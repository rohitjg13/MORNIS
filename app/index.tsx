import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function Index() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session) {
        const userType = await AsyncStorage.getItem('userType');
        if (userType === 'driver') {
          router.replace('/drivers/dashboard');
        } else if (userType === 'people') {
          router.replace('/people/dashboard');
        }
      } else if (event === 'SIGNED_OUT') {
        await AsyncStorage.removeItem('userType');
        router.replace('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAuthState = async () => {
    try {
      // Check if Supabase is properly configured
      const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
      const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;
      
      if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'your-supabase-project-url') {
        console.log('Supabase not configured, redirecting to login');
        router.replace('/login');
        return;
      }

      // Wait a bit for Supabase to restore session from storage
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        router.replace('/login');
        return;
      }
      
      if (session) {
        console.log('Session found:', session.user.id);
        const userType = await AsyncStorage.getItem('userType');
        
        if (userType === 'driver') {
          router.replace('/drivers/dashboard');
        } else if (userType === 'people') {
          router.replace('/people/dashboard');
        } else {
          router.replace('/login');
        }
      } else {
        console.log('No session found, redirecting to login');
        router.replace('/login');
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#ff0" />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
});
