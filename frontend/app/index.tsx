import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function Welcome() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔒 OMERTÁ</Text>
      <Text style={styles.subtitle}>The World's Most Secure Messaging App</Text>
      <Text style={styles.tagline}>Making Pegasus Irrelevant</Text>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => router.push('/(tabs)')}
      >
        <Text style={styles.buttonText}>Enter Secure Zone</Text>
      </TouchableOpacity>
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
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});