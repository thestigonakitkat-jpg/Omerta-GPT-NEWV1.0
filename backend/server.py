import os
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
import uuid
from pathlib import Path
import bleach

from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware 
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, validator

# Import our real-world security engine
from security_engine import security_engine, rate_limit_middleware, brute_force_protection
from pin_security import router as pin_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Input sanitization function
def sanitize_input(text: str, max_length: int = 10000) -> str:
    """Sanitize and validate input text"""
    if not text or not isinstance(text, str):
        raise HTTPException(status_code=400, detail="Invalid input: text must be a non-empty string")
    
    # Length check
    if len(text) > max_length:
        raise HTTPException(status_code=400, detail=f"Input too long: maximum {max_length} characters")
    
    # Enhanced dangerous patterns detection - be more specific to avoid false positives
    dangerous_patterns = [
        '<script', '</script', 'javascript:', 'onload=', 'onerror=', 'eval(', 'document.',
        'drop table', 'delete from', 'insert into', 'update set', 'union select',
        'exec(', 'execute(', 'xp_', 'sp_', '../', '..\\', '/etc/passwd', 'drop table devices'
    ]
    
    # SQL injection specific patterns (more precise)
    sql_patterns = [';--', '; --', '/*', '*/', '; drop table']
    
    text_lower = text.lower()
    
    # Check for dangerous patterns
    for pattern in dangerous_patterns:
        if pattern in text_lower:
            raise HTTPException(status_code=400, detail="Invalid input: potentially dangerous content detected")
    
    # Check for SQL injection patterns (but allow legitimate -- in PGP messages)
    for pattern in sql_patterns:
        if pattern in text_lower:
            # Allow if it's part of a PGP message structure
            if not ('-----begin' in text_lower and '-----end' in text_lower):
                raise HTTPException(status_code=400, detail="Invalid input: potentially dangerous content detected")
    
    # Basic HTML escape for non-encrypted content (if it looks like HTML)
    if '<' in text and '>' in text and not ('-----begin' in text_lower and '-----end' in text_lower):
        text = bleach.clean(text, tags=[], attributes=[], strip=True)
    
    return text.strip()

# Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        
        # Add comprehensive security headers
        security_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY", 
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
            "X-Permitted-Cross-Domain-Policies": "none",
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Resource-Policy": "cross-origin"
        }
        
        for header, value in security_headers.items():
            response.headers[header] = value
            
        return response

# MongoDB connection (used for non-ephemeral tasks). Do NOT store notes/attachments/envelopes here.
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Custom key function to get real client IP behind proxy/ingress
def get_client_ip(request: Request):
    """Get real client IP from headers when behind proxy/ingress"""
    # Try X-Forwarded-For first (most common)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For can contain multiple IPs, take the first one (original client)
        return forwarded_for.split(",")[0].strip()
    
    # Try X-Real-IP (used by some proxies)
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    
    # Fallback to remote address
    return get_remote_address(request)

# Initialize rate limiter with custom key function for proxy/ingress environments
limiter = Limiter(key_func=get_client_ip)

# Create the main app
app = FastAPI(title="OMERTA Secure API", version="2.0.0")

# CRITICAL: Add limiter to app state BEFORE adding middleware
app.state.limiter = limiter

# Add exception handler for rate limiting (use default handler)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security middleware
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])  # Configure for production
app.add_middleware(SecurityHeadersMiddleware)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ---------------------------
# Models
# ---------------------------
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Secure Note (RAM-only, Cryptgeon-style)
MAX_TTL_SECONDS = 7 * 24 * 60 * 60  # up to one week
MIN_READ_LIMIT = 1
MAX_READ_LIMIT = 1  # CRITICAL: Always 1-time read only, link purged after single read

class NoteCreate(BaseModel):
    ciphertext: str  # base64 or opaque string, server does not inspect
    meta: Optional[Dict] = None
    ttl_seconds: int = Field(..., gt=0, le=MAX_TTL_SECONDS)
    read_limit: int = Field(1, ge=MIN_READ_LIMIT, le=MAX_READ_LIMIT)

    @validator('ciphertext')
    def non_empty_cipher(cls, v: str):
        if not v or not isinstance(v, str):
            raise ValueError("ciphertext must be a non-empty string")
        return v

