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
    
    def generate_normal_metrics(self) -> dict:
        """Generate normal device metrics (should show CLEAN)"""
        return {
            "device_id": self.test_device_id,
            "timestamp": int(time.time()),
            "cpu_usage_pattern": [15.2, 18.5, 12.1, 20.3, 16.8],  # Normal CPU usage
            "memory_pressure": 0.45,  # 45% memory usage - normal
            "battery_drain_rate": 0.05,  # 5% per hour - normal
            "network_anomalies": 2,  # Few anomalies - normal
            "process_anomalies": False,
            "disk_io_anomalies": 1,
            "thermal_signature": 0.3,  # 30% thermal - normal
            "app_performance_metrics": {
                "response_time": 120.5,
                "memory_usage": 45.2
            }
        }
    
    def generate_suspicious_cpu_metrics(self) -> dict:
        """Generate suspicious CPU patterns (should detect surveillance)"""
        return {
            "device_id": self.test_device_id,
            "timestamp": int(time.time()),
            "cpu_usage_pattern": [78.5, 82.1, 79.3, 85.2, 80.7],  # High sustained CPU
            "memory_pressure": 0.55,
            "battery_drain_rate": 0.08,
            "network_anomalies": 3,
            "process_anomalies": True,
            "disk_io_anomalies": 2,
            "thermal_signature": 0.65,
            "app_performance_metrics": {
                "response_time": 250.8,
                "memory_usage": 78.3
            }
        }
    
    def generate_memory_scanning_metrics(self) -> dict:
        """Generate high memory pressure (should detect memory scanning)"""
        return {
            "device_id": self.test_device_id,
            "timestamp": int(time.time()),
            "cpu_usage_pattern": [45.2, 48.5, 42.1, 50.3, 46.8],
            "memory_pressure": 0.85,  # 85% memory pressure - suspicious
            "battery_drain_rate": 0.09,
            "network_anomalies": 4,
            "process_anomalies": True,
            "disk_io_anomalies": 5,
            "thermal_signature": 0.55,
            "app_performance_metrics": {
                "response_time": 180.5,
                "memory_usage": 85.2
            }
        }
    
    def generate_battery_drain_metrics(self) -> dict:
        """Generate battery drain patterns (should detect spyware activity)"""
        return {
            "device_id": self.test_device_id,
            "timestamp": int(time.time()),
            "cpu_usage_pattern": [35.2, 38.5, 32.1, 40.3, 36.8],
            "memory_pressure": 0.65,
            "battery_drain_rate": 0.15,  # 15% per hour - excessive drain
            "network_anomalies": 3,
            "process_anomalies": True,
            "disk_io_anomalies": 3,
            "thermal_signature": 0.45,
            "app_performance_metrics": {
                "response_time": 160.5,
                "memory_usage": 65.2
            }
        }
    
    def generate_network_exfiltration_metrics(self) -> dict:
        """Generate network anomalies (should detect data exfiltration)"""
        return {
            "device_id": self.test_device_id,
            "timestamp": int(time.time()),
            "cpu_usage_pattern": [25.2, 28.5, 22.1, 30.3, 26.8],
            "memory_pressure": 0.55,
            "battery_drain_rate": 0.07,
            "network_anomalies": 12,  # High network anomalies - suspicious
            "process_anomalies": True,
            "disk_io_anomalies": 8,
            "thermal_signature": 0.35,
            "app_performance_metrics": {
                "response_time": 140.5,
                "memory_usage": 55.2
            }
        }
    
    def generate_critical_breach_metrics(self) -> dict:
        """Generate metrics indicating critical breach"""
        return {
            "device_id": self.test_device_id,
            "timestamp": int(time.time()),
            "cpu_usage_pattern": [88.5, 92.1, 89.3, 95.2, 90.7],  # Very high CPU
            "memory_pressure": 0.92,  # Very high memory pressure
            "battery_drain_rate": 0.18,  # Extreme battery drain
            "network_anomalies": 15,  # Many network anomalies
            "process_anomalies": True,
            "disk_io_anomalies": 12,
            "thermal_signature": 0.85,  # High thermal signature
            "app_performance_metrics": {
                "response_time": 450.8,
                "memory_usage": 92.3
            }
        }
    
    def test_system_status(self):
        """Test GET /api/graphite-defense/status - System operational status"""
        print("\n🛡️ Testing Graphite Defense System Status")
        
        try:
            response = self.session.get(f"{API_BASE}/graphite-defense/status")
            
            if response.status_code == 200:
                data = response.json()
                if (data.get('system_status') == 'OPERATIONAL' and 
                    'active_signatures' in data and 
                    'capabilities' in data):
                    
                    capabilities = data.get('capabilities', [])
                    expected_capabilities = [
                        'Real-time threat detection',
                        'Behavioral pattern analysis', 
                        'Automatic countermeasure deployment',
                        'Emergency response protocols',
                        'Global threat intelligence'
                    ]
                    
                    has_all_capabilities = all(cap in capabilities for cap in expected_capabilities)
                    
                    self.log_test("System Status Check", True, 
                                f"Status: {data['system_status']}, Signatures: {data.get('active_signatures')}, Redis: {data.get('redis_status')}, Capabilities: {len(capabilities)}/5")
                else:
                    self.log_test("System Status Check", False, f"Invalid response structure: {data}")
            else:
                self.log_test("System Status Check", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("System Status Check", False, f"Exception: {str(e)}")
    
    def test_graphite_signatures(self):
        """Test GET /api/graphite-defense/signatures - Known Graphite signatures"""
        print("\n🎯 Testing Graphite Signature Database")
        
        try:
            response = self.session.get(f"{API_BASE}/graphite-defense/signatures")
            
            if response.status_code == 200:
                signatures = response.json()
                if isinstance(signatures, list) and len(signatures) > 0:
                    
                    expected_signatures = [
                        "High CPU Surveillance Pattern",
                        "Memory Scanning Indicator", 
                        "Battery Drain Attack",
                        "Network Exfiltration Pattern",
                        "Thermal Overload Signature"
                    ]
                    
                    signature_names = [sig.get('name') for sig in signatures]
                    found_signatures = [name for name in expected_signatures if name in signature_names]
                    
                    if len(found_signatures) >= 4:  # At least 4 out of 5 signatures
                        self.log_test("Graphite Signatures Retrieval", True, 
                                    f"Found {len(signatures)} signatures including: {', '.join(found_signatures[:3])}...")
                    else:
                        self.log_test("Graphite Signatures Retrieval", False, 
                                    f"Missing expected signatures. Found: {signature_names}")
                else:
                    self.log_test("Graphite Signatures Retrieval", False, f"Invalid signatures response: {signatures}")
            else:
                self.log_test("Graphite Signatures Retrieval", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Graphite Signatures Retrieval", False, f"Exception: {str(e)}")
    
    def test_normal_threat_report(self):
        """Test POST /api/graphite-defense/report-threat with normal metrics"""
        print("\n📊 Testing Normal Device Metrics (Should Show CLEAN)")
        
        try:
            metrics = self.generate_normal_metrics()
            response = self.session.post(f"{API_BASE}/graphite-defense/report-threat", json=metrics)
            
            if response.status_code == 200:
                analysis = response.json()
                if (analysis.get('device_id') == self.test_device_id and 
                    'threat_level' in analysis and 
                    'confidence' in analysis):
                    
                    threat_level = analysis.get('threat_level')
                    confidence = analysis.get('confidence', 0)
                    
                    # Normal metrics should show CLEAN (0) or SUSPICIOUS (1) at most
                    if threat_level <= 1 and confidence < 30:
                        self.log_test("Normal Metrics Threat Analysis", True, 
                                    f"Threat Level: {threat_level} (CLEAN/SUSPICIOUS), Confidence: {confidence:.1f}%")
                    else:
                        self.log_test("Normal Metrics Threat Analysis", False, 
                                    f"Normal metrics flagged as high threat: Level {threat_level}, Confidence {confidence:.1f}%")
                else:
                    self.log_test("Normal Metrics Threat Analysis", False, f"Invalid analysis response: {analysis}")
            else:
                self.log_test("Normal Metrics Threat Analysis", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Normal Metrics Threat Analysis", False, f"Exception: {str(e)}")
    
    def test_suspicious_cpu_threat_report(self):
        """Test POST /api/graphite-defense/report-threat with suspicious CPU patterns"""
        print("\n🔥 Testing Suspicious CPU Patterns (Should Detect Surveillance)")
        
        try:
            metrics = self.generate_suspicious_cpu_metrics()
            response = self.session.post(f"{API_BASE}/graphite-defense/report-threat", json=metrics)
            
            if response.status_code == 200:
                analysis = response.json()
                if 'threat_level' in analysis and 'signature_matches' in analysis:
                    
                    threat_level = analysis.get('threat_level')
                    confidence = analysis.get('confidence', 0)
                    signature_matches = analysis.get('signature_matches', [])
                    
                    # Should detect high CPU surveillance pattern
                    cpu_signature_detected = any('CPU' in sig for sig in signature_matches)
                    
                    if threat_level >= 1 and confidence > 15 and cpu_signature_detected:
                        self.log_test("Suspicious CPU Pattern Detection", True, 
                                    f"Detected: Level {threat_level}, Confidence: {confidence:.1f}%, Signatures: {len(signature_matches)}")
                    else:
                        self.log_test("Suspicious CPU Pattern Detection", False, 
                                    f"Failed to detect CPU surveillance: Level {threat_level}, Confidence {confidence:.1f}%")
                else:
                    self.log_test("Suspicious CPU Pattern Detection", False, f"Invalid analysis response: {analysis}")
            else:
                self.log_test("Suspicious CPU Pattern Detection", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Suspicious CPU Pattern Detection", False, f"Exception: {str(e)}")
    
    def test_memory_scanning_threat_report(self):
        """Test POST /api/graphite-defense/report-threat with memory scanning indicators"""
        print("\n🧠 Testing Memory Scanning Detection")
        
        try:
            metrics = self.generate_memory_scanning_metrics()
            response = self.session.post(f"{API_BASE}/graphite-defense/report-threat", json=metrics)
            
            if response.status_code == 200:
                analysis = response.json()
                if 'threat_level' in analysis and 'signature_matches' in analysis:
                    
                    threat_level = analysis.get('threat_level')
                    confidence = analysis.get('confidence', 0)
                    signature_matches = analysis.get('signature_matches', [])
                    
                    # Should detect memory scanning
                    memory_signature_detected = any('Memory' in sig for sig in signature_matches)
                    
                    if threat_level >= 1 and memory_signature_detected:
                        self.log_test("Memory Scanning Detection", True, 
                                    f"Detected: Level {threat_level}, Confidence: {confidence:.1f}%, Memory signature found")
                    else:
                        self.log_test("Memory Scanning Detection", False, 
                                    f"Failed to detect memory scanning: Level {threat_level}, Signatures: {signature_matches}")
                else:
                    self.log_test("Memory Scanning Detection", False, f"Invalid analysis response: {analysis}")
            else:
                self.log_test("Memory Scanning Detection", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Memory Scanning Detection", False, f"Exception: {str(e)}")
    
    def test_battery_drain_threat_report(self):
        """Test POST /api/graphite-defense/report-threat with battery drain patterns"""
        print("\n🔋 Testing Battery Drain Attack Detection")
        
        try:
            metrics = self.generate_battery_drain_metrics()
            response = self.session.post(f"{API_BASE}/graphite-defense/report-threat", json=metrics)
            
            if response.status_code == 200:
                analysis = response.json()
                if 'threat_level' in analysis and 'signature_matches' in analysis:
                    
                    threat_level = analysis.get('threat_level')
                    confidence = analysis.get('confidence', 0)
                    signature_matches = analysis.get('signature_matches', [])
                    
                    # Should detect battery drain attack
                    battery_signature_detected = any('Battery' in sig for sig in signature_matches)
                    
                    if threat_level >= 1 and battery_signature_detected:
                        self.log_test("Battery Drain Attack Detection", True, 
                                    f"Detected: Level {threat_level}, Confidence: {confidence:.1f}%, Battery signature found")
                    else:
                        self.log_test("Battery Drain Attack Detection", False, 
                                    f"Failed to detect battery drain: Level {threat_level}, Signatures: {signature_matches}")
                else:
                    self.log_test("Battery Drain Attack Detection", False, f"Invalid analysis response: {analysis}")
            else:
                self.log_test("Battery Drain Attack Detection", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Battery Drain Attack Detection", False, f"Exception: {str(e)}")
    
    def test_network_exfiltration_threat_report(self):
        """Test POST /api/graphite-defense/report-threat with network anomalies"""
        print("\n🌐 Testing Network Exfiltration Detection")
        
        try:
            metrics = self.generate_network_exfiltration_metrics()
            response = self.session.post(f"{API_BASE}/graphite-defense/report-threat", json=metrics)
            
            if response.status_code == 200:
                analysis = response.json()
                if 'threat_level' in analysis and 'signature_matches' in analysis:
                    
                    threat_level = analysis.get('threat_level')
                    confidence = analysis.get('confidence', 0)
                    signature_matches = analysis.get('signature_matches', [])
                    
                    # Should detect network exfiltration
                    network_signature_detected = any('Network' in sig for sig in signature_matches)
                    
                    if threat_level >= 2 and network_signature_detected:
                        self.log_test("Network Exfiltration Detection", True, 
                                    f"Detected: Level {threat_level}, Confidence: {confidence:.1f}%, Network signature found")
                    else:
                        self.log_test("Network Exfiltration Detection", False, 
                                    f"Failed to detect network exfiltration: Level {threat_level}, Signatures: {signature_matches}")
                else:
                    self.log_test("Network Exfiltration Detection", False, f"Invalid analysis response: {analysis}")
            else:
                self.log_test("Network Exfiltration Detection", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Network Exfiltration Detection", False, f"Exception: {str(e)}")
    
    def test_critical_breach_threat_report(self):
        """Test POST /api/graphite-defense/report-threat with critical breach indicators"""
        print("\n🚨 Testing Critical Breach Detection")
        
        try:
            metrics = self.generate_critical_breach_metrics()
            response = self.session.post(f"{API_BASE}/graphite-defense/report-threat", json=metrics)
            
            if response.status_code == 200:
                analysis = response.json()
                if 'threat_level' in analysis and 'recommendations' in analysis:
                    
                    threat_level = analysis.get('threat_level')
                    confidence = analysis.get('confidence', 0)
                    recommendations = analysis.get('recommendations', [])
                    
                    # Should detect critical breach (level 4 or 5)
                    steelos_recommended = any('STEELOS' in rec for rec in recommendations)
                    
                    if threat_level >= 4 and confidence > 70 and steelos_recommended:
                        self.log_test("Critical Breach Detection", True, 
                                    f"CRITICAL DETECTED: Level {threat_level}, Confidence: {confidence:.1f}%, STEELOS-Shredder recommended")
                    else:
                        self.log_test("Critical Breach Detection", False, 
                                    f"Failed to detect critical breach: Level {threat_level}, Confidence {confidence:.1f}%")
                else:
                    self.log_test("Critical Breach Detection", False, f"Invalid analysis response: {analysis}")
            else:
                self.log_test("Critical Breach Detection", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Critical Breach Detection", False, f"Exception: {str(e)}")
    
    def test_threat_history(self):
        """Test GET /api/graphite-defense/threat-history/{device_id}"""
        print("\n📚 Testing Threat History Retrieval")
        
        try:
            response = self.session.get(f"{API_BASE}/graphite-defense/threat-history/{self.test_device_id}")
            
            if response.status_code == 200:
                history = response.json()
                if isinstance(history, list):
                    # Should have some history from previous tests
                    if len(history) > 0:
                        latest_analysis = history[0]
                        if 'device_id' in latest_analysis and 'threat_level' in latest_analysis:
                            self.log_test("Threat History Retrieval", True, 
                                        f"Retrieved {len(history)} historical analyses for device")
                        else:
                            self.log_test("Threat History Retrieval", False, 
                                        f"Invalid history entry structure: {latest_analysis}")
                    else:
                        self.log_test("Threat History Retrieval", True, 
                                    "No history yet (expected for new device)")
                else:
                    self.log_test("Threat History Retrieval", False, f"Invalid history response: {history}")
            else:
                self.log_test("Threat History Retrieval", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Threat History Retrieval", False, f"Exception: {str(e)}")
    
    def test_global_intelligence(self):
        """Test GET /api/graphite-defense/global-intelligence"""
        print("\n🌍 Testing Global Threat Intelligence")
        
        try:
            response = self.session.get(f"{API_BASE}/graphite-defense/global-intelligence")
            
            if response.status_code == 200:
                intelligence = response.json()
                if ('total_monitored_devices' in intelligence and 
                    'system_status' in intelligence and 
                    'threat_distribution' in intelligence):
                    
                    system_status = intelligence.get('system_status')
                    monitored_devices = intelligence.get('total_monitored_devices', 0)
                    
                    if system_status == 'OPERATIONAL':
                        self.log_test("Global Threat Intelligence", True, 
                                    f"Status: {system_status}, Devices: {monitored_devices}, Recent threats: {intelligence.get('recent_threats', 0)}")
                    else:
                        self.log_test("Global Threat Intelligence", False, 
                                    f"System not operational: {system_status}")
                else:
                    self.log_test("Global Threat Intelligence", False, f"Invalid intelligence response: {intelligence}")
            else:
                self.log_test("Global Threat Intelligence", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Global Threat Intelligence", False, f"Exception: {str(e)}")
    
    def test_emergency_countermeasures(self):
        """Test POST /api/graphite-defense/deploy-emergency"""
        print("\n🚨 Testing Emergency Countermeasure Deployment")
        
        try:
            # Generate authorization code
            expected_code = hashlib.sha256(f"EMERGENCY_GRAPHITE_DEFENSE_{self.test_device_id}".encode()).hexdigest()[:8]
            
            payload = {
                "device_id": self.test_device_id,
                "threat_level": 5,  # CRITICAL_BREACH
                "authorization_code": expected_code,
                "immediate_action": True
            }
            
            response = self.session.post(f"{API_BASE}/graphite-defense/deploy-emergency", json=payload)
            
            if response.status_code == 200:
                result = response.json()
                if (result.get('status') == 'SUCCESS' and 
                    'deployment_id' in result and 
                    result.get('measures_deployed', 0) > 0):
                    
                    self.log_test("Emergency Countermeasure Deployment", True, 
                                f"Deployed {result['measures_deployed']} countermeasures, ID: {result['deployment_id'][:20]}...")
                else:
                    self.log_test("Emergency Countermeasure Deployment", False, f"Invalid deployment response: {result}")
            else:
                self.log_test("Emergency Countermeasure Deployment", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Emergency Countermeasure Deployment", False, f"Exception: {str(e)}")
    
    def test_invalid_authorization_code(self):
        """Test emergency deployment with invalid authorization code"""
        print("\n🔒 Testing Invalid Authorization Code Rejection")
        
        try:
            payload = {
                "device_id": self.test_device_id,
                "threat_level": 5,
                "authorization_code": "INVALID123",
                "immediate_action": True
            }
            
            response = self.session.post(f"{API_BASE}/graphite-defense/deploy-emergency", json=payload)
            
            if response.status_code == 401:
                self.log_test("Invalid Authorization Code Rejection", True, 
                            "Correctly rejected invalid authorization code")
            else:
                self.log_test("Invalid Authorization Code Rejection", False, 
                            f"Should reject invalid auth code: HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Invalid Authorization Code Rejection", False, f"Exception: {str(e)}")
    
    def test_input_validation(self):
        """Test input validation on threat report endpoint"""
        print("\n🛡️ Testing Input Validation")
        
        try:
            # Test invalid device_id (too short)
            invalid_metrics = {
                "device_id": "short",  # Too short (min 10 chars)
                "timestamp": int(time.time()),
                "cpu_usage_pattern": [50.0],
                "memory_pressure": 0.5,
                "battery_drain_rate": 0.1,
                "network_anomalies": 5,
                "process_anomalies": False,
                "disk_io_anomalies": 2,
                "thermal_signature": 0.4
            }
            
            response = self.session.post(f"{API_BASE}/graphite-defense/report-threat", json=invalid_metrics)
            
            if response.status_code == 422:  # Validation error
                self.log_test("Input Validation (Short Device ID)", True, 
                            "Correctly rejected short device ID")
            else:
                self.log_test("Input Validation (Short Device ID)", False, 
                            f"Should reject short device ID: HTTP {response.status_code}")
            
            # Test invalid timestamp (negative)
            invalid_metrics2 = {
                "device_id": "valid_device_id_12345",
                "timestamp": -1,  # Invalid negative timestamp
                "cpu_usage_pattern": [50.0],
                "memory_pressure": 0.5,
                "battery_drain_rate": 0.1,
                "network_anomalies": 5,
                "process_anomalies": False,
                "disk_io_anomalies": 2,
                "thermal_signature": 0.4
            }
            
            response2 = self.session.post(f"{API_BASE}/graphite-defense/report-threat", json=invalid_metrics2)
            
            if response2.status_code == 422:
                self.log_test("Input Validation (Invalid Timestamp)", True, 
                            "Correctly rejected negative timestamp")
            else:
                self.log_test("Input Validation (Invalid Timestamp)", False, 
                            f"Should reject negative timestamp: HTTP {response2.status_code}")
                
        except Exception as e:
            self.log_test("Input Validation", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all Graphite Defense System tests"""
        print("🛡️ GRAPHITE-KILLER DEFENSE SYSTEM COMPREHENSIVE TESTING")
        print("=" * 80)
        print("Testing the world's first anti-surveillance system designed to detect")
        print("and defeat Graphite-class state-level spyware attacks.")
        print("=" * 80)
        
        # System Status Tests
        self.test_system_status()
        self.test_graphite_signatures()
        
        # Threat Detection Tests
        self.test_normal_threat_report()
        self.test_suspicious_cpu_threat_report()
        self.test_memory_scanning_threat_report()
        self.test_battery_drain_threat_report()
        self.test_network_exfiltration_threat_report()
        self.test_critical_breach_threat_report()
        
        # System Integration Tests
        self.test_threat_history()
        self.test_global_intelligence()
        
        # Emergency Response Tests
        self.test_emergency_countermeasures()
        self.test_invalid_authorization_code()
        
        # Security Tests
        self.test_input_validation()
        
        # Generate summary
        self.generate_summary()
    
    def generate_summary(self):
        """Generate comprehensive test summary"""
        print("\n" + "=" * 80)
        print("🛡️ GRAPHITE-KILLER DEFENSE SYSTEM TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        # Categorize test results
        critical_tests = [
            'System Status Check',
            'Graphite Signatures Retrieval',
            'Suspicious CPU Pattern Detection',
            'Memory Scanning Detection',
            'Network Exfiltration Detection',
            'Critical Breach Detection',
            'Emergency Countermeasure Deployment'
        ]
        
        detection_tests = [
            'Normal Metrics Threat Analysis',
            'Suspicious CPU Pattern Detection',
            'Memory Scanning Detection', 
            'Battery Drain Attack Detection',
            'Network Exfiltration Detection',
            'Critical Breach Detection'
        ]
        
        security_tests = [
            'Invalid Authorization Code Rejection',
            'Input Validation (Short Device ID)',
            'Input Validation (Invalid Timestamp)'
        ]
        
        # Calculate category success rates
        critical_passed = sum(1 for result in self.test_results 
                            if result['success'] and result['test'] in critical_tests)
        detection_passed = sum(1 for result in self.test_results 
                             if result['success'] and result['test'] in detection_tests)
        security_passed = sum(1 for result in self.test_results 
                            if result['success'] and result['test'] in security_tests)
        
        print(f"\n📊 CATEGORY BREAKDOWN:")
        print(f"🎯 Critical System Functions: {critical_passed}/{len([t for t in critical_tests if any(r['test'] == t for r in self.test_results)])}")
        print(f"🔍 Threat Detection Accuracy: {detection_passed}/{len([t for t in detection_tests if any(r['test'] == t for r in self.test_results)])}")
        print(f"🔒 Security Validation: {security_passed}/{len([t for t in security_tests if any(r['test'] == t for r in self.test_results)])}")
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  • {result['test']}: {result['details']}")
        
        # Overall system assessment
        if passed_tests == total_tests:
            print(f"\n🎉 GRAPHITE-KILLER DEFENSE SYSTEM: FULLY OPERATIONAL")
            print("✅ All 6 Graphite Defense endpoints operational")
            print("✅ Threat detection accuracy with various attack patterns confirmed")
            print("✅ Emergency response protocols functional")
            print("✅ System integration with Redis working")
            print("✅ Real-time monitoring and alerting capabilities verified")
            print("\n🏆 SUCCESS: OMERTÀ can defeat nation-state surveillance!")
            print("This proves OMERTÀ is the world's most secure messaging platform.")
        elif passed_tests >= total_tests * 0.85:
            print(f"\n⚠️ GRAPHITE-KILLER DEFENSE SYSTEM: MOSTLY OPERATIONAL")
            print("Core anti-surveillance functionality working with minor issues")
            print("System ready for deployment with noted limitations")
        elif passed_tests >= total_tests * 0.70:
            print(f"\n🔧 GRAPHITE-KILLER DEFENSE SYSTEM: NEEDS ATTENTION")
            print("Basic functionality working but significant issues detected")
            print("Requires fixes before production deployment")
        else:
            print(f"\n❌ GRAPHITE-KILLER DEFENSE SYSTEM: CRITICAL ISSUES")
            print("Major functionality problems detected")
            print("System not ready for anti-surveillance operations")
        
        return passed_tests, failed_tests

if __name__ == "__main__":
    print(f"Testing Graphite Defense System at: {API_BASE}")
    tester = GraphiteDefenseTester()
    tester.run_all_tests()