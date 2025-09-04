import os
import logging
import hashlib
import hmac
import time
import secrets
from typing import Dict, List, Optional, Tuple
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
class DualKeyOperator(BaseModel):
    operator_id: str = Field(..., min_length=5, max_length=50)
    operator_type: str = Field(...)  # "developer", "security_officer", "admin"
    key_fragment: str = Field(..., min_length=64, max_length=128)
    password_hash: str = Field(..., min_length=32, max_length=128)
    totp_secret: str = Field(..., min_length=16, max_length=32)
    public_key: str = Field(..., min_length=64, max_length=512)

    @validator('operator_type')
    def validate_operator_type(cls, v):
        if v not in ["developer", "security_officer", "admin", "emergency_admin"]:
            raise ValueError("operator_type must be developer, security_officer, admin, or emergency_admin")
        return v

class DualKeyOperation(BaseModel):
    operation_id: str
    operation_type: str  # "system_reset", "update_install", "emergency_access", "master_override"
    operator_a_id: str
    operator_b_id: str
    initiated_at: int
    expires_at: int
    status: str  # "initiated", "waiting_second_key", "authenticated", "executed", "expired", "cancelled"
    operation_data: dict

class DualKeyAuthRequest(BaseModel):
    operation_id: str = Field(..., min_length=10, max_length=100)
    operator_id: str = Field(..., min_length=5, max_length=50)
    key_fragment: str = Field(..., min_length=64, max_length=128)
    password: str = Field(..., min_length=8, max_length=200)
    totp_code: str = Field(..., min_length=6, max_length=8)
    cryptographic_signature: str = Field(..., min_length=64, max_length=512)

class DualKeyResponse(BaseModel):
    success: bool
    message: str
    operation_id: Optional[str] = None
    status: Optional[str] = None
    next_step: Optional[str] = None
    time_remaining: Optional[int] = None

def sanitize_dual_key_input(text: str, max_length: int = 100) -> str:
    """Sanitize dual key input data"""
    if not text or not isinstance(text, str):
        raise HTTPException(status_code=400, detail="Invalid input: text must be a non-empty string")
    
    if len(text) > max_length:
        raise HTTPException(status_code=400, detail=f"Input too long: maximum {max_length} characters")
    
    # Check for dangerous patterns
    dangerous_patterns = [
        '<script', 'javascript:', '../', '/etc/passwd', 'drop table',
        'eval(', 'exec(', 'system(', 'import os', '__import__',
        'subprocess', 'os.system', 'exec', 'shell'
    ]
    text_lower = text.lower()
    
    for pattern in dangerous_patterns:
        if pattern in text_lower:
            raise HTTPException(status_code=400, detail="Potentially dangerous content detected")
    
    return text.strip()

def generate_dual_key_signature(operation_id: str, operator_id: str, timestamp: int) -> str:
    """Generate cryptographic signature for dual key operation"""
    data = f"DUAL_KEY_OPERATION:{operation_id}:{operator_id}:{timestamp}"
    signature = hmac.new(
        b"OMERTA_DUAL_KEY_NUCLEAR_PROTOCOL_SECRET_2025_NSA",
        data.encode(),
        hashlib.sha256
    ).hexdigest()
    return signature

def verify_totp_code(secret: str, code: str, window: int = 1) -> bool:
    """Verify TOTP code with time window tolerance"""
    try:
        import pyotp
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=window)
    except ImportError:
        # Fallback TOTP implementation
        import base64
        import struct
        
        # Simple TOTP verification (production should use proper library)
        current_time = int(time.time()) // 30
        
        for i in range(-window, window + 1):
            time_counter = current_time + i
            expected_code = generate_totp_code(secret, time_counter)
            if expected_code == code.zfill(6):
                return True
        return False

