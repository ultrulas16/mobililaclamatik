import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { user, profile, loading, subscriptionStatus } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [waitingForProfile, setWaitingForProfile] = useState(false);

  useEffect(() => {
    if (loading || subscriptionStatus === 'loading') {
      console.log('[INDEX] Auth loading...');
      return;
    }

    console.log('[INDEX] User:', !!user, 'Profile:', !!profile, 'Role:', profile?.role, 'Subscription:', subscriptionStatus);

    const inAuthGroup = segments[0] === '(tabs)';
    const inSubscriptionExpiredPage = segments[0] === 'subscription-expired';

    if (user && !profile) {
      console.log('[INDEX] User without profile - waiting for creation...');
      setWaitingForProfile(true);
      return;
    } else if (!user || !profile) {
      console.log('[INDEX] No auth, redirecting to welcome');
      setWaitingForProfile(false);
      if (segments[0] !== 'welcome' && segments[0] !== 'auth') {
        router.replace('/welcome');
      }
    } else if (profile.role === 'company' && subscriptionStatus === 'expired' && !inSubscriptionExpiredPage) {
      console.log('[INDEX] Subscription expired, redirecting to expired page');
      setWaitingForProfile(false);
      router.replace('/subscription-expired');
    } else if (!inAuthGroup) {
      setWaitingForProfile(false);
      console.log('[INDEX] Redirecting to dashboard:', profile.role);

      switch (profile.role) {
        case 'admin':
          router.replace('/(tabs)/admin');
          break;
        case 'company':
          router.replace('/(tabs)/company');
          break;
        case 'operator':
          router.replace('/(tabs)/operator');
          break;
        case 'customer':
          router.replace('/(tabs)/customer');
          break;
        case 'customer_branch':
          router.replace('/(tabs)/branch');
          break;
        default:
          console.log('Unknown role, redirecting to welcome');
          router.replace('/welcome');
          break;
      }
    }
  }, [user, profile, loading, subscriptionStatus, segments]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4caf50" />
      {waitingForProfile && (
        <Text style={styles.waitingText}>
          Hesabınız oluşturuluyor...{"\n"}
          Lütfen bekleyin.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 40,
  },
  waitingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});
