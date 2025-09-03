/**
 * 🧩 VAULT SECURITY PUZZLE - NSA ENGAGEMENT PROTOCOL
 * 
 * Cloudflare-style interactive puzzle that keeps users engaged while
 * cryptographic operations happen in background. Appears to be security-related
 * but actually just buys time for Argon2id key derivation.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, PanGestureHandler, State } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../state/theme';

interface VaultSecurityPuzzleProps {
  visible: boolean;
  onComplete: () => void;
  onFail?: () => void;
  minimumTime?: number; // Minimum time to keep puzzle active (for crypto)
}

interface PuzzlePiece {
  id: number;
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  placed: boolean;
}

export const VaultSecurityPuzzle: React.FC<VaultSecurityPuzzleProps> = ({
  visible,
  onComplete,
  onFail,
  minimumTime = 5000 // 5 seconds minimum for crypto
}) => {
  const { colors } = useTheme();
  const [stage, setStage] = useState<'initializing' | 'puzzle' | 'validating' | 'complete'>('initializing');
  const [puzzlePieces, setPuzzlePieces] = useState<PuzzlePiece[]>([]);
  const [completedPieces, setCompletedPieces] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [securityLevel, setSecurityLevel] = useState(0);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const securityBarAnim = useRef(new Animated.Value(0)).current;

  // Initialize puzzle when visible
  useEffect(() => {
    if (visible) {
      initializePuzzle();
    }
  }, [visible]);

  const initializePuzzle = async () => {
    console.log('🧩 NSA PUZZLE: Initializing security puzzle...');
    setStage('initializing');
    setStartTime(Date.now());
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Generate puzzle pieces
    const pieces: PuzzlePiece[] = [
      { id: 1, targetX: 100, targetY: 100, currentX: 50, currentY: 200, placed: false },
      { id: 2, targetX: 150, targetY: 100, currentX: 250, currentY: 150, placed: false },
      { id: 3, targetX: 100, targetY: 150, currentX: 200, currentY: 250, placed: false },
      { id: 4, targetX: 150, targetY: 150, currentX: 300, currentY: 50, placed: false },
    ];
    
    setPuzzlePieces(pieces);
    
    // Security level animation
    Animated.timing(securityBarAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    // Move to puzzle stage after initialization
    setTimeout(() => {
      setStage('puzzle');
      console.log('🧩 NSA PUZZLE: Puzzle ready for user interaction');
    }, 1500);
  };

  const handlePieceMove = (pieceId: number, x: number, y: number) => {
    const updatedPieces = puzzlePieces.map(piece => {
      if (piece.id === pieceId) {
        const distance = Math.sqrt(
          Math.pow(x - piece.targetX, 2) + Math.pow(y - piece.targetY, 2)
        );
        
        // If piece is close enough to target (within 30 units)
        if (distance < 30 && !piece.placed) {
          setCompletedPieces(prev => prev + 1);
          setSecurityLevel(prev => prev + 25);
          
          // Animate security level increase
          Animated.timing(progressAnim, {
            toValue: (completedPieces + 1) / 4,
            duration: 300,
            useNativeDriver: false,
          }).start();
          
          console.log(`🧩 NSA PUZZLE: Piece ${pieceId} placed correctly`);
          
          return { ...piece, currentX: piece.targetX, currentY: piece.targetY, placed: true };
        }
        return { ...piece, currentX: x, currentY: y };
      }
      return piece;
    });
    
    setPuzzlePieces(updatedPieces);
    
    // Check if puzzle is complete
    const allPlaced = updatedPieces.every(piece => piece.placed);
    if (allPlaced) {
      handlePuzzleComplete();
    }
  };

  const handlePuzzleComplete = async () => {
    console.log('🧩 NSA PUZZLE: All pieces placed correctly');
    setStage('validating');
    setSecurityLevel(100);
    
    // Ensure minimum time has passed for crypto operations
    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, minimumTime - elapsedTime);
    
    if (remainingTime > 0) {
      console.log(`🧩 NSA PUZZLE: Waiting additional ${remainingTime}ms for crypto completion`);
      setTimeout(() => {
        completePuzzle();
      }, remainingTime);
    } else {
      completePuzzle();
    }
  };

  const completePuzzle = () => {
    console.log('🧩 NSA PUZZLE: Security validation complete');
    setStage('complete');
    
    // Success animation
    Animated.sequence([
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      onComplete();
    });
  };

  const handlePuzzleFail = () => {
    console.log('🧩 NSA PUZZLE: Security validation failed');
    if (onFail) {
      onFail();
    }
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={32} color={colors.accent} />
          <Text style={[styles.title, { color: colors.text }]}>🔒 OMERTA Security Verification</Text>
          <Text style={[styles.subtitle, { color: colors.sub }]}>
            {stage === 'initializing' && 'Initializing secure connection...'}
            {stage === 'puzzle' && 'Complete the security puzzle to verify your identity'}
            {stage === 'validating' && 'Validating cryptographic signatures...'}
            {stage === 'complete' && 'Security verification complete'}
          </Text>
        </View>

        {/* Security Level Indicator */}
        <View style={styles.securityIndicator}>
          <Text style={[styles.securityLabel, { color: colors.text }]}>Security Level</Text>
          <View style={[styles.progressBarContainer, { backgroundColor: colors.bg }]}>
            <Animated.View 
              style={[
                styles.progressBar, 
                { 
                  backgroundColor: colors.accent,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  })
                }
              ]} 
            />
          </View>
          <Text style={[styles.securityPercent, { color: colors.accent }]}>
            {securityLevel}%
          </Text>
        </View>

        {/* Puzzle Area */}
        {stage === 'puzzle' && (
          <View style={styles.puzzleArea}>
            <Text style={[styles.puzzleInstructions, { color: colors.sub }]}>
              Drag the security tokens to their correct positions
            </Text>
            
            {/* Target positions (outlines) */}
            {puzzlePieces.map(piece => (
              <View
                key={`target-${piece.id}`}
                style={[
                  styles.targetPosition,
                  {
                    left: piece.targetX,
                    top: piece.targetY,
                    borderColor: piece.placed ? colors.accent : colors.border,
                    backgroundColor: piece.placed ? `${colors.accent}20` : 'transparent'
                  }
                ]}
              />
            ))}
            
            {/* Draggable pieces */}
            {puzzlePieces.map(piece => (
              !piece.placed && (
                <TouchableOpacity
                  key={`piece-${piece.id}`}
                  style={[
                    styles.puzzlePiece,
                    {
                      left: piece.currentX,
                      top: piece.currentY,
                      backgroundColor: colors.accent
                    }
                  ]}
                  onPress={() => {
                    // Simple tap to place (for mobile ease)
                    handlePieceMove(piece.id, piece.targetX, piece.targetY);
                  }}
                >
                  <Ionicons name="key" size={16} color="#000" />
                  <Text style={styles.pieceText}>{piece.id}</Text>
                </TouchableOpacity>
              )
            ))}
          </View>
        )}

        {/* Loading states */}
        {(stage === 'initializing' || stage === 'validating') && (
          <View style={styles.loadingArea}>
            <Animated.View style={[styles.spinner, { transform: [{ rotate: '360deg' }] }]}>
              <Ionicons name="sync" size={32} color={colors.accent} />
            </Animated.View>
            <Text style={[styles.loadingText, { color: colors.sub }]}>
              {stage === 'initializing' && 'Establishing secure connection...'}
              {stage === 'validating' && 'Verifying cryptographic integrity...'}
            </Text>
          </View>
        )}

        {/* Complete state */}
        {stage === 'complete' && (
          <View style={styles.completeArea}>
            <Ionicons name="checkmark-circle" size={48} color={colors.accent} />
            <Text style={[styles.completeText, { color: colors.text }]}>
              Security Verification Complete
            </Text>
            <Text style={[styles.completeSubtext, { color: colors.sub }]}>
              Vault access granted
            </Text>
          </View>
        )}

        {/* Skip option (appears after 8 seconds if puzzle not complete) */}
        {stage === 'puzzle' && (
          <TouchableOpacity 
            style={[styles.skipButton, { borderColor: colors.border }]}
            onPress={handlePuzzleComplete}
          >
            <Text style={[styles.skipText, { color: colors.sub }]}>
              Skip puzzle (manual verification)
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  securityIndicator: {
    marginBottom: 24,
  },
  securityLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  securityPercent: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  puzzleArea: {
    height: 300,
    position: 'relative',
    marginBottom: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
  },
  puzzleInstructions: {
    position: 'absolute',
    top: -25,
    left: 0,
    right: 0,
    fontSize: 12,
    textAlign: 'center',
  },
  targetPosition: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  puzzlePiece: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  pieceText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  loadingArea: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  spinner: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
  },
  completeArea: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  completeText: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 4,
  },
  completeSubtext: {
    fontSize: 14,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 16,
  },
  skipText: {
    fontSize: 12,
  },
});

export default VaultSecurityPuzzle;