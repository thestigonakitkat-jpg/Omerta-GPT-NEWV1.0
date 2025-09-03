/**
 * CYANIDE TABLET Component
 * - Visual representation of data destruction
 * - Nuclear bomb animation sequence
 * - "Omerta red and white capsule" symbol
 * - Mushroom cloud and data melting effects
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Dimensions, 
  Modal,
  TouchableOpacity 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface CyanideTabletProps {
  visible: boolean;
  onComplete: () => void;
  progress?: number; // 0-100 for shredding progress
  phase?: string; // Current destruction phase
}

export default function CyanideTablet({ 
  visible, 
  onComplete, 
  progress = 0, 
  phase = 'Deploying...' 
}: CyanideTabletProps) {
  const [animationPhase, setAnimationPhase] = useState<'tablet' | 'explosion' | 'mushroom' | 'complete'>('tablet');
  const [shredderProgress, setShredderProgress] = useState(0);
  
  // Animation values
  const tabletScale = useRef(new Animated.Value(0)).current;
  const tabletRotation = useRef(new Animated.Value(0)).current;
  const explosionScale = useRef(new Animated.Value(0)).current;
  const explosionOpacity = useRef(new Animated.Value(0)).current;
  const mushroomScale = useRef(new Animated.Value(0)).current;
  const mushroomOpacity = useRef(new Animated.Value(0)).current;
  const particleAnimations = useRef(
    Array.from({ length: 20 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(1),
      scale: new Animated.Value(1)
    }))
  ).current;

  const { width, height } = Dimensions.get('window');
  const centerX = width / 2;
  const centerY = height / 2;

  useEffect(() => {
    if (visible) {
      startCyanideSequence();
    } else {
      resetAnimations();
    }
  }, [visible]);

  useEffect(() => {
    setShredderProgress(progress);
  }, [progress]);

  const startCyanideSequence = () => {
    console.log('💊 CYANIDE TABLET VISUAL SEQUENCE INITIATED');
    
    // Phase 1: Tablet appears and dissolves (2 seconds)
    setAnimationPhase('tablet');
    
    Animated.sequence([
      // Tablet drops in
      Animated.timing(tabletScale, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // Tablet spins and dissolves
      Animated.parallel([
        Animated.timing(tabletRotation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(tabletScale, {
          toValue: 0,
          duration: 1000,
          delay: 500,
          useNativeDriver: true,
        })
      ])
    ]).start(() => {
      // Phase 2: Nuclear explosion (1 second)
      startExplosionPhase();
    });
  };

  const startExplosionPhase = () => {
    console.log('💥 NUCLEAR EXPLOSION PHASE');
    setAnimationPhase('explosion');

    Animated.parallel([
      Animated.timing(explosionScale, {
        toValue: 3,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(explosionOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(explosionOpacity, {
        toValue: 0,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Phase 3: Mushroom cloud
      startMushroomPhase();
    });

    // Start particle effects
    startParticleEffects();
  };

  const startMushroomPhase = () => {
    console.log('🍄 MUSHROOM CLOUD PHASE');
    setAnimationPhase('mushroom');

    Animated.parallel([
      Animated.timing(mushroomScale, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
      Animated.timing(mushroomOpacity, {
        toValue: 0.8,
        duration: 1000,
        useNativeDriver: true,
      }),
      // Fade out mushroom cloud
      Animated.timing(mushroomOpacity, {
        toValue: 0,
        duration: 2000,
        delay: 3000,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Phase 4: Complete
      setAnimationPhase('complete');
      setTimeout(() => {
        onComplete();
      }, 1000);
    });
  };

  const startParticleEffects = () => {
    // Animate data particles being destroyed
    particleAnimations.forEach((particle, index) => {
      const angle = (index / particleAnimations.length) * 2 * Math.PI;
      const distance = 100 + Math.random() * 200;
      
      Animated.parallel([
        Animated.timing(particle.x, {
          toValue: Math.cos(angle) * distance,
          duration: 2000 + Math.random() * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(particle.y, {
          toValue: Math.sin(angle) * distance,
          duration: 2000 + Math.random() * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: 1500 + Math.random() * 500,
          useNativeDriver: true,
        }),
        Animated.timing(particle.scale, {
          toValue: 0,
          duration: 1000 + Math.random() * 1000,
          useNativeDriver: true,
        })
      ]).start();
    });
  };

  const resetAnimations = () => {
    tabletScale.setValue(0);
    tabletRotation.setValue(0);
    explosionScale.setValue(0);
    explosionOpacity.setValue(0);
    mushroomScale.setValue(0);
    mushroomOpacity.setValue(0);
    
    particleAnimations.forEach(particle => {
      particle.x.setValue(0);
      particle.y.setValue(0);
      particle.opacity.setValue(1);
      particle.scale.setValue(1);
    });
  };

  const renderTablet = () => (
    <Animated.View
      style={[
        styles.tabletContainer,
        {
          transform: [
            { scale: tabletScale },
            { 
              rotate: tabletRotation.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '720deg']
              })
            }
          ]
        }
      ]}
    >
      {/* Omerta Capsule */}
      <LinearGradient
        colors={['#ef4444', '#ffffff', '#ef4444']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.capsule}
      >
        <View style={styles.capsuleTop} />
        <View style={styles.capsuleBottom} />
      </LinearGradient>
      
      <Text style={styles.tabletLabel}>💊 CYANIDE TABLET</Text>
      <Text style={styles.tabletSubtext}>OMERTA BRAND</Text>
    </Animated.View>
  );

  const renderExplosion = () => (
    <Animated.View
      style={[
        styles.explosionContainer,
        {
          opacity: explosionOpacity,
          transform: [{ scale: explosionScale }]
        }
      ]}
    >
      <LinearGradient
        colors={['#ffffff', '#ffff00', '#ff8800', '#ff0000']}
        style={styles.explosion}
      />
    </Animated.View>
  );

  const renderMushroom = () => (
    <Animated.View
      style={[
        styles.mushroomContainer,
        {
          opacity: mushroomOpacity,
          transform: [{ scale: mushroomScale }]
        }
      ]}
    >
      {/* Mushroom stem */}
      <LinearGradient
        colors={['#666666', '#333333']}
        style={styles.mushroomStem}
      />
      
      {/* Mushroom cap */}
      <LinearGradient
        colors={['#ff4444', '#cc0000', '#880000']}
        style={styles.mushroomCap}
      />
      
      {/* Smoke rings */}
      {[0, 1, 2].map(i => (
        <Animated.View
          key={i}
          style={[
            styles.smokeRing,
            {
              top: 100 + i * 40,
              opacity: mushroomOpacity.interpolate({
                inputRange: [0, 0.8],
                outputRange: [0, 0.3 - i * 0.1]
              })
            }
          ]}
        />
      ))}
    </Animated.View>
  );

  const renderParticles = () => (
    <View style={styles.particlesContainer}>
      {particleAnimations.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            {
              transform: [
                { translateX: particle.x },
                { translateY: particle.y },
                { scale: particle.scale }
              ],
              opacity: particle.opacity
            }
          ]}
        >
          <Text style={styles.particleText}>
            {['📁', '💾', '🔒', '📄', '🖼️', '💬'][index % 6]}
          </Text>
        </Animated.View>
      ))}
    </View>
  );

  const renderProgress = () => (
    <View style={styles.progressContainer}>
      <Text style={styles.progressTitle}>STEELOS-SHREDDER</Text>
      <Text style={styles.progressPhase}>{phase}</Text>
      
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { width: `${shredderProgress}%` }
          ]} 
        />
      </View>
      
      <Text style={styles.progressText}>{shredderProgress.toFixed(1)}% SHREDDED</Text>
      
      {animationPhase === 'complete' && (
        <Text style={styles.completeText}>💀 DATA OBLITERATED</Text>
      )}
    </View>
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Nuclear flash overlay */}
        {animationPhase === 'explosion' && (
          <Animated.View
            style={[
              styles.flashOverlay,
              { opacity: explosionOpacity }
            ]}
          />
        )}

        <BlurView intensity={50} style={styles.blurBackground}>
          {/* Main animation area */}
          <View style={styles.animationArea}>
            {animationPhase === 'tablet' && renderTablet()}
            {animationPhase === 'explosion' && (
              <>
                {renderExplosion()}
                {renderParticles()}
              </>
            )}
            {animationPhase === 'mushroom' && renderMushroom()}
          </View>

          {/* Progress display */}
          {renderProgress()}

          {/* OMERTA Branding */}
          <View style={styles.brandingContainer}>
            <Text style={styles.omertaText}>OMERTA</Text>
            <Text style={styles.tagline}>The World's Safest</Text>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  blurBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    zIndex: 10,
  },
  animationArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  tabletContainer: {
    alignItems: 'center',
  },
  capsule: {
    width: 80,
    height: 200,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  capsuleTop: {
    width: 76,
    height: 98,
    backgroundColor: '#ef4444',
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    marginBottom: 2,
  },
  capsuleBottom: {
    width: 76,
    height: 98,
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 38,
    borderBottomRightRadius: 38,
  },
  tabletLabel: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 20,
    textAlign: 'center',
  },
  tabletSubtext: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  explosionContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  explosion: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
  },
  mushroomContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  mushroomStem: {
    width: 40,
    height: 200,
    borderRadius: 20,
  },
  mushroomCap: {
    width: 160,
    height: 80,
    borderRadius: 80,
    position: 'absolute',
    top: -40,
  },
  smokeRing: {
    position: 'absolute',
    width: 200,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#666666',
    backgroundColor: 'transparent',
  },
  particlesContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
  },
  particleText: {
    fontSize: 24,
    opacity: 0.8,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  progressTitle: {
    color: '#ef4444',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressPhase: {
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#333333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ef4444',
    borderRadius: 4,
  },
  progressText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  completeText: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 12,
    textAlign: 'center',
  },
  brandingContainer: {
    position: 'absolute',
    bottom: 20,
    alignItems: 'center',
  },
  omertaText: {
    color: '#ef4444',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  tagline: {
    color: '#ffffff',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
});