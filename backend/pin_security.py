import asyncio
import hashlib
import hmac
import time
import secrets
from datetime import datetime, timedelta
from typing import Dict, Optional
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

# Import from main security engine
from security_engine import security_engine, brute_force_protection
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pin", tags=["PIN Security"])

class PinAttempt(BaseModel):
    device_id: str
    pin: str
    timestamp: Optional[int] = None

class PinResponse(BaseModel):
    success: bool
    message: str
    attempts_remaining: Optional[int] = None
    locked_until: Optional[int] = None
    kill_token: Optional[dict] = None

# 🔒 NSA CONSTANT-TIME PIN VERIFICATION
async def verify_pin_constant_time(submitted_pin: str, correct_pin: str, is_panic_pin: bool = False) -> tuple[bool, bool]:
    """
    Constant-time PIN verification that prevents timing attacks.
    Returns (is_correct, is_panic) to hide panic PIN detection timing.
    """
    
    # SECURITY: Always perform same operations regardless of PIN
    start_time = time.time_ns()
    
    # Check normal PIN with constant time comparison
    normal_match = secrets.compare_digest(submitted_pin.encode(), correct_pin.encode())
    
    # Check panic PIN with constant time comparison (000000 for deception)
    panic_match = secrets.compare_digest(submitted_pin.encode(), "000000".encode())
    
    # SECURITY: Add fixed random delay to mask crypto operations
    base_delay = 100 + secrets.randbelow(50)  # 100-150ms random delay
    
    # Simulate expensive crypto operations for ALL PINs
    # This hides the timing difference between normal and panic PINs
    fake_crypto_work = hashlib.pbkdf2_hmac(
        'sha256',
        submitted_pin.encode(),
        b'fake_salt_constant_time_2025',
        50000,  # 50k iterations takes ~50-80ms
        32
    )
    
    # Additional constant work
    for i in range(secrets.randbelow(1000) + 500):  # 500-1500 iterations
        fake_crypto_work = hashlib.sha256(fake_crypto_work + str(i).encode()).digest()
    
    # Ensure minimum time has passed
    elapsed_ns = time.time_ns() - start_time
    elapsed_ms = elapsed_ns // 1_000_000
    
    if elapsed_ms < base_delay:
        await asyncio.sleep((base_delay - elapsed_ms) / 1000.0)
    
    # SECURITY: Clear PIN from memory immediately after verification
    # Note: Python strings are immutable, but we can try to clear references
    submitted_pin = "0" * len(submitted_pin)
    correct_pin = "0" * len(correct_pin)
    
    return normal_match, panic_match

async def generate_signed_kill_token(device_id: str, reason: str) -> dict:
    """Generate cryptographically signed kill token for automatic execution"""
    timestamp = int(time.time())
    
    # Create kill token data
    kill_token_data = f"{device_id}:{timestamp}:{reason}:OMERTA_KILL_AUTHORITY_2025"
    
    # Generate cryptographic signature
    signature = hmac.new(
        b"OMERTA_KILL_TOKEN_SECRET_KEY_2025_NSA_GRADE",
        kill_token_data.encode(),
        hashlib.sha256
    ).hexdigest()
    
    kill_token = {
        "command": "SIGNED_KILL_TOKEN_PANIC",
        "device_id": device_id,
        "wipe_type": "panic_automatic_kill",
        "timestamp": timestamp,
        "reason": reason,
        "signature": signature,
        "token_data": kill_token_data,
        "auto_execute": True,
        "show_decoy_interface": True,
        "kill_method": "signed_token",
        "bypass_user_confirmation": True
    }
    
    return kill_token

