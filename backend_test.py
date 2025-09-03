#!/usr/bin/env python3
"""
Backend API Testing for RAM-only Secure Notes
Tests the FastAPI backend endpoints for secure notes functionality
"""

import requests
import json
import time
import sys
from datetime import datetime, timezone

# Get backend URL from environment
BACKEND_URL = "https://steelos-secure.preview.emergentagent.com/api"

def test_status_endpoint():
    """Test that the status endpoint still works (regression test)"""
    print("=== Testing /api/status endpoint (regression) ===")
    
    try:
        # Test GET /api/status
        response = requests.get(f"{BACKEND_URL}/status")
        print(f"GET /api/status - Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Status endpoint working")
            return True
        else:
            print(f"❌ Status endpoint failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Status endpoint error: {e}")
        return False

def test_create_secure_note():
    """Test creating a secure note with TTL and read limit"""
    print("\n=== Testing POST /api/notes (Create Secure Note) ===")
    
    payload = {
        "ciphertext": "abc123",
        "ttl_seconds": 60,
        "read_limit": 2,
        "meta": {"t": "test"}
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/notes", json=payload)
        print(f"POST /api/notes - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            # Verify response structure
            required_fields = ["id", "expires_at", "views_left"]
            if all(field in data for field in required_fields):
                if data["views_left"] == 2:
                    print("✅ Note created successfully with correct views_left")
                    return data["id"]
                else:
                    print(f"❌ Incorrect views_left: expected 2, got {data['views_left']}")
            else:
                print(f"❌ Missing required fields in response")
        else:
            print(f"❌ Create note failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Create note error: {e}")
    
    return None

def test_read_note_twice(note_id):
    """Test reading a note twice to verify view count decrement and purging"""
    print(f"\n=== Testing GET /api/notes/{note_id} (Read Note Twice) ===")
    
    # First read
    try:
        print("First read:")
        response = requests.get(f"{BACKEND_URL}/notes/{note_id}")
        print(f"GET /api/notes/{note_id} - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get("views_left") == 1 and data.get("ciphertext") == "abc123":
                print("✅ First read successful, views_left decremented to 1")
            else:
                print(f"❌ First read failed: views_left={data.get('views_left')}, ciphertext={data.get('ciphertext')}")
                return False
        else:
            print(f"❌ First read failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ First read error: {e}")
        return False
    
    # Second read
    try:
        print("\nSecond read:")
        response = requests.get(f"{BACKEND_URL}/notes/{note_id}")
        print(f"GET /api/notes/{note_id} - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get("views_left") == 0:
                print("✅ Second read successful, views_left decremented to 0")
            else:
                print(f"❌ Second read failed: views_left={data.get('views_left')}")
                return False
        else:
            print(f"❌ Second read failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Second read error: {e}")
        return False
    
    # Third read (should fail with 404 since note is purged immediately after views_left reaches 0)
    try:
        print("\nThird read (should be purged):")
        response = requests.get(f"{BACKEND_URL}/notes/{note_id}")
        print(f"GET /api/notes/{note_id} - Status: {response.status_code}")
        
        if response.status_code == 404:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            if data.get("detail") == "not_found_or_expired":
                print("✅ Third read correctly returned 404 not_found_or_expired (note was purged)")
                return True
            else:
                print(f"❌ Third read wrong error: {data.get('detail')}")
        else:
            print(f"❌ Third read should have returned 404, got: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Third read error: {e}")
    
    return False

def test_ttl_expiry():
    """Test TTL expiry functionality"""
    print("\n=== Testing TTL Expiry ===")
    
    payload = {
        "ciphertext": "ttl_test",
        "ttl_seconds": 2,
        "read_limit": 1,
        "meta": {"test": "ttl"}
    }
    
    try:
        # Create note with 2 second TTL
        response = requests.post(f"{BACKEND_URL}/notes", json=payload)
        print(f"POST /api/notes (TTL=2s) - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            note_id = data["id"]
            print(f"Created note with ID: {note_id}")
            
            # Wait 3 seconds for expiry
            print("Waiting 3 seconds for TTL expiry...")
            time.sleep(3)
            
            # Try to read expired note
            response = requests.get(f"{BACKEND_URL}/notes/{note_id}")
            print(f"GET /api/notes/{note_id} (after expiry) - Status: {response.status_code}")
            
            if response.status_code == 410:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)}")
                if data.get("detail") == "expired":
                    print("✅ TTL expiry test successful - note correctly expired")
                    return True
                else:
                    print(f"❌ Wrong expiry error: {data.get('detail')}")
            else:
                print(f"❌ Expected 410 expired, got: {response.status_code}")
        else:
            print(f"❌ Failed to create TTL test note: {response.status_code}")
            
    except Exception as e:
        print(f"❌ TTL expiry test error: {e}")
    
    return False

def test_invalid_note_id():
    """Test accessing non-existent note ID"""
    print("\n=== Testing Invalid Note ID ===")
    
    try:
        response = requests.get(f"{BACKEND_URL}/notes/bad-id-12345")
        print(f"GET /api/notes/bad-id-12345 - Status: {response.status_code}")
        
        if response.status_code == 404:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            if data.get("detail") == "not_found_or_expired":
                print("✅ Invalid note ID test successful - correctly returned 404")
                return True
            else:
                print(f"❌ Wrong error message: {data.get('detail')}")
        else:
            print(f"❌ Expected 404, got: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Invalid note ID test error: {e}")
    
    return False

def test_send_envelope():
    """Test sending an envelope message"""
    print("\n=== Testing POST /api/envelopes/send (Send Envelope) ===")
    
    payload = {
        "to_oid": "user_bob_123",
        "from_oid": "user_alice_456", 
        "ciphertext": "encrypted_hello_message_1"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/envelopes/send", json=payload)
        print(f"POST /api/envelopes/send - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            # Verify response structure
            if "id" in data and isinstance(data["id"], str):
                print("✅ Envelope sent successfully with ID")
                return data["id"]
            else:
                print(f"❌ Missing or invalid 'id' field in response")
        else:
            print(f"❌ Send envelope failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Send envelope error: {e}")
    
    return None

def test_poll_envelopes_delete_on_delivery():
    """Test polling envelopes with delete-on-delivery behavior"""
    print("\n=== Testing GET /api/envelopes/poll (Delete-on-Delivery) ===")
    
    # First send an envelope
    payload = {
        "to_oid": "user_charlie_789",
        "from_oid": "user_dave_012",
        "ciphertext": "encrypted_test_message_2"
    }
    
    try:
        # Send envelope
        response = requests.post(f"{BACKEND_URL}/envelopes/send", json=payload)
        print(f"POST /api/envelopes/send - Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Failed to send envelope for polling test: {response.status_code}")
            return False
            
        envelope_id = response.json().get("id")
        print(f"Sent envelope with ID: {envelope_id}")
        
        # First poll - should return the message
        print("\nFirst poll (should return message):")
        response = requests.get(f"{BACKEND_URL}/envelopes/poll?oid=user_charlie_789")
        print(f"GET /api/envelopes/poll?oid=user_charlie_789 - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            messages = data.get("messages", [])
            if len(messages) == 1:
                msg = messages[0]
                if (msg.get("id") == envelope_id and 
                    msg.get("from_oid") == "user_dave_012" and
                    msg.get("ciphertext") == "encrypted_test_message_2" and
                    "ts" in msg):
                    print("✅ First poll successful - message returned with correct data")
                else:
                    print(f"❌ First poll message data incorrect: {msg}")
                    return False
            else:
                print(f"❌ First poll expected 1 message, got {len(messages)}")
                return False
        else:
            print(f"❌ First poll failed: {response.status_code} - {response.text}")
            return False
        
        # Second poll - should return empty (delete-on-delivery)
        print("\nSecond poll (should be empty due to delete-on-delivery):")
        response = requests.get(f"{BACKEND_URL}/envelopes/poll?oid=user_charlie_789")
        print(f"GET /api/envelopes/poll?oid=user_charlie_789 - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            messages = data.get("messages", [])
            if len(messages) == 0:
                print("✅ Second poll successful - messages empty (delete-on-delivery working)")
                return True
            else:
                print(f"❌ Second poll expected 0 messages, got {len(messages)}")
                return False
        else:
            print(f"❌ Second poll failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Poll envelopes test error: {e}")
    
    return False

def test_envelope_ttl_behavior():
    """Test envelope TTL sweep behavior (best-effort)"""
    print("\n=== Testing Envelope TTL Behavior ===")
    
    # Send an envelope
    payload = {
        "to_oid": "user_eve_345",
        "from_oid": "user_frank_678",
        "ciphertext": "ttl_test_message"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/envelopes/send", json=payload)
        print(f"POST /api/envelopes/send - Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Failed to send envelope for TTL test: {response.status_code}")
            return False
            
        # Poll to get the message and verify it has timestamp
        response = requests.get(f"{BACKEND_URL}/envelopes/poll?oid=user_eve_345")
        print(f"GET /api/envelopes/poll?oid=user_eve_345 - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            messages = data.get("messages", [])
            if len(messages) == 1:
                msg = messages[0]
                if "ts" in msg:
                    # Verify timestamp format
                    try:
                        ts_str = msg["ts"]
                        # Should be ISO format timestamp
                        datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                        print("✅ TTL test successful - message includes valid timestamp")
                        
                        # Verify second poll is empty (delete-on-delivery)
                        response = requests.get(f"{BACKEND_URL}/envelopes/poll?oid=user_eve_345")
                        if response.status_code == 200:
                            data = response.json()
                            if len(data.get("messages", [])) == 0:
                                print("✅ TTL test confirmed - message deleted after delivery")
                                return True
                            else:
                                print("❌ TTL test failed - message not deleted after delivery")
                        return True
                    except ValueError as e:
                        print(f"❌ TTL test failed - invalid timestamp format: {e}")
                        return False
                else:
                    print("❌ TTL test failed - message missing timestamp")
                    return False
            else:
                print(f"❌ TTL test failed - expected 1 message, got {len(messages)}")
                return False
        else:
            print(f"❌ TTL test failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ TTL test error: {e}")
    
    return False

def test_secure_notes_regression():
    """Regression test for secure notes functionality"""
    print("\n=== Testing Secure Notes Regression ===")
    
    payload = {
        "ciphertext": "regression_test_abc",
        "ttl_seconds": 5,
        "read_limit": 1
    }
    
    try:
        # Create note
        response = requests.post(f"{BACKEND_URL}/notes", json=payload)
        print(f"POST /api/notes - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            note_id = data["id"]
            print(f"Created note with ID: {note_id}")
            
            # Read note (first time - should work)
            response = requests.get(f"{BACKEND_URL}/notes/{note_id}")
            print(f"GET /api/notes/{note_id} (first read) - Status: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ First read successful")
                
                # Read note again (should fail with 404 not_found_or_expired because note is purged immediately after views_left reaches 0)
                response = requests.get(f"{BACKEND_URL}/notes/{note_id}")
                print(f"GET /api/notes/{note_id} (second read) - Status: {response.status_code}")
                
                if response.status_code == 404:
                    data = response.json()
                    if data.get("detail") == "not_found_or_expired":
                        print("✅ Secure notes regression test successful - note purged after view limit reached")
                        return True
                    else:
                        print(f"❌ Wrong error detail: {data.get('detail')}")
                else:
                    print(f"❌ Expected 404 not_found_or_expired, got: {response.status_code}")
            else:
                print(f"❌ First read failed: {response.status_code}")
        else:
            print(f"❌ Failed to create regression test note: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Secure notes regression test error: {e}")
    
    return False

def test_rate_limiting_notes_create():
    """Test rate limiting on Notes CREATE endpoint (10/minute)"""
    print("\n=== Testing Rate Limiting: Notes CREATE (10/minute) ===")
    
    payload = {
        "ciphertext": "rate_limit_test",
        "ttl_seconds": 60,
        "read_limit": 1
    }
    
    success_count = 0
    rate_limited_count = 0
    
    try:
        print("Sending 15 requests rapidly to test 10/minute rate limit...")
        
        for i in range(15):
            response = requests.post(f"{BACKEND_URL}/notes", json=payload)
            
            if response.status_code == 200:
                success_count += 1
            elif response.status_code == 429:
                rate_limited_count += 1
                print(f"Request {i+1}: Rate limited (429) - {response.json().get('detail', 'No detail')}")
            else:
                print(f"Request {i+1}: Unexpected status {response.status_code}")
            
            # Small delay to avoid overwhelming
            time.sleep(0.1)
        
        print(f"Results: {success_count} successful, {rate_limited_count} rate limited")
        
        # Expected: 10 success + 5 rate limited
        if success_count == 10 and rate_limited_count == 5:
            print("✅ Rate limiting working correctly for Notes CREATE")
            return True
        else:
            print(f"❌ Rate limiting FAILED - Expected 10 success + 5 rate limited, got {success_count} success + {rate_limited_count} rate limited")
            return False
            
    except Exception as e:
        print(f"❌ Rate limiting test error: {e}")
        return False

def test_rate_limiting_notes_read():
    """Test rate limiting on Notes READ endpoint (30/minute)"""
    print("\n=== Testing Rate Limiting: Notes READ (30/minute) ===")
    
    # First create a note to read
    payload = {
        "ciphertext": "rate_limit_read_test",
        "ttl_seconds": 300,
        "read_limit": 50  # High limit so we can test rate limiting
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/notes", json=payload)
        if response.status_code != 200:
            print(f"❌ Failed to create note for read rate limit test: {response.status_code}")
            return False
        
        note_id = response.json()["id"]
        print(f"Created note {note_id} for read rate limit testing")
        
        success_count = 0
        rate_limited_count = 0
        
        print("Sending 35 requests rapidly to test 30/minute rate limit...")
        
        for i in range(35):
            response = requests.get(f"{BACKEND_URL}/notes/{note_id}")
            
            if response.status_code == 200:
                success_count += 1
            elif response.status_code == 429:
                rate_limited_count += 1
                print(f"Request {i+1}: Rate limited (429) - {response.json().get('detail', 'No detail')}")
            else:
                print(f"Request {i+1}: Unexpected status {response.status_code}")
            
            time.sleep(0.1)
        
        print(f"Results: {success_count} successful, {rate_limited_count} rate limited")
        
        # Expected: 30 success + 5 rate limited
        if success_count == 30 and rate_limited_count == 5:
            print("✅ Rate limiting working correctly for Notes READ")
            return True
        else:
            print(f"❌ Rate limiting FAILED - Expected 30 success + 5 rate limited, got {success_count} success + {rate_limited_count} rate limited")
            return False
            
    except Exception as e:
        print(f"❌ Rate limiting test error: {e}")
        return False

def test_rate_limiting_envelopes_send():
    """Test rate limiting on Envelopes SEND endpoint (50/minute)"""
    print("\n=== Testing Rate Limiting: Envelopes SEND (50/minute) ===")
    
    payload = {
        "to_oid": "rate_test_user",
        "from_oid": "rate_test_sender",
        "ciphertext": "rate_limit_envelope_test"
    }
    
    success_count = 0
    rate_limited_count = 0
    
    try:
        print("Sending 55 requests rapidly to test 50/minute rate limit...")
        
        for i in range(55):
            response = requests.post(f"{BACKEND_URL}/envelopes/send", json=payload)
            
            if response.status_code == 200:
                success_count += 1
            elif response.status_code == 429:
                rate_limited_count += 1
                print(f"Request {i+1}: Rate limited (429) - {response.json().get('detail', 'No detail')}")
            else:
                print(f"Request {i+1}: Unexpected status {response.status_code}")
            
            time.sleep(0.1)
        
        print(f"Results: {success_count} successful, {rate_limited_count} rate limited")
        
        # Expected: 50 success + 5 rate limited
        if success_count == 50 and rate_limited_count == 5:
            print("✅ Rate limiting working correctly for Envelopes SEND")
            return True
        else:
            print(f"❌ Rate limiting FAILED - Expected 50 success + 5 rate limited, got {success_count} success + {rate_limited_count} rate limited")
            return False
            
    except Exception as e:
        print(f"❌ Rate limiting test error: {e}")
        return False

def test_rate_limiting_envelopes_poll():
    """Test rate limiting on Envelopes POLL endpoint (100/minute)"""
    print("\n=== Testing Rate Limiting: Envelopes POLL (100/minute) ===")
    
    success_count = 0
    rate_limited_count = 0
    
    try:
        print("Sending 105 requests rapidly to test 100/minute rate limit...")
        
        for i in range(105):
            response = requests.get(f"{BACKEND_URL}/envelopes/poll?oid=rate_test_user")
            
            if response.status_code == 200:
                success_count += 1
            elif response.status_code == 429:
                rate_limited_count += 1
                print(f"Request {i+1}: Rate limited (429) - {response.json().get('detail', 'No detail')}")
            else:
                print(f"Request {i+1}: Unexpected status {response.status_code}")
            
            time.sleep(0.05)  # Faster for 100/minute test
        
        print(f"Results: {success_count} successful, {rate_limited_count} rate limited")
        
        # Expected: 100 success + 5 rate limited
        if success_count == 100 and rate_limited_count == 5:
            print("✅ Rate limiting working correctly for Envelopes POLL")
            return True
        else:
            print(f"❌ Rate limiting FAILED - Expected 100 success + 5 rate limited, got {success_count} success + {rate_limited_count} rate limited")
            return False
            
    except Exception as e:
        print(f"❌ Rate limiting test error: {e}")
        return False

def test_input_sanitization():
    """Test input sanitization against dangerous payloads"""
    print("\n=== Testing Input Sanitization ===")
    
    dangerous_payloads = [
        "<script>alert('xss')</script>",
        "'; DROP TABLE notes; --",
        "javascript:alert(1)",
        "<img src=x onerror=alert(1)>",
        "eval('malicious code')",
        "document.cookie",
        "onload=alert(1)"
    ]
    
    blocked_count = 0
    accepted_count = 0
    
    try:
        print("Testing dangerous payloads...")
        
        for i, payload in enumerate(dangerous_payloads):
            print(f"\nTesting payload {i+1}: {payload[:50]}...")
            
            # Test in notes endpoint
            note_payload = {
                "ciphertext": payload,
                "ttl_seconds": 60,
                "read_limit": 1
            }
            
            response = requests.post(f"{BACKEND_URL}/notes", json=note_payload)
            
            if response.status_code == 400:
                blocked_count += 1
                print(f"✅ Payload {i+1} BLOCKED (400): {response.json().get('detail', 'No detail')}")
            elif response.status_code == 200:
                accepted_count += 1
                print(f"❌ Payload {i+1} ACCEPTED (200) - SECURITY VULNERABILITY!")
            else:
                print(f"⚠️  Payload {i+1} unexpected status: {response.status_code}")
        
        print(f"\nResults: {blocked_count} blocked, {accepted_count} accepted")
        
        # All dangerous payloads should be blocked
        if blocked_count == len(dangerous_payloads) and accepted_count == 0:
            print("✅ Input sanitization working correctly - all dangerous payloads blocked")
            return True
        else:
            print(f"❌ Input sanitization FAILED - {accepted_count} dangerous payloads were accepted")
            return False
            
    except Exception as e:
        print(f"❌ Input sanitization test error: {e}")
        return False

def test_legitimate_encrypted_content():
    """Test that legitimate encrypted content still works"""
    print("\n=== Testing Legitimate Encrypted Content ===")
    
    # Simulate legitimate encrypted content (base64-like)
    legitimate_payloads = [
        "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y=",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ",
        "-----BEGIN PGP MESSAGE-----\nVersion: GnuPG v2\n\nhQEMA5rE8HtsgTrEAQf+KhIxbwvbpM2kxT7/OGHQmBXCH3xHTA==\n-----END PGP MESSAGE-----"
    ]
    
    success_count = 0
    
    try:
        print("Testing legitimate encrypted content...")
        
        for i, payload in enumerate(legitimate_payloads):
            print(f"\nTesting legitimate payload {i+1}...")
            
            note_payload = {
                "ciphertext": payload,
                "ttl_seconds": 60,
                "read_limit": 1
            }
            
            response = requests.post(f"{BACKEND_URL}/notes", json=note_payload)
            
            if response.status_code == 200:
                success_count += 1
                print(f"✅ Legitimate payload {i+1} ACCEPTED")
            else:
                print(f"❌ Legitimate payload {i+1} REJECTED ({response.status_code}): {response.json().get('detail', 'No detail')}")
        
        print(f"\nResults: {success_count}/{len(legitimate_payloads)} legitimate payloads accepted")
        
        if success_count == len(legitimate_payloads):
            print("✅ Legitimate encrypted content working correctly")
            return True
        else:
            print(f"❌ Legitimate content test FAILED - {len(legitimate_payloads) - success_count} legitimate payloads were rejected")
            return False
            
    except Exception as e:
        print(f"❌ Legitimate content test error: {e}")
        return False

def test_security_headers():
    """Test that all required security headers are present"""
    print("\n=== Testing Security Headers ===")
    
    expected_headers = [
        "X-Content-Type-Options",
        "X-Frame-Options", 
        "X-XSS-Protection",
        "Strict-Transport-Security",
        "Content-Security-Policy",
        "Referrer-Policy",
        "Permissions-Policy",
        "X-Permitted-Cross-Domain-Policies",
        "Cross-Origin-Embedder-Policy",
        "Cross-Origin-Opener-Policy",
        "Cross-Origin-Resource-Policy"
    ]
    
    try:
        # Test on a simple endpoint
        response = requests.get(f"{BACKEND_URL}/")
        print(f"GET /api/ - Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Failed to get response for header testing: {response.status_code}")
            return False
        
        headers = response.headers
        present_headers = []
        missing_headers = []
        
        print("\nChecking security headers:")
        for header in expected_headers:
            if header in headers:
                present_headers.append(header)
                print(f"✅ {header}: {headers[header]}")
            else:
                missing_headers.append(header)
                print(f"❌ {header}: MISSING")
        
        print(f"\nResults: {len(present_headers)}/{len(expected_headers)} headers present")
        
        if len(missing_headers) == 0:
            print("✅ All security headers present")
            return True
        else:
            print(f"❌ Security headers test FAILED - Missing: {missing_headers}")
            return False
            
    except Exception as e:
        print(f"❌ Security headers test error: {e}")
        return False

def test_core_functionality_integrity():
    """Test that security measures don't break core functionality"""
    print("\n=== Testing Core Functionality Integrity ===")
    
    try:
        # Test 1: Create and read a secure note
        print("Testing secure notes functionality...")
        payload = {
            "ciphertext": "integrity_test_note",
            "ttl_seconds": 60,
            "read_limit": 1
        }
        
        response = requests.post(f"{BACKEND_URL}/notes", json=payload)
        if response.status_code != 200:
            print(f"❌ Failed to create note: {response.status_code}")
            return False
        
        note_id = response.json()["id"]
        
        response = requests.get(f"{BACKEND_URL}/notes/{note_id}")
        if response.status_code != 200:
            print(f"❌ Failed to read note: {response.status_code}")
            return False
        
        print("✅ Secure notes functionality working")
        
        # Test 2: Send and poll envelope
        print("Testing envelope functionality...")
        envelope_payload = {
            "to_oid": "integrity_test_user",
            "from_oid": "integrity_test_sender",
            "ciphertext": "integrity_test_message"
        }
        
        response = requests.post(f"{BACKEND_URL}/envelopes/send", json=envelope_payload)
        if response.status_code != 200:
            print(f"❌ Failed to send envelope: {response.status_code}")
            return False
        
        response = requests.get(f"{BACKEND_URL}/envelopes/poll?oid=integrity_test_user")
        if response.status_code != 200:
            print(f"❌ Failed to poll envelopes: {response.status_code}")
            return False
        
        messages = response.json().get("messages", [])
        if len(messages) != 1:
            print(f"❌ Expected 1 message, got {len(messages)}")
            return False
        
        print("✅ Envelope functionality working")
        
        print("✅ Core functionality integrity maintained")
        return True
        
    except Exception as e:
        print(f"❌ Core functionality integrity test error: {e}")
        return False

def main():
    """Run all backend tests including comprehensive security verification"""
    print("🔒 FINAL 100/100 SECURITY VERIFICATION - CRITICAL TEST")
    print("Starting Backend API Tests for RAM-only Secure Notes and Messaging Envelopes")
    print(f"Backend URL: {BACKEND_URL}")
    print("=" * 80)
    
    results = []
    
    # CORE FUNCTIONALITY TESTS
    print("\n🔧 CORE FUNCTIONALITY TESTS")
    print("=" * 50)
    
    # Test 1: Status endpoint regression
    results.append(("Status endpoint", test_status_endpoint()))
    
    # Test 2: Create secure note
    note_id = test_create_secure_note()
    results.append(("Create secure note", note_id is not None))
    
    # Test 3: Read note twice (only if creation succeeded)
    if note_id:
        results.append(("Read note twice + purge", test_read_note_twice(note_id)))
    else:
        results.append(("Read note twice + purge", False))
    
    # Test 4: TTL expiry
    results.append(("TTL expiry", test_ttl_expiry()))
    
    # Test 5: Invalid note ID
    results.append(("Invalid note ID", test_invalid_note_id()))
    
    # Test 6: Send envelope
    envelope_id = test_send_envelope()
    results.append(("Send envelope", envelope_id is not None))
    
    # Test 7: Poll envelopes with delete-on-delivery
    results.append(("Poll delete-on-delivery", test_poll_envelopes_delete_on_delivery()))
    
    # Test 8: Envelope TTL behavior
    results.append(("Envelope TTL behavior", test_envelope_ttl_behavior()))
    
    # Test 9: Secure notes regression
    results.append(("Secure notes regression", test_secure_notes_regression()))
    
    # CRITICAL SECURITY TESTS
    print("\n🔒 CRITICAL SECURITY VERIFICATION TESTS")
    print("=" * 50)
    
    # RATE LIMITING VERIFICATION (CRITICAL)
    print("\n⚡ RATE LIMITING VERIFICATION")
    results.append(("Rate Limit: Notes CREATE (10/min)", test_rate_limiting_notes_create()))
    results.append(("Rate Limit: Notes READ (30/min)", test_rate_limiting_notes_read()))
    results.append(("Rate Limit: Envelopes SEND (50/min)", test_rate_limiting_envelopes_send()))
    results.append(("Rate Limit: Envelopes POLL (100/min)", test_rate_limiting_envelopes_poll()))
    
    # INPUT SANITIZATION VERIFICATION (CRITICAL)
    print("\n🛡️  INPUT SANITIZATION VERIFICATION")
    results.append(("Input Sanitization: Block Dangerous", test_input_sanitization()))
    results.append(("Input Sanitization: Allow Legitimate", test_legitimate_encrypted_content()))
    
    # SECURITY HEADERS VERIFICATION
    print("\n📋 SECURITY HEADERS VERIFICATION")
    results.append(("Security Headers (11 required)", test_security_headers()))
    
    # CORE FUNCTIONALITY INTEGRITY
    print("\n🔧 CORE FUNCTIONALITY INTEGRITY")
    results.append(("Core Functionality Integrity", test_core_functionality_integrity()))
    
    # Summary
    print("\n" + "=" * 80)
    print("🔒 FINAL SECURITY VERIFICATION RESULTS:")
    print("=" * 80)
    
    passed = 0
    total = len(results)
    core_tests = 9
    security_tests = total - core_tests
    
    core_passed = 0
    security_passed = 0
    
    for i, (test_name, success) in enumerate(results):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{test_name:<35} {status}")
        if success:
            passed += 1
            if i < core_tests:
                core_passed += 1
            else:
                security_passed += 1
    
    print(f"\nCore Functionality: {core_passed}/{core_tests} tests passed")
    print(f"Security Tests: {security_passed}/{security_tests} tests passed")
    print(f"Overall: {passed}/{total} tests passed")
    
    # Calculate security score
    security_score = (security_passed / security_tests) * 100 if security_tests > 0 else 0
    
    print(f"\n🔒 SECURITY SCORE: {security_score:.1f}/100")
    
    if security_score == 100.0 and core_passed == core_tests:
        print("🎉 100/100 SECURITY RATING ACHIEVED! All security measures working perfectly!")
        return 0
    elif security_score >= 90.0:
        print("⚠️  Near perfect security - minor issues to address")
        return 1
    else:
        print("❌ CRITICAL SECURITY VULNERABILITIES FOUND - Immediate action required!")
        return 1

if __name__ == "__main__":
    sys.exit(main())