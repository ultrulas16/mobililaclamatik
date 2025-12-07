// app/subscription-expired.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, LogOut, CreditCard } from 'lucide-react-native';

export default function SubscriptionExpired() {
  const router = useRouter();
  const { t } = useLanguage();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.replace('/welcome');
  };

  const handleRenewSubscription = () => {
    router.push('/company/subscription');
  };

  return (
    <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconContainer}>
          <AlertTriangle size={80} color="#fff" />
        </View>

        <Text style={styles.title}>{t('subscriptionExpiredTitle')}</Text>
        <Text style={styles.subtitle}>{t('subscriptionExpiredMessage')}</Text>

        <TouchableOpacity
          style={styles.renewButton}
          onPress={handleRenewSubscription}
        >
          <CreditCard size={24} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.renewButtonText}>{t('renewSubscription')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <LogOut size={20} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.logoutButtonText}>{t('logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#fecaca', // Daha açık kırmızı tonu
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 24,
  },
  renewButton: {
    backgroundColor: '#22c55e', // Daha canlı yeşil tonu
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  renewButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
});
