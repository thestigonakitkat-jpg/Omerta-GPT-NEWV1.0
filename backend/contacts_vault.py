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
class ContactEntry(BaseModel):
    oid: str = Field(..., min_length=1, max_length=200)
    display_name: str = Field("", max_length=100)
    verified: bool = Field(default=False)
    added_timestamp: int = Field(default_factory=lambda: int(time.time()))
    verification_timestamp: Optional[int] = None
    cryptographic_dna: Optional[str] = Field(None, max_length=100)  # DNA signature
    dna_confidence: Optional[int] = Field(None, ge=0, le=100)       # DNA confidence score

class ContactsBackup(BaseModel):
    contacts: List[ContactEntry]
    backup_timestamp: int = Field(default_factory=lambda: int(time.time()))
    device_id: str = Field(..., min_length=1, max_length=100)

class ContactsVaultRequest(BaseModel):
    device_id: str = Field(..., min_length=1, max_length=100)
    contacts: List[ContactEntry]
    encryption_key_hash: str = Field(..., min_length=32, max_length=128)

class ContactsRestoreRequest(BaseModel):
    device_id: str = Field(..., min_length=1, max_length=100)
    encryption_key_hash: str = Field(..., min_length=32, max_length=128)

class ContactsVaultResponse(BaseModel):
    success: bool
    message: str
    backup_id: Optional[str] = None
    contacts_count: Optional[int] = None

def sanitize_contact_input(text: str, max_length: int = 200) -> str:
    """Sanitize contact input data"""
    if not text or not isinstance(text, str):
        raise HTTPException(status_code=400, detail="Invalid input: text must be a non-empty string")
    
    if len(text) > max_length:
        raise HTTPException(status_code=400, detail=f"Input too long: maximum {max_length} characters")
    
    # Check for dangerous patterns in contact data
    dangerous_patterns = ['<script', 'javascript:', 'eval(', '../', '/etc/passwd', 'drop table']
    text_lower = text.lower()
    
    for pattern in dangerous_patterns:
        if pattern in text_lower:
            raise HTTPException(status_code=400, detail="Potentially dangerous content detected")
    
    return text.strip()

def generate_backup_signature(device_id: str, timestamp: int, contacts_count: int) -> str:
    """Generate cryptographic signature for contact backup"""
    data = f"CONTACTS_VAULT:{device_id}:{timestamp}:{contacts_count}"
    signature = hmac.new(
        b"OMERTA_CONTACTS_VAULT_SECRET_2025_GRADE",
        data.encode(),
        hashlib.sha256
    ).hexdigest()
    return signature

def validate_contact_dna(contact: dict) -> dict:
    """🧬 CRYPTOGRAPHIC DNA VALIDATION for contacts"""
    try:
        validation_result = {
            "is_valid": True,
            "confidence": 100,
            "threats_detected": [],
            "dna_status": "valid"
        }
        
        # Enhanced malicious pattern detection for contacts
        malicious_patterns = [
            # Script injection
            r'<script[\s\S]*?</script>',
            r'javascript:',
            r'data:text/html',
            r'vbscript:',
            r'on\w+\s*=',
            # SQL injection
            r'(union\s+select|drop\s+table|insert\s+into|delete\s+from)',
            r'(exec\s*\(|execute\s*\(|xp_cmdshell|sp_executesql)',
            # Command injection
            r'(\.\./){2,}',
            r'/(etc/passwd|proc/self|dev/tcp)',
            r'(nc\s+-l|bash\s+-i|sh\s+-i|cmd\.exe|powershell)',
            # Encoding attacks
            r'%[0-9a-f]{2}',
            r'\\x[0-9a-f]{2}',
            r'\\u[0-9a-f]{4}',
            r'(base64|btoa\(|atob\(|fromCharCode)',
            # Advanced threats
            r'(eval\s*\(|Function\s*\(|setTimeout\s*\()',
            r'(document\.|window\.|location\.)',
            r'(innerHTML|outerHTML|insertAdjacentHTML)',
            r'(<iframe|<object|<embed|<applet|<meta)'
        ]
        
        contact_string = str(contact).lower()
        
        for pattern in malicious_patterns:
            import re
            if re.search(pattern, contact_string, re.IGNORECASE):
                validation_result["threats_detected"].append(pattern)
                validation_result["confidence"] -= 15
        
        # DNA signature validation
        if "cryptographic_dna" in contact:
            dna_sig = contact["cryptographic_dna"]
            if not dna_sig or not dna_sig.startswith("DNA_"):
                validation_result["confidence"] -= 20
                validation_result["dna_status"] = "invalid_format"
            elif len(dna_sig) < 36:  # DNA_ + 32 char hash
                validation_result["confidence"] -= 15
                validation_result["dna_status"] = "weak_dna"
        else:
            validation_result["confidence"] -= 10
            validation_result["dna_status"] = "missing_dna"
        
        # Size validation
        oid_len = len(contact.get("oid", ""))
        name_len = len(contact.get("display_name", ""))
        
        if oid_len > 200:
            validation_result["confidence"] -= 20
            validation_result["threats_detected"].append("oversized_oid")
        
        if name_len > 100:
            validation_result["confidence"] -= 15
            validation_result["threats_detected"].append("oversized_name")
        
        # Final validation
        validation_result["confidence"] = max(0, validation_result["confidence"])
        validation_result["is_valid"] = (
            validation_result["confidence"] >= 70 and 
            len(validation_result["threats_detected"]) == 0
        )
        
        return validation_result
        
    except Exception as e:
        logger.error(f"DNA validation error: {e}")
        return {
            "is_valid": False,
            "confidence": 0,
            "threats_detected": ["validation_error"],
            "dna_status": "error"
        }

