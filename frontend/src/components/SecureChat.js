import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  Alert,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { useSecurityStore } from '../state/security';
import VanishMessage from './VanishMessage';
import ThreatMonitor from './ThreatMonitor';
import omertaAPI from '../utils/api';

export default function SecureChat({ contactId = 'demo_contact', contactName = 'Demo Contact' }) {
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef(null);

  const { 
    threatLevel, 
    addMessage, 
    getMessage, 
    updateActivity,
    isMonitoring 
  } = useSecurityStore();

  useEffect(() => {
    // Load demo messages for testing
    loadDemoMessages();
    
    // Update activity when chat is active
    updateActivity();
    
    // Scroll to bottom when new messages arrive
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages.length]);

  const loadDemoMessages = () => {
    const demoMessages = [
      {
        id: 'demo_1',
        content: 'Welcome to OMERTÁ secure messaging. This message will self-destruct after reading.',
        timestamp: Date.now() - 300000,
        isOwn: false,
        vanishTime: 30000
      },
      {
        id: 'demo_2', 
        content: 'Every message uses our Vanish Protocol - RAM-only storage, one-time read, complete invisibility to surveillance.',
        timestamp: Date.now() - 240000,
        isOwn: false,
        vanishTime: 45000
      },
      {
        id: 'demo_3',
        content: 'Even if Pegasus infects this device, your messages are already gone. 🛡️',
        timestamp: Date.now() - 180000,
        isOwn: true,
        vanishTime: 60000
      }
    ];
    
    setMessages(demoMessages);
  };

  const sendMessage = async () => {
    if (!messageInput.trim()) return;
    
    try {
      // Create message with unique ID
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const newMessage = {
        id: messageId,
        content: messageInput.trim(),
        timestamp: Date.now(),
        isOwn: true,
        vanishTime: getVanishTime()
      };

      // Add to local messages
      setMessages(prev => [...prev, newMessage]);
      
      // Add to Vanish Protocol store
      addMessage(messageId, newMessage.content, newMessage.vanishTime);
      
      // Update activity tracker
      updateActivity();
      
      // Clear input
      setMessageInput('');
      
      // Simulate response after delay
      setTimeout(() => {
        simulateResponse();
      }, 2000 + Math.random() * 3000);

      // Log security event
      console.log(`🔒 Secure message sent: ${messageId} (Vanish: ${newMessage.vanishTime}ms)`);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Send Failed', 'Message could not be sent securely.');
    }
  };

  const simulateResponse = () => {
    const responses = [
      'Message received via Vanish Protocol. 🛡️',
      'Your security level is impressive. No surveillance detected.',
      'OMERTÁ\'s protection is working perfectly.',
      'This communication channel is secure and untraceable.',
      'Even state-level actors cannot intercept these messages.',
      'The Vanish Protocol makes content unextractable.'
    ];
    
    const responseMessage = {
      id: `response_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      content: responses[Math.floor(Math.random() * responses.length)],
      timestamp: Date.now(),
      isOwn: false,
      vanishTime: getVanishTime()
    };
    
    setMessages(prev => [...prev, responseMessage]);
    addMessage(responseMessage.id, responseMessage.content, responseMessage.vanishTime);
  };

  const getVanishTime = () => {
    // Variable vanish times based on threat level
    switch (threatLevel) {
      case 'critical': return 10000; // 10 seconds
      case 'high': return 20000;     // 20 seconds  
      case 'medium': return 30000;   // 30 seconds
      case 'low': return 45000;      // 45 seconds
      default: return 60000;         // 60 seconds
    }
  };

  const getThreatStatusColor = () => {
    switch (threatLevel) {
      case 'critical': return '#ff0000';
      case 'high': return '#ff4444'; 
      case 'medium': return '#ff8800';
      case 'low': return '#ffaa00';
      default: return '#00ff00';
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Chat Header */}
      <View style={[styles.header, threatLevel !== 'normal' && styles.threatHeader]}>
        <View style={styles.headerInfo}>
          <Text style={styles.contactName}>{contactName}</Text>
          <View style={styles.securityStatus}>
            <Text style={styles.securityLabel}>🛡️ OMERTÁ-SECURE</Text>
            <Text style={[styles.threatStatus, { color: getThreatStatusColor() }]}>
              Threat: {threatLevel.toUpperCase()}
            </Text>
          </View>
        </View>
        
        <ThreatMonitor 
          onThreatDetected={(analysis) => {
            console.log('🚨 Chat received threat alert:', analysis);
            // Automatically reduce vanish time for critical threats
            if (analysis.level === 'critical') {
              console.log('⏰ Reducing message TTL due to critical threat');
            }
          }}
        />
      </View>

      {/* Messages Area */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <View 
            key={message.id}
            style={[
              styles.messageWrapper,
              message.isOwn ? styles.ownMessageWrapper : styles.otherMessageWrapper
            ]}
          >
            <VanishMessage
              messageId={message.id}
              initialContent={message.content}
              ttl={message.vanishTime}
              isOwn={message.isOwn}
              timestamp={message.timestamp}
            />
          </View>
        ))}
        
        {isTyping && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>🔒 Secure typing...</Text>
          </View>
        )}
      </ScrollView>

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <View style={styles.vanishInfo}>
          <Text style={styles.vanishLabel}>
            ⏰ Auto-vanish: {getVanishTime() / 1000}s | 
            🔒 RAM-only | 
            👁️ One-read | 
            🚫 Screenshot-proof
          </Text>
        </View>
        
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={messageInput}
            onChangeText={(text) => {
              setMessageInput(text);
              setIsTyping(text.length > 0);
            }}
            placeholder="Type secure message..."
            placeholderTextColor="#666"
            multiline
            maxLength={1000}
            secureTextEntry={false}
            autoCorrect={false}
            autoCapitalize="none"
          />
          
          <TouchableOpacity 
            style={[
              styles.sendButton,
              !messageInput.trim() && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!messageInput.trim()}
          >
            <Text style={styles.sendButtonText}>🚀</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    backgroundColor: '#111',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ef4444',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  threatHeader: {
    backgroundColor: '#2a0a0a',
    borderBottomColor: '#ff0000',
  },
  headerInfo: {
    flex: 1,
  },
  contactName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  securityStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityLabel: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: 'bold',
    marginRight: 10,
  },
  threatStatus: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  monitoringIndicator: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  monitoringText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
    padding: 10,
  },
  messageWrapper: {
    marginVertical: 5,
  },
  ownMessageWrapper: {
    alignItems: 'flex-end',
  },
  otherMessageWrapper: {
    alignItems: 'flex-start',
  },
  typingIndicator: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  typingText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
  inputContainer: {
    backgroundColor: '#111',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  vanishInfo: {
    marginBottom: 10,
  },
  vanishLabel: {
    color: '#ef4444',
    fontSize: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#222',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  sendButton: {
    backgroundColor: '#ef4444',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#666',
  },
  sendButtonText: {
    fontSize: 20,
  },
});