#!/usr/bin/env python3
"""
Simple Backend API Test - Single request per endpoint
Tests core functionality without triggering rate limits
"""

import requests
import json
import time
import sys

# Get backend URL from environment
BACKEND_URL = "https://omerta-secure-2.preview.emergentagent.com/api"

def test_single_secure_note():
    """Test single secure note creation and reading"""
    print("=== Testing Single Secure Note ===")
    
    payload = {
        "ciphertext": "test_encrypted_content_single",
        "ttl_seconds": 300,
        "read_limit": 1
    }
    
    try:
        # Create note
        print("Creating secure note...")
        response = requests.post(f"{BACKEND_URL}/notes", json=payload)
        print(f"POST /api/notes - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            note_id = data["id"]
            print(f"✅ Note created: {note_id}")
            
            # Wait a moment to avoid rate limiting
            time.sleep(2)
            
            # Read note
            print("Reading secure note...")
            response = requests.get(f"{BACKEND_URL}/notes/{note_id}")
            print(f"GET /api/notes/{note_id} - Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("ciphertext") == payload["ciphertext"]:
                    print("✅ Note read successfully")
                    return True
                else:
                    print("❌ Incorrect content")
            else:
                print(f"❌ Read failed: {response.status_code}")
        else:
            print(f"❌ Create failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    
    return False

def test_single_envelope():
    """Test single envelope send and poll"""
    print("\n=== Testing Single Envelope ===")
    
    payload = {
        "to_oid": "test_recipient_single",
        "from_oid": "test_sender_single",
        "ciphertext": "test_encrypted_message_single"
    }
    
    try:
        # Send envelope
        print("Sending envelope...")
        response = requests.post(f"{BACKEND_URL}/envelopes/send", json=payload)
        print(f"POST /api/envelopes/send - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            envelope_id = data["id"]
            print(f"✅ Envelope sent: {envelope_id}")
            
            # Wait a moment to avoid rate limiting
            time.sleep(2)
            
            # Poll envelope
            print("Polling envelope...")
            response = requests.get(f"{BACKEND_URL}/envelopes/poll?oid={payload['to_oid']}")
            print(f"GET /api/envelopes/poll - Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                messages = data.get("messages", [])
                if len(messages) == 1 and messages[0].get("id") == envelope_id:
                    print("✅ Envelope polled successfully")
                    return True
                else:
                    print(f"❌ Incorrect messages: {len(messages)}")
            else:
                print(f"❌ Poll failed: {response.status_code}")
        else:
            print(f"❌ Send failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    
    return False

def main():
    """Run simple backend tests"""
    print("🔒 Simple Backend API Test")
    print(f"Backend URL: {BACKEND_URL}")
    print("=" * 50)
    
    # Test health check first
    try:
        response = requests.get(f"{BACKEND_URL}/")
        if response.status_code == 200:
            print("✅ Backend is responding")
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return 1
    except Exception as e:
        print(f"❌ Cannot connect to backend: {e}")
        return 1
    
    # Test core functionality
    note_test = test_single_secure_note()
    envelope_test = test_single_envelope()
    
    print("\n" + "=" * 50)
    print("Results:")
    print(f"Secure Notes: {'✅ PASS' if note_test else '❌ FAIL'}")
    print(f"Envelopes: {'✅ PASS' if envelope_test else '❌ FAIL'}")
    
    if note_test and envelope_test:
        print("🎉 Core backend functionality working!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())