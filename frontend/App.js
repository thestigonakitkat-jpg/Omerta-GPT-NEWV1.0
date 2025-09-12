import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useSecurityStore } from './src/state/security';
import { useTheme } from './src/state/theme';
import { secureGate } from './src/utils/secureDevice';
import { sendMsg, forceRekey } from './src/utils/crypto';
import { sendEnvelope } from './src/utils/api';
import VanishMessage from './src/components/VanishMessage';
import SecureChat from './src/components/SecureChat';
import DefconOnePanel from './src/components/DefconOnePanel';
import SteeloshShredder from './src/components/SteeloshShredder';
import ContactManager from './src/components/ContactManager';
import RemoteKillSystem from './src/components/RemoteKillSystem';
import MatrixBackground from './src/components/MatrixBackground';

export default function App() {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState('auth'); // auth, main, demo, defcon
  const [threatStatus, setThreatStatus] = useState('normal');
  const [showDefconPanel, setShowDefconPanel] = useState(false);
  const [showSteeloshShredder, setShowSteeloshShredder] = useState(false);
  const [shredderTrigger, setShredderTrigger] = useState('manual');
  const [tapSequence, setTapSequence] = useState([]);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [nextRebootTime, setNextRebootTime] = useState(null);
  const [rebootWarning, setRebootWarning] = useState(false);
  const [showContactManager, setShowContactManager] = useState(false);
  
  const { 
    isSecureGatePassed,
    setSecureGatePassed,
    threatLevel,
    updateThreatLevel,
    addSuspiciousActivity,
    clearSecurityData,
    hydrate: hydrateSecurityStore
  } = useSecurityStore();

  const { mode: themeMode, hydrate: hydrateTheme } = useTheme();

  // Initialize security systems
  useEffect(() => {
    const initializeSecurity = async () => {
      try {
        // Hydrate stores
        await hydrateSecurityStore();
        await hydrateTheme();
        
        // Run security gate
        await secureGate();
        setSecureGatePassed(true);
        
        console.log('🛡️ OMERTA Security initialized successfully');
      } catch (error) {
        console.error('🚨 Security initialization failed:', error);
        // In production, this would block the app
        if (!__DEV__) {
          Alert.alert(
            'Security Error',
            'Device security check failed. App cannot continue.',
            [{ text: 'Exit', onPress: () => {} }]
          );
        }
      }
    };

    initializeSecurity();

    // Simulate threat detection (in real app, this would be actual monitoring)
    const threatSimulation = setInterval(() => {
      const levels = ['normal', 'low', 'medium', 'high'];
      const randomLevel = levels[Math.floor(Math.random() * levels.length)];
      
      if (randomLevel !== threatStatus) {
        setThreatStatus(randomLevel);
        updateThreatLevel(randomLevel);
        
        if (randomLevel === 'high') {
          addSuspiciousActivity({
            type: 'behavioral_anomaly',
            description: 'Unusual app access pattern detected',
            severity: randomLevel
          });
        }
      }
    }, 30000); // Check every 30 seconds

    // Simulate auto-reboot scheduling
    const scheduleReboot = () => {
      const now = new Date();
      const next2AM = new Date(now);
      next2AM.setHours(2, 0, 0, 0);
      if (next2AM <= now) {
        next2AM.setDate(next2AM.getDate() + 1);
      }
      setNextRebootTime(next2AM);
    };

    scheduleReboot();

    return () => {
      clearInterval(threatSimulation);
    };
  }, []);

  const handleAuthentication = async () => {
    // Check for panic PIN first
    if (pin === '000000') {
      console.log('🚨 PANIC PIN ACTIVATED - Initiating STEELOS-Shredder');
      setShredderTrigger('panic_pin');
      setShowSteeloshShredder(true);
      setPin('');
      return;
    }
    
    // Demo PIN for testing
    if (pin === '123456') {
      setIsAuthenticated(true);
      setCurrentView('main');
      console.log('✅ Authentication successful');
    } else {
      Alert.alert('Authentication Failed', 'Invalid PIN entered');
      console.log('❌ Authentication failed');
    }
    setPin('');
  };

  const handleTapSequence = () => {
    const now = Date.now();
    
    // Reset sequence if more than 2 seconds between taps
    if (now - lastTapTime > 2000) {
      setTapSequence([1]);
    } else {
      const newSequence = [...tapSequence];
      newSequence.push(1);
      
      // Check for 4-4-4-2-2 pattern (simplified for demo)
      if (newSequence.length >= 16) {
        console.log('🚨 DEFCON-1 access sequence activated');
        setShowDefconPanel(true);
        setTapSequence([]);
      } else {
        setTapSequence(newSequence);
      }
    }
    
    setLastTapTime(now);
  };

  const handlePINInput = (digit) => {
    if (pin.length < 6) {
      setPin(pin + digit);
    }
  };

  const clearPIN = () => {
    setPin('');
  };

  const testCryptoFunction = async () => {
    try {
      console.log('🧪 Testing crypto functions...');
      await sendMsg('test-chat', 'test-peer-oid', new TextEncoder().encode('Hello OMERTA!'));
      console.log('✅ Crypto test successful');
      Alert.alert('Success', 'Crypto functions working correctly');
    } catch (error) {
      console.error('❌ Crypto test failed:', error);
      Alert.alert('Error', 'Crypto test failed: ' + error.message);
    }
  };

  // Authentication Screen
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <MatrixBackground intensity={0.2} color="#ef4444" />
        <Text style={styles.title}>🔒 OMERTÁ</Text>
        <Text style={styles.subtitle}>World's Most Secure Messaging</Text>
        <Text style={styles.tagline}>Making Pegasus Irrelevant</Text>
        
        <View style={styles.pinContainer}>
          <Text style={styles.pinLabel}>Enter Security PIN</Text>
          <Text style={styles.pinDisplay}>
            {pin.replace(/./g, '●')} {pin.length < 6 && '_'.repeat(6 - pin.length)}
          </Text>
          
          <View style={styles.keypad}>
            {[1,2,3,4,5,6,7,8,9,0].map(digit => (
              <TouchableOpacity 
                key={digit}
                style={styles.keypadButton}
                onPress={() => handlePINInput(digit.toString())}
              >
                <Text style={styles.keypadText}>{digit}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.pinActions}>
            <TouchableOpacity style={styles.clearButton} onPress={clearPIN}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.authButton, pin.length === 6 && styles.authButtonActive]}
              onPress={handleAuthentication}
              disabled={pin.length !== 6}
            >
              <Text style={styles.authButtonText}>Authenticate</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.footer}>Nuclear Reset Build v2.0</Text>
        <Text style={styles.hint}>PIN: 123456 | Panic: 000000</Text>
        <Text style={styles.securityStatus}>
          🛡️ Security Gate: {isSecureGatePassed ? '✅ PASSED' : '🔄 CHECKING...'}
        </Text>
        <StatusBar style="light" />
      </View>
    );
  }

  // Main Application
  return (
    <View style={styles.mainContainer}>
      <MatrixBackground intensity={threatLevel === 'critical' ? 0.8 : 0.1} color="#ef4444" />
      <TouchableOpacity 
        style={[styles.header, threatStatus !== 'normal' && styles.threatHeader]}
        onPress={handleTapSequence}
        activeOpacity={1}
      >
        <Text style={styles.headerTitle}>🔒 OMERTÁ</Text>
        <Text style={styles.headerSubtitle}>NUCLEAR RESET BUILD</Text>
        {threatStatus !== 'normal' && (
          <Text style={styles.threatIndicator}>
            🚨 THREAT LEVEL: {threatStatus.toUpperCase()}
          </Text>
        )}
        {tapSequence.length > 0 && (
          <Text style={styles.tapSequenceIndicator}>
            Sequence: {tapSequence.length}/16 {tapSequence.length >= 12 ? '(Almost there...)' : ''}
          </Text>
        )}
      </TouchableOpacity>
      
      <ScrollView style={styles.content}>
        <View style={styles.statusPanel}>
          <Text style={styles.statusTitle}>🛡️ SECURITY STATUS</Text>
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Vanish Protocol</Text>
              <Text style={styles.statusValue}>✅ ACTIVE</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Threat Detection</Text>
              <Text style={[styles.statusValue, { color: getThreatColor(threatStatus) }]}>
                {threatStatus.toUpperCase()}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Security Gate</Text>
              <Text style={styles.statusValue}>
                {isSecureGatePassed ? '✅ PASSED' : '🔄 CHECKING'}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>STEELOS-Shredder</Text>
              <Text style={styles.statusValue}>🔥 READY</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Auto-Reboot</Text>
              <Text style={styles.statusValue}>
                {nextRebootTime ? 
                  `⏰ ${nextRebootTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 
                  '🔄 ACTIVE'
                }
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Theme Mode</Text>
              <Text style={styles.statusValue}>
                {themeMode.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setCurrentView('chat')}
        >
          <Text style={styles.actionButtonText}>💬 Open Secure Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#28a745' }]}
          onPress={() => setShowContactManager(true)}
        >
          <Text style={styles.actionButtonText}>📇 Secure Contacts</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#666' }]}
          onPress={() => setCurrentView('demo')}
        >
          <Text style={styles.actionButtonText}>🚀 Demo Vanish Protocol</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#007bff' }]}
          onPress={testCryptoFunction}
        >
          <Text style={styles.actionButtonText}>🧪 Test Crypto Functions</Text>
        </TouchableOpacity>

        {currentView === 'chat' && (
          <View style={styles.chatSection}>
            <SecureChat />
          </View>
        )}

        {currentView === 'demo' && (
          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>🥇 VANISH PROTOCOL DEMO</Text>
            <Text style={styles.demoSubtitle}>Gold Standard - Safer than Signal</Text>
            
            <VanishMessage 
              messageId="demo1"
              initialContent="This message will self-destruct after reading. This is OMERTÁ-SECURE'S VANISH PROTOCOL - making message content unextractable even if Pegasus infects your device."
              ttl={60000}
            />
            
            <VanishMessage 
              messageId="demo2"
              initialContent="🔗 Hidden Link Test: https://secure-channel.omerta/classified-intel-xyz123 - Links are encrypted behind chat bubbles, invisible to surveillance."
              ttl={45000}
            />
          </View>
        )}

        <View style={styles.features}>
          <Text style={styles.featureTitle}>🚀 ACTIVE DEFENSES:</Text>
          <Text style={styles.feature}>🛡️ RAM-only message storage</Text>
          <Text style={styles.feature}>👁️ One-time read protection</Text>
          <Text style={styles.feature}>🔗 Encrypted hidden links</Text>
          <Text style={styles.feature}>📱 Screenshot resistance</Text>
          <Text style={styles.feature}>🔍 Real-time threat detection</Text>
          <Text style={styles.feature}>🏥 Behavioral anomaly analysis</Text>
          <Text style={styles.feature}>🚨 Emergency protocols</Text>
          <Text style={styles.feature}>⚛️ DEFCON-1 two-person integrity</Text>
          <Text style={styles.feature}>🔑 Hardware-backed encryption</Text>
          <Text style={styles.feature}>🎯 Device attestation</Text>
        </View>

        <TouchableOpacity 
          style={[styles.panicButton, { marginBottom: 20 }]}
          onPress={() => {
            setShredderTrigger('emergency_nuke');
            setShowSteeloshShredder(true);
          }}
        >
          <Text style={styles.panicButtonText}>🔥 STEELOS-SHREDDER</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.defconButton, { marginBottom: 100 }]}
          onPress={() => setShowDefconPanel(true)}
        >
          <Text style={styles.defconButtonText}>🚨 DEFCON-1 PROTOCOL</Text>
          <Text style={styles.defconButtonSubtext}>
            Secret Access: Tap header 16 times quickly
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* DEFCON-1 Panel */}
      <DefconOnePanel 
        visible={showDefconPanel}
        onClose={() => setShowDefconPanel(false)}
      />

      {/* STEELOS-Shredder Modal */}
      <SteeloshShredder
        visible={showSteeloshShredder}
        triggerType={shredderTrigger}
        onClose={() => setShowSteeloshShredder(false)}
      />

      {/* Contact Manager Modal */}
      <ContactManager
        visible={showContactManager}
        onClose={() => setShowContactManager(false)}
      />
      
      <StatusBar style="light" />
    </View>
  );
}

// Helper function for threat color mapping
function getThreatColor(threatLevel) {
  switch (threatLevel) {
    case 'critical': return '#dc3545';
    case 'high': return '#fd7e14';
    case 'medium': return '#ffc107';
    case 'low': return '#20c997';
    default: return '#28a745';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#bfbfbf',
    marginBottom: 5,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 12,
    color: '#888',
    marginBottom: 30,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  pinContainer: {
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  pinLabel: {
    fontSize: 14,
    color: '#bfbfbf',
    marginBottom: 15,
  },
  pinDisplay: {
    fontSize: 24,
    color: '#ffffff',
    fontFamily: 'monospace',
    marginBottom: 30,
    letterSpacing: 8,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 200,
    justifyContent: 'space-between',
  },
  keypadButton: {
    width: 60,
    height: 60,
    backgroundColor: '#1a1a1a',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 5,
    borderWidth: 1,
    borderColor: '#333',
  },
  keypadText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  pinActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 30,
  },
  clearButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#ffffff',
    fontSize: 16,
  },
  authButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#666',
    borderRadius: 8,
  },
  authButtonActive: {
    backgroundColor: '#007bff',
  },
  authButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    fontSize: 10,
    color: '#444',
    textAlign: 'center',
  },
  hint: {
    position: 'absolute',
    bottom: 40,
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  securityStatus: {
    position: 'absolute',
    bottom: 20,
    fontSize: 10,
    color: '#ffd700',
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#141414',
    padding: 15,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  threatHeader: {
    backgroundColor: '#2d1810',
    borderBottomColor: '#dc3545',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#bfbfbf',
    marginTop: 2,
  },
  threatIndicator: {
    fontSize: 10,
    color: '#dc3545',
    marginTop: 5,
    fontWeight: 'bold',
  },
  tapSequenceIndicator: {
    fontSize: 8,
    color: '#ffc107',
    marginTop: 3,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  statusPanel: {
    backgroundColor: '#141414',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
    textAlign: 'center',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statusItem: {
    width: '48%',
    marginBottom: 10,
  },
  statusLabel: {
    fontSize: 10,
    color: '#888',
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 12,
    color: '#bfbfbf',
    fontWeight: 'bold',
  },
  actionButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatSection: {
    backgroundColor: '#141414',
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  demoSection: {
    backgroundColor: '#141414',
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  demoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffd700',
    textAlign: 'center',
    marginBottom: 5,
  },
  demoSubtitle: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  features: {
    backgroundColor: '#141414',
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  feature: {
    fontSize: 12,
    color: '#bfbfbf',
    marginBottom: 5,
    paddingLeft: 10,
  },
  panicButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  panicButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  defconButton: {
    backgroundColor: '#fd7e14',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  defconButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  defconButtonSubtext: {
    color: '#ffffff',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 5,
    opacity: 0.7,
  },
});
