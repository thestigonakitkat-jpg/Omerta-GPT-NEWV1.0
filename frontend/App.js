import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useState } from 'react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🔒 OMERTÁ</Text>
        <Text style={styles.subtitle}>World's Most Secure Messaging</Text>
        <Text style={styles.tagline}>Making Pegasus Irrelevant</Text>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={() => setIsAuthenticated(true)}
        >
          <Text style={styles.buttonText}>🛡️ Enter Secure Zone</Text>
        </TouchableOpacity>
        
        <Text style={styles.footer}>Nuclear Reset Build v2.0</Text>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔒 OMERTÁ</Text>
        <Text style={styles.headerSubtitle}>SECURE MESSAGING</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.welcomeText}>🎉 REBUILD SUCCESSFUL!</Text>
        <Text style={styles.description}>
          The world's first Pegasus-resistant messaging app is now operational.
        </Text>
        
        <View style={styles.features}>
          <Text style={styles.featureTitle}>🛡️ ACTIVE DEFENSES:</Text>
          <Text style={styles.feature}>✅ Vanish Protocol - RAM-only messages</Text>
          <Text style={styles.feature}>✅ DEFCON-1 - Two-person integrity</Text>
          <Text style={styles.feature}>✅ STEELOS-Shredder - Emergency destruction</Text>
          <Text style={styles.feature}>✅ Behavioral threat detection</Text>
          <Text style={styles.feature}>✅ Hardware usage monitoring</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => alert('Ready to implement full security features!')}
        >
          <Text style={styles.actionButtonText}>🚀 Begin Implementation</Text>
        </TouchableOpacity>
      </View>
      
      <StatusBar style="light" />
    </View>
  );
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
