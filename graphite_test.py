#!/usr/bin/env python3
"""
🛡️ OMERTÁ GRAPHITE DEFENSE TESTING
Test Graphite Defense System with Redis now available
"""

import requests
import time
import hashlib

BACKEND_URL = "http://localhost:8001/api"

def test_graphite_defense():
    """Test Graphite Defense System"""
    print("🛡️ TESTING GRAPHITE DEFENSE SYSTEM WITH REDIS")
    
    # 1. Test system status
    try:
        response = requests.get(f"{BACKEND_URL}/graphite-defense/status", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("system_status") == "OPERATIONAL":
                print(f"✅ PASS | Graphite Defense Status | System operational with {data.get('active_signatures', 0)} signatures")
            else:
                print(f"❌ FAIL | Graphite Defense Status | System not operational: {data}")
        else:
            print(f"❌ FAIL | Graphite Defense Status | HTTP {response.status_code}")
    except Exception as e:
        print(f"❌ FAIL | Graphite Defense Status | Error: {str(e)}")
    
    # 2. Test emergency countermeasures with proper authorization
    try:
        device_id = "test_device_emergency_redis"
        expected_code = hashlib.sha256(f"EMERGENCY_GRAPHITE_DEFENSE_{device_id}".encode()).hexdigest()[:8]
        
        countermeasure_data = {
            "device_id": device_id,
            "threat_level": 5,  # CRITICAL_BREACH
            "authorization_code": expected_code,
            "immediate_action": True
        }
        
        response = requests.post(f"{BACKEND_URL}/graphite-defense/deploy-emergency", 
                               json=countermeasure_data, timeout=10)
        if response.status_code == 200:
            result = response.json()
            if result.get('status') == 'SUCCESS':
                print(f"✅ PASS | Graphite Emergency Countermeasures | Deployed {result.get('measures_deployed', 0)} countermeasures")
            else:
                print(f"❌ FAIL | Graphite Emergency Countermeasures | Deployment failed: {result}")
        else:
            print(f"❌ FAIL | Graphite Emergency Countermeasures | HTTP {response.status_code}")
    except Exception as e:
        print(f"❌ FAIL | Graphite Emergency Countermeasures | Error: {str(e)}")

if __name__ == "__main__":
    test_graphite_defense()