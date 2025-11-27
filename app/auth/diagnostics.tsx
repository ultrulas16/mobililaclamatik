import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft } from 'lucide-react-native';

export default function Diagnostics() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [diagnostic, setDiagnostic] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');

  const checkStatus = async () => {
    setChecking(true);
    setMessage('');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData.session?.user;

      if (!currentUser) {
        setMessage('❌ Oturum bulunamadı');
        setDiagnostic({ user: null, profile: null });
        setChecking(false);
        return;
      }

      console.log('[DIAGNOSTICS] User:', currentUser.id);
      console.log('[DIAGNOSTICS] Email:', currentUser.email);
      console.log('[DIAGNOSTICS] Provider:', currentUser.app_metadata?.provider);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      console.log('[DIAGNOSTICS] Profile:', profileData);
      console.log('[DIAGNOSTICS] Profile Error:', profileError);

      setDiagnostic({
        user: {
          id: currentUser.id,
          email: currentUser.email,
          provider: currentUser.app_metadata?.provider || 'email',
          metadata: currentUser.user_metadata,
        },
        profile: profileData,
        profileError: profileError,
      });

      if (!profileData) {
        setMessage('⚠️ Profil bulunamadı! Manuel oluşturabilirsiniz.');
      } else {
        setMessage('✅ Profil var!');
      }
    } catch (error: any) {
      console.error('[DIAGNOSTICS] Error:', error);
      setMessage('❌ Hata: ' + error.message);
    } finally {
      setChecking(false);
    }
  };

  const createProfileManually = async () => {
    setCreating(true);
    setMessage('');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData.session?.user;

      if (!currentUser) {
        setMessage('❌ Oturum bulunamadı');
        setCreating(false);
        return;
      }

      console.log('[DIAGNOSTICS] Creating profile for:', currentUser.id);

      const fullName = currentUser.user_metadata?.full_name ||
                       currentUser.user_metadata?.name ||
                       currentUser.email?.split('@')[0] ||
                       'User';
      const companyName = fullName + ' Pest Control';

      // Create company first
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          owner_id: currentUser.id,
          email: currentUser.email,
          phone: '',
          address: '',
          currency: 'TRY',
        })
        .select()
        .single();

      if (companyError) {
        console.error('[DIAGNOSTICS] Company error:', companyError);
        throw companyError;
      }

      console.log('[DIAGNOSTICS] Company created:', companyData.id);

      // Create profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: currentUser.id,
          email: currentUser.email!,
          full_name: fullName,
          phone: '',
          role: 'company',
          company_id: companyData.id,
          company_name: companyName,
          currency: 'TRY',
          accepted_privacy_policy: true,
          accepted_terms_of_service: true,
          privacy_policy_accepted_at: new Date().toISOString(),
          terms_of_service_accepted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (profileError) {
        console.error('[DIAGNOSTICS] Profile error:', profileError);
        throw profileError;
      }

      console.log('[DIAGNOSTICS] Profile created:', profileData);
      setMessage('✅ Profil başarıyla oluşturuldu! Sayfa yenileniyor...');

      setTimeout(() => {
        router.replace('/');
      }, 2000);
    } catch (error: any) {
      console.error('[DIAGNOSTICS] Create error:', error);
      setMessage('❌ Hata: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <LinearGradient colors={['#4caf50', '#2e7d32']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>🔧 OAuth Diagnostics</Text>
          <Text style={styles.subtitle}>Hesap Durumu Kontrolü</Text>
        </View>

        <View style={styles.card}>
          {message ? (
            <View style={styles.messageContainer}>
              <Text style={styles.messageText}>{message}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.button}
            onPress={checkStatus}
            disabled={checking}
          >
            {checking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>🔄 Durumu Kontrol Et</Text>
            )}
          </TouchableOpacity>

          {diagnostic && (
            <View style={styles.diagnosticContainer}>
              <Text style={styles.sectionTitle}>Kullanıcı Bilgileri:</Text>
              {diagnostic.user ? (
                <>
                  <Text style={styles.diagnosticText}>ID: {diagnostic.user.id}</Text>
                  <Text style={styles.diagnosticText}>Email: {diagnostic.user.email}</Text>
                  <Text style={styles.diagnosticText}>Provider: {diagnostic.user.provider}</Text>
                </>
              ) : (
                <Text style={styles.diagnosticText}>❌ Kullanıcı yok</Text>
              )}

              <Text style={styles.sectionTitle}>Profil Durumu:</Text>
              {diagnostic.profile ? (
                <>
                  <Text style={styles.diagnosticText}>✅ Profil var</Text>
                  <Text style={styles.diagnosticText}>Rol: {diagnostic.profile.role}</Text>
                  <Text style={styles.diagnosticText}>İsim: {diagnostic.profile.full_name}</Text>
                  <Text style={styles.diagnosticText}>Company ID: {diagnostic.profile.company_id || 'Yok'}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.diagnosticText}>❌ Profil yok</Text>
                  {diagnostic.user && (
                    <TouchableOpacity
                      style={[styles.button, styles.createButton]}
                      onPress={createProfileManually}
                      disabled={creating}
                    >
                      {creating ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.buttonText}>➕ Profil Oluştur</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>📋 Context Durumu:</Text>
            <Text style={styles.infoText}>Loading: {loading ? 'Evet ⏳' : 'Hayır'}</Text>
            <Text style={styles.infoText}>User: {user ? '✅ Var' : '❌ Yok'}</Text>
            <Text style={styles.infoText}>Profile: {profile ? '✅ Var' : '❌ Yok'}</Text>
            {profile && (
              <>
                <Text style={styles.infoText}>Role: {profile.role}</Text>
                <Text style={styles.infoText}>Name: {profile.full_name}</Text>
              </>
            )}
          </View>
        </View>
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
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#e8f5e9',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  messageContainer: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  messageText: {
    fontSize: 14,
    color: '#1976d2',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4caf50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#ff9800',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  diagnosticContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  diagnosticText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  infoBox: {
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ffb74d',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e65100',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#e65100',
    marginBottom: 4,
  },
});