async def store_contacts_backup(request: Request, payload: ContactsVaultRequest):
    """Store encrypted contacts backup in vault system"""
    try:
        # Rate limiting for contacts vault operations
        await rate_limit_middleware(request, "contacts_vault")
        
        # Sanitize inputs
        device_id = sanitize_contact_input(payload.device_id, max_length=100)
        
        # Validate contacts data
        sanitized_contacts = []
        for contact in payload.contacts:
            sanitized_contact = ContactEntry(
                oid=sanitize_contact_input(contact.oid, max_length=200),
                display_name=sanitize_contact_input(contact.display_name or "", max_length=100),
                verified=contact.verified,
                added_timestamp=contact.added_timestamp,
                verification_timestamp=contact.verification_timestamp
            )
            sanitized_contacts.append(sanitized_contact)
        
        # Create backup entry
        backup_timestamp = int(time.time())
        backup_id = f"contacts_backup_{device_id}_{backup_timestamp}"
        
        backup_data = ContactsBackup(
            contacts=sanitized_contacts,
            backup_timestamp=backup_timestamp,
            device_id=device_id
        )
        
        # Generate signature for integrity
        signature = generate_backup_signature(device_id, backup_timestamp, len(sanitized_contacts))
        
        # Store in security engine sessions (RAM-only storage)
        if device_id not in security_engine.user_sessions:
            security_engine.user_sessions[device_id] = {}
        
        # Store contacts backup with encryption key hash for verification
        security_engine.user_sessions[device_id]["contacts_vault"] = {
            "backup_id": backup_id,
            "backup_data": backup_data.dict(),
            "signature": signature,
            "encryption_key_hash": payload.encryption_key_hash,
            "stored_timestamp": backup_timestamp,
            "quarantine_passed": True,  # Basic quarantine check passed
            "backup_count": len(sanitized_contacts)
        }
        
        logger.info(f"📇 CONTACTS VAULT: Stored {len(sanitized_contacts)} contacts for device {device_id}")
        
        return ContactsVaultResponse(
            success=True,
            message=f"Contacts backup stored successfully in vault",
            backup_id=backup_id,
            contacts_count=len(sanitized_contacts)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Contacts vault storage failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to store contacts backup")

async def retrieve_contacts_backup(request: Request, device_id: str, encryption_key_hash: str):
    """Retrieve encrypted contacts backup from vault"""
    try:
        # Rate limiting for contacts vault operations
        await rate_limit_middleware(request, "contacts_vault")
        
        device_id = sanitize_contact_input(device_id, max_length=100)
        
        if device_id not in security_engine.user_sessions:
            raise HTTPException(status_code=404, detail="No contacts backup found for device")
        
        session = security_engine.user_sessions[device_id]
        
        if "contacts_vault" not in session:
            raise HTTPException(status_code=404, detail="No contacts vault data found")
        
        vault_data = session["contacts_vault"]
        
        # Verify encryption key hash matches
        if vault_data["encryption_key_hash"] != encryption_key_hash:
            logger.warning(f"🚨 CONTACTS VAULT: Invalid encryption key for device {device_id}")
            raise HTTPException(status_code=403, detail="Invalid encryption key for contacts vault")
        
        # Verify backup integrity
        backup_data = vault_data["backup_data"]
        stored_signature = vault_data["signature"]
        
        verification_signature = generate_backup_signature(
            backup_data["device_id"], 
            backup_data["backup_timestamp"], 
            len(backup_data["contacts"])
        )
        
        if stored_signature != verification_signature:
            logger.error(f"🚨 CONTACTS VAULT: Signature verification failed for device {device_id}")
            raise HTTPException(status_code=400, detail="Contacts backup integrity verification failed")
        
        # Run quarantine check on contacts before returning
        quarantined_contacts = []
        safe_contacts = []
        
        for contact in backup_data["contacts"]:
            try:
                # Basic quarantine: check for suspicious patterns
                oid_clean = sanitize_contact_input(contact["oid"], max_length=200)
                name_clean = sanitize_contact_input(contact.get("display_name", ""), max_length=100)
                
                safe_contacts.append({
                    "oid": oid_clean,
                    "display_name": name_clean,
                    "verified": contact.get("verified", False),
                    "added_timestamp": contact.get("added_timestamp", int(time.time())),
                    "verification_timestamp": contact.get("verification_timestamp")
                })
                
            except HTTPException:
                # Quarantine suspicious contact
                quarantined_contacts.append(contact)
                logger.warning(f"🛡️ QUARANTINED: Suspicious contact detected in backup")
        
        logger.info(f"📇 CONTACTS VAULT: Retrieved {len(safe_contacts)} contacts, quarantined {len(quarantined_contacts)}")
        
        return {
            "success": True,
            "backup_id": vault_data["backup_id"],
            "contacts": safe_contacts,
            "quarantined_count": len(quarantined_contacts),
            "backup_timestamp": backup_data["backup_timestamp"],
            "total_retrieved": len(safe_contacts),
            "signature_verified": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Contacts vault retrieval failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve contacts backup")

async def clear_contacts_vault(request: Request, device_id: str):
    """Clear contacts vault for device"""
    try:
        await rate_limit_middleware(request, "contacts_vault")
        
        device_id = sanitize_contact_input(device_id, max_length=100)
        
        if device_id in security_engine.user_sessions:
            session = security_engine.user_sessions[device_id]
            if "contacts_vault" in session:
                del session["contacts_vault"]
                logger.info(f"📇 CONTACTS VAULT: Cleared vault for device {device_id}")
        
        return {"success": True, "message": "Contacts vault cleared"}
        
    except Exception as e:
        logger.error(f"Clear contacts vault failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear contacts vault")