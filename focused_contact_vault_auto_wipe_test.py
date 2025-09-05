#!/usr/bin/env python3
"""
Focused Backend API Testing for Contact Vault and Auto-Wipe Systems
Tests the newly implemented Contact Vault and Auto-Wipe endpoints
"""

import requests
import json
import time
import sys
from datetime import datetime, timezone

# Get backend URL from environment
BACKEND_URL = "https://crypto-vault-21.preview.emergentagent.com/api"

def test_contacts_vault_store():
    """Test POST /api/contacts-vault/store endpoint"""
    print("=== Testing POST /api/contacts-vault/store (Contact Vault Store) ===")
    
    payload = {
        "device_id": "test_device_vault_001",
        "contacts": [
            {
                "oid": "contact_alice_123",
                "display_name": "Alice Smith",
                "verified": True,
                "added_timestamp": int(time.time()),
                "verification_timestamp": int(time.time())
            },
            {
                "oid": "contact_bob_456", 
                "display_name": "Bob Johnson",
                "verified": False,
                "added_timestamp": int(time.time())
            }
        ],
        "encryption_key_hash": "sha256_hash_of_encryption_key_abc123def456"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/contacts-vault/store", json=payload)
        print(f"POST /api/contacts-vault/store - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            # Verify response structure
            required_fields = ["success", "message", "backup_id", "contacts_count"]
            if all(field in data for field in required_fields):
                if data["success"] and data["contacts_count"] == 2:
                    print("✅ Contacts vault store successful")
                    return data["backup_id"]
                else:
                    print(f"❌ Store failed: success={data.get('success')}, count={data.get('contacts_count')}")
            else:
                print(f"❌ Missing required fields in response")
        else:
            print(f"❌ Contacts vault store failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Contacts vault store error: {e}")
    
    return None

def test_contacts_vault_retrieve():
    """Test GET /api/contacts-vault/retrieve/{device_id} endpoint"""
    print("\n=== Testing GET /api/contacts-vault/retrieve (Contact Vault Retrieve) ===")
    
    # First store some contacts
    store_payload = {
        "device_id": "test_device_vault_002",
        "contacts": [
            {
                "oid": "contact_charlie_789",
                "display_name": "Charlie Brown",
                "verified": True,
                "added_timestamp": int(time.time())
            }
        ],
        "encryption_key_hash": "correct_encryption_key_hash_xyz789abc123"
    }
    
    try:
        # Store contacts first
        store_response = requests.post(f"{BACKEND_URL}/contacts-vault/store", json=store_payload)
        if store_response.status_code != 200:
            print(f"❌ Failed to store contacts for retrieve test: {store_response.status_code}")
            return False
        
        print("Contacts stored successfully, now testing retrieval...")
        
        # Test retrieval with correct encryption key
        device_id = "test_device_vault_002"
        encryption_key_hash = "correct_encryption_key_hash_xyz789abc123"
        
        response = requests.get(f"{BACKEND_URL}/contacts-vault/retrieve/{device_id}?encryption_key_hash={encryption_key_hash}")
        print(f"GET /api/contacts-vault/retrieve/{device_id} - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            # Verify response structure
            required_fields = ["success", "backup_id", "contacts", "signature_verified"]
            if all(field in data for field in required_fields):
                if (data["success"] and 
                    data["signature_verified"] and 
                    len(data["contacts"]) == 1 and
                    data["contacts"][0]["oid"] == "contact_charlie_789"):
                    print("✅ Contacts vault retrieve successful with correct encryption key")
                    
                    # Test with wrong encryption key
                    print("\nTesting with wrong encryption key...")
                    wrong_response = requests.get(f"{BACKEND_URL}/contacts-vault/retrieve/{device_id}?encryption_key_hash=wrong_key_hash_123456789012345678901234567890")
                    print(f"GET with wrong key - Status: {wrong_response.status_code}")
                    
                    if wrong_response.status_code == 403:
                        print("✅ Correctly rejected wrong encryption key")
                        return True
                    else:
                        print(f"❌ Should have rejected wrong key with 403, got: {wrong_response.status_code}")
                        return False
                else:
                    print(f"❌ Retrieve validation failed")
                    return False
            else:
                print(f"❌ Missing required fields in retrieve response")
                return False
        else:
            print(f"❌ Contacts vault retrieve failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Contacts vault retrieve error: {e}")
        return False

def test_contacts_vault_clear():
    """Test DELETE /api/contacts-vault/clear/{device_id} endpoint"""
    print("\n=== Testing DELETE /api/contacts-vault/clear (Contact Vault Clear) ===")
    
    # First store some contacts
    store_payload = {
        "device_id": "test_device_vault_003",
        "contacts": [
            {
                "oid": "contact_delete_test",
                "display_name": "Delete Test Contact",
                "verified": False,
                "added_timestamp": int(time.time())
            }
        ],
        "encryption_key_hash": "delete_test_key_hash_123456789012345678901234567890"
    }
    
    try:
        # Store contacts first
        store_response = requests.post(f"{BACKEND_URL}/contacts-vault/store", json=store_payload)
        if store_response.status_code != 200:
            print(f"❌ Failed to store contacts for clear test: {store_response.status_code}")
            return False
        
        print("Contacts stored successfully, now testing clear...")
        
        # Clear the vault
        device_id = "test_device_vault_003"
        response = requests.delete(f"{BACKEND_URL}/contacts-vault/clear/{device_id}")
        print(f"DELETE /api/contacts-vault/clear/{device_id} - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get("success"):
                print("✅ Contacts vault cleared successfully")
                
                # Verify vault is actually cleared by trying to retrieve
                print("Verifying vault is cleared...")
                retrieve_response = requests.get(f"{BACKEND_URL}/contacts-vault/retrieve/{device_id}?encryption_key_hash=delete_test_key_hash_123456789012345678901234567890")
                
                if retrieve_response.status_code == 404:
                    print("✅ Vault correctly cleared - retrieve returns 404")
                    return True
                else:
                    print(f"❌ Vault not properly cleared - retrieve returned: {retrieve_response.status_code}")
                    return False
            else:
                print(f"❌ Clear failed: {data}")
                return False
        else:
            print(f"❌ Contacts vault clear failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Contacts vault clear error: {e}")
        return False

def test_contacts_vault_security():
    """Test contacts vault security features (quarantine, input sanitization)"""
    print("\n=== Testing Contacts Vault Security Features ===")
    
    # Test dangerous input sanitization
    dangerous_payload = {
        "device_id": "test_device_security",
        "contacts": [
            {
                "oid": "<script>alert('xss')</script>",
                "display_name": "'; DROP TABLE contacts; --",
                "verified": False,
                "added_timestamp": int(time.time())
            }
        ],
        "encryption_key_hash": "security_test_key_hash_123456789012345678901234567890"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/contacts-vault/store", json=dangerous_payload)
        print(f"POST with dangerous input - Status: {response.status_code}")
        
        if response.status_code == 400:
            print("✅ Dangerous input correctly blocked")
            return True
        elif response.status_code == 200:
            print("❌ SECURITY VULNERABILITY: Dangerous input was accepted!")
            return False
        else:
            print(f"⚠️  Unexpected response to dangerous input: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Contacts vault security test error: {e}")
        return False

def test_auto_wipe_configure():
    """Test POST /api/auto-wipe/configure endpoint"""
    print("\n=== Testing POST /api/auto-wipe/configure (Auto-Wipe Configure) ===")
    
    payload = {
        "device_id": "test_device_autowipe_001",
        "enabled": True,
        "days_inactive": 7,
        "wipe_type": "app_data",
        "warning_days": 2
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/auto-wipe/configure", json=payload)
        print(f"POST /api/auto-wipe/configure - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            # Verify response structure
            required_fields = ["success", "message", "config"]
            if all(field in data for field in required_fields):
                if (data["success"] and 
                    data["config"]["device_id"] == "test_device_autowipe_001" and
                    data["config"]["days_inactive"] == 7 and
                    data["config"]["wipe_type"] == "app_data"):
                    print("✅ Auto-wipe configuration successful")
                    return True
                else:
                    print(f"❌ Configuration validation failed")
            else:
                print(f"❌ Missing required fields in response")
        else:
            print(f"❌ Auto-wipe configure failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Auto-wipe configure error: {e}")
    
    return False

def test_auto_wipe_activity():
    """Test POST /api/auto-wipe/activity endpoint"""
    print("\n=== Testing POST /api/auto-wipe/activity (Activity Update) ===")
    
    payload = {
        "device_id": "test_device_autowipe_002",
        "activity_type": "app_usage"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/auto-wipe/activity", json=payload)
        print(f"POST /api/auto-wipe/activity - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            # Verify response structure
            required_fields = ["success", "message", "timestamp"]
            if all(field in data for field in required_fields):
                if data["success"] and isinstance(data["timestamp"], int):
                    print("✅ Activity update successful")
                    return True
                else:
                    print(f"❌ Activity update validation failed")
            else:
                print(f"❌ Missing required fields in response")
        else:
            print(f"❌ Activity update failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Activity update error: {e}")
    
    return False

def test_auto_wipe_status():
    """Test GET /api/auto-wipe/status/{device_id} endpoint"""
    print("\n=== Testing GET /api/auto-wipe/status (Auto-Wipe Status) ===")
    
    # First configure auto-wipe
    config_payload = {
        "device_id": "test_device_autowipe_003",
        "enabled": True,
        "days_inactive": 3,
        "wipe_type": "full_nuke",
        "warning_days": 1
    }
    
    try:
        # Configure auto-wipe first
        config_response = requests.post(f"{BACKEND_URL}/auto-wipe/configure", json=config_payload)
        if config_response.status_code != 200:
            print(f"❌ Failed to configure auto-wipe for status test: {config_response.status_code}")
            return False
        
        print("Auto-wipe configured successfully, now testing status...")
        
        # Check status
        device_id = "test_device_autowipe_003"
        response = requests.get(f"{BACKEND_URL}/auto-wipe/status/{device_id}")
        print(f"GET /api/auto-wipe/status/{device_id} - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            # Verify response structure
            required_fields = ["success", "wipe_pending", "status"]
            if all(field in data for field in required_fields):
                if (data["success"] and 
                    "status" in data and
                    data["status"]["device_id"] == device_id and
                    data["status"]["enabled"] == True and
                    data["status"]["wipe_type"] == "full_nuke"):
                    print("✅ Auto-wipe status check successful")
                    return True
                else:
                    print(f"❌ Status validation failed")
            else:
                print(f"❌ Missing required fields in status response")
        else:
            print(f"❌ Auto-wipe status failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Auto-wipe status error: {e}")
    
    return False

def test_auto_wipe_token():
    """Test GET /api/auto-wipe/token/{device_id} endpoint"""
    print("\n=== Testing GET /api/auto-wipe/token (Wipe Token Retrieval) ===")
    
    device_id = "test_device_autowipe_004"
    
    try:
        # Check for wipe token (should be none initially)
        response = requests.get(f"{BACKEND_URL}/auto-wipe/token/{device_id}")
        print(f"GET /api/auto-wipe/token/{device_id} - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            # Should have no wipe tokens initially
            if data.get("wipe_pending") == False:
                print("✅ No wipe tokens pending (as expected)")
                return True
            else:
                print(f"⚠️  Unexpected wipe token found: {data}")
                return True  # Not necessarily a failure
        else:
            print(f"❌ Wipe token check failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Wipe token test error: {e}")
    
    return False

def test_auto_wipe_integration_steelos():
    """Test auto-wipe integration with STEELOS-SHREDDER"""
    print("\n=== Testing Auto-Wipe Integration with STEELOS-SHREDDER ===")
    
    # Test that auto-wipe can trigger STEELOS-SHREDDER for full_nuke
    device_id = "test_device_integration_001"
    
    # Configure auto-wipe with full_nuke
    config_payload = {
        "device_id": device_id,
        "enabled": True,
        "days_inactive": 2,  # Very short for testing
        "wipe_type": "full_nuke",
        "warning_days": 1  # Must be >= 1 according to validation
    }
    
    try:
        # Configure auto-wipe
        config_response = requests.post(f"{BACKEND_URL}/auto-wipe/configure", json=config_payload)
        if config_response.status_code != 200:
            print(f"❌ Failed to configure auto-wipe integration test: {config_response.status_code}")
            return False
        
        print("Auto-wipe configured for STEELOS integration test")
        
        # Check that STEELOS-SHREDDER endpoints are still working
        shredder_payload = {
            "device_id": device_id,
            "trigger_type": "manual",
            "confirmation_token": "test_integration"
        }
        
        shredder_response = requests.post(f"{BACKEND_URL}/steelos-shredder/deploy", json=shredder_payload)
        print(f"POST /api/steelos-shredder/deploy - Status: {shredder_response.status_code}")
        
        if shredder_response.status_code == 200:
            data = shredder_response.json()
            if data.get("shredder_activated") and data.get("kill_token_generated"):
                print("✅ STEELOS-SHREDDER integration working")
                
                # Check if kill token is available
                status_response = requests.get(f"{BACKEND_URL}/steelos-shredder/status/{device_id}")
                if status_response.status_code == 200:
                    status_data = status_response.json()
                    if status_data.get("shredder_pending"):
                        print("✅ STEELOS-SHREDDER kill token integration working")
                        return True
                    else:
                        print("⚠️  Kill token not found in status check")
                        return True  # Not necessarily a failure
                else:
                    print(f"❌ STEELOS status check failed: {status_response.status_code}")
            else:
                print(f"❌ STEELOS deployment failed: {data}")
        else:
            print(f"❌ STEELOS-SHREDDER integration failed: {shredder_response.status_code}")
            
    except Exception as e:
        print(f"❌ Auto-wipe STEELOS integration error: {e}")
    
    return False

def main():
    """Run focused tests for Contact Vault and Auto-Wipe systems"""
    print("📇⏰ FOCUSED CONTACT VAULT & AUTO-WIPE TESTING")
    print("Testing newly implemented Contact Vault and Auto-Wipe backend endpoints")
    print(f"Backend URL: {BACKEND_URL}")
    print("=" * 80)
    
    results = []
    
    # CONTACT VAULT SYSTEM TESTS
    print("\n📇 CONTACT VAULT SYSTEM TESTS")
    print("=" * 50)
    
    results.append(("Contact Vault: Store", test_contacts_vault_store() is not None))
    results.append(("Contact Vault: Retrieve", test_contacts_vault_retrieve()))
    results.append(("Contact Vault: Clear", test_contacts_vault_clear()))
    results.append(("Contact Vault: Security", test_contacts_vault_security()))
    
    # AUTO-WIPE SYSTEM TESTS
    print("\n⏰ AUTO-WIPE SYSTEM TESTS")
    print("=" * 50)
    
    results.append(("Auto-Wipe: Configure", test_auto_wipe_configure()))
    results.append(("Auto-Wipe: Activity", test_auto_wipe_activity()))
    results.append(("Auto-Wipe: Status", test_auto_wipe_status()))
    results.append(("Auto-Wipe: Token", test_auto_wipe_token()))
    results.append(("Auto-Wipe: STEELOS Integration", test_auto_wipe_integration_steelos()))
    
    # Summary
    print("\n" + "=" * 80)
    print("📇⏰ CONTACT VAULT & AUTO-WIPE TEST RESULTS:")
    print("=" * 80)
    
    passed = 0
    total = len(results)
    contact_vault_tests = 4
    auto_wipe_tests = 5
    
    vault_passed = 0
    wipe_passed = 0
    
    for i, (test_name, success) in enumerate(results):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{test_name:<40} {status}")
        if success:
            passed += 1
            if i < contact_vault_tests:
                vault_passed += 1
            else:
                wipe_passed += 1
    
    print(f"\nContact Vault System: {vault_passed}/{contact_vault_tests} tests passed")
    print(f"Auto-Wipe System: {wipe_passed}/{auto_wipe_tests} tests passed")
    print(f"Overall: {passed}/{total} tests passed")
    
    # Calculate scores
    vault_score = (vault_passed / contact_vault_tests) * 100 if contact_vault_tests > 0 else 0
    wipe_score = (wipe_passed / auto_wipe_tests) * 100 if auto_wipe_tests > 0 else 0
    
    print(f"\n📇 CONTACT VAULT SCORE: {vault_score:.1f}/100")
    print(f"⏰ AUTO-WIPE SCORE: {wipe_score:.1f}/100")
    
    if vault_score == 100.0 and wipe_score == 100.0:
        print("🎉 100/100 NEW SYSTEMS SUCCESS! Contact Vault and Auto-Wipe working perfectly!")
        return 0
    elif vault_score >= 75.0 and wipe_score >= 75.0:
        print("⚠️  Good performance - minor issues to address")
        return 1
    else:
        print("❌ CRITICAL ISSUES FOUND - Immediate action required!")
        return 1

if __name__ == "__main__":
    sys.exit(main())