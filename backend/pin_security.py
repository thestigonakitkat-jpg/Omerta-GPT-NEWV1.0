"""
PIN Security with Exponential Backoff Brute Force Protection
- Escalating penalties: 1 min → 2 min → 4 min → ... → years
- Remote wipe capability with factory reset triggers
- Panic PIN detection and silent wipe
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from security_engine import security_engine, brute_force_protection
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# PIN Security Router
pin_router = APIRouter(prefix="/pin", tags=["PIN Security"])

class PinAttempt(BaseModel):
    pin: str
    device_id: str
    context: str  # "chats", "vault", "app_unlock"

class PinResponse(BaseModel):
    success: bool
    message: str
    blocked_until: float = 0
    wipe_triggered: bool = False
    kill_token: dict = None  # Signed kill token for automatic execution

@pin_router.post("/verify", response_model=PinResponse)
async def verify_pin(request: Request, attempt: PinAttempt):
    """Verify PIN with exponential backoff brute force protection"""
    
    # Define correct PINs (in production, these would be hashed and stored securely per user)
    CORRECT_PINS = {
        "chats": "123456",
        "vault": "654321", 
        "app_unlock": "OMERTA2025!@#$%^&*"  # 16-char passphrase
    }
    
    PANIC_PIN = "911911"  # Universal panic PIN
    
    try:
        # Check for panic PIN first (silent detection)
        if attempt.pin == PANIC_PIN:
            await security_engine.trigger_remote_wipe(attempt.device_id, "panic")
            logger.critical(f"PANIC PIN DETECTED: Device {attempt.device_id} - Silent wipe triggered")
            
            # Return fake success to hide panic PIN detection
            return PinResponse(
                success=True,
                message="Access granted",
                wipe_triggered=True  # This flag should trigger immediate wipe on client
            )
        
        # Check correct PIN
        correct_pin = CORRECT_PINS.get(attempt.context)
        if not correct_pin:
            raise HTTPException(status_code=400, detail="Invalid context")
        
        pin_is_correct = (attempt.pin == correct_pin)
        
        # Apply brute force protection (will throw HTTPException if blocked)
        await brute_force_protection(
            request, 
            f"pin_{attempt.context}_{attempt.device_id}", 
            success=pin_is_correct
        )
        
        if pin_is_correct:
            return PinResponse(
                success=True,
                message="Access granted"
            )
        else:
            return PinResponse(
                success=False,
                message="Incorrect PIN"
            )
            
    except HTTPException as e:
        if e.status_code == 429:
            # Extract block time from error message
            import re
            time_match = re.search(r'Blocked for (.+?)\.', e.detail)
            time_desc = time_match.group(1) if time_match else "unknown time"
            
            return PinResponse(
                success=False,
                message=f"Too many failed attempts. Blocked for {time_desc}.",
                blocked_until=0  # Could extract actual timestamp if needed
            )
        else:
            raise e

@pin_router.post("/remote-wipe")
async def trigger_remote_wipe(request: Request, device_id: str, wipe_type: str = "secure"):
    """Trigger remote factory reset (admin/emergency use)"""
    
    # In production, this would require admin authentication
    # For demo purposes, allowing direct trigger
    
    success = await security_engine.trigger_remote_wipe(device_id, wipe_type)
    
    if success:
        return {"message": f"Remote wipe triggered for device {device_id}", "type": wipe_type}
    else:
        raise HTTPException(status_code=500, detail="Failed to trigger remote wipe")

@pin_router.get("/wipe-status/{device_id}")
async def check_wipe_status(device_id: str):
    """Check if device has pending wipe command"""
    
    # Check if device has pending wipe
    device_session = security_engine.user_sessions.get(device_id, {})
    pending_wipe = device_session.get("pending_wipe")
    
    if pending_wipe:
        # Clear the command after device picks it up
        del security_engine.user_sessions[device_id]["pending_wipe"]
        
        return {
            "wipe_pending": True,
            "wipe_command": pending_wipe
        }
    
    return {"wipe_pending": False}

@pin_router.post("/factory-reset-confirm")
async def confirm_factory_reset(device_id: str):
    """Confirm that factory reset was successfully triggered on device"""
    
    logger.info(f"Factory reset confirmed for device {device_id}")
    
    # Clean up any remaining session data
    if device_id in security_engine.user_sessions:
        del security_engine.user_sessions[device_id]
    
    # Clean up any brute force tracking for this device
    keys_to_remove = [key for key in security_engine.brute_force_attempts.keys() if device_id in key]
    for key in keys_to_remove:
        del security_engine.brute_force_attempts[key]
    
    return {"message": "Factory reset confirmed and device cleaned up"}