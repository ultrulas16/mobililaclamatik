import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import { Bug } from 'lucide-react-native';

export default function Welcome() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, profile, loading } = useAuth();
  const [showOAuthLoading, setShowOAuthLoading] = React.useState(false);

  useEffect(() => {
    if (loading) {
      return;
    }

    console.log('Welcome page - User:', !!user, 'Profile:', !!profile);
    console.log('User metadata:', user?.user_metadata);
    console.log('User app_metadata:', user?.app_metadata);

    if (user && profile) {
      console.log('User already logged in with profile, redirecting to dashboard');
      router.replace('/');
    } else if (user && !profile) {
      // User exists but no profile - OAuth user, wait for profile creation
      console.log('OAuth user detected, waiting for profile creation...');
      setShowOAuthLoading(true);
      // Show loading state while profile is being created
      console.log('Showing loading for OAuth user without profile');
    }
  }, [user, profile, loading]);

  if (loading || showOAuthLoading) {
    return (
      <LinearGradient colors={['#4caf50', '#2e7d32']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          {showOAuthLoading && (
            <Text style={styles.loadingText}>
              Hesabınız oluşturuluyor...{"\n"}
              Bu işlem birkaç saniye sürebilir.
            </Text>
          )}
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#4caf50', '#2e7d32']} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Bug size={80} color="#fff" strokeWidth={2} />
        </View>

        <Text style={styles.title}>{t('welcome')}</Text>
        <Text style={styles.subtitle}>Pest Control Management System</Text>

        <View style={styles.languageSection}>
          <Text style={styles.languageLabel}>{t('selectLanguage')}</Text>
          <LanguageSelector />
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={styles.primaryButtonText}>{t('login')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/auth/register')}
        >
          <Text style={styles.secondaryButtonText}>{t('register')}</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    lineHeight: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
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
    color: '#e8f5e9',
    marginBottom: 50,
    textAlign: 'center',
  },
  languageSection: {
    width: '100%',
    marginBottom: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
  },
  languageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  primaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
  },
  primaryButtonText: {
    color: '#2e7d32',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});