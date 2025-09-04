import os
import logging
import hashlib
import hmac
import time
from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Request
from pydantic import BaseModel, Field, validator
from pathlib import Path
from dotenv import load_dotenv

# Import security engine for rate limiting
from security_engine import security_engine, rate_limit_middleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

# Pydantic models
class ActiveAuthConfig(BaseModel):
    device_id: str = Field(..., min_length=1, max_length=100)
    enabled: bool = Field(default=True)
    auth_interval_hours: int = Field(default=72, ge=24, le=168)  # 24h to 168h (1-7 days)
    wipe_type: str = Field(default="app_data")  # "app_data" or "full_nuke"
    warning_hours: int = Field(default=6, ge=1, le=24)  # Warning period

    @validator('auth_interval_hours')
    def validate_auth_interval(cls, v):
        valid_intervals = [24, 48, 72, 96, 120, 144, 168]  # 1-7 days in hours
        if v not in valid_intervals:
            raise ValueError(f"auth_interval_hours must be one of {valid_intervals}")
        return v

    @validator('wipe_type')
    def validate_wipe_type(cls, v):
        if v not in ["app_data", "full_nuke"]:
            raise ValueError("wipe_type must be 'app_data' or 'full_nuke'")
        return v

class AuthenticationRecord(BaseModel):
    device_id: str = Field(..., min_length=1, max_length=100)
    authentication_type: str = Field(default="pin_entry")
    timestamp: int = Field(default_factory=lambda: int(time.time()))

class ActiveAuthStatus(BaseModel):
    device_id: str
    enabled: bool
    auth_interval_hours: int
    wipe_type: str
    last_authentication: int
    hours_until_auth_required: int
    warning_active: bool
    auth_overdue: bool
    authentication_count: int

class ActiveAuthResponse(BaseModel):
    success: bool
    message: str
    config: Optional[ActiveAuthConfig] = None
    status: Optional[ActiveAuthStatus] = None

def sanitize_input(text: str, max_length: int = 100) -> str:
    """Sanitize input data for active auth system"""
    if not text or not isinstance(text, str):
        raise HTTPException(status_code=400, detail="Invalid input: text must be a non-empty string")
    
    if len(text) > max_length:
        raise HTTPException(status_code=400, detail=f"Input too long: maximum {max_length} characters")
    
    # Check for dangerous patterns
    dangerous_patterns = ['<script', 'javascript:', '../', '/etc/passwd', 'drop table']
    text_lower = text.lower()
    
    for pattern in dangerous_patterns:
        if pattern in text_lower:
            raise HTTPException(status_code=400, detail="Potentially dangerous content detected")
    
    return text.strip()

def generate_auth_signature(device_id: str, timestamp: int, auth_type: str) -> str:
    """Generate cryptographic signature for authentication record"""
    data = f"ACTIVE_AUTH:{device_id}:{timestamp}:{auth_type}"
    signature = hmac.new(
        b"OMERTA_ACTIVE_AUTH_SECRET_2025_GRADE",
        data.encode(),
        hashlib.sha256
    ).hexdigest()
    return signature

