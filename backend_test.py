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
BACKEND_URL = "https://app-builder-check.preview.emergentagent.com/api"

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

def main():
    """Run all backend tests"""
    print("Starting Backend API Tests for RAM-only Secure Notes")
    print(f"Backend URL: {BACKEND_URL}")
    print("=" * 60)
    
    results = []
    
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
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST RESULTS SUMMARY:")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{test_name:<25} {status}")
        if success:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())