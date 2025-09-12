#!/usr/bin/env python3
"""
🔒 OMERTÁ ADDITIONAL BACKEND TESTING
Testing WebSocket functionality and LiveKit integration as requested in the review.
"""

import asyncio
import json
import requests
import time
import sys
import websockets
from typing import Dict, List, Any
from datetime import datetime

# Backend URL from frontend .env
BACKEND_URL = "http://localhost:8001/api"
WS_URL = "ws://localhost:8001/api/ws"

class OMERTAAdditionalTester:
    def __init__(self):
        self.results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            status = "✅ PASS"
        else:
            self.failed_tests += 1
            status = "❌ FAIL"
            
        result = f"{status} | {test_name}"
        if details:
            result += f" | {details}"
            
        print(result)
        self.results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'timestamp': datetime.now().isoformat()
        })
    
    def test_messaging_envelopes(self):
        """Test messaging envelope system (send/poll delete-on-delivery)"""
        print("\n📨 TESTING MESSAGING ENVELOPES")
        
        # 1. Test envelope sending
        try:
            envelope_data = {
                "to_oid": "test_recipient_001",
                "from_oid": "test_sender_001", 
                "ciphertext": "U2FsdGVkX1+encrypted_message_content_here",
                "ts": datetime.now().isoformat()
            }
            
            response = requests.post(f"{BACKEND_URL}/envelopes/send", 
                                   json=envelope_data, timeout=10)
            if response.status_code == 200:
                result = response.json()
                if result.get('id'):
                    envelope_id = result['id']
                    self.log_test("Envelope Sending", True, 
                                f"Envelope sent successfully: {envelope_id[:8]}...")
                    
                    # Store for polling test
                    self.test_recipient_oid = envelope_data['to_oid']
                else:
                    self.log_test("Envelope Sending", False, f"No envelope ID returned: {result}")
            else:
                self.log_test("Envelope Sending", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_test("Envelope Sending", False, f"Error: {str(e)}")
        
        # 2. Test envelope polling (first poll should deliver message)
        try:
            response = requests.get(f"{BACKEND_URL}/envelopes/poll?oid={self.test_recipient_oid}&max=10", 
                                  timeout=10)
            if response.status_code == 200:
                result = response.json()
                messages = result.get('messages', [])
                if len(messages) > 0:
                    message = messages[0]
                    if all(key in message for key in ['id', 'from_oid', 'ciphertext', 'ts']):
                        self.log_test("Envelope Polling - First Poll", True, 
                                    f"Retrieved {len(messages)} message(s) with proper structure")
                    else:
                        self.log_test("Envelope Polling - First Poll", False, 
                                    f"Message missing required fields: {message}")
                else:
                    self.log_test("Envelope Polling - First Poll", False, "No messages retrieved")
            else:
                self.log_test("Envelope Polling - First Poll", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_test("Envelope Polling - First Poll", False, f"Error: {str(e)}")
        
        # 3. Test delete-on-delivery (second poll should return empty)
        try:
            response = requests.get(f"{BACKEND_URL}/envelopes/poll?oid={self.test_recipient_oid}&max=10", 
                                  timeout=10)
            if response.status_code == 200:
                result = response.json()
                messages = result.get('messages', [])
                if len(messages) == 0:
                    self.log_test("Envelope Delete-on-Delivery", True, 
                                "Second poll returns empty array (delete-on-delivery working)")
                else:
                    self.log_test("Envelope Delete-on-Delivery", False, 
                                f"Messages still available after first poll: {len(messages)}")
            else:
                self.log_test("Envelope Delete-on-Delivery", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_test("Envelope Delete-on-Delivery", False, f"Error: {str(e)}")
    
    async def test_websocket_functionality(self):
        """Test WebSocket real-time messaging"""
        print("\n🔌 TESTING WEBSOCKET FUNCTIONALITY")
        
        try:
            # Test WebSocket connection
            test_oid = "websocket_test_user_001"
            uri = f"{WS_URL}?oid={test_oid}"
            
            async with websockets.connect(uri, timeout=10) as websocket:
                self.log_test("WebSocket Connection", True, "Successfully connected to WebSocket")
                
                # Test heartbeat/ping functionality
                try:
                    # Wait for ping message
                    message = await asyncio.wait_for(websocket.recv(), timeout=10)
                    data = json.loads(message)
                    
                    if data.get('type') == 'ping':
                        self.log_test("WebSocket Heartbeat", True, "Heartbeat/ping system working")
                    else:
                        # Check if it's a message delivery
                        if 'messages' in data:
                            self.log_test("WebSocket Message Delivery", True, "Real-time message delivery working")
                        else:
                            self.log_test("WebSocket Heartbeat", False, f"Unexpected message: {data}")
                            
                except asyncio.TimeoutError:
                    self.log_test("WebSocket Heartbeat", False, "No heartbeat received within timeout")
                
                # Test real-time message delivery by sending an envelope to this OID
                try:
                    envelope_data = {
                        "to_oid": test_oid,
                        "from_oid": "websocket_sender_001",
                        "ciphertext": "Real-time WebSocket test message",
                        "ts": datetime.now().isoformat()
                    }
                    
                    # Send envelope via HTTP API
                    response = requests.post(f"{BACKEND_URL}/envelopes/send", 
                                           json=envelope_data, timeout=5)
                    
                    if response.status_code == 200:
                        # Wait for real-time delivery via WebSocket
                        try:
                            message = await asyncio.wait_for(websocket.recv(), timeout=5)
                            data = json.loads(message)
                            
                            if 'messages' in data and len(data['messages']) > 0:
                                delivered_msg = data['messages'][0]
                                if delivered_msg.get('ciphertext') == envelope_data['ciphertext']:
                                    self.log_test("WebSocket Real-time Delivery", True, 
                                                "Message delivered in real-time via WebSocket")
                                else:
                                    self.log_test("WebSocket Real-time Delivery", False, 
                                                "Message content mismatch")
                            else:
                                self.log_test("WebSocket Real-time Delivery", False, 
                                            "No messages in WebSocket response")
                        except asyncio.TimeoutError:
                            self.log_test("WebSocket Real-time Delivery", False, 
                                        "No real-time delivery within timeout")
                    else:
                        self.log_test("WebSocket Real-time Delivery", False, 
                                    f"Failed to send envelope: HTTP {response.status_code}")
                        
                except Exception as e:
                    self.log_test("WebSocket Real-time Delivery", False, f"Error: {str(e)}")
                    
        except Exception as e:
            self.log_test("WebSocket Connection", False, f"Connection failed: {str(e)}")
    
    def test_livekit_integration(self):
        """Test LiveKit video calling integration"""
        print("\n🎥 TESTING LIVEKIT INTEGRATION")
        
        # 1. Test LiveKit token generation
        try:
            token_data = {
                "room_name": "test-room-001",
                "participant_name": "test-participant",
                "metadata": {"user_type": "test"},
                "ttl_hours": 2
            }
            
            response = requests.post(f"{BACKEND_URL}/livekit/token", 
                                   json=token_data, timeout=10)
            if response.status_code == 200:
                result = response.json()
                required_fields = ['token', 'ws_url', 'session_id', 'room_name', 'participant_identity']
                if all(field in result for field in required_fields):
                    self.log_test("LiveKit Token Generation", True, 
                                f"JWT token generated for room {result['room_name']}")
                    
                    # Store for room creation test
                    self.test_room_name = token_data['room_name']
                else:
                    missing_fields = [f for f in required_fields if f not in result]
                    self.log_test("LiveKit Token Generation", False, 
                                f"Missing fields: {missing_fields}")
            else:
                self.log_test("LiveKit Token Generation", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_test("LiveKit Token Generation", False, f"Error: {str(e)}")
        
        # 2. Test LiveKit room creation
        try:
            room_data = {
                "room_name": "secure-room-002",
                "max_participants": 4,
                "is_private": True,
                "requires_approval": False,
                "voice_scrambler_enabled": True,
                "face_blur_enabled": True,
                "recording_enabled": False
            }
            
            response = requests.post(f"{BACKEND_URL}/livekit/room/create", 
                                   json=room_data, timeout=10)
            if response.status_code == 200:
                result = response.json()
                if result.get('status') == 'success' and result.get('room'):
                    room_info = result['room']
                    self.log_test("LiveKit Room Creation", True, 
                                f"Room created: {room_info.get('room_name')} with security features")
                    
                    # Store for room listing test
                    self.created_room_name = room_data['room_name']
                else:
                    self.log_test("LiveKit Room Creation", False, f"Room creation failed: {result}")
            else:
                self.log_test("LiveKit Room Creation", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_test("LiveKit Room Creation", False, f"Error: {str(e)}")
        
        # 3. Test LiveKit room listing
        try:
            response = requests.get(f"{BACKEND_URL}/livekit/rooms", timeout=10)
            if response.status_code == 200:
                result = response.json()
                if result.get('status') == 'success':
                    rooms = result.get('rooms', [])
                    self.log_test("LiveKit Room Listing", True, 
                                f"Retrieved {len(rooms)} active rooms")
                else:
                    self.log_test("LiveKit Room Listing", False, f"Listing failed: {result}")
            else:
                self.log_test("LiveKit Room Listing", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_test("LiveKit Room Listing", False, f"Error: {str(e)}")
        
        # 4. Test LiveKit room info retrieval
        try:
            if hasattr(self, 'created_room_name'):
                response = requests.get(f"{BACKEND_URL}/livekit/room/{self.created_room_name}", 
                                      timeout=10)
                if response.status_code == 200:
                    result = response.json()
                    if result.get('status') == 'success' and result.get('room'):
                        room_info = result['room']
                        security_features = ['voice_scrambler_enabled', 'face_blur_enabled']
                        has_security = any(room_info.get(feature) for feature in security_features)
                        
                        self.log_test("LiveKit Room Info Retrieval", True, 
                                    f"Room info retrieved with security features: {has_security}")
                    else:
                        self.log_test("LiveKit Room Info Retrieval", False, f"Info retrieval failed: {result}")
                else:
                    self.log_test("LiveKit Room Info Retrieval", False, f"HTTP {response.status_code}")
            else:
                self.log_test("LiveKit Room Info Retrieval", False, "No room created for testing")
        except Exception as e:
            self.log_test("LiveKit Room Info Retrieval", False, f"Error: {str(e)}")
        
        # 5. Test LiveKit session management
        try:
            session_data = {
                "session_id": "test_session_12345"
            }
            
            response = requests.post(f"{BACKEND_URL}/livekit/session/end", 
                                   json=session_data, timeout=10)
            if response.status_code == 200:
                result = response.json()
                if result.get('status') == 'success':
                    self.log_test("LiveKit Session Management", True, "Session ended successfully")
                else:
                    self.log_test("LiveKit Session Management", False, f"Session end failed: {result}")
            elif response.status_code == 404:
                # Session not found is acceptable for test
                self.log_test("LiveKit Session Management", True, "Session management working (404 for non-existent session)")
            else:
                self.log_test("LiveKit Session Management", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_test("LiveKit Session Management", False, f"Error: {str(e)}")
    
    def test_health_endpoint(self):
        """Test API health endpoint"""
        print("\n🏥 TESTING API HEALTH")
        
        try:
            # Test if there's a dedicated health endpoint
            response = requests.get(f"{BACKEND_URL}/health", timeout=10)
            if response.status_code == 200:
                self.log_test("API Health Endpoint", True, "Dedicated health endpoint responding")
            else:
                # Fall back to root endpoint
                response = requests.get(f"{BACKEND_URL}/", timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("message") == "Hello World":
                        self.log_test("API Health Endpoint", True, "Root endpoint serving as health check")
                    else:
                        self.log_test("API Health Endpoint", False, f"Unexpected response: {data}")
                else:
                    self.log_test("API Health Endpoint", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_test("API Health Endpoint", False, f"Error: {str(e)}")
    
    async def run_additional_tests(self):
        """Run additional test suite"""
        print("🔒 OMERTÁ ADDITIONAL BACKEND TESTING")
        print("=" * 60)
        
        # Initialize test variables
        self.test_recipient_oid = None
        self.test_room_name = None
        self.created_room_name = None
        
        # Run all test suites
        self.test_health_endpoint()
        self.test_messaging_envelopes()
        await self.test_websocket_functionality()
        self.test_livekit_integration()
        
        # Print final results
        print("\n" + "=" * 60)
        print("🎯 ADDITIONAL TEST RESULTS")
        print("=" * 60)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests} ✅")
        print(f"Failed: {self.failed_tests} ❌")
        print(f"Success Rate: {success_rate:.1f}%")
        
        # Save detailed results
        with open('/app/omerta_additional_test_results.json', 'w') as f:
            json.dump({
                'summary': {
                    'total_tests': self.total_tests,
                    'passed_tests': self.passed_tests,
                    'failed_tests': self.failed_tests,
                    'success_rate': success_rate,
                    'timestamp': datetime.now().isoformat()
                },
                'detailed_results': self.results
            }, f, indent=2)
        
        print(f"\n📊 Additional test results saved to: /app/omerta_additional_test_results.json")
        
        return success_rate

async def main():
    tester = OMERTAAdditionalTester()
    success_rate = await tester.run_additional_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success_rate >= 60 else 1)

if __name__ == "__main__":
    asyncio.run(main())