/**
 * Fake Android Interface
 * - Shows realistic Android home screen with apps and contacts
 * - Browsable interface to fool attackers
 * - Triggered when panic PIN or emergency nuke activated
 * - Hides real OMERTÀ wipe process
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, StatusBar, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Fake apps data
const FAKE_APPS = [
  { name: 'Phone', icon: 'call', color: '#4CAF50' },
  { name: 'Messages', icon: 'chatbox', color: '#2196F3' },
  { name: 'Contacts', icon: 'people', color: '#FF9800' },
  { name: 'Camera', icon: 'camera', color: '#795548' },
  { name: 'Gallery', icon: 'images', color: '#9C27B0' },
  { name: 'Settings', icon: 'settings', color: '#607D8B' },
  { name: 'Chrome', icon: 'globe', color: '#4285F4' },
  { name: 'Gmail', icon: 'mail', color: '#EA4335' },
  { name: 'Maps', icon: 'map', color: '#34A853' },
  { name: 'YouTube', icon: 'play-circle', color: '#FF0000' },
  { name: 'Drive', icon: 'folder', color: '#4285F4' },
  { name: 'Photos', icon: 'image', color: '#FBBC04' },
  { name: 'Calculator', icon: 'calculator', color: '#34A853' },
  { name: 'Clock', icon: 'time', color: '#1976D2' },
  { name: 'Calendar', icon: 'calendar', color: '#4285F4' },
  { name: 'Weather', icon: 'cloudy', color: '#03A9F4' },
];

// Fake contacts data
const FAKE_CONTACTS = [
  { name: 'Mom', phone: '(555) 123-4567', initial: 'M' },
  { name: 'Dad', phone: '(555) 234-5678', initial: 'D' },
  { name: 'John Smith', phone: '(555) 345-6789', initial: 'J' },
  { name: 'Sarah Johnson', phone: '(555) 456-7890', initial: 'S' },
  { name: 'Mike Wilson', phone: '(555) 567-8901', initial: 'M' },
  { name: 'Lisa Brown', phone: '(555) 678-9012', initial: 'L' },
  { name: 'Tom Davis', phone: '(555) 789-0123', initial: 'T' },
  { name: 'Emily White', phone: '(555) 890-1234', initial: 'E' },
];

// Fake photos (using placeholder colors)
const FAKE_PHOTOS = [
  { id: 1, color: '#FF6B6B', label: 'Vacation' },
  { id: 2, color: '#4ECDC4', label: 'Family' },
  { id: 3, color: '#45B7D1', label: 'Work' },
  { id: 4, color: '#96CEB4', label: 'Friends' },
  { id: 5, color: '#FFEAA7', label: 'Nature' },
  { id: 6, color: '#DDA0DD', label: 'Food' },
  { id: 7, color: '#98D8C8', label: 'Travel' },
  { id: 8, color: '#F7DC6F', label: 'Pets' },
];

interface FakeAndroidInterfaceProps {
  onWipeComplete?: () => void;
}

export default function FakeAndroidInterface({ onWipeComplete }: FakeAndroidInterfaceProps) {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'contacts' | 'gallery' | 'phone'>('home');
  const [showWipeScreen, setShowWipeScreen] = useState(false);
  
  useEffect(() => {
    // Simulate browsable interface for 8-15 seconds, then show wipe completion
    const wipeTimer = setTimeout(() => {
      setShowWipeScreen(true);
      
      // Show OMERTA logo and message, then complete wipe
      setTimeout(() => {
        onWipeComplete?.();
      }, 4000);
    }, 12000);

    return () => clearTimeout(wipeTimer);
  }, [onWipeComplete]);

  const handleAppPress = (appName: string) => {
    switch (appName) {
      case 'Contacts':
        setCurrentScreen('contacts');
        break;
      case 'Gallery':
      case 'Photos':
        setCurrentScreen('gallery');
        break;
      case 'Phone':
        setCurrentScreen('phone');
        break;
      default:
        // Show fake loading for other apps
        setCurrentScreen('home');
        setTimeout(() => {
          // Return to home after fake loading
        }, 1000);
    }
  };

  const renderHomeScreen = () => (
    <View style={styles.homeScreen}>
      {/* Status bar */}
      <StatusBar backgroundColor="#2196F3" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Android</Text>
        <Text style={styles.headerTime}>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>

      {/* Apps grid */}
      <ScrollView style={styles.appsContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.appsGrid}>
          {FAKE_APPS.map((app, index) => (
            <TouchableOpacity
              key={index}
              style={styles.appIcon}
              onPress={() => handleAppPress(app.name)}
            >
              <View style={[styles.appIconBg, { backgroundColor: app.color }]}>
                <Ionicons name={app.icon as any} size={28} color="#ffffff" />
              </View>
              <Text style={styles.appName}>{app.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navButton}>
          <Ionicons name="arrow-back" size={24} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <Ionicons name="ellipse" size={24} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <Ionicons name="square" size={24} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderContactsScreen = () => (
    <View style={styles.contactsScreen}>
      <View style={styles.appHeader}>
        <TouchableOpacity onPress={() => setCurrentScreen('home')}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.appHeaderTitle}>Contacts</Text>
        <TouchableOpacity>
          <Ionicons name="search" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.contactsList}>
        {FAKE_CONTACTS.map((contact, index) => (
          <TouchableOpacity key={index} style={styles.contactItem}>
            <View style={[styles.contactAvatar, { backgroundColor: `#${Math.floor(Math.random()*16777215).toString(16)}` }]}>
              <Text style={styles.contactInitial}>{contact.initial}</Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{contact.name}</Text>
              <Text style={styles.contactPhone}>{contact.phone}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderGalleryScreen = () => (
    <View style={styles.galleryScreen}>
      <View style={styles.appHeader}>
        <TouchableOpacity onPress={() => setCurrentScreen('home')}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.appHeaderTitle}>Gallery</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.photosGrid}>
        <View style={styles.photosContainer}>
          {FAKE_PHOTOS.map((photo) => (
            <TouchableOpacity key={photo.id} style={styles.photoItem}>
              <View style={[styles.photoPlaceholder, { backgroundColor: photo.color }]}>
                <Text style={styles.photoLabel}>{photo.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const renderWipeScreen = () => (
    <View style={styles.wipeScreen}>
      <View style={styles.wipeContent}>
        {/* OMERTA Logo */}
        <View style={styles.wipeLogoContainer}>
          <View style={styles.wipeLogo}>
            <Text style={styles.wipeLogoText}>O</Text>
            <View style={styles.logoGlimmer} />
          </View>
        </View>
        
        {/* Wipe message */}
        <Text style={styles.wipeMessage}>
          "The reason we are the world's safest"
        </Text>
        
        {/* Loading indicator */}
        <View style={styles.wipeProgress}>
          <View style={styles.progressBar} />
        </View>
      </View>
    </View>
  );

  if (showWipeScreen) {
    return renderWipeScreen();
  }

  switch (currentScreen) {
    case 'contacts':
      return renderContactsScreen();
    case 'gallery':
      return renderGalleryScreen();
    case 'phone':
      return renderContactsScreen(); // Phone uses similar contact interface
    default:
      return renderHomeScreen();
  }
}

const styles = StyleSheet.create({
  homeScreen: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 40,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerTime: {
    color: '#ffffff',
    fontSize: 14,
  },
  appsContainer: {
    flex: 1,
    padding: 16,
  },
  appsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  appIcon: {
    width: (width - 64) / 4,
    alignItems: 'center',
    marginBottom: 24,
  },
  appIconBg: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  appName: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navButton: {
    padding: 12,
  },
  contactsScreen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  galleryScreen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 40,
  },
  appHeaderTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  contactsList: {
    flex: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactInitial: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  photosGrid: {
    flex: 1,
    padding: 4,
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  photoItem: {
    width: (width - 16) / 3,
    marginBottom: 4,
  },
  photoPlaceholder: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  photoLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  wipeScreen: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wipeContent: {
    alignItems: 'center',
  },
  wipeLogoContainer: {
    marginBottom: 40,
  },
  wipeLogo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#9ca3af',
    position: 'relative',
  },
  wipeLogoText: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: '900',
  },
  logoGlimmer: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 20,
    height: 20,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    opacity: 0.8,
  },
  wipeMessage: {
    color: '#ffffff',
    fontSize: 18,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 40,
  },
  wipeProgress: {
    width: 200,
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ef4444',
  },
});