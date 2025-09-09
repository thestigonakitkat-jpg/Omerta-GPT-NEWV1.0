import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useSecurityStore } from './src/state/security';
import threatDetector from './src/utils/threatDetection';
import VanishMessage from './src/components/VanishMessage';

export default function App() {
  const [pin, setPin] = useState('');
  const [currentView, setCurrentView] = useState('auth'); // auth, main, demo
  const [threatStatus, setThreatStatus] = useState('normal');
  
  const { 
    isAuthenticated, 
    authenticate, 
    threatLevel,
    setThreatLevel,
    addThreat,
    startMonitoring,
    stopMonitoring,
    triggerPanicMode 
  } = useSecurityStore();

  // Initialize threat detection system
  useEffect(() => {
    threatDetector.initialize().then(() => {
      // Set up threat detection callback
      threatDetector.onThreatDetected((analysis) => {
        console.log('🚨 Threat detected:', analysis);
        setThreatLevel(analysis.level);
        setThreatStatus(analysis.level);
        
        analysis.threats.forEach(threat => {
          addThreat(threat);
        });
        
        if (analysis.level === 'critical') {
          Alert.alert(
            '🚨 CRITICAL THREAT DETECTED',
            'Possible surveillance activity detected. OMERTÁ is activating countermeasures.',
            [
              { text: 'Activate DEFCON-1', onPress: () => setCurrentView('defcon') },
              { text: 'Continue Monitoring', style: 'cancel' }
            ]
          );
        }
      });
    });

    return () => {
      threatDetector.stopMonitoring();
    };
  }, []);

  const handleAuthentication = async () => {
    const success = await authenticate(pin);
    if (success) {
      setCurrentView('main');
      startMonitoring();
      threatDetector.startMonitoring();
    } else {
      Alert.alert('Authentication Failed', 'Invalid PIN or Panic Mode Activated');
      setPin('');
    }
  };

  const handlePINInput = (digit) => {
    if (pin.length < 6) {
      setPin(pin + digit);
    }
  };

  const clearPIN = () => {
    setPin('');
  };

  // Authentication Screen
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
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
        <StatusBar style="light" />
      </View>
    );
  }

  // Main Application
  return (
    <View style={styles.mainContainer}>
      <View style={[styles.header, threatLevel !== 'normal' && styles.threatHeader]}>
        <Text style={styles.headerTitle}>🔒 OMERTÁ</Text>
        <Text style={styles.headerSubtitle}>NUCLEAR RESET BUILD</Text>
        {threatLevel !== 'normal' && (
          <Text style={styles.threatIndicator}>
            🚨 THREAT LEVEL: {threatLevel.toUpperCase()}
          </Text>
        )}
      </View>
      
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
              <Text style={[styles.statusValue, { color: getThreatColor(threatLevel) }]}>
                {threatLevel.toUpperCase()}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>DEFCON Level</Text>
              <Text style={styles.statusValue}>5 - NORMAL</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>STEELOS-Shredder</Text>
              <Text style={styles.statusValue}>🔥 READY</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setCurrentView('demo')}
        >
          <Text style={styles.actionButtonText}>🚀 Demo Vanish Protocol</Text>
        </TouchableOpacity>

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
        </View>

        <TouchableOpacity 
          style={[styles.panicButton, { marginBottom: 100 }]}
          onPress={() => {
            Alert.alert(
              '☢️ NUCLEAR OPTION',
              'This will destroy ALL data and trigger STEELOS-Shredder. Continue?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'EXECUTE', style: 'destructive', onPress: triggerPanicMode }
              ]
            );
          }}
        >
          <Text style={styles.panicButtonText}>☢️ EMERGENCY NUKE</Text>
        </TouchableOpacity>
      </ScrollView>
      
      <StatusBar style="light" />
    </View>
  );
}

function getThreatColor(level) {
  switch(level) {
    case 'critical': return '#ff0000';
    case 'high': return '#ff4444';
    case 'medium': return '#ff8800';
    case 'low': return '#ffaa00';
    default: return '#00ff00';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 5,
  },
  tagline: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 50,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 30,
    marginBottom: 30,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  footer: {
    color: '#666',
    fontSize: 12,
    position: 'absolute',
    bottom: 20,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    backgroundColor: '#111',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#ef4444',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#fff',
    letterSpacing: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    color: '#ef4444',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  features: {
    backgroundColor: '#111',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  featureTitle: {
    fontSize: 18,
    color: '#ef4444',
    fontWeight: 'bold',
    marginBottom: 15,
  },
  feature: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
    paddingLeft: 10,
  },
  actionButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
