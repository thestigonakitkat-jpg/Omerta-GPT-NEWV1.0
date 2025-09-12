#!/usr/bin/env python3
"""
🔌 OMERTÁ WEBSOCKET TESTING
Simple WebSocket connectivity test using websocket-client
"""

import json
import requests
import time
import websocket
from datetime import datetime

# Backend URL
BACKEND_URL = "http://localhost:8001/api"
WS_URL = "ws://localhost:8001/api/ws"

def test_websocket_simple():
    """Test WebSocket connectivity using websocket-client"""
    print("🔌 TESTING WEBSOCKET FUNCTIONALITY")
    
    try:
        # Test WebSocket connection
        test_oid = "websocket_test_user_simple"
        uri = f"{WS_URL}?oid={test_oid}"
        
        # Create WebSocket connection
        ws = websocket.create_connection(uri, timeout=10)
        print("✅ PASS | WebSocket Connection | Successfully connected to WebSocket")
        
        # Test receiving messages (wait for ping or message)
        try:
            message = ws.recv()
            data = json.loads(message)
            
            if data.get('type') == 'ping':
                print("✅ PASS | WebSocket Heartbeat | Heartbeat/ping system working")
            elif 'messages' in data:
                print("✅ PASS | WebSocket Message Delivery | Real-time message delivery working")
            else:
                print(f"✅ PASS | WebSocket Communication | Received message: {data}")
                
        except Exception as e:
            print(f"❌ FAIL | WebSocket Message Reception | Error: {str(e)}")
        
        # Test real-time delivery by sending envelope
        try:
            envelope_data = {
                "to_oid": test_oid,
                "from_oid": "websocket_sender_simple",
                "ciphertext": "WebSocket real-time test message",
                "ts": datetime.now().isoformat()
            }
            
            # Send envelope via HTTP API
            response = requests.post(f"{BACKEND_URL}/envelopes/send", 
                                   json=envelope_data, timeout=5)
            
            if response.status_code == 200:
                # Try to receive real-time delivery
                try:
                    ws.settimeout(5)  # 5 second timeout
                    message = ws.recv()
                    data = json.loads(message)
                    
                    if 'messages' in data and len(data['messages']) > 0:
                        delivered_msg = data['messages'][0]
                        if delivered_msg.get('ciphertext') == envelope_data['ciphertext']:
                            print("✅ PASS | WebSocket Real-time Delivery | Message delivered in real-time via WebSocket")
                        else:
                            print("❌ FAIL | WebSocket Real-time Delivery | Message content mismatch")
                    else:
                        print("❌ FAIL | WebSocket Real-time Delivery | No messages in WebSocket response")
                        
                except websocket.WebSocketTimeoutException:
                    print("❌ FAIL | WebSocket Real-time Delivery | No real-time delivery within timeout")
                except Exception as e:
                    print(f"❌ FAIL | WebSocket Real-time Delivery | Error: {str(e)}")
            else:
                print(f"❌ FAIL | WebSocket Real-time Delivery | Failed to send envelope: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"❌ FAIL | WebSocket Real-time Delivery | Error: {str(e)}")
        
        # Close connection
        ws.close()
        print("✅ PASS | WebSocket Cleanup | Connection closed successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ FAIL | WebSocket Connection | Connection failed: {str(e)}")
        return False

if __name__ == "__main__":
    test_websocket_simple()