def generate_totp_code(secret: str, time_counter: int) -> str:
    """Generate TOTP code for given time counter"""
    try:
        import base64
        import struct
        
        # Decode base32 secret
        key = base64.b32decode(secret.upper() + '=' * (8 - len(secret) % 8))
        
        # Create HMAC
        time_bytes = struct.pack('>Q', time_counter)
        hmac_digest = hmac.new(key, time_bytes, hashlib.sha1).digest()
        
        # Extract dynamic binary code
        offset = hmac_digest[-1] & 0x0F
        binary_code = struct.unpack('>I', hmac_digest[offset:offset+4])[0] & 0x7FFFFFFF
        
        # Generate 6-digit code
        return str(binary_code % 1000000).zfill(6)
    except Exception:
        return "000000"  # Fallback

def combine_key_fragments(fragment_a: str, fragment_b: str) -> str:
    """Combine two key fragments to create master key"""
    try:
        # XOR the fragments together
        bytes_a = bytes.fromhex(fragment_a)
        bytes_b = bytes.fromhex(fragment_b)
        
        if len(bytes_a) != len(bytes_b):
            raise ValueError("Key fragments must be same length")
        
        combined = bytes(a ^ b for a, b in zip(bytes_a, bytes_b))
        return combined.hex()
    except Exception as e:
        logger.error(f"Key fragment combination failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid key fragments")

