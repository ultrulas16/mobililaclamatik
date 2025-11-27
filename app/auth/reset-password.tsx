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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Lock } from 'lucide-react-native';

export default function ResetPassword() {
  const router = useRouter();
  const { t } = useLanguage();
  const { updatePassword } = useAuth();
  const params = useLocalSearchParams();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      if (Platform.OS === 'web') {
        console.log('[RESET_PASSWORD] Current URL:', window.location.href);
        console.log('[RESET_PASSWORD] Hash:', window.location.hash);

        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        const error_code = hashParams.get('error_code');
        const error_description = hashParams.get('error_description');

        console.log('[RESET_PASSWORD] Token type:', type);
        console.log('[RESET_PASSWORD] Has access token:', !!accessToken);
        console.log('[RESET_PASSWORD] Error code:', error_code);

        if (error_code) {
          console.error('[RESET_PASSWORD] URL contains error:', error_code, error_description);
          setError('Şifre sıfırlama bağlantısı geçersiz. Lütfen yeni bir bağlantı isteyin.');
          setIsValidSession(false);
          return;
        }

        if (type === 'recovery' && accessToken && refreshToken) {
          try {
            console.log('[RESET_PASSWORD] Setting recovery session...');
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('[RESET_PASSWORD] Session error:', error);
              setError('Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş');
              setIsValidSession(false);
            } else {
              console.log('[RESET_PASSWORD] Session set successfully, user:', data.user?.email);
              setIsValidSession(true);
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          } catch (err) {
            console.error('[RESET_PASSWORD] Error setting session:', err);
            setError('Bir hata oluştu. Lütfen tekrar deneyin.');
            setIsValidSession(false);
          }
        } else {
          console.log('[RESET_PASSWORD] No recovery token in URL, checking existing session...');
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log('[RESET_PASSWORD] Found existing session for:', session.user?.email);
            setIsValidSession(true);
          } else {
            console.log('[RESET_PASSWORD] No valid session found');
            setIsValidSession(false);
          }
        }
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        setIsValidSession(!!session);
      }
    };

    checkSession();
  }, []);

  const handleResetPassword = async () => {
    if (!isValidSession) {
      setError('Şifre sıfırlama bağlantısı geçersiz. Lütfen yeni bir bağlantı isteyin.');
      return;
    }

    if (!password || !confirmPassword) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return;
    }

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => {
        router.replace('/auth/login');
      }, 2000);
    } catch (err: any) {
      console.error('[RESET_PASSWORD] Error:', err);
      let errorMessage = 'Şifre sıfırlama başarısız oldu';
      if (err.message?.includes('token')) {
        errorMessage = 'Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş. Lütfen tekrar deneyin.';
      } else if (err.message?.includes('network')) {
        errorMessage = 'İnternet bağlantınızı kontrol edin';
      }
      setError(errorMessage);
    } finally {
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
          <View style={styles.header}>
            <Text style={styles.title}>Yeni Şifre Oluştur</Text>
            <Text style={styles.subtitle}>
              Lütfen yeni şifrenizi girin
            </Text>
          </View>

          <View style={styles.formContainer}>
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {success ? (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>
                  Şifreniz başarıyla güncellendi. Giriş sayfasına yönlendiriliyorsunuz...
                </Text>
              </View>
            ) : null}

            <View style={styles.inputContainer}>
              <Lock size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Yeni Şifre"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                editable={!loading && !success}
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Yeni Şifre (Tekrar)"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                editable={!loading && !success}
              />
            </View>

            <TouchableOpacity
              style={[styles.resetButton, (loading || success) && styles.resetButtonDisabled]}
              onPress={handleResetPassword}
              disabled={loading || success}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.resetButtonText}>Şifreyi Güncelle</Text>
              )}
            </TouchableOpacity>

            {!success && (
              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => router.push('/auth/login')}
              >
                <Text style={styles.loginLinkText}>Giriş sayfasına dön</Text>
              </TouchableOpacity>
            )}
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
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
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
    lineHeight: 24,
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
    lineHeight: 20,
  },
  successContainer: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  successText: {
    color: '#2e7d32',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
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
  resetButton: {
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
  resetButtonDisabled: {
    opacity: 0.6,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginLinkText: {
    color: '#4caf50',
    fontSize: 14,
    fontWeight: '600',
  },
});
