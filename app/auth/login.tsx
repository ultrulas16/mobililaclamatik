import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Mail, Lock } from 'lucide-react-native';
import { LanguageSelector } from '@/components/LanguageSelector'; // Eklendi
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const router = useRouter();
  const { t } = useLanguage();
  const { signIn, signInWithGoogle, user, profile, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (user && profile) {
      router.replace('/');
    }
  }, [user, profile, authLoading]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t('fillAllFields')); // Çeviri kullanıldı
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
      setTimeout(() => {
        router.replace('/');
      }, 500);
    } catch (err: any) {
      console.error('[LOGIN] Login error:', err);
      let errorMessage = 'Giriş başarısız oldu';
      if (err.message?.includes('Invalid login credentials')) {
        errorMessage = 'Email veya şifre hatalı';
      } else if (err.message?.includes('Email not confirmed')) {
        errorMessage = 'Email adresinizi doğrulayın';
      } else if (err.message?.includes('network')) {
        errorMessage = 'İnternet bağlantınızı kontrol edin';
      }
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('[LOGIN] Google OAuth error:', err);
      setError('Google ile giriş başarısız oldu. Lütfen tekrar deneyin.');
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#4caf50', '#2e7d32']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
            
            {/* Dil Seçici Eklendi */}
            <View style={styles.languageContainer}>
              <LanguageSelector />
            </View>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>{t('login')}</Text>
            <Text style={styles.subtitle}>Pest Control System</Text>
          </View>

          <View style={styles.formContainer}>
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputContainer}>
              <Mail size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('email')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('password')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>{t('login')}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity
              style={[styles.googleButton, loading && styles.googleButtonDisabled]}
              onPress={handleGoogleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#666" />
              ) : (
                <>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleButtonText}>Google ile Giriş Yap</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.linksContainer}>
              <TouchableOpacity
                style={styles.forgotPasswordLink}
                onPress={() => router.push('/auth/forgot-password')}
              >
                <Text style={styles.forgotPasswordText}>{t('forgotPassword')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.registerLink}
                onPress={() => router.push('/auth/register')}
              >
                <Text style={styles.registerLinkText}>{t('dontHaveAccount')}</Text>
                <Text style={styles.registerLinkTextBold}> {t('register')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageContainer: {
    // Dil seçici için stil
  },
  header: {
    marginBottom: 40,
    marginTop: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#e8f5e9',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
  },
  loginButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#4caf50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linksContainer: {
    marginTop: 20,
  },
  forgotPasswordLink: {
    alignItems: 'center',
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: '#4caf50',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  registerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerLinkText: {
    color: '#666',
    fontSize: 14,
  },
  registerLinkTextBold: {
    color: '#4caf50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  googleButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4285F4',
    marginRight: 12,
  },
  googleButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});