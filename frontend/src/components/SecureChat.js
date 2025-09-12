import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { sendMsg } from '../utils/crypto';

export default function SecureChat() {
  const [messages, setMessages] = useState([
    { id: '1', text: 'Welcome to OMERTÁ Secure Chat', sender: 'system', timestamp: Date.now() },
    { id: '2', text: 'All messages are end-to-end encrypted', sender: 'system', timestamp: Date.now() + 1000 },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    try {
      // Send via crypto system
      await sendMsg('demo-chat', 'demo-peer', new TextEncoder().encode(inputText));
      console.log('✅ Message sent securely');
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      Alert.alert('Send Failed', 'Could not send encrypted message');
    }

    // Simulate response
    setTimeout(() => {
      const response = {
        id: (Date.now() + 1).toString(),
        text: '🔒 Message received and verified through OMERTÁ protocol',
        sender: 'peer',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, response]);
    }, 2000);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🔒 SECURE CHAT</Text>
      
      <ScrollView style={styles.messageContainer}>
        {messages.map(message => (
          <View key={message.id} style={[
            styles.messageBubble,
            message.sender === 'user' ? styles.userMessage : 
            message.sender === 'system' ? styles.systemMessage : styles.peerMessage
          ]}>
            <Text style={styles.messageText}>{message.text}</Text>
            <Text style={styles.messageTime}>
              {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </Text>
          </View>
        ))}
        {isTyping && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>🔒 Peer is typing...</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type secure message..."
          placeholderTextColor="#666"
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendButtonText}>🔐 Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  header: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  messageContainer: {
    flex: 1,
    padding: 10,
  },
  messageBubble: {
    backgroundColor: '#1a2332',
    borderRadius: 10,
    padding: 10,
    marginVertical: 5,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#2d5a87',
    alignSelf: 'flex-end',
  },
  systemMessage: {
    backgroundColor: '#2d4a22',
    alignSelf: 'center',
    maxWidth: '90%',
  },
  peerMessage: {
    backgroundColor: '#3d3d3d',
    alignSelf: 'flex-start',
  },
  messageText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 18,
  },
  messageTime: {
    color: '#888',
    fontSize: 10,
    marginTop: 5,
    textAlign: 'right',
  },
  typingIndicator: {
    padding: 10,
    alignSelf: 'flex-start',
  },
  typingText: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#333',
  },
  sendButton: {
    backgroundColor: '#007bff',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#333',
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});