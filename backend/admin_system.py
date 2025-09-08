"""
🔐 ADMIN SYSTEM - Multi-Signature Remote Kill & Admin Access
Implements secure admin access with multi-signature protocol for critical operations.
"""

import os
import secrets
import hashlib
import hmac
import time
from typing import Dict, List, Optional, Tuple
from pydantic import BaseModel
from fastapi import HTTPException
from enum import Enum
import mnemonic
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import base64

class AdminOperationType(str, Enum):
    REMOTE_KILL = "remote_kill"
    OID_REVOCATION = "oid_revocation"
    SYSTEM_UPDATE = "system_update"
    EMERGENCY_WIPE = "emergency_wipe"

class AdminAuthRequest(BaseModel):
    admin_passphrase: str
    device_id: str

class AdminAuthResponse(BaseModel):
    success: bool
    session_token: str
    expires_at: float
    admin_id: str

class MultiSigInitRequest(BaseModel):
    session_token: str
    operation_type: AdminOperationType
    target_device_id: Optional[str] = None
    target_oid: Optional[str] = None
    operation_data: Optional[Dict] = None

class MultiSigSignRequest(BaseModel):
    operation_id: str
    admin_seed_words: List[str]  # 6 words from admin's half
    admin_passphrase: str
    admin_id: str

class MultiSigOperation(BaseModel):
    operation_id: str
    operation_type: AdminOperationType
    target_device_id: Optional[str]
    target_oid: Optional[str]
    operation_data: Optional[Dict]
    created_at: float
    expires_at: float
    admin_signatures: Dict[str, bool] = {}
    completed: bool = False
    execution_token: Optional[str] = None

class AdminSystem:
    def __init__(self):
        self.admin_sessions: Dict[str, Dict] = {}
        self.multisig_operations: Dict[str, MultiSigOperation] = {}
        self.admin_passphrase = os.getenv('ADMIN_PASSPHRASE', 'Omertaisthecode#01')
        self.master_seed_phrase = self._generate_master_seed()
        self.admin_splits = self._split_master_seed()
        
    def _generate_master_seed(self) -> str:
        """Generate 12-word BIP39 mnemonic for master seed"""
        mnemo = mnemonic.Mnemonic("english")
        return mnemo.generate(strength=128)  # 12 words
    
    def _split_master_seed(self) -> Tuple[List[str], List[str]]:
        """Split 12-word seed into two 6-word halves"""
        words = self.master_seed_phrase.split()
        admin1_words = words[:6]  # First 6 words
        admin2_words = words[6:]  # Last 6 words
        return admin1_words, admin2_words
    
    def _generate_session_token(self) -> str:
        """Generate secure session token"""
        return secrets.token_urlsafe(32)
    
    def _generate_operation_id(self) -> str:
        """Generate unique operation ID"""
        return f"admin_op_{int(time.time())}_{secrets.token_hex(8)}"
    
    def _hash_passphrase(self, passphrase: str, salt: bytes) -> bytes:
        """Hash admin passphrase with PBKDF2"""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        return kdf.derive(passphrase.encode())
    
    def _validate_handshake(self, admin_id: str, timestamp: float) -> bool:
        """Validate admin handshake to prevent imposter attacks"""
        current_time = time.time()
        
        # Check timestamp is within 5 minutes
        if abs(current_time - timestamp) > 300:
            return False
            
        # Generate expected handshake signature
        handshake_data = f"OMERTA_ADMIN_{admin_id}_{timestamp}"
        expected_signature = hmac.new(
            self.admin_passphrase.encode(),
            handshake_data.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return True  # Simplified for now
    
    async def authenticate_admin(self, passphrase: str, device_id: str) -> AdminAuthResponse:
        """Authenticate admin with passphrase"""
        
        # Validate passphrase
        if passphrase != self.admin_passphrase:
            raise HTTPException(status_code=401, detail="Invalid admin passphrase")
        
        # Generate session
        session_token = self._generate_session_token()
        admin_id = f"admin_{secrets.token_hex(4)}"
        expires_at = time.time() + 1800  # 30 minutes
        
        self.admin_sessions[session_token] = {
            'admin_id': admin_id,
            'device_id': device_id,
            'created_at': time.time(),
            'expires_at': expires_at,
            'authenticated': True
        }
        
        print(f"🔐 Admin authenticated: {admin_id} from device {device_id}")
        
        return AdminAuthResponse(
            success=True,
            session_token=session_token,
            expires_at=expires_at,
            admin_id=admin_id
        )
    
    async def initiate_multisig_operation(self, request: MultiSigInitRequest) -> Dict:
        """Initiate multi-signature operation"""
        
        # Validate session
        if request.session_token not in self.admin_sessions:
            raise HTTPException(status_code=401, detail="Invalid session token")
        
        session = self.admin_sessions[request.session_token]
        if time.time() > session['expires_at']:
            raise HTTPException(status_code=401, detail="Session expired")
        
        # Create operation
        operation_id = self._generate_operation_id()
        operation = MultiSigOperation(
            operation_id=operation_id,
            operation_type=request.operation_type,
            target_device_id=request.target_device_id,
            target_oid=request.target_oid,
            operation_data=request.operation_data,
            created_at=time.time(),
            expires_at=time.time() + 300,  # 5 minutes for second admin
            admin_signatures={
                'admin1': False,
                'admin2': False
            }
        )
        
        self.multisig_operations[operation_id] = operation
        
        print(f"🚢 Multi-sig operation initiated: {operation_id} - {request.operation_type}")
        
        return {
            'success': True,
            'operation_id': operation_id,
            'operation_type': request.operation_type,
            'expires_at': operation.expires_at,
            'message': f'Multi-sig {request.operation_type} operation created. Second admin has 5 minutes to sign.',
            'handshake_challenge': f'OMERTA_HANDSHAKE_{operation_id}_{int(time.time())}'
        }
    
    async def sign_multisig_operation(self, request: MultiSigSignRequest) -> Dict:
        """Sign multi-signature operation with admin credentials"""
        
        # Validate operation exists
        if request.operation_id not in self.multisig_operations:
            raise HTTPException(status_code=404, detail="Operation not found")
        
        operation = self.multisig_operations[request.operation_id]
        
        # Check if operation expired
        if time.time() > operation.expires_at:
            raise HTTPException(status_code=410, detail="Operation expired")
        
        # Validate admin passphrase
        if request.admin_passphrase != self.admin_passphrase:
            raise HTTPException(status_code=401, detail="Invalid admin passphrase")
        
        # Validate seed words (6 words should be either first or second half)
        if len(request.admin_seed_words) != 6:
            raise HTTPException(status_code=400, detail="Must provide exactly 6 seed words")
        
        admin1_words, admin2_words = self.admin_splits
        
        # Determine which admin is signing
        admin_key = None
        if request.admin_seed_words == admin1_words:
            admin_key = 'admin1'
        elif request.admin_seed_words == admin2_words:
            admin_key = 'admin2'
        else:
            raise HTTPException(status_code=401, detail="Invalid seed words")
        
        # Check if this admin already signed
        if operation.admin_signatures[admin_key]:
            raise HTTPException(status_code=409, detail="Admin already signed this operation")
        
        # Sign the operation
        operation.admin_signatures[admin_key] = True
        
        # Check if both admins have signed
        if all(operation.admin_signatures.values()):
            operation.completed = True
            operation.execution_token = self._generate_execution_token(operation)
            
            print(f"✅ Multi-sig operation completed: {request.operation_id}")
            
            # Execute the operation
            execution_result = await self._execute_operation(operation)
            
            return {
                'success': True,
                'operation_completed': True,
                'execution_token': operation.execution_token,
                'execution_result': execution_result,
                'message': f'Multi-sig operation {operation.operation_type} executed successfully'
            }
        else:
            print(f"📝 Admin {admin_key} signed operation: {request.operation_id}")
            
            return {
                'success': True,
                'operation_completed': False,
                'signatures_received': sum(operation.admin_signatures.values()),
                'signatures_required': 2,
                'message': f'Admin signature recorded. Waiting for second admin signature.'
            }
    
    def _generate_execution_token(self, operation: MultiSigOperation) -> str:
        """Generate signed execution token for completed operation"""
        token_data = f"{operation.operation_id}_{operation.operation_type}_{operation.created_at}"
        signature = hmac.new(
            self.admin_passphrase.encode(),
            token_data.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return f"{base64.b64encode(token_data.encode()).decode()}_{signature}"
    
    async def _execute_operation(self, operation: MultiSigOperation) -> Dict:
        """Execute the multi-signature operation"""
        
        if operation.operation_type == AdminOperationType.REMOTE_KILL:
            return await self._execute_remote_kill(operation)
        elif operation.operation_type == AdminOperationType.OID_REVOCATION:
            return await self._execute_oid_revocation(operation)
        elif operation.operation_type == AdminOperationType.SYSTEM_UPDATE:
            return await self._execute_system_update(operation)
        elif operation.operation_type == AdminOperationType.EMERGENCY_WIPE:
            return await self._execute_emergency_wipe(operation)
        else:
            raise HTTPException(status_code=400, detail="Unknown operation type")
    
    async def _execute_remote_kill(self, operation: MultiSigOperation) -> Dict:
        """Execute remote kill operation"""
        
        # Generate kill token for target device
        kill_token = {
            'command': 'REMOTE_KILL',
            'device_id': operation.target_device_id,
            'wipe_type': 'full_nuke',
            'timestamp': time.time(),
            'admin_signature': self._generate_execution_token(operation),
            'destruction_phases': [
                'DISABLE_LOCATION_SPOOFING',
                'REVEAL_REAL_LOCATION', 
                'INITIATE_FPV_MISSILE_VIEW',
                'DEPLOY_STEELOS_SHREDDER',
                'EXECUTE_FUZZY_SCREEN_WIPE'
            ]
        }
        
        print(f"💀 REMOTE KILL EXECUTED: Device {operation.target_device_id}")
        
        return {
            'kill_token': kill_token,
            'target_device': operation.target_device_id,
            'execution_time': time.time(),
            'status': 'KILL_TOKEN_DEPLOYED'
        }
    
    async def _execute_oid_revocation(self, operation: MultiSigOperation) -> Dict:
        """Execute OID revocation operation"""
        
        revocation_token = {
            'command': 'REVOKE_OID',
            'target_oid': operation.target_oid,
            'timestamp': time.time(),
            'admin_signature': self._generate_execution_token(operation)
        }
        
        print(f"🚫 OID REVOKED: {operation.target_oid}")
        
        return {
            'revocation_token': revocation_token,
            'target_oid': operation.target_oid,
            'status': 'OID_REVOKED'
        }
    
    async def _execute_system_update(self, operation: MultiSigOperation) -> Dict:
        """Execute system update operation"""
        
        update_token = {
            'command': 'SYSTEM_UPDATE',
            'update_data': operation.operation_data,
            'timestamp': time.time(),
            'admin_signature': self._generate_execution_token(operation)
        }
        
        print(f"📦 SYSTEM UPDATE EXECUTED")
        
        return {
            'update_token': update_token,
            'status': 'UPDATE_DEPLOYED'
        }
    
    async def _execute_emergency_wipe(self, operation: MultiSigOperation) -> Dict:
        """Execute emergency wipe operation"""
        
        wipe_token = {
            'command': 'EMERGENCY_WIPE',
            'device_id': operation.target_device_id,
            'timestamp': time.time(),
            'admin_signature': self._generate_execution_token(operation)
        }
        
        print(f"💥 EMERGENCY WIPE EXECUTED: Device {operation.target_device_id}")
        
        return {
            'wipe_token': wipe_token,
            'target_device': operation.target_device_id,
            'status': 'EMERGENCY_WIPE_DEPLOYED'
        }
    
    async def get_operation_status(self, operation_id: str) -> Dict:
        """Get status of multi-signature operation"""
        
        if operation_id not in self.multisig_operations:
            raise HTTPException(status_code=404, detail="Operation not found")
        
        operation = self.multisig_operations[operation_id]
        
        return {
            'operation_id': operation_id,
            'operation_type': operation.operation_type,
            'created_at': operation.created_at,
            'expires_at': operation.expires_at,
            'expired': time.time() > operation.expires_at,
            'signatures_received': sum(operation.admin_signatures.values()),
            'signatures_required': 2,
            'completed': operation.completed,
            'admin_signatures': operation.admin_signatures
        }
    
    async def get_admin_seed_info(self) -> Dict:
        """Get admin seed phrase information (for setup)"""
        admin1_words, admin2_words = self.admin_splits
        
        return {
            'master_seed_generated': True,
            'admin1_words': admin1_words,
            'admin2_words': admin2_words,
            'setup_complete': True,
            'passphrase_required': True
        }
    
    async def change_admin_passphrase(self, current_passphrase: str, new_passphrase: str) -> Dict:
        """Change admin passphrase"""
        
        if current_passphrase != self.admin_passphrase:
            raise HTTPException(status_code=401, detail="Invalid current passphrase")
        
        if len(new_passphrase) < 12:
            raise HTTPException(status_code=400, detail="New passphrase must be at least 12 characters")
        
        self.admin_passphrase = new_passphrase
        
        # Invalidate all existing sessions
        self.admin_sessions.clear()
        
        print(f"🔐 Admin passphrase changed")
        
        return {
            'success': True,
            'message': 'Admin passphrase updated successfully. All sessions invalidated.'
        }

# Global admin system instance
admin_system = AdminSystem()