import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';

export type UserRole = 'admin' | 'company' | 'operator' | 'customer' | 'customer_branch';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  company_id?: string;
  company_name?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, profile: Partial<UserProfile>) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  subscriptionStatus: 'active' | 'expired' | 'cancelled' | 'trial' | 'none' | 'loading';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'active' | 'expired' | 'cancelled' | 'trial' | 'none' | 'loading'>('loading');
  const loadingProfile = useRef(false);

  // Handle OAuth callback on web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleAuthCallback = async () => {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('Error setting session:', error);
            } else {
              console.log('OAuth session set successfully');
              // Clear the hash from URL
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          } catch (error) {
            console.error('Error handling OAuth callback:', error);
          }
        }
      };

      handleAuthCallback();
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadProfileAndSubscription = async (userId: string, retryCount = 0) => {
      if (loadingProfile.current || !mounted) return;
      loadingProfile.current = true;
      setSubscriptionStatus('loading'); // Abonelik durumu için yükleme state'ini ayarlayın

      try {
        console.log('[AUTH] Loading profile for user:', userId, 'Retry:', retryCount);
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (profileError) {
          console.error('[AUTH] Profile query error:', profileError);
          throw profileError;
        }

        if (!profileData) {
          console.warn('[AUTH] Profile not found for user:', userId);

          if (retryCount < 15) {
            const delay = Math.min(1000 * Math.pow(1.5, retryCount), 10000);
            console.log(`[AUTH] Retrying profile load in ${delay}ms... (${retryCount + 1}/15)`);
            loadingProfile.current = false;
            setTimeout(() => {
              if (mounted) {
                loadProfileAndSubscription(userId, retryCount + 1);
              }
            }, delay);
            return;
          } else {
            console.error('[AUTH] Profile not found after 15 retries, attempting manual fallback...');
            try {
              const { data: userData } = await supabase.auth.getUser();
              if (userData.user) {
                const fullName = userData.user.user_metadata?.full_name ||
                                 userData.user.user_metadata?.name ||
                                 userData.user.email?.split('@')[0] ||
                                 'User';
                const companyName = fullName + ' Pest Control';

                const { data: companyData } = await supabase
                  .from('companies')
                  .insert({
                    name: companyName,
                    owner_id: userId,
                    email: userData.user.email,
                    phone: '',
                    address: '',
                    currency: 'TRY',
                  })
                  .select()
                  .single();

                await supabase
                  .from('profiles')
                  .insert({
                    id: userId,
                    email: userData.user.email!,
                    full_name: fullName,
                    phone: '',
                    role: 'company',
                    company_id: companyData?.id,
                    company_name: companyName,
                    currency: 'TRY',
                    accepted_privacy_policy: true,
                    accepted_terms_of_service: true,
                    privacy_policy_accepted_at: new Date().toISOString(),
                    terms_of_service_accepted_at: new Date().toISOString(),
                  });

                console.log('[AUTH] Profile created manually via fallback, reloading...');
                loadProfileAndSubscription(userId, 0); // Yeni oluşturulan profili ve aboneliği almak için yeniden yükle
                return;
              }
            } catch (fallbackError) {
              console.error('[AUTH] Fallback profile creation failed:', fallbackError);
            }
            if (mounted) {
              setProfile(null);
              setSubscriptionStatus('none'); // Profil yoksa, abonelik de yok
              setLoading(false);
            }
            loadingProfile.current = false;
            return;
          }
        }

        console.log('[AUTH] Profile loaded successfully:', profileData.email, 'Role:', profileData.role);
        if (mounted) {
          setProfile(profileData);
        }

        // --- Abonelik Durumunu Getir ---
        let companyIdForSubscription: string | undefined;
        if (profileData.role === 'company') {
          // Eğer kullanıcı bir şirket sahibi ise, companies tablosundan company ID'sini bul
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('id')
            .eq('owner_id', profileData.id)
            .maybeSingle();

          if (companyError) {
            console.error('[AUTH] Error fetching company for subscription:', companyError);
          } else if (companyData?.id) {
            companyIdForSubscription = companyData.id;
          }
        } else if (profileData.company_id) {
          // Eğer kullanıcı bir operatör, müşteri veya şube ise,
          // subscriptions tablosundaki company_id, companies.id'ye referans verir.
          companyIdForSubscription = profileData.company_id;
        }

        if (companyIdForSubscription && profileData.role !== 'admin') { // Adminler için abonelik kontrolü yapmaya gerek yok
          console.log('[AUTH] Fetching subscription for company owner profile ID:', companyIdForSubscription);
          const { data: subscriptionData, error: subscriptionError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('company_id', companyIdForSubscription) // Bu artık doğru bir şekilde şirket sahibinin profil ID'sine referans veriyor
            .maybeSingle();

          if (subscriptionError) {
            console.error('[AUTH] Subscription query error:', subscriptionError);
            if (mounted) setSubscriptionStatus('none');
          } else if (subscriptionData) {
            // YENİ EKLENEN MANTIK: Deneme süresi bitmişse expired olarak işaretle
            if (subscriptionData.status === 'trial' && new Date(subscriptionData.trial_ends_at) < new Date()) {
              console.log('[AUTH] Trial period ended, setting status to expired.');
              if (mounted) setSubscriptionStatus('expired');
            } else {
              console.log('[AUTH] Subscription found:', subscriptionData.status);
              if (mounted) setSubscriptionStatus(subscriptionData.status);
            }
          } else {
            console.log('[AUTH] No subscription found for company owner profile ID:', companyIdForSubscription);
            if (mounted) setSubscriptionStatus('none');
          }
        } else if (profileData.role === 'admin') {
          console.log('[AUTH] Admin kullanıcı, abonelik durumu aktif olarak ayarlandı (bypass edildi)');
          if (mounted) setSubscriptionStatus('active'); // Adminler her zaman erişime sahip
        } else {
          console.log('[AUTH] Abonelik kontrolü için ilgili şirket ID\'si yok veya şirketle ilgili bir rol değil.');
          if (mounted) setSubscriptionStatus('none'); // Şirket aboneliğine bağlı olmayan roller için varsayılan
        }

        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('[AUTH] Error in loadProfileAndSubscription:', error);
        if (mounted) {
          setProfile(null);
          setSubscriptionStatus('none');
          setLoading(false);
        }
      } finally {
        loadingProfile.current = false;
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfileAndSubscription(session.user.id);
      } else {
        setLoading(false);
        setSubscriptionStatus('none'); // Kullanıcı yoksa, abonelik de yok
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      console.log('[AUTH] State changed:', event);
      console.log('[AUTH] User ID:', session?.user?.id);
      console.log('[AUTH] Provider:', session?.user?.app_metadata?.provider);
      console.log('[AUTH] Email:', session?.user?.email);

      if (event === 'SIGNED_OUT') {
        console.log('[AUTH] User signed out');
        setSession(null);
        setUser(null);
        setProfile(null);
        setSubscriptionStatus('none');
        setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('[AUTH] User authenticated, loading profile and subscription...');
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          loadProfileAndSubscription(session.user.id);
        } else {
          setLoading(false);
          setSubscriptionStatus('none');
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('[AUTH] Attempting email/password sign in...');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('[AUTH] Sign in error:', error);
      throw error;
    }
    console.log('[AUTH] Sign in successful');
  };

  const signInWithGoogle = async () => {
    console.log('[AUTH] Starting Google OAuth...');

    const redirectUrl = Platform.OS === 'web'
      ? 'https://multilingual-pest-co-akov.bolt.host/'
      : 'myapp://';

    console.log('[AUTH] OAuth redirect URL:', redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('[AUTH] OAuth error:', error);
      throw error;
    }
    console.log('[AUTH] OAuth request initiated successfully');
  };

  const signUp = async (email: string, password: string, profileData: Partial<UserProfile>) => {
    console.log('[AUTH] Starting registration for:', email);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.error('[AUTH] Sign up error:', error);
      throw error;
    }

    if (data.user) {
      console.log('[AUTH] User created, creating profile...');

      if (profileData.role === 'company' && profileData.company_name) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .insert({
            name: profileData.company_name,
            owner_id: data.user.id,
            email: email,
            phone: profileData.phone || '',
            address: '',
            currency: 'TRY',
          })
          .select()
          .single();

        if (companyError) {
          console.error('[AUTH] Company creation error:', companyError);
          throw companyError;
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email,
            full_name: profileData.full_name!,
            phone: profileData.phone || '',
            role: profileData.role!,
            company_id: companyData.id,
            company_name: profileData.company_name,
            currency: 'TRY',
            accepted_privacy_policy: true,
            accepted_terms_of_service: true,
            privacy_policy_accepted_at: new Date().toISOString(),
            terms_of_service_accepted_at: new Date().toISOString(),
          });

        if (profileError) {
          console.error('[AUTH] Profile creation error:', profileError);
          throw profileError;
        }
      } else if (profileData.role === 'customer') {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email,
            full_name: profileData.full_name!,
            phone: profileData.phone || '',
            role: profileData.role!,
            company_name: profileData.company_name,
            currency: 'TRY',
            accepted_privacy_policy: true,
            accepted_terms_of_service: true,
            privacy_policy_accepted_at: new Date().toISOString(),
            terms_of_service_accepted_at: new Date().toISOString(),
          });

        if (profileError) {
          console.error('[AUTH] Profile creation error:', profileError);
          throw profileError;
        }

        const { error: customerError } = await supabase
          .from('customers')
          .insert({
            profile_id: data.user.id,
            company_name: profileData.company_name,
          });

        if (customerError) {
          console.error('[AUTH] Customer creation error:', customerError);
          throw customerError;
        }
      }

      console.log('[AUTH] Registration complete, signing out for email verification...');
      await supabase.auth.signOut();
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    console.log('[AUTH] Requesting password reset for:', email);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: Platform.OS === 'web'
        ? 'https://multilingual-pest-co-akov.bolt.host/auth/reset-password'
        : 'myapp://auth/reset-password',
    });
    if (error) {
      console.error('[AUTH] Password reset error:', error);
      throw error;
    }
    console.log('[AUTH] Password reset email sent successfully');
  };

  const updatePassword = async (newPassword: string) => {
    console.log('[AUTH] Updating password...');
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      console.error('[AUTH] Password update error:', error);
      throw error;
    }
    console.log('[AUTH] Password updated successfully');
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signInWithGoogle, signUp, signOut, resetPassword, updatePassword, subscriptionStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