class NoteCreateResponse(BaseModel):
    id: str
    expires_at: datetime
    views_left: int

class NoteReadResponse(BaseModel):
    id: str
    ciphertext: str
    meta: Optional[Dict] = None
    views_left: int
    expires_at: datetime

# Messaging envelopes (RAM-only, delete-on-delivery)
UNDLV_TTL_SECONDS = 48 * 60 * 60

class EnvelopeSend(BaseModel):
    to_oid: str
    from_oid: str
    ciphertext: str  # opaque string, client handles E2EE
    ts: Optional[datetime] = None

class Envelope(BaseModel):
    id: str
    to_oid: str
    from_oid: str
    ciphertext: str
    ts: datetime
    expires_at: datetime

class EnvelopePollResponse(BaseModel):
    messages: List[Dict]

# ---------------------------
# RAM-only stores and housekeeping
# ---------------------------
class RamNote:
    def __init__(self, note_id: str, ciphertext: str, meta: Optional[Dict], read_limit: int, ttl_seconds: int):
        self.id = note_id
        self.ciphertext = ciphertext
        self.meta = meta
        self.read_limit = read_limit
        self.views = 0
        self.expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)

    @property
    def views_left(self) -> int:
        return max(self.read_limit - self.views, 0)

    def expired(self) -> bool:
        return datetime.now(timezone.utc) >= self.expires_at

# In-memory dict: id -> RamNote
NOTES_STORE: Dict[str, RamNote] = {}

# Envelopes by recipient OID
ENVELOPES: Dict[str, List[Envelope]] = {}

# WebSocket subscribers per OID
SUBS: Dict[str, List[WebSocket]] = {}

_cleanup_stop = asyncio.Event()

async def cleanup_notes_loop():
    try:
        while not _cleanup_stop.is_set():
            # Sweep notes
            to_delete = []
            for k, v in list(NOTES_STORE.items()):
                if v.expired() or v.views_left <= 0:
                    to_delete.append(k)
            for k in to_delete:
                NOTES_STORE.pop(k, None)

            # Sweep envelopes by TTL
            now = datetime.now(timezone.utc)
            for oid, lst in list(ENVELOPES.items()):
                new_lst = [e for e in lst if e.expires_at > now]
                ENVELOPES[oid] = new_lst
            await asyncio.sleep(30)
    except Exception as e:
        logger.exception("cleanup_notes_loop error: %s", e)

# ---------------------------
# Routes
# ---------------------------
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Secure Notes endpoints (RAM-only) with REAL-WORLD security
@api_router.post("/notes", response_model=NoteCreateResponse)
async def create_note(request: Request, payload: NoteCreate):
    # REAL-WORLD rate limiting that works behind proxies
    await rate_limit_middleware(request, "notes_create")
    
    # Sanitize input
    sanitized_ciphertext = sanitize_input(payload.ciphertext, max_length=50000)  # Allow larger encrypted content
    
    # CRITICAL: Enforce 1-time read only policy
    if payload.read_limit != 1:
        raise HTTPException(status_code=400, detail="Read limit must be 1 (one-time read only)")
    
    note_id = str(uuid.uuid4())
    note = RamNote(
        note_id=note_id,
        ciphertext=sanitized_ciphertext,
        meta=payload.meta,
        read_limit=1,  # CRITICAL: Always 1-time read only, link purged after single read
        ttl_seconds=payload.ttl_seconds,
    )
    NOTES_STORE[note_id] = note
    logger.info(f"Created 1-TIME READ secure note {note_id}, expires at {note.expires_at}, PURGES AFTER SINGLE READ")
    return NoteCreateResponse(id=note_id, expires_at=note.expires_at, views_left=1)