@router.post("/verify", response_model=PinResponse)
async def verify_pin(
    attempt: PinAttempt,
    request: Request
):
    """
    🔒 NSA-GRADE PIN VERIFICATION with constant-time anti-timing protection
    """
    
    # Rate limiting check
    if not await security_engine.check_rate_limit(request, "pin_verify"):
        raise HTTPException(status_code=429, detail="Too many PIN attempts")
    
    client_id = security_engine.get_real_client_id(request)
    
    # Get brute force status
    if client_id in security_engine.brute_force_attempts:
        attempts_data = security_engine.brute_force_attempts[client_id]
        
        # Check if currently locked out
        if "locked_until" in attempts_data:
            if time.time() < attempts_data["locked_until"]:
                remaining_time = int(attempts_data["locked_until"] - time.time())
                return PinResponse(
                    success=False,
                    message=f"Account locked. Try again in {remaining_time} seconds.",
                    locked_until=int(attempts_data["locked_until"])
                )
    
    # 🔒 CONSTANT-TIME PIN VERIFICATION (prevents timing attacks)
    # NOTE: This is the correct PIN in production - for demo, we'll use "123456"
    CORRECT_PIN = "123456"  # In production: load from secure storage
    
    # Perform constant-time verification
    is_correct, is_panic = await verify_pin_constant_time(attempt.pin, CORRECT_PIN, False)
    
    if is_panic:
        # 🚨 PANIC PIN DETECTED - SILENT WIPE PROTOCOL
        logger.critical(f"PANIC PIN DETECTED: Device {attempt.device_id} - GENERATING SIGNED KILL TOKEN FOR AUTOMATIC EXECUTION")
        
        # Generate signed kill token for automatic execution
        kill_token = await generate_signed_kill_token(
            attempt.device_id, 
            "Panic PIN (911911) - Signed kill token execution"
        )
        
        # Queue kill token for immediate automatic execution
        if attempt.device_id not in security_engine.user_sessions:
            security_engine.user_sessions[attempt.device_id] = {}
        
        security_engine.user_sessions[attempt.device_id]["signed_kill_token"] = kill_token
        
        logger.critical(f"SIGNED KILL TOKEN GENERATED: Device {attempt.device_id} - AUTOMATIC FACTORY RESET WILL EXECUTE")
        logger.critical(f"Kill Token Signature: {kill_token['signature']}")
        
        # Return fake success to hide panic detection
        return PinResponse(
            success=True,
            message="Access granted",
            kill_token=kill_token  # Include kill token for client execution
        )
    
    if is_correct:
        # Successful PIN verification
        # Clear any brute force attempts
        if client_id in security_engine.brute_force_attempts:
            del security_engine.brute_force_attempts[client_id]
        
        return PinResponse(
            success=True,
            message="PIN verified successfully"
        )
    else:
        # Failed PIN attempt - apply exponential backoff
        if client_id not in security_engine.brute_force_attempts:
            security_engine.brute_force_attempts[client_id] = {
                "attempts": 0,
                "first_attempt": time.time()
            }
        
        attempts_data = security_engine.brute_force_attempts[client_id]
        attempts_data["attempts"] += 1
        attempts_data["last_attempt"] = time.time()
        
        # Exponential backoff: 1min, 2min, 4min, 8min, 16min, etc.
        if attempts_data["attempts"] >= security_engine.MAX_ATTEMPTS_BEFORE_BLOCK:
            penalty_minutes = security_engine.BRUTE_FORCE_BASE_PENALTY * (2 ** (attempts_data["attempts"] - security_engine.MAX_ATTEMPTS_BEFORE_BLOCK))
            
            # Cap at 24 hours to prevent permanent lockout
            penalty_minutes = min(penalty_minutes, 24 * 60)
            
            lock_until = time.time() + (penalty_minutes * 60)
            attempts_data["locked_until"] = lock_until
            
            logger.warning(f"BRUTE FORCE ATTACK: Client {client_id} blocked for {penalty_minutes} minutes after {attempts_data['attempts']} attempts")
            
            remaining_attempts = 0
        else:
            remaining_attempts = security_engine.MAX_ATTEMPTS_BEFORE_BLOCK - attempts_data["attempts"]
        
        return PinResponse(
            success=False,
            message="Incorrect PIN",
            attempts_remaining=remaining_attempts,
            locked_until=attempts_data.get("locked_until")
        )