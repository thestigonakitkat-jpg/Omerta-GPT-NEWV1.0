import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function MatrixBackground({ intensity = 0.3, color = '#ef4444' }) {
  const [columns, setColumns] = useState([]);
  
  useEffect(() => {
    // Initialize matrix columns
    const numColumns = Math.floor(width / 20);
    const initialColumns = [];
    
    for (let i = 0; i < numColumns; i++) {
      initialColumns.push({
        id: i,
        x: i * 20,
        characters: [],
        speed: 0.5 + Math.random() * 2,
        opacity: new Animated.Value(Math.random()),
      });
    }
    
    setColumns(initialColumns);
  }, []);

  useEffect(() => {
    // Start matrix animation
    const interval = setInterval(() => {
      setColumns(prevColumns => 
        prevColumns.map(column => {
          // Add new characters randomly
          const newCharacters = [...column.characters];
          
          if (Math.random() < intensity) {
            newCharacters.push({
              id: Date.now() + Math.random(),
              y: -20,
              char: getRandomOmertaChar(),
              opacity: 1,
            });
          }
          
          // Update existing characters
          const updatedCharacters = newCharacters
            .map(char => ({
              ...char,
              y: char.y + column.speed,
              opacity: char.opacity - 0.01,
            }))
            .filter(char => char.y < height + 20 && char.opacity > 0);
          
          return {
            ...column,
            characters: updatedCharacters,
          };
        })
      );
    }, 50);

    return () => clearInterval(interval);
  }, [intensity]);

  const getRandomOmertaChar = () => {
    const omertaChars = ['O', 'M', 'E', 'R', 'T', 'À', '🔒', '🛡️', '🔥', '💀', '⚡', '☢️'];
    const matrixChars = ['0', '1'];
    const securitySymbols = ['#', '@', '$', '%', '&', '*', '+', '=', '?'];
    
    const allChars = [...omertaChars, ...matrixChars, ...securitySymbols];
    return allChars[Math.floor(Math.random() * allChars.length)];
  };

  return (
    <View style={styles.container} pointerEvents="none">
      {columns.map(column => (
        <View key={column.id} style={[styles.column, { left: column.x }]}>
          {column.characters.map(char => (
            <Text
              key={char.id}
              style={[
                styles.character,
                {
                  top: char.y,
                  opacity: char.opacity,
                  color: color,
                }
              ]}
            >
              {char.char}
            </Text>
          ))}
        </View>
      ))}
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
    backgroundColor: 'transparent',
  },
  column: {
    position: 'absolute',
    width: 20,
    height: '100%',
  },
  character: {
    position: 'absolute',
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    textAlign: 'center',
    width: 20,
  },
});