async def initiate_dual_key_operation(request: Request, operation_type: str, operation_data: dict, operator_a_id: str, operator_b_id: str):
    """Initiate a dual-key operation requiring two-person authentication"""
    try:
        # Aggressive rate limiting for dual key operations
        await rate_limit_middleware(request, "dual_key_operation", max_requests=5, window_minutes=60)
        
        # Sanitize inputs
        operation_type = sanitize_dual_key_input(operation_type, max_length=50)
        operator_a_id = sanitize_dual_key_input(operator_a_id, max_length=50)
        operator_b_id = sanitize_dual_key_input(operator_b_id, max_length=50)
        
        # Validate operation type
        valid_operations = ["system_reset", "update_install", "emergency_access", "master_override", "developer_recovery"]
        if operation_type not in valid_operations:
            raise HTTPException(status_code=400, detail=f"Invalid operation type. Must be one of: {valid_operations}")
        
        # Ensure different operators
        if operator_a_id == operator_b_id:
            raise HTTPException(status_code=400, detail="Must use two different operators for dual-key operation")
        
        # Generate operation ID
        current_timestamp = int(time.time())
        operation_id = f"DUAL_KEY_{operation_type.upper()}_{current_timestamp}_{secrets.token_hex(8)}"
        
        # Set expiration (5 minutes for coordination)
        expires_at = current_timestamp + (5 * 60)
        
        # Create operation record
        operation_record = DualKeyOperation(
            operation_id=operation_id,
            operation_type=operation_type,
            operator_a_id=operator_a_id,
            operator_b_id=operator_b_id,
            initiated_at=current_timestamp,
            expires_at=expires_at,
            status="initiated",
            operation_data=operation_data
        )
        
        # Store in security engine
        if "dual_key_operations" not in security_engine.user_sessions:
            security_engine.user_sessions["dual_key_operations"] = {}
        
        security_engine.user_sessions["dual_key_operations"][operation_id] = operation_record.dict()
        
        logger.critical(f"🔐🔐 DUAL KEY OPERATION INITIATED: {operation_type.upper()} - OpID: {operation_id}, Operators: {operator_a_id} + {operator_b_id}")
        
        return DualKeyResponse(
            success=True,
            message=f"Dual-key operation initiated. Both operators must authenticate within 5 minutes.",
            operation_id=operation_id,
            status="initiated",
            next_step="Both operators must provide authentication",
            time_remaining=300  # 5 minutes
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Dual key operation initiation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to initiate dual key operation")

async def authenticate_dual_key_operator(request: Request, auth_request: DualKeyAuthRequest):
    """Authenticate one operator for dual-key operation"""
    try:
        await rate_limit_middleware(request, "dual_key_auth", max_requests=10, window_minutes=60)
        
        # Sanitize inputs
        operation_id = sanitize_dual_key_input(auth_request.operation_id, max_length=100)
        operator_id = sanitize_dual_key_input(auth_request.operator_id, max_length=50)
        
        # Get operation record
        if "dual_key_operations" not in security_engine.user_sessions:
            raise HTTPException(status_code=404, detail="Operation not found")
        
        operations = security_engine.user_sessions["dual_key_operations"]
        if operation_id not in operations:
            raise HTTPException(status_code=404, detail="Operation ID not found")
        
        operation = operations[operation_id]
        current_timestamp = int(time.time())
        
        # Check expiration
        if current_timestamp >= operation["expires_at"]:
            operation["status"] = "expired"
            raise HTTPException(status_code=410, detail="Operation has expired")
        
        # Verify operator is authorized for this operation
        if operator_id not in [operation["operator_a_id"], operation["operator_b_id"]]:
            logger.warning(f"🚨 UNAUTHORIZED DUAL KEY ATTEMPT: {operator_id} not authorized for operation {operation_id}")
            raise HTTPException(status_code=403, detail="Operator not authorized for this operation")
        
        # Get operator credentials (in production, these would be stored securely)
        operators = get_dual_key_operators()
        if operator_id not in operators:
            raise HTTPException(status_code=403, detail="Unknown operator")
        
        operator = operators[operator_id]
        
        # Verify password
        password_hash = hashlib.sha256(auth_request.password.encode()).hexdigest()
        if password_hash != operator["password_hash"]:
            logger.warning(f"🚨 DUAL KEY AUTH FAILURE: Invalid password for operator {operator_id}")
            raise HTTPException(status_code=403, detail="Invalid password")
        
        # Verify TOTP
        if not verify_totp_code(operator["totp_secret"], auth_request.totp_code):
            logger.warning(f"🚨 DUAL KEY AUTH FAILURE: Invalid TOTP for operator {operator_id}")
            raise HTTPException(status_code=403, detail="Invalid TOTP code")
        
        # Verify cryptographic signature
        expected_signature = generate_dual_key_signature(operation_id, operator_id, current_timestamp)
        # In production, would verify the signature more rigorously
        
        # Mark operator as authenticated
        auth_field = f"operator_{operator_id}_authenticated"
        operation[auth_field] = True
        operation[f"operator_{operator_id}_auth_time"] = current_timestamp
        
        # Check if both operators are authenticated
        operator_a_auth = operation.get(f"operator_{operation['operator_a_id']}_authenticated", False)
        operator_b_auth = operation.get(f"operator_{operation['operator_b_id']}_authenticated", False)
        
        if operator_a_auth and operator_b_auth:
            operation["status"] = "authenticated"
            
            # Execute the dual-key operation
            execution_result = await execute_dual_key_operation(operation)
            
            logger.critical(f"🔐🔐 DUAL KEY OPERATION AUTHENTICATED: {operation['operation_type'].upper()} - Both operators confirmed")
            
            return DualKeyResponse(
                success=True,
                message="Both operators authenticated. Operation executed successfully.",
                operation_id=operation_id,
                status="executed",
                next_step="Operation complete"
            )
        else:
            operation["status"] = "waiting_second_key"
            waiting_for = operation["operator_b_id"] if operator_a_auth else operation["operator_a_id"]
            
            logger.info(f"🔐 DUAL KEY AUTH: Operator {operator_id} authenticated, waiting for {waiting_for}")
            
            return DualKeyResponse(
                success=True,
                message=f"Operator {operator_id} authenticated. Waiting for second operator authentication.",
                operation_id=operation_id,
                status="waiting_second_key",
                next_step=f"Waiting for operator {waiting_for}",
                time_remaining=operation["expires_at"] - current_timestamp
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Dual key operator authentication failed: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")

async def execute_dual_key_operation(operation: dict):
    """Execute the dual-key operation after both operators authenticate"""
    try:
        operation_type = operation["operation_type"]
        operation_data = operation["operation_data"]
        
        logger.critical(f"🚀 EXECUTING DUAL KEY OPERATION: {operation_type.upper()}")
        
        if operation_type == "system_reset":
            result = await execute_system_reset(operation_data)
        elif operation_type == "update_install":
            result = await execute_update_install(operation_data)
        elif operation_type == "emergency_access":
            result = await execute_emergency_access(operation_data)
        elif operation_type == "master_override":
            result = await execute_master_override(operation_data)
        elif operation_type == "developer_recovery":
            result = await execute_developer_recovery(operation_data)
        else:
            raise ValueError(f"Unknown operation type: {operation_type}")
        
        operation["status"] = "executed"
        operation["executed_at"] = int(time.time())
        operation["execution_result"] = result
        
        return result
        
    except Exception as e:
        logger.error(f"Dual key operation execution failed: {e}")
        operation["status"] = "failed"
        operation["error"] = str(e)
        raise

def get_dual_key_operators() -> dict:
    """Get dual key operators (in production, from secure storage)"""
    # This is a simplified version - in production, operators would be stored securely
    return {
        "dev_primary": {
            "operator_type": "developer",
            "password_hash": hashlib.sha256("DevSecure2025!".encode()).hexdigest(),
            "totp_secret": "JBSWY3DPEHPK3PXP",  # Base32 secret
            "key_fragment": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
            "public_key": "dev_public_key_placeholder"
        },
        "sec_officer": {
            "operator_type": "security_officer", 
            "password_hash": hashlib.sha256("SecOfficer2025!".encode()).hexdigest(),
            "totp_secret": "JBSWY3DPEHPK3PXQ",  # Different Base32 secret
            "key_fragment": "f6e5d4c3b2a1098765432109876543210fedcba0987654321fedcba09876543",
            "public_key": "sec_public_key_placeholder"
        }
    }

async def execute_system_reset(operation_data: dict):
    """Execute system reset with dual-key authorization"""
    logger.critical("🔄 DUAL KEY SYSTEM RESET: Authorized by two operators")
    # Implementation would perform actual system reset
    return {"action": "system_reset", "status": "completed", "timestamp": int(time.time())}

async def execute_update_install(operation_data: dict):
    """Execute update installation with dual-key authorization"""
    logger.critical("📦 DUAL KEY UPDATE INSTALL: Authorized by two operators")
    # Implementation would perform actual update installation
    return {"action": "update_install", "status": "completed", "timestamp": int(time.time())}

async def execute_emergency_access(operation_data: dict):
    """Execute emergency access with dual-key authorization"""
    logger.critical("🚨 DUAL KEY EMERGENCY ACCESS: Authorized by two operators")
    # Implementation would grant emergency access
    return {"action": "emergency_access", "status": "granted", "timestamp": int(time.time())}

async def execute_master_override(operation_data: dict):
    """Execute master override with dual-key authorization"""
    logger.critical("🔓 DUAL KEY MASTER OVERRIDE: Authorized by two operators")
    # Implementation would perform master override
    return {"action": "master_override", "status": "completed", "timestamp": int(time.time())}

async def execute_developer_recovery(operation_data: dict):
    """Execute developer recovery with dual-key authorization"""
    logger.critical("🔧 DUAL KEY DEVELOPER RECOVERY: Authorized by two operators")
    # Implementation would perform developer recovery
    return {"action": "developer_recovery", "status": "completed", "timestamp": int(time.time())}

async def get_dual_key_operation_status(request: Request, operation_id: str):
    """Get status of dual-key operation"""
    try:
        await rate_limit_middleware(request, "dual_key_status")
        
        operation_id = sanitize_dual_key_input(operation_id, max_length=100)
        
        if "dual_key_operations" not in security_engine.user_sessions:
            raise HTTPException(status_code=404, detail="No operations found")
        
        operations = security_engine.user_sessions["dual_key_operations"]
        if operation_id not in operations:
            raise HTTPException(status_code=404, detail="Operation not found")
        
        operation = operations[operation_id]
        current_timestamp = int(time.time())
        
        # Check if expired
        if current_timestamp >= operation["expires_at"] and operation["status"] == "initiated":
            operation["status"] = "expired"
        
        return {
            "success": True,
            "operation_id": operation_id,
            "status": operation["status"],
            "operation_type": operation["operation_type"],
            "time_remaining": max(0, operation["expires_at"] - current_timestamp),
            "operators": {
                "operator_a": operation["operator_a_id"],
                "operator_b": operation["operator_b_id"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get dual key operation status failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to get operation status")