import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MatrixBackground({ intensity = 0.1, color = '#00ff00' }) {
  // Simple animated background simulation
  const chars = ['O', 'M', 'E', 'R', 'T', 'Á', '0', '1'];
  
  return (
    <View style={[styles.container, { opacity: intensity }]}>
      <View style={styles.matrix}>
        {[...Array(20)].map((_, i) => (
          <Text key={i} style={[styles.char, { color }]}>
            {chars[Math.floor(Math.random() * chars.length)]}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  matrix: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  char: {
    fontSize: 12,
    fontFamily: 'monospace',
    margin: 2,
  },
});