async def configure_active_authentication(request: Request, payload: ActiveAuthConfig):
    """Configure active authentication requirements for device"""
    try:
        await rate_limit_middleware(request, "active_auth_config")
        
        # Sanitize inputs
        device_id = sanitize_input(payload.device_id, max_length=100)
        
        # Validate configuration
        if payload.warning_hours >= payload.auth_interval_hours:
            raise HTTPException(
                status_code=400, 
                detail="warning_hours must be less than auth_interval_hours"
            )
        
        # Store configuration in RAM
        if device_id not in security_engine.user_sessions:
            security_engine.user_sessions[device_id] = {}
        
        current_timestamp = int(time.time())
        
        config_data = {
            "enabled": payload.enabled,
            "auth_interval_hours": payload.auth_interval_hours,
            "wipe_type": payload.wipe_type,
            "warning_hours": payload.warning_hours,
            "configured_timestamp": current_timestamp,
            "last_authentication": current_timestamp,  # Initialize with current time
            "authentication_count": 0,
            "warning_count": 0,
            "auth_overdue": False
        }
        
        security_engine.user_sessions[device_id]["active_auth_config"] = config_data
        
        logger.info(f"🕒 ACTIVE AUTH: Configured for device {device_id} - {payload.auth_interval_hours}h interval, {payload.wipe_type}")
        
        return ActiveAuthResponse(
            success=True,
            message=f"Active authentication configured: {payload.auth_interval_hours}h interval → {payload.wipe_type}",
            config=payload
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Active auth configuration failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to configure active authentication")

async def record_authentication(request: Request, payload: AuthenticationRecord):
    """Record successful authentication by user"""
    try:
        await rate_limit_middleware(request, "active_auth_record")
        
        device_id = sanitize_input(payload.device_id, max_length=100)
        auth_type = sanitize_input(payload.authentication_type, max_length=50)
        
        if device_id not in security_engine.user_sessions:
            # Initialize if not exists
            security_engine.user_sessions[device_id] = {}
        
        session = security_engine.user_sessions[device_id]
        
        # Update authentication record
        current_timestamp = payload.timestamp or int(time.time())
        
        if "active_auth_config" not in session:
            # Initialize default config if none exists
            session["active_auth_config"] = {
                "enabled": False,
                "auth_interval_hours": 72,
                "wipe_type": "app_data",
                "warning_hours": 6,
                "configured_timestamp": current_timestamp,
                "last_authentication": current_timestamp,
                "authentication_count": 0,
                "warning_count": 0,
                "auth_overdue": False
            }
        
        # Record the authentication
        auth_config = session["active_auth_config"]
        auth_config["last_authentication"] = current_timestamp
        auth_config["authentication_count"] += 1
        auth_config["warning_count"] = 0  # Reset warnings on successful auth
        auth_config["auth_overdue"] = False  # Clear overdue status
        
        # Generate signature for authentication record
        signature = generate_auth_signature(device_id, current_timestamp, auth_type)
        
        # Store authentication record
        if "auth_history" not in session:
            session["auth_history"] = []
        
        auth_record = {
            "timestamp": current_timestamp,
            "auth_type": auth_type,
            "signature": signature,
            "device_id": device_id
        }
        
        # Keep only last 10 authentication records
        session["auth_history"].append(auth_record)
        if len(session["auth_history"]) > 10:
            session["auth_history"] = session["auth_history"][-10:]
        
        logger.info(f"🔐 ACTIVE AUTH: Authentication recorded for device {device_id} ({auth_type})")
        
        return {
            "success": True, 
            "message": "Authentication recorded successfully",
            "timestamp": current_timestamp,
            "auth_count": auth_config["authentication_count"]
        }
        
    except Exception as e:
        logger.error(f"Authentication recording failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to record authentication")

async def check_active_auth_status(request: Request, device_id: str):
    """Check active authentication status and trigger wipe if necessary"""
    try:
        await rate_limit_middleware(request, "active_auth_status")
        
        device_id = sanitize_input(device_id, max_length=100)
        
        if device_id not in security_engine.user_sessions:
            return {"success": True, "auth_overdue": False, "message": "No active auth configuration found"}
        
        session = security_engine.user_sessions[device_id]
        
        if "active_auth_config" not in session:
            return {"success": True, "auth_overdue": False, "message": "Active auth not configured"}
        
        config = session["active_auth_config"]
        
        if not config["enabled"]:
            return {"success": True, "auth_overdue": False, "message": "Active auth disabled"}
        
        current_timestamp = int(time.time())
        last_auth = config["last_authentication"]
        auth_interval_seconds = config["auth_interval_hours"] * 60 * 60
        warning_seconds = config["warning_hours"] * 60 * 60
        
        time_since_auth = current_timestamp - last_auth
        
        # Calculate status
        auth_overdue = time_since_auth >= auth_interval_seconds
        warning_active = time_since_auth >= (auth_interval_seconds - warning_seconds) and not auth_overdue
        
        hours_until_auth = max(0, (auth_interval_seconds - time_since_auth) / 3600)
        
        status = ActiveAuthStatus(
            device_id=device_id,
            enabled=config["enabled"],
            auth_interval_hours=config["auth_interval_hours"],
            wipe_type=config["wipe_type"],
            last_authentication=last_auth,
            hours_until_auth_required=int(hours_until_auth),
            warning_active=warning_active,
            auth_overdue=auth_overdue,
            authentication_count=config.get("authentication_count", 0)
        )
        
        # Handle overdue authentication
        if auth_overdue and not config.get("wipe_triggered", False):
            await trigger_active_auth_wipe(device_id, config)
            config["wipe_triggered"] = True
            config["auth_overdue"] = True
        
        # Update warning count
        if warning_active:
            config["warning_count"] = config.get("warning_count", 0) + 1
        
        logger.info(f"🕒 ACTIVE AUTH STATUS: Device {device_id} - Hours until auth: {int(hours_until_auth)}, Warning: {warning_active}, Overdue: {auth_overdue}")
        
        return {
            "success": True,
            "auth_overdue": auth_overdue,
            "warning_active": warning_active,
            "status": status.dict(),
            "message": "Active authentication status checked"
        }
        
    except Exception as e:
        logger.error(f"Active auth status check failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to check active auth status")

async def trigger_active_auth_wipe(device_id: str, config: dict):
    """Trigger wipe due to overdue active authentication"""
    try:
        current_timestamp = int(time.time())
        wipe_type = config["wipe_type"]
        auth_interval = config["auth_interval_hours"]
        
        # Generate signature for wipe action
        signature = generate_auth_signature(device_id, current_timestamp, f"wipe_{wipe_type}")
        
        if wipe_type == "full_nuke":
            # Trigger STEELOS-SHREDDER for full nuke
            kill_token = {
                "command": "ACTIVE_AUTH_STEELOS_SHREDDER",
                "device_id": device_id,
                "wipe_type": "steelos_shredder_obliteration",
                "timestamp": current_timestamp,
                "trigger_type": "active_auth_overdue",
                "reason": f"Active authentication not provided within {auth_interval} hours",
                "signature": signature,
                "auto_execute": True,
                "show_cyanide_animation": True,
                "kill_method": "steelos_shredder",
                "bypass_user_confirmation": True,
                "destruction_phases": [
                    "secure_store_annihilation",
                    "file_system_destruction",
                    "memory_clearing", 
                    "cache_data_destruction",
                    "metadata_destruction"
                ]
            }
            
            # Store in session for client retrieval
            if device_id not in security_engine.user_sessions:
                security_engine.user_sessions[device_id] = {}
            
            security_engine.user_sessions[device_id]["steelos_shredder_token"] = kill_token
            
            logger.critical(f"💀 ACTIVE AUTH FULL NUKE: Device {device_id} - STEELOS-SHREDDER activated after {auth_interval}h without authentication")
            
        else:
            # App data wipe only
            wipe_command = {
                "command": "ACTIVE_AUTH_APP_DATA_WIPE",
                "device_id": device_id,
                "wipe_type": "app_data_only",
                "timestamp": current_timestamp,
                "trigger_type": "active_auth_overdue",
                "reason": f"Active authentication not provided within {auth_interval} hours",
                "signature": signature,
                "wipe_targets": [
                    "secure_notes",
                    "chat_messages",
                    "vault_items", 
                    "contact_data",
                    "user_settings",
                    "active_auth_config"
                ]
            }
            
            # Store in session for client retrieval
            if device_id not in security_engine.user_sessions:
                security_engine.user_sessions[device_id] = {}
            
            security_engine.user_sessions[device_id]["active_auth_wipe_token"] = wipe_command
            
            logger.warning(f"🧹 ACTIVE AUTH APP DATA WIPE: Device {device_id} - App data wipe after {auth_interval}h without authentication")
        
    except Exception as e:
        logger.error(f"Active auth wipe trigger failed: {e}")

async def get_active_auth_wipe_token(request: Request, device_id: str):
    """Get pending active auth wipe token for device"""
    try:
        await rate_limit_middleware(request, "active_auth_token")
        
        device_id = sanitize_input(device_id, max_length=100)
        
        if device_id not in security_engine.user_sessions:
            return {"auth_wipe_pending": False, "message": "No wipe tokens found"}
        
        session = security_engine.user_sessions[device_id]
        
        # Check for STEELOS-SHREDDER token (full nuke)
        if "steelos_shredder_token" in session:
            token = session["steelos_shredder_token"]
            del session["steelos_shredder_token"]  # One-time use
            
            logger.critical(f"💀 ACTIVE AUTH TOKEN RETRIEVED: FULL NUKE for device {device_id}")
            
            return {
                "auth_wipe_pending": True,
                "wipe_type": "full_nuke",
                "token": token,
                "message": "STEELOS-SHREDDER active auth wipe token retrieved"
            }
        
        # Check for app data wipe token
        if "active_auth_wipe_token" in session:
            token = session["active_auth_wipe_token"]
            del session["active_auth_wipe_token"]  # One-time use
            
            logger.warning(f"🧹 ACTIVE AUTH TOKEN RETRIEVED: APP DATA for device {device_id}")
            
            return {
                "auth_wipe_pending": True,
                "wipe_type": "app_data",
                "token": token,
                "message": "App data active auth wipe token retrieved"
            }
        
        return {"auth_wipe_pending": False, "message": "No wipe tokens pending"}
        
    except Exception as e:
        logger.error(f"Active auth wipe token retrieval failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve wipe token")

async def disable_active_auth(request: Request, device_id: str):
    """Disable active authentication for device"""
    try:
        await rate_limit_middleware(request, "active_auth_disable")
        
        device_id = sanitize_input(device_id, max_length=100)
        
        if device_id in security_engine.user_sessions:
            session = security_engine.user_sessions[device_id]
            if "active_auth_config" in session:
                session["active_auth_config"]["enabled"] = False
                logger.info(f"🕒 ACTIVE AUTH: Disabled for device {device_id}")
        
        return {"success": True, "message": "Active authentication disabled"}
        
    except Exception as e:
        logger.error(f"Disable active auth failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to disable active authentication")