"""
LiveKit Integration Manager for OMERTÀ Video Calling
Handles token generation, room management, and security for video calls
"""

import os
import time
import uuid
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import logging
from dotenv import load_dotenv

try:
    from livekit import AccessToken, VideoGrant, RoomServiceClient, Room, DisconnectReason
except ImportError:
    # Fallback for development
    class AccessToken:
        def __init__(self, api_key: str, api_secret: str):
            self.api_key = api_key
            self.api_secret = api_secret
            self.identity = ""
            self.name = ""
            
        def with_identity(self, identity: str):
            self.identity = identity
            return self
            
        def with_name(self, name: str):
            self.name = name
            return self
            
        def with_grants(self, grants):
            self.grants = grants
            return self
            
        def to_jwt(self) -> str:
            # Mock JWT for development
            return f"mock-jwt-{self.identity}-{int(time.time())}"
    
    class VideoGrant:
        def __init__(self):
            self.room_join = True
            self.room = ""
            self.can_publish = True
            self.can_subscribe = True
            
        def with_room_join(self, can_join: bool):
            self.room_join = can_join
            return self
            
        def with_room_name(self, room: str):
            self.room = room
            return self
            
        def with_can_publish(self, can_publish: bool):
            self.can_publish = can_publish
            return self
            
        def with_can_subscribe(self, can_subscribe: bool):
            self.can_subscribe = can_subscribe
            return self

load_dotenv()

logger = logging.getLogger(__name__)

