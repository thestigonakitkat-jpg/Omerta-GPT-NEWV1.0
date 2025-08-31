from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timedelta, timezone
import asyncio


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection (used for non-ephemeral tasks). Do NOT store notes/attachments/envelopes here.
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

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
MAX_READ_LIMIT = 3

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

# Secure Notes endpoints (RAM-only)
@api_router.post("/notes", response_model=NoteCreateResponse)
async def create_note(payload: NoteCreate):
    note_id = str(uuid.uuid4())
    note = RamNote(
        note_id=note_id,
        ciphertext=payload.ciphertext,
        meta=payload.meta,
        read_limit=payload.read_limit,
        ttl_seconds=payload.ttl_seconds,
    )
    NOTES_STORE[note_id] = note
    return NoteCreateResponse(id=note_id, expires_at=note.expires_at, views_left=note.views_left)

@api_router.get("/notes/{note_id}", response_model=NoteReadResponse)
async def read_note(note_id: str):
    note = NOTES_STORE.get(note_id)
    if not note:
        raise HTTPException(status_code=404, detail="not_found_or_expired")
    if note.expired():
        NOTES_STORE.pop(note_id, None)
        raise HTTPException(status_code=410, detail="expired")
    if note.views_left <= 0:
        NOTES_STORE.pop(note_id, None)
        raise HTTPException(status_code=410, detail="view_limit_reached")

    # Serve and decrement views
    note.views += 1
    resp = NoteReadResponse(
        id=note.id,
        ciphertext=note.ciphertext,
        meta=note.meta,
        views_left=note.views_left,
        expires_at=note.expires_at,
    )

    # If after increment views_left == 0, purge immediately (mirror cryptgeon semantics)
    if note.views_left <= 0:
        NOTES_STORE.pop(note_id, None)

    return resp

# Messaging envelopes (RAM-only delete-on-delivery)
@api_router.post("/envelopes/send")
async def send_envelope(payload: EnvelopeSend):
    env = Envelope(
        id=str(uuid.uuid4()),
        to_oid=payload.to_oid,
        from_oid=payload.from_oid,
        ciphertext=payload.ciphertext,
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
async def poll_envelopes(oid: str, max: int = 50):
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
            except RuntimeError:
                break
    except WebSocketDisconnect:
        pass
    except Exception:
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

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def on_startup():
    # Start background cleanup for RAM-only stores
    asyncio.create_task(cleanup_notes_loop())

@app.on_event("shutdown")
async def on_shutdown():
    _cleanup_stop.set()
    client.close()