@api_router.get("/notes/{note_id}")
async def read_note(request: Request, note_id: str):
    # REAL-WORLD rate limiting that works behind proxies  
    await rate_limit_middleware(request, "notes_read")
    
    if note_id not in NOTES_STORE:
        raise HTTPException(status_code=404, detail="not_found_or_expired")
    
    note = NOTES_STORE[note_id]
    
    # Check expiry
    now_utc = datetime.now(timezone.utc)
    if now_utc > note.expires_at:
        del NOTES_STORE[note_id]
        raise HTTPException(status_code=410, detail="expired")
    
    # Consume view
    note.views += 1
    
    if note.views_left <= 0:
        ciphertext = note.ciphertext
        del NOTES_STORE[note_id]
        return {"ciphertext": ciphertext, "views_left": 0}
    
    return {"ciphertext": note.ciphertext, "views_left": note.views_left}

# Messaging envelopes (RAM-only delete-on-delivery) with REAL-WORLD security
@api_router.post("/envelopes/send")
async def send_envelope(request: Request, payload: EnvelopeSend):
    # REAL-WORLD rate limiting that works behind proxies
    await rate_limit_middleware(request, "envelopes_send")
    # Sanitize inputs
    sanitized_to_oid = sanitize_input(payload.to_oid, max_length=100)
    sanitized_from_oid = sanitize_input(payload.from_oid, max_length=100)
    sanitized_ciphertext = sanitize_input(payload.ciphertext, max_length=50000)  # Allow larger encrypted content
    
    env = Envelope(
        id=str(uuid.uuid4()),
        to_oid=sanitized_to_oid,
        from_oid=sanitized_from_oid,
        ciphertext=sanitized_ciphertext,
        ts=payload.ts or datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=UNDLV_TTL_SECONDS),
    )
    # If there are active subscribers, push immediately and do not queue
    subs = SUBS.get(env.to_oid, [])
    delivered = False
    if subs:
        # build frame
        frame = {
            "id": env.id,
            "from_oid": env.from_oid,
            "ciphertext": env.ciphertext,
            "ts": env.ts.isoformat(),
        }
        stale = []
        for ws in subs:
            try:
                await ws.send_json({"messages": [frame]})
                delivered = True
            except Exception:
                stale.append(ws)
        # cleanup stale
        for ws in stale:
            try:
                subs.remove(ws)
            except ValueError:
                pass
        SUBS[env.to_oid] = subs
    if not delivered:
        ENVELOPES.setdefault(env.to_oid, []).append(env)
    return {"id": env.id}

@api_router.get("/envelopes/poll", response_model=EnvelopePollResponse)
async def poll_envelopes(request: Request, oid: str, max: int = 50):
    # REAL-WORLD rate limiting that works behind proxies
    await rate_limit_middleware(request, "envelopes_poll")
    lst = ENVELOPES.get(oid, [])
    if not lst:
        return {"messages": []}
    # deliver up to max and delete them (delete-on-delivery)
    deliver = lst[:max]
    ENVELOPES[oid] = lst[max:]
    return {"messages": [
        {
            "id": e.id,
            "from_oid": e.from_oid,
            "ciphertext": e.ciphertext,
            "ts": e.ts.isoformat(),
        } for e in deliver
    ]}

# STEELOS-SHREDDER Endpoint
class ShredderRequest(BaseModel):
    device_id: str
    trigger_type: str  # "panic_pin", "emergency_nuke", "anti_forensics", "manual"
    confirmation_token: Optional[str] = None
    
class ShredderResponse(BaseModel):
    shredder_activated: bool
    kill_token_generated: bool
    destruction_initiated: bool
    message: str

