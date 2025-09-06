import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type UserType = 'people' | 'driver';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedUserType, setSelectedUserType] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const signUp = async () => {
    if (!selectedUserType) {
      Alert.alert('Error', 'Please select whether you are a Driver or Citizen');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (!password.trim() || password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            user_type: selectedUserType
          }
        }
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        await AsyncStorage.setItem('userType', selectedUserType!);
        
        if (selectedUserType === 'driver') {
          router.replace('/drivers/dashboard');
        } else {
          router.replace('/people/dashboard');
        }
      }
    } catch (err) {
      console.error('Failed to sign up:', err);
      Alert.alert('Error', 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    if (!selectedUserType) {
      Alert.alert('Error', 'Please select whether you are a Driver or Citizen');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else if (data.user) {
        await AsyncStorage.setItem('userType', selectedUserType!);
        
        await supabase.auth.updateUser({
          data: { user_type: selectedUserType }
        });

        if (selectedUserType === 'driver') {
          router.replace('/drivers/dashboard');
        } else {
          router.replace('/people/dashboard');
        }
      }
    } catch (err) {
      console.error('Failed to sign in:', err);
      Alert.alert('Error', 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to TrashTrack</Text>
        <Text style={styles.subtitle}>
          Choose your role and {isSignUp ? 'create an account' : 'sign in'}
        </Text>

        <>
          <View style={styles.userTypeContainer}>
            <Text style={styles.label}>I am a:</Text>
            <View style={styles.userTypeButtons}>
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  selectedUserType === 'people' && styles.userTypeButtonSelected,
                ]}
                onPress={() => setSelectedUserType('people')}
              >
                <Text
                  style={[
                    styles.userTypeButtonText,
                    selectedUserType === 'people' && styles.userTypeButtonTextSelected,
                  ]}
                >
                  Citizen
                </Text>
                <Text style={styles.userTypeDescription}>
                  Report incidents and track waste collection
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  selectedUserType === 'driver' && styles.userTypeButtonSelected,
                ]}
                onPress={() => setSelectedUserType('driver')}
              >
                <Text
                  style={[
                    styles.userTypeButtonText,
                    selectedUserType === 'driver' && styles.userTypeButtonTextSelected,
                  ]}
                >
                  Driver
                </Text>
                <Text style={styles.userTypeDescription}>
                  Manage garbage collection routes
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#aaa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, (!selectedUserType || !email.trim() || !password.trim()) && styles.buttonDisabled]}
            onPress={isSignUp ? signUp : signIn}
            disabled={loading || !selectedUserType || !email.trim() || !password.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <Text style={styles.secondaryButtonText}>
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 40,
  },
  userTypeContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 18,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 15,
  },
  userTypeButtons: {
    gap: 15,
  },
  userTypeButton: {
    backgroundColor: '#222',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#333',
  },
  userTypeButtonSelected: {
    borderColor: '#ff0',
    backgroundColor: '#333',
  },
  userTypeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 5,
  },
  userTypeButtonTextSelected: {
    color: '#ff0',
  },
  userTypeDescription: {
    fontSize: 14,
    color: '#aaa',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#222',
    borderRadius: 16,
    padding: 15,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  button: {
    backgroundColor: '#ff0',
    borderRadius: 16,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#666',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  secondaryButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    color: '#ff0',
  },
});
