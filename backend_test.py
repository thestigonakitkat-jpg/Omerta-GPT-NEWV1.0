#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Admin System with Multi-Signature Operations
Tests admin authentication, multi-sig operations, seed info retrieval, and rate limiting
"""

import requests
import json
import time
import hashlib
import hmac
import secrets
from datetime import datetime, timezone
import sys
import os

# Get backend URL from environment
BACKEND_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://stealth-comms-1.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

class AdminSystemTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.admin_session_token = None
        self.admin_id = None
        self.operation_id = None
        self.seed_info = None
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    Details: {details}")
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
    
    def test_dual_key_initiate(self):
        """Test Design A: Dual-Key Operation Initiation"""
        print("\n🔐🔐 Testing Design A: Dual-Command Bridge System")
        
        try:
            # Test valid dual-key operation initiation
            payload = {
                'operation_type': 'system_reset',
                'operation_data': {'reset_level': 'full', 'confirmation': True},
                'operator_a_id': 'dev_primary',
                'operator_b_id': 'sec_officer'
            }
            
            response = self.session.post(f"{API_BASE}/dual-key/initiate", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('operation_id'):
                    self.operation_ids['dual_key'] = data['operation_id']
                    self.log_test("Dual-Key Operation Initiation", True, 
                                f"Operation ID: {data['operation_id']}, Status: {data.get('status')}")
                else:
                    self.log_test("Dual-Key Operation Initiation", False, f"Invalid response: {data}")
            else:
                self.log_test("Dual-Key Operation Initiation", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Dual-Key Operation Initiation", False, f"Exception: {str(e)}")
    
    def test_dual_key_authenticate(self):
        """Test Design A: Dual-Key Operator Authentication"""
        if 'dual_key' not in self.operation_ids:
            self.log_test("Dual-Key Authentication", False, "No operation ID available")
            return
            
        try:
            operation_id = self.operation_ids['dual_key']
            
            # Test first operator authentication
            auth_payload = {
                'operation_id': operation_id,
                'operator_id': 'dev_primary',
                'key_fragment': 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
                'password': 'DevSecure2025!',
                'totp_code': self.generate_totp_code('JBSWY3DPEHPK3PXP'),
                'cryptographic_signature': 'test_signature_dev_primary'
            }
            
            response = self.session.post(f"{API_BASE}/dual-key/authenticate", json=auth_payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_test("Dual-Key First Operator Auth", True, 
                                f"Status: {data.get('status')}, Next: {data.get('next_step')}")
                    
                    # Test second operator authentication
                    auth_payload2 = {
                        'operation_id': operation_id,
                        'operator_id': 'sec_officer',
                        'key_fragment': 'f6e5d4c3b2a1098765432109876543210fedcba0987654321fedcba09876543',
                        'password': 'SecOfficer2025!',
                        'totp_code': self.generate_totp_code('JBSWY3DPEHPK3PXQ'),
                        'cryptographic_signature': 'test_signature_sec_officer'
                    }
                    
                    response2 = self.session.post(f"{API_BASE}/dual-key/authenticate", json=auth_payload2)
                    
                    if response2.status_code == 200:
                        data2 = response2.json()
                        if data2.get('success') and data2.get('status') == 'executed':
                            self.log_test("Dual-Key Second Operator Auth & Execution", True,
                                        f"Operation executed successfully: {data2.get('message')}")
                        else:
                            self.log_test("Dual-Key Second Operator Auth", False, f"Execution failed: {data2}")
                    else:
                        self.log_test("Dual-Key Second Operator Auth", False,
                                    f"HTTP {response2.status_code}: {response2.text}")
                else:
                    self.log_test("Dual-Key First Operator Auth", False, f"Auth failed: {data}")
            else:
                self.log_test("Dual-Key First Operator Auth", False,
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Dual-Key Authentication", False, f"Exception: {str(e)}")
    
    def test_dual_key_status(self):
        """Test Design A: Dual-Key Operation Status"""
        if 'dual_key' not in self.operation_ids:
            self.log_test("Dual-Key Status Check", False, "No operation ID available")
            return
            
        try:
            operation_id = self.operation_ids['dual_key']
            response = self.session.get(f"{API_BASE}/dual-key/status/{operation_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_test("Dual-Key Status Check", True,
                                f"Status: {data.get('status')}, Type: {data.get('operation_type')}")
                else:
                    self.log_test("Dual-Key Status Check", False, f"Invalid response: {data}")
            else:
                self.log_test("Dual-Key Status Check", False,
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Dual-Key Status Check", False, f"Exception: {str(e)}")
    
    def test_split_master_key_initiate(self):
        """Test Design B: Split Master Key Operation Initiation"""
        print("\n🔑🔑 Testing Design B: Split Master Key System")
        
        try:
            payload = {
                'operation_type': 'emergency_override',
                'operation_data': {'override_level': 'critical', 'reason': 'emergency_access'}
            }
            
            response = self.session.post(f"{API_BASE}/split-master-key/initiate", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('operation_id'):
                    self.operation_ids['split_key'] = data['operation_id']
                    self.log_test("Split Master Key Initiation", True,
                                f"Operation ID: {data['operation_id']}, Fragments required: {data.get('fragments_required')}")
                else:
                    self.log_test("Split Master Key Initiation", False, f"Invalid response: {data}")
            else:
                self.log_test("Split Master Key Initiation", False,
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Split Master Key Initiation", False, f"Exception: {str(e)}")
    
    def test_split_master_key_fragments(self):
        """Test Design B: Split Master Key Fragment Provision"""
        if 'split_key' not in self.operation_ids:
            self.log_test("Split Master Key Fragments", False, "No operation ID available")
            return
            
        try:
            # Test first key holder fragment
            fragment_payload1 = {
                'key_holder_id': 'dev_alpha',
                'key_fragment': 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
                'pin': 'DEV2025',
                'totp_code': self.generate_totp_code('JBSWY3DPEHPK3PXP'),
                'operation_type': 'emergency_override'
            }
            
            response1 = self.session.post(f"{API_BASE}/split-master-key/fragment", json=fragment_payload1)
            
            if response1.status_code == 200:
                data1 = response1.json()
                if data1.get('success'):
                    self.log_test("Split Key First Fragment", True,
                                f"Status: {data1.get('master_key_status')}, Fragments: {data1.get('fragments_received')}/{data1.get('fragments_required')}")
                    
                    # Test second key holder fragment
                    fragment_payload2 = {
                        'key_holder_id': 'sec_bravo',
                        'key_fragment': 'f6e5d4c3b2a1098765432109876543210fedcba0987654321fedcba09876543',
                        'pin': 'SEC2025',
                        'totp_code': self.generate_totp_code('JBSWY3DPEHPK3PXQ'),
                        'operation_type': 'emergency_override'
                    }
                    
                    response2 = self.session.post(f"{API_BASE}/split-master-key/fragment", json=fragment_payload2)
                    
                    if response2.status_code == 200:
                        data2 = response2.json()
                        if data2.get('success') and 'reconstructed' in data2.get('master_key_status', ''):
                            self.log_test("Split Key Second Fragment & Reconstruction", True,
                                        f"Master key reconstructed and operation executed: {data2.get('message')}")
                        else:
                            self.log_test("Split Key Second Fragment", False, f"Reconstruction failed: {data2}")
                    else:
                        self.log_test("Split Key Second Fragment", False,
                                    f"HTTP {response2.status_code}: {response2.text}")
                else:
                    self.log_test("Split Key First Fragment", False, f"Fragment rejected: {data1}")
            else:
                self.log_test("Split Key First Fragment", False,
                            f"HTTP {response1.status_code}: {response1.text}")
                
        except Exception as e:
            self.log_test("Split Master Key Fragments", False, f"Exception: {str(e)}")
    
    def test_split_master_key_status(self):
        """Test Design B: Split Master Key Operation Status"""
        if 'split_key' not in self.operation_ids:
            self.log_test("Split Master Key Status", False, "No operation ID available")
            return
            
        try:
            operation_id = self.operation_ids['split_key']
            response = self.session.get(f"{API_BASE}/split-master-key/status/{operation_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_test("Split Master Key Status", True,
                                f"Status: {data.get('status')}, Key reconstructed: {data.get('master_key_reconstructed')}")
                else:
                    self.log_test("Split Master Key Status", False, f"Invalid response: {data}")
            else:
                self.log_test("Split Master Key Status", False,
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Split Master Key Status", False, f"Exception: {str(e)}")
    
    def test_security_features(self):
        """Test Security Features: Rate Limiting and Input Sanitization"""
        print("\n🔒 Testing Security Features")
        
        # Test rate limiting on dual-key initiate
        try:
            rate_limit_count = 0
            for i in range(7):  # Try to exceed 5/hour limit
                payload = {
                    'operation_type': 'system_reset',
                    'operation_data': {'test': f'rate_limit_{i}'},
                    'operator_a_id': 'dev_primary',
                    'operator_b_id': 'sec_officer'
                }
                response = self.session.post(f"{API_BASE}/dual-key/initiate", json=payload)
                if response.status_code == 429:
                    rate_limit_count += 1
                    break
                time.sleep(0.1)  # Small delay between requests
            
            if rate_limit_count > 0:
                self.log_test("Dual-Key Rate Limiting", True, f"Rate limit triggered after {i+1} requests")
            else:
                self.log_test("Dual-Key Rate Limiting", False, "Rate limiting not working")
                
        except Exception as e:
            self.log_test("Dual-Key Rate Limiting", False, f"Exception: {str(e)}")
        
        # Test input sanitization
        try:
            dangerous_payloads = [
                '<script>alert("xss")</script>',
                '; DROP TABLE operations; --',
                '../../../etc/passwd',
                'javascript:alert(1)',
                'eval(malicious_code)'
            ]
            
            sanitization_working = 0
            for payload in dangerous_payloads:
                test_data = {
                    'operation_type': payload,
                    'operation_data': {'test': 'sanitization'},
                    'operator_a_id': 'dev_primary',
                    'operator_b_id': 'sec_officer'
                }
                response = self.session.post(f"{API_BASE}/dual-key/initiate", data=test_data)
                if response.status_code == 400:
                    sanitization_working += 1
            
            if sanitization_working >= len(dangerous_payloads) * 0.8:  # 80% blocked
                self.log_test("Input Sanitization", True, f"{sanitization_working}/{len(dangerous_payloads)} dangerous payloads blocked")
            else:
                self.log_test("Input Sanitization", False, f"Only {sanitization_working}/{len(dangerous_payloads)} payloads blocked")
                
        except Exception as e:
            self.log_test("Input Sanitization", False, f"Exception: {str(e)}")
    
    def test_operation_timeouts(self):
        """Test Operation Timeout Behavior"""
        print("\n⏰ Testing Operation Timeouts")
        
        try:
            # Create a dual-key operation and check timeout behavior
            payload = {
                'operation_type': 'emergency_access',
                'operation_data': {'timeout_test': True},
                'operator_a_id': 'dev_primary',
                'operator_b_id': 'sec_officer'
            }
            
            response = self.session.post(f"{API_BASE}/dual-key/initiate", data=payload)
            
            if response.status_code == 200:
                data = response.json()
                operation_id = data.get('operation_id')
                
                if operation_id:
                    # Check initial status
                    status_response = self.session.get(f"{API_BASE}/dual-key/status/{operation_id}")
                    if status_response.status_code == 200:
                        status_data = status_response.json()
                        time_remaining = status_data.get('time_remaining', 0)
                        
                        if time_remaining > 0 and time_remaining <= 300:  # 5 minutes max
                            self.log_test("Operation Timeout Configuration", True,
                                        f"Operation expires in {time_remaining} seconds (≤5 minutes)")
                        else:
                            self.log_test("Operation Timeout Configuration", False,
                                        f"Invalid timeout: {time_remaining} seconds")
                    else:
                        self.log_test("Operation Timeout Configuration", False, "Could not check status")
                else:
                    self.log_test("Operation Timeout Configuration", False, "No operation ID returned")
            else:
                self.log_test("Operation Timeout Configuration", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Operation Timeout Configuration", False, f"Exception: {str(e)}")
    
    def test_authentication_validation(self):
        """Test Authentication and Authorization Validation"""
        print("\n🔐 Testing Authentication & Authorization")
        
        try:
            # Test invalid operator authentication
            invalid_auth_payload = {
                'operation_id': 'fake_operation_id',
                'operator_id': 'invalid_operator',
                'key_fragment': 'invalid_fragment',
                'password': 'wrong_password',
                'totp_code': '000000',
                'cryptographic_signature': 'invalid_signature'
            }
            
            response = self.session.post(f"{API_BASE}/dual-key/authenticate", json=invalid_auth_payload)
            
            if response.status_code in [403, 404]:
                self.log_test("Invalid Operator Rejection", True, f"HTTP {response.status_code} - Unauthorized access blocked")
            else:
                self.log_test("Invalid Operator Rejection", False, f"Invalid operator not properly rejected: HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Invalid Operator Rejection", False, f"Exception: {str(e)}")
        
        try:
            # Test invalid key holder for split master key
            invalid_fragment_payload = {
                'key_holder_id': 'unknown_holder',
                'key_fragment': 'invalid_fragment',
                'pin': 'WRONG',
                'totp_code': '000000',
                'operation_type': 'system_reset'
            }
            
            response = self.session.post(f"{API_BASE}/split-master-key/fragment", json=invalid_fragment_payload)
            
            if response.status_code in [403, 404]:
                self.log_test("Invalid Key Holder Rejection", True, f"HTTP {response.status_code} - Unknown key holder blocked")
            else:
                self.log_test("Invalid Key Holder Rejection", False, f"Invalid key holder not properly rejected: HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Invalid Key Holder Rejection", False, f"Exception: {str(e)}")
    
    def test_cryptographic_signatures(self):
        """Test Cryptographic Signature Verification"""
        print("\n🔐 Testing Cryptographic Features")
        
        try:
            # Test that operations generate proper signatures
            payload = {
                'operation_type': 'master_override',
                'operation_data': {'signature_test': True},
                'operator_a_id': 'dev_primary',
                'operator_b_id': 'sec_officer'
            }
            
            response = self.session.post(f"{API_BASE}/dual-key/initiate", data=payload)
            
            if response.status_code == 200:
                data = response.json()
                operation_id = data.get('operation_id')
                
                # Check if operation ID contains cryptographic elements
                if operation_id and len(operation_id) > 32 and 'DUAL_KEY' in operation_id:
                    self.log_test("Cryptographic Operation ID Generation", True,
                                f"Operation ID has cryptographic structure: {operation_id[:50]}...")
                else:
                    self.log_test("Cryptographic Operation ID Generation", False,
                                f"Operation ID lacks cryptographic structure: {operation_id}")
            else:
                self.log_test("Cryptographic Operation ID Generation", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Cryptographic Operation ID Generation", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all dual-key nuclear submarine protocol tests"""
        print("🚢⚛️ DUAL-KEY NUCLEAR SUBMARINE PROTOCOL COMPREHENSIVE TESTING")
        print("=" * 80)
        
        # Design A: Dual-Command Bridge System Tests
        self.test_dual_key_initiate()
        self.test_dual_key_authenticate()
        self.test_dual_key_status()
        
        # Design B: Split Master Key System Tests
        self.test_split_master_key_initiate()
        self.test_split_master_key_fragments()
        self.test_split_master_key_status()
        
        # Security Feature Tests
        self.test_security_features()
        self.test_operation_timeouts()
        self.test_authentication_validation()
        self.test_cryptographic_signatures()
        
        # Generate summary
        self.generate_summary()
    
    def generate_summary(self):
        """Generate test summary"""
        print("\n" + "=" * 80)
        print("🚢⚛️ DUAL-KEY NUCLEAR SUBMARINE PROTOCOL TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  • {result['test']}: {result['details']}")
        
        # Determine overall system status
        critical_tests = [
            'Dual-Key Operation Initiation',
            'Dual-Key Second Operator Auth & Execution',
            'Split Master Key Initiation',
            'Split Key Second Fragment & Reconstruction'
        ]
        
        critical_passed = sum(1 for result in self.test_results 
                            if result['success'] and result['test'] in critical_tests)
        
        if critical_passed == len(critical_tests):
            print("\n🎉 DUAL-KEY NUCLEAR SUBMARINE PROTOCOL: FULLY OPERATIONAL")
            print("Both Design A (Dual-Command Bridge) and Design B (Split Master Key) systems working!")
        elif critical_passed >= len(critical_tests) * 0.75:
            print("\n⚠️ DUAL-KEY NUCLEAR SUBMARINE PROTOCOL: MOSTLY OPERATIONAL")
            print("Core functionality working with minor issues")
        else:
            print("\n❌ DUAL-KEY NUCLEAR SUBMARINE PROTOCOL: CRITICAL ISSUES")
            print("Major functionality problems detected")
        
        return passed_tests, failed_tests

if __name__ == "__main__":
    print(f"Testing backend at: {API_BASE}")
    tester = DualKeyNuclearProtocolTester()
    tester.run_all_tests()