@api_router.post("/steelos-shredder/deploy", response_model=ShredderResponse)
async def deploy_steelos_shredder(request: Request, payload: ShredderRequest):
    """
    💊 DEPLOY CYANIDE TABLET - STEELOS-SHREDDER Data Destruction
    Generates signed kill token and initiates complete data obliteration
    """
    try:
        # REAL-WORLD rate limiting that works behind proxies
        await rate_limit_middleware(request, "shredder_deploy")
        
        # Sanitize inputs
        device_id = sanitize_input(payload.device_id, max_length=100)
        trigger_type = sanitize_input(payload.trigger_type, max_length=50)
        
        logger.critical(f"💊🧬 STEELOS-SHREDDER DEPLOYMENT: Device {device_id}, Trigger: {trigger_type}")
        
        # Generate signed kill token for STEELOS-SHREDDER
        import hmac
        import hashlib
        import time
        
        timestamp = int(time.time())
        kill_token_data = f"STEELOS_SHREDDER:{device_id}:{timestamp}:{trigger_type}:CYANIDE_TABLET_DEPLOYED"
        
        # Generate cryptographic signature
        signature = hmac.new(
            b"STEELOS_SHREDDER_KILL_TOKEN_SECRET_2025_NSA_GRADE",
            kill_token_data.encode(),
            hashlib.sha256
        ).hexdigest()
        
        kill_token = {
            "command": "STEELOS_SHREDDER_KILL_TOKEN",
            "device_id": device_id,
            "wipe_type": "steelos_shredder_obliteration",
            "timestamp": timestamp,
            "trigger_type": trigger_type,
            "reason": f"STEELOS-SHREDDER triggered by {trigger_type}",
            "signature": signature,
            "token_data": kill_token_data,
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
        
        # Store kill token for device retrieval
        if device_id not in security_engine.user_sessions:
            security_engine.user_sessions[device_id] = {}
            
        security_engine.user_sessions[device_id]["steelos_shredder_token"] = kill_token
        
        logger.critical(f"💀 CYANIDE TABLET DEPLOYED: Device {device_id} - STEELOS-SHREDDER KILL TOKEN GENERATED")
        logger.critical(f"🧬 DNA DESTRUCTION Signature: {signature}")
        
        return ShredderResponse(
            shredder_activated=True,
            kill_token_generated=True,
            destruction_initiated=True,
            message="CYANIDE TABLET DEPLOYED - STEELOS-SHREDDER ACTIVATED"
        )
        
    except Exception as e:
        logger.error(f"STEELOS-SHREDDER deployment failed: {e}")
        return ShredderResponse(
            shredder_activated=False,
            kill_token_generated=False,
            destruction_initiated=False,
            message="STEELOS-SHREDDER deployment failed"
        )

@api_router.get("/steelos-shredder/status/{device_id}")
async def get_shredder_status(request: Request, device_id: str):
    """Check if STEELOS-SHREDDER kill token is waiting for device"""
    try:
        # REAL-WORLD rate limiting that works behind proxies
        await rate_limit_middleware(request, "shredder_status")
        
        device_id = sanitize_input(device_id, max_length=100)
        
        if device_id in security_engine.user_sessions:
            session = security_engine.user_sessions[device_id]
            
            # Check for STEELOS-SHREDDER kill token
            if "steelos_shredder_token" in session:
                kill_token = session["steelos_shredder_token"]
                
                logger.critical(f"💊 STEELOS-SHREDDER TOKEN RETRIEVED: Device {device_id}")
                
                # Remove token after retrieval (one-time use)
                del session["steelos_shredder_token"]
                
                return {
                    "shredder_pending": True,
                    "kill_token": kill_token,
                    "cyanide_deployed": True
                }
        
        return {
            "shredder_pending": False,
            "kill_token": None,
            "cyanide_deployed": False
        }
        
    except Exception as e:
        logger.error(f"STEELOS-SHREDDER status check failed: {e}")
        return {
            "shredder_pending": False,
            "kill_token": None,
            "cyanide_deployed": False,
            "error": str(e)
        }

# WebSocket for real-time delivery
@app.websocket("/api/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    # Expect a query param oid
    oid = ws.query_params.get("oid")
    if not oid:
        await ws.close(code=1008)
        return
    SUBS.setdefault(oid, []).append(ws)
    try:
        # On connect: flush any queued envelopes for this oid (deliver and delete)
        pending = ENVELOPES.get(oid, [])
        if pending:
            frames = [
                {
                    "id": e.id,
                    "from_oid": e.from_oid,
                    "ciphertext": e.ciphertext,
                    "ts": e.ts.isoformat(),
                } for e in pending
            ]
            ENVELOPES[oid] = []
            await ws.send_json({"messages": frames})
        # Keepalive loop
        while True:
            try:
                # wait for ping/pong or small sleep
                await asyncio.sleep(5)
                await ws.send_json({"type": "ping", "t": datetime.now(timezone.utc).isoformat()})
            except (RuntimeError, ConnectionResetError):
                # Normal connection closure scenarios
                break
            except Exception as e:
                # Handle WebSocket connection errors
                from websockets.exceptions import ConnectionClosedOK, ConnectionClosedError
                if isinstance(e, (ConnectionClosedOK, ConnectionClosedError)):
                    # Normal WebSocket closure - don't log as error
                    break
                else:
                    # Actual error - log it
                    logger.exception("WebSocket error")
                    break
    except WebSocketDisconnect:
        # Normal FastAPI WebSocket disconnect
        pass
    except Exception as e:
        # Handle other exceptions, but don't log normal closures
        from websockets.exceptions import ConnectionClosedOK, ConnectionClosedError
        if not isinstance(e, (ConnectionClosedOK, ConnectionClosedError)):
            logger.exception("WebSocket error")
    finally:
        # Remove from subs
        try:
            arr = SUBS.get(oid, [])
            if ws in arr:
                arr.remove(ws)
                SUBS[oid] = arr
        except Exception:
            pass
        try:
            await ws.close()
        except Exception:
            pass

# Include the router in the main app
app.include_router(api_router)

# Include the PIN security router with /api prefix
app.include_router(pin_router, prefix="/api")

# Import and include new feature routers
from contacts_vault import store_contacts_backup, retrieve_contacts_backup, clear_contacts_vault
from auto_wipe import configure_auto_wipe, update_activity, check_auto_wipe_status, get_wipe_token

# Add contacts vault endpoints
@api_router.post("/contacts-vault/store")
async def store_contacts(request: Request, payload: dict):
    """Store contacts backup in vault"""
    from contacts_vault import ContactsVaultRequest, store_contacts_backup
    validated_payload = ContactsVaultRequest(**payload)
    return await store_contacts_backup(request, validated_payload)

@api_router.get("/contacts-vault/retrieve/{device_id}")
async def retrieve_contacts(request: Request, device_id: str, encryption_key_hash: str):
    """Retrieve contacts backup from vault"""
    return await retrieve_contacts_backup(request, device_id, encryption_key_hash)

@api_router.delete("/contacts-vault/clear/{device_id}")
async def clear_contacts(request: Request, device_id: str):
    """Clear contacts vault for device"""
    return await clear_contacts_vault(request, device_id)

# Add auto-wipe endpoints
@api_router.post("/auto-wipe/configure")
async def configure_autowipe(request: Request, payload: dict):
    """Configure auto-wipe settings"""
    from auto_wipe import AutoWipeConfig, configure_auto_wipe
    validated_payload = AutoWipeConfig(**payload)
    return await configure_auto_wipe(request, validated_payload)

@api_router.post("/auto-wipe/activity")
async def update_device_activity(request: Request, payload: dict):
    """Update device activity timestamp"""
    from auto_wipe import ActivityUpdate, update_activity
    validated_payload = ActivityUpdate(**payload)
    return await update_activity(request, validated_payload)

@api_router.get("/auto-wipe/status/{device_id}")
async def get_autowipe_status(request: Request, device_id: str):
    """Check auto-wipe status for device"""
    return await check_auto_wipe_status(request, device_id)

@api_router.get("/auto-wipe/token/{device_id}")
async def get_autowipe_token(request: Request, device_id: str):
    """Get pending auto-wipe token for device"""
    return await get_wipe_token(request, device_id)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"]
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def on_startup():
    # Start background cleanup for RAM-only stores
    asyncio.create_task(cleanup_notes_loop())

@app.on_event("shutdown")
async def on_shutdown():
    _cleanup_stop.set()
    client.close()