class LiveKitManager:
    """
    Manages LiveKit video calling functionality with OMERTÀ security integration
    """
    
    def __init__(self):
        self.api_key = os.getenv("LIVEKIT_API_KEY", "dev-api-key")
        self.api_secret = os.getenv("LIVEKIT_API_SECRET", "dev-secret-key-very-long-and-secure")
        self.ws_url = os.getenv("LIVEKIT_WS_URL", "ws://localhost:7880")
        
        # Active rooms and participants tracking
        self.active_rooms: Dict[str, Dict] = {}
        self.participant_sessions: Dict[str, Dict] = {}
        
        logger.info(f"LiveKit Manager initialized with API key: {self.api_key[:8]}...")
    
    def generate_access_token(
        self, 
        room_name: str, 
        participant_identity: str, 
        participant_name: str = None,
        metadata: Dict = None,
        ttl_hours: int = 4
    ) -> Dict:
        """
        Generates secure access token for LiveKit room access
        
        Args:
            room_name: Name of the room to join
            participant_identity: Unique identifier for participant
            participant_name: Display name for participant
            metadata: Additional participant metadata
            ttl_hours: Token time-to-live in hours
            
        Returns:
            Dictionary containing token and connection info
        """
        try:
            # Create access token
            token = AccessToken(self.api_key, self.api_secret)
            
            # Set participant identity and name
            token = token.with_identity(participant_identity)
            if participant_name:
                token = token.with_name(participant_name)
            
            # Create video grants
            grants = VideoGrant()
            grants = grants.with_room_join(True)
            grants = grants.with_room_name(room_name)
            grants = grants.with_can_publish(True)
            grants = grants.with_can_subscribe(True)
            
            # Apply grants to token
            token = token.with_grants(grants)
            
            # Generate JWT
            jwt_token = token.to_jwt()
            
            # Track participant session
            session_id = str(uuid.uuid4())
            self.participant_sessions[session_id] = {
                "participant_identity": participant_identity,
                "participant_name": participant_name or participant_identity,
                "room_name": room_name,
                "created_at": datetime.utcnow(),
                "metadata": metadata or {},
                "active": True
            }
            
            # Track room activity
            if room_name not in self.active_rooms:
                self.active_rooms[room_name] = {
                    "created_at": datetime.utcnow(),
                    "participants": [],
                    "active": True
                }
            
            if participant_identity not in self.active_rooms[room_name]["participants"]:
                self.active_rooms[room_name]["participants"].append(participant_identity)
            
            logger.info(f"Generated access token for {participant_identity} in room {room_name}")
            
            return {
                "token": jwt_token,
                "ws_url": self.ws_url,
                "session_id": session_id,
                "room_name": room_name,
                "participant_identity": participant_identity,
                "participant_name": participant_name or participant_identity,
                "expires_at": (datetime.utcnow() + timedelta(hours=ttl_hours)).isoformat(),
                "server_info": {
                    "url": self.ws_url,
                    "api_key": self.api_key
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to generate access token: {str(e)}")
            raise Exception(f"Token generation failed: {str(e)}")
    
    def validate_room_access(self, user_id: str, room_name: str) -> bool:
        """
        Validates if user has permission to access specific room
        
        Args:
            user_id: User identifier from OMERTÀ auth system
            room_name: Room name to validate access for
            
        Returns:
            Boolean indicating access permission
        """
        try:
            # Basic validation - can be extended with OMERTÀ permission system
            if not user_id or not room_name:
                return False
            
            # Check for blocked users (integrate with OMERTÀ security)
            blocked_users = self._get_blocked_users()
            if user_id in blocked_users:
                logger.warning(f"Blocked user {user_id} attempted to access room {room_name}")
                return False
            
            # Room-specific access control
            room_permissions = self._get_room_permissions(room_name)
            if room_permissions and user_id not in room_permissions.get("allowed_users", []):
                # Check if user has admin privileges
                if not self._is_admin_user(user_id):
                    logger.warning(f"User {user_id} denied access to restricted room {room_name}")
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Room access validation failed: {str(e)}")
            return False
    
    def create_room(self, room_name: str, creator_id: str, room_config: Dict = None) -> Dict:
        """
        Creates a new video calling room with specified configuration
        
        Args:
            room_name: Unique name for the room
            creator_id: User ID of room creator
            room_config: Room configuration options
            
        Returns:
            Dictionary containing room information
        """
        try:
            config = room_config or {}
            
            room_info = {
                "room_name": room_name,
                "creator_id": creator_id,
                "created_at": datetime.utcnow().isoformat(),
                "max_participants": config.get("max_participants", 4),
                "is_private": config.get("is_private", False),
                "requires_approval": config.get("requires_approval", False),
                "voice_scrambler_enabled": config.get("voice_scrambler_enabled", True),
                "face_blur_enabled": config.get("face_blur_enabled", True),
                "recording_enabled": config.get("recording_enabled", False),
                "participants": [],
                "active": True
            }
            
            self.active_rooms[room_name] = room_info
            
            logger.info(f"Created room {room_name} by user {creator_id}")
            
            return room_info
            
        except Exception as e:
            logger.error(f"Failed to create room: {str(e)}")
            raise Exception(f"Room creation failed: {str(e)}")
    
    def get_room_info(self, room_name: str) -> Optional[Dict]:
        """
        Retrieves information about a specific room
        
        Args:
            room_name: Name of room to get info for
            
        Returns:
            Dictionary containing room information or None if not found
        """
        return self.active_rooms.get(room_name)
    
    def list_active_rooms(self, user_id: str = None) -> List[Dict]:
        """
        Lists active rooms, optionally filtered by user access
        
        Args:
            user_id: Optional user ID to filter by access permissions
            
        Returns:
            List of room information dictionaries
        """
        rooms = []
        for room_name, room_info in self.active_rooms.items():
            if room_info.get("active", False):
                # Filter by user access if specified
                if user_id and not self.validate_room_access(user_id, room_name):
                    continue
                
                # Remove sensitive information
                public_info = {
                    "room_name": room_name,
                    "created_at": room_info["created_at"],
                    "participant_count": len(room_info.get("participants", [])),
                    "max_participants": room_info.get("max_participants", 4),
                    "is_private": room_info.get("is_private", False),
                    "requires_approval": room_info.get("requires_approval", False)
                }
                rooms.append(public_info)
        
        return rooms
    
    def end_session(self, session_id: str) -> bool:
        """
        Ends a participant session and cleans up resources
        
        Args:
            session_id: Session ID to end
            
        Returns:
            Boolean indicating success
        """
        try:
            if session_id in self.participant_sessions:
                session = self.participant_sessions[session_id]
                session["active"] = False
                session["ended_at"] = datetime.utcnow()
                
                # Remove from room participants
                room_name = session["room_name"]
                participant_identity = session["participant_identity"]
                
                if room_name in self.active_rooms:
                    participants = self.active_rooms[room_name]["participants"]
                    if participant_identity in participants:
                        participants.remove(participant_identity)
                
                logger.info(f"Ended session {session_id} for participant {participant_identity}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to end session: {str(e)}")
            return False
    
    def _get_blocked_users(self) -> List[str]:
        """Get list of blocked users from OMERTÀ security system"""
        # TODO: Integration with OMERTÀ security system
        return []
    
    def _get_room_permissions(self, room_name: str) -> Dict:
        """Get room-specific permissions from OMERTÀ system"""
        # TODO: Integration with OMERTÀ permission system
        return {}
    
    def _is_admin_user(self, user_id: str) -> bool:
        """Check if user has admin privileges in OMERTÀ system"""
        # TODO: Integration with OMERTÀ admin system
        return False
    
    def cleanup_expired_sessions(self):
        """
        Cleanup expired sessions and inactive rooms
        Should be called periodically by background task
        """
        try:
            current_time = datetime.utcnow()
            expired_sessions = []
            
            # Find expired sessions (older than 24 hours)
            for session_id, session in self.participant_sessions.items():
                if session.get("active", False):
                    created_at = session["created_at"]
                    if isinstance(created_at, str):
                        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    
                    if (current_time - created_at).total_seconds() > 86400:  # 24 hours
                        expired_sessions.append(session_id)
            
            # Clean up expired sessions
            for session_id in expired_sessions:
                self.end_session(session_id)
            
            # Clean up empty rooms
            empty_rooms = []
            for room_name, room_info in self.active_rooms.items():
                if len(room_info.get("participants", [])) == 0:
                    created_at = room_info["created_at"]
                    if isinstance(created_at, str):
                        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    
                    # Remove rooms empty for more than 1 hour
                    if (current_time - created_at).total_seconds() > 3600:
                        empty_rooms.append(room_name)
            
            for room_name in empty_rooms:
                del self.active_rooms[room_name]
                logger.info(f"Cleaned up empty room: {room_name}")
            
            if expired_sessions or empty_rooms:
                logger.info(f"Cleaned up {len(expired_sessions)} expired sessions and {len(empty_rooms)} empty rooms")
            
        except Exception as e:
            logger.error(f"Session cleanup failed: {str(e)}")

# Global instance
livekit_manager = LiveKitManager()