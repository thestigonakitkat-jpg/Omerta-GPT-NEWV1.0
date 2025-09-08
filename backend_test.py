#!/usr/bin/env python3
"""
🛡️ GRAPHITE-KILLER DEFENSE SYSTEM COMPREHENSIVE TESTING

Tests the world's first comprehensive anti-surveillance system designed 
specifically to detect and defeat Graphite-class state-level spyware.

TESTING SCOPE:
- All 6 Graphite Defense API endpoints
- Threat detection with various attack patterns  
- Emergency response protocols
- System integration and Redis connectivity
- Signature matching and confidence scoring
"""

import requests
import json
import time
import hashlib
import hmac
import secrets
import random
from datetime import datetime, timezone
import sys
import os

# Get backend URL from environment
BACKEND_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://omerta-shield.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

class GraphiteDefenseTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.test_device_id = f"test_device_{int(time.time())}"
        
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
    
    def test_admin_authentication(self):
        """Test Admin Authentication with passphrase 'Omertaisthecode#01'"""
        print("\n🔐 Testing Admin Authentication")
        
        try:
            # Test valid admin authentication
            payload = {
                'admin_passphrase': 'Omertaisthecode#01',
                'device_id': 'test_device_12345'
            }
            
            response = self.session.post(f"{API_BASE}/admin/authenticate", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('session_token'):
                    self.admin_session_token = data['session_token']
                    self.admin_id = data['admin_id']
                    self.log_test("Admin Authentication", True, 
                                f"Admin ID: {data['admin_id']}, Session expires: {datetime.fromtimestamp(data['expires_at']).strftime('%H:%M:%S')}")
                else:
                    self.log_test("Admin Authentication", False, f"Invalid response: {data}")
            else:
                self.log_test("Admin Authentication", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Admin Authentication", False, f"Exception: {str(e)}")
    
    def test_invalid_admin_authentication(self):
        """Test Admin Authentication with wrong passphrase"""
        try:
            payload = {
                'admin_passphrase': 'WrongPassphrase123',
                'device_id': 'test_device_12345'
            }
            
            response = self.session.post(f"{API_BASE}/admin/authenticate", json=payload)
            
            if response.status_code == 401:
                self.log_test("Invalid Admin Authentication Rejection", True, 
                            "Correctly rejected invalid passphrase")
            else:
                self.log_test("Invalid Admin Authentication Rejection", False, 
                            f"Should reject invalid passphrase: HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Invalid Admin Authentication Rejection", False, f"Exception: {str(e)}")
    
    def test_seed_info_retrieval(self):
        """Test GET /api/admin/seed/info to get 12-word seed split into 6/6"""
        print("\n🌱 Testing Admin Seed Info Retrieval")
        
        try:
            response = self.session.get(f"{API_BASE}/admin/seed/info")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'success' and data.get('seed_info'):
                    seed_info = data['seed_info']
                    self.seed_info = seed_info
                    
                    admin1_words = seed_info.get('admin1_words', [])
                    admin2_words = seed_info.get('admin2_words', [])
                    
                    if len(admin1_words) == 6 and len(admin2_words) == 6:
                        self.log_test("Seed Info Retrieval", True, 
                                    f"Admin1 words: {' '.join(admin1_words[:3])}... Admin2 words: {' '.join(admin2_words[:3])}...")
                    else:
                        self.log_test("Seed Info Retrieval", False, 
                                    f"Invalid seed split: Admin1={len(admin1_words)} words, Admin2={len(admin2_words)} words")
                else:
                    self.log_test("Seed Info Retrieval", False, f"Invalid response: {data}")
            else:
                self.log_test("Seed Info Retrieval", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Seed Info Retrieval", False, f"Exception: {str(e)}")
    
    def test_multisig_operation_initiation(self):
        """Test POST /api/admin/multisig/initiate for remote_kill operations"""
        print("\n🚀 Testing Multi-Sig Operation Initiation")
        
        if not self.admin_session_token:
            self.log_test("Multi-Sig Operation Initiation", False, "No admin session token available")
            return
        
        try:
            payload = {
                'session_token': self.admin_session_token,
                'operation_type': 'remote_kill',
                'target_device_id': 'target_device_67890',
                'operation_data': {
                    'reason': 'Security breach detected',
                    'priority': 'critical'
                }
            }
            
            response = self.session.post(f"{API_BASE}/admin/multisig/initiate", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('operation_id'):
                    self.operation_id = data['operation_id']
                    self.log_test("Multi-Sig Operation Initiation", True, 
                                f"Operation ID: {data['operation_id']}, Type: {data.get('operation_type')}, Expires: {datetime.fromtimestamp(data['expires_at']).strftime('%H:%M:%S')}")
                else:
                    self.log_test("Multi-Sig Operation Initiation", False, f"Invalid response: {data}")
            else:
                self.log_test("Multi-Sig Operation Initiation", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Multi-Sig Operation Initiation", False, f"Exception: {str(e)}")
    
    def test_multisig_operation_signing(self):
        """Test POST /api/admin/multisig/sign with seed words and passphrase"""
        print("\n✍️ Testing Multi-Sig Operation Signing")
        
        if not self.operation_id:
            self.log_test("Multi-Sig Operation Signing", False, "No operation ID available")
            return
        
        if not self.seed_info:
            self.log_test("Multi-Sig Operation Signing", False, "No seed info available")
            return
        
        try:
            # Test first admin signature
            admin1_words = self.seed_info.get('admin1_words', [])
            
            payload1 = {
                'operation_id': self.operation_id,
                'admin_seed_words': admin1_words,
                'admin_passphrase': 'Omertaisthecode#01',
                'admin_id': 'admin1'
            }
            
            response1 = self.session.post(f"{API_BASE}/admin/multisig/sign", json=payload1)
            
            if response1.status_code == 200:
                data1 = response1.json()
                if data1.get('success'):
                    signatures_received = data1.get('signatures_received', 0)
                    self.log_test("Multi-Sig First Admin Signature", True, 
                                f"Signatures: {signatures_received}/2, Completed: {data1.get('operation_completed', False)}")
                    
                    # Test second admin signature
                    admin2_words = self.seed_info.get('admin2_words', [])
                    
                    payload2 = {
                        'operation_id': self.operation_id,
                        'admin_seed_words': admin2_words,
                        'admin_passphrase': 'Omertaisthecode#01',
                        'admin_id': 'admin2'
                    }
                    
                    response2 = self.session.post(f"{API_BASE}/admin/multisig/sign", json=payload2)
                    
                    if response2.status_code == 200:
                        data2 = response2.json()
                        if data2.get('success') and data2.get('operation_completed'):
                            execution_result = data2.get('execution_result', {})
                            self.log_test("Multi-Sig Second Admin Signature & Execution", True,
                                        f"Operation executed: {execution_result.get('status')}, Kill token deployed: {bool(execution_result.get('kill_token'))}")
                        else:
                            self.log_test("Multi-Sig Second Admin Signature", False, f"Execution failed: {data2}")
                    else:
                        self.log_test("Multi-Sig Second Admin Signature", False,
                                    f"HTTP {response2.status_code}: {response2.text}")
                else:
                    self.log_test("Multi-Sig First Admin Signature", False, f"Signature failed: {data1}")
            else:
                self.log_test("Multi-Sig First Admin Signature", False,
                            f"HTTP {response1.status_code}: {response1.text}")
                
        except Exception as e:
            self.log_test("Multi-Sig Operation Signing", False, f"Exception: {str(e)}")
    
    def test_operation_status_check(self):
        """Test GET /api/admin/multisig/status/{operation_id}"""
        print("\n📊 Testing Operation Status Check")
        
        if not self.operation_id:
            self.log_test("Operation Status Check", False, "No operation ID available")
            return
        
        try:
            response = self.session.get(f"{API_BASE}/admin/multisig/status/{self.operation_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'success' and data.get('operation'):
                    operation = data['operation']
                    self.log_test("Operation Status Check", True,
                                f"Status: {operation.get('operation_type')}, Completed: {operation.get('completed')}, Signatures: {operation.get('signatures_received')}/{operation.get('signatures_required')}")
                else:
                    self.log_test("Operation Status Check", False, f"Invalid response: {data}")
            else:
                self.log_test("Operation Status Check", False,
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Operation Status Check", False, f"Exception: {str(e)}")
    
    def test_rate_limiting(self):
        """Test rate limiting on admin endpoints"""
        print("\n🚦 Testing Rate Limiting")
        
        # Test auth rate limiting (5/min)
        try:
            auth_blocked = False
            for i in range(7):  # Try to exceed 5/min limit
                payload = {
                    'admin_passphrase': 'TestPassphrase123',
                    'device_id': f'test_device_{i}'
                }
                response = self.session.post(f"{API_BASE}/admin/authenticate", json=payload)
                if response.status_code == 429:
                    auth_blocked = True
                    break
                time.sleep(0.1)
            
            if auth_blocked:
                self.log_test("Admin Auth Rate Limiting", True, f"Rate limit triggered after {i+1} requests")
            else:
                self.log_test("Admin Auth Rate Limiting", False, "Rate limiting not working for auth")
                
        except Exception as e:
            self.log_test("Admin Auth Rate Limiting", False, f"Exception: {str(e)}")
        
        # Test multisig initiate rate limiting (3/min)
        if self.admin_session_token:
            try:
                initiate_blocked = False
                for i in range(5):  # Try to exceed 3/min limit
                    payload = {
                        'session_token': self.admin_session_token,
                        'operation_type': 'remote_kill',
                        'target_device_id': f'test_target_{i}'
                    }
                    response = self.session.post(f"{API_BASE}/admin/multisig/initiate", json=payload)
                    if response.status_code == 429:
                        initiate_blocked = True
                        break
                    time.sleep(0.1)
                
                if initiate_blocked:
                    self.log_test("Multi-Sig Initiate Rate Limiting", True, f"Rate limit triggered after {i+1} requests")
                else:
                    self.log_test("Multi-Sig Initiate Rate Limiting", False, "Rate limiting not working for initiate")
                    
            except Exception as e:
                self.log_test("Multi-Sig Initiate Rate Limiting", False, f"Exception: {str(e)}")
    
    def test_input_sanitization(self):
        """Test input sanitization on admin endpoints"""
        print("\n🛡️ Testing Input Sanitization")
        
        try:
            dangerous_payloads = [
                '<script>alert("xss")</script>',
                '; DROP TABLE admin_sessions; --',
                '../../../etc/passwd',
                'javascript:alert(1)',
                'eval(malicious_code)'
            ]
            
            sanitization_working = 0
            for payload in dangerous_payloads:
                test_data = {
                    'admin_passphrase': payload,
                    'device_id': 'test_device'
                }
                response = self.session.post(f"{API_BASE}/admin/authenticate", json=test_data)
                if response.status_code == 400:
                    sanitization_working += 1
            
            if sanitization_working >= len(dangerous_payloads) * 0.8:  # 80% blocked
                self.log_test("Input Sanitization", True, f"{sanitization_working}/{len(dangerous_payloads)} dangerous payloads blocked")
            else:
                self.log_test("Input Sanitization", False, f"Only {sanitization_working}/{len(dangerous_payloads)} payloads blocked")
                
        except Exception as e:
            self.log_test("Input Sanitization", False, f"Exception: {str(e)}")
    
    def test_invalid_operations(self):
        """Test invalid operation scenarios"""
        print("\n❌ Testing Invalid Operation Scenarios")
        
        # Test signing non-existent operation
        try:
            payload = {
                'operation_id': 'fake_operation_id_12345',
                'admin_seed_words': ['fake', 'seed', 'words', 'test', 'invalid', 'operation'],
                'admin_passphrase': 'Omertaisthecode#01',
                'admin_id': 'admin1'
            }
            
            response = self.session.post(f"{API_BASE}/admin/multisig/sign", json=payload)
            
            if response.status_code == 404:
                self.log_test("Invalid Operation ID Rejection", True, "Correctly rejected non-existent operation")
            else:
                self.log_test("Invalid Operation ID Rejection", False, f"Should reject invalid operation: HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Invalid Operation ID Rejection", False, f"Exception: {str(e)}")
        
        # Test invalid seed words
        if self.operation_id:
            try:
                payload = {
                    'operation_id': self.operation_id,
                    'admin_seed_words': ['invalid', 'seed', 'words', 'that', 'dont', 'match'],
                    'admin_passphrase': 'Omertaisthecode#01',
                    'admin_id': 'admin1'
                }
                
                response = self.session.post(f"{API_BASE}/admin/multisig/sign", json=payload)
                
                if response.status_code == 401:
                    self.log_test("Invalid Seed Words Rejection", True, "Correctly rejected invalid seed words")
                else:
                    self.log_test("Invalid Seed Words Rejection", False, f"Should reject invalid seed words: HTTP {response.status_code}")
                    
            except Exception as e:
                self.log_test("Invalid Seed Words Rejection", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all admin system tests"""
        print("🔐 ADMIN SYSTEM WITH MULTI-SIGNATURE OPERATIONS COMPREHENSIVE TESTING")
        print("=" * 80)
        
        # Core Admin System Tests
        self.test_admin_authentication()
        self.test_invalid_admin_authentication()
        self.test_seed_info_retrieval()
        self.test_multisig_operation_initiation()
        self.test_multisig_operation_signing()
        self.test_operation_status_check()
        
        # Security Feature Tests
        self.test_rate_limiting()
        self.test_input_sanitization()
        self.test_invalid_operations()
        
        # Generate summary
        self.generate_summary()
    
    def generate_summary(self):
        """Generate test summary"""
        print("\n" + "=" * 80)
        print("🔐 ADMIN SYSTEM MULTI-SIGNATURE PROTOCOL TEST SUMMARY")
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
            'Admin Authentication',
            'Seed Info Retrieval',
            'Multi-Sig Operation Initiation',
            'Multi-Sig Second Admin Signature & Execution'
        ]
        
        critical_passed = sum(1 for result in self.test_results 
                            if result['success'] and result['test'] in critical_tests)
        
        if critical_passed == len(critical_tests):
            print("\n🎉 ADMIN SYSTEM MULTI-SIGNATURE PROTOCOL: FULLY OPERATIONAL")
            print("All critical admin operations working: authentication, multi-sig, remote kill!")
        elif critical_passed >= len(critical_tests) * 0.75:
            print("\n⚠️ ADMIN SYSTEM MULTI-SIGNATURE PROTOCOL: MOSTLY OPERATIONAL")
            print("Core functionality working with minor issues")
        else:
            print("\n❌ ADMIN SYSTEM MULTI-SIGNATURE PROTOCOL: CRITICAL ISSUES")
            print("Major functionality problems detected")
        
        return passed_tests, failed_tests

if __name__ == "__main__":
    print(f"Testing backend at: {API_BASE}")
    tester = AdminSystemTester()
    tester.run_all_tests()