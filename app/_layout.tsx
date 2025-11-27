import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleAuthCallback = async () => {
        const currentUrl = window.location.href;
        console.log('[OAUTH] Checking for callback at:', currentUrl);

        let accessToken, refreshToken, errorParam;

        if (window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          accessToken = hashParams.get('access_token');
          refreshToken = hashParams.get('refresh_token');
          errorParam = hashParams.get('error');
          console.log('[OAUTH] Hash params:', { hasToken: !!accessToken, hasRefresh: !!refreshToken, error: errorParam });
        }

        if (!accessToken && window.location.search) {
          const searchParams = new URLSearchParams(window.location.search);
          accessToken = searchParams.get('access_token');
          refreshToken = searchParams.get('refresh_token');
          errorParam = searchParams.get('error');
          console.log('[OAUTH] Search params:', { hasToken: !!accessToken, hasRefresh: !!refreshToken, error: errorParam });
        }

        if (errorParam) {
          console.error('[OAUTH] Error in URL:', errorParam);
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }

        if (accessToken && refreshToken) {
          try {
            console.log('[OAUTH] Setting session...');
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('[OAUTH] Session error:', error);
            } else {
              console.log('[OAUTH] Session set for:', data.user?.email);
              console.log('[OAUTH] Provider:', data.user?.app_metadata?.provider);
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          } catch (error) {
            console.error('[OAUTH] Callback error:', error);
          }
        }
      };

      handleAuthCallback();
    }
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/register" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </AuthProvider>
    </LanguageProvider>
  );
}