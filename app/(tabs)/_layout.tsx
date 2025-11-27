// app/(tabs)/_layout.tsx
import React, { useEffect } from 'react';
import { Tabs, Redirect } from 'expo-router';
import { User, Building2, Users, UserCheck, Store } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native'; // Yükleme durumu için import'lar

export default function TabsLayout() {
  const { profile, loading, subscriptionStatus } = useAuth();

  // Auth context yüklenirken veya abonelik durumu belirlenirken yükleme göstergesi göster
  if (loading || subscriptionStatus === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4caf50" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (!profile) {
    return <Redirect href="/welcome" />;
  }

  // Abonelik durumu 'expired', 'cancelled' veya 'none' ise (ve admin değilse) yönlendir
  if (
    profile.role !== 'admin' &&
    (subscriptionStatus === 'expired' || subscriptionStatus === 'cancelled' || subscriptionStatus === 'none')
  ) {
    console.log(`[TABS_LAYOUT] Kullanıcı ${profile.email} abonelik durumu nedeniyle yönlendiriliyor: ${subscriptionStatus}`);
    return <Redirect href="/subscription-expired" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          href: profile.role === 'admin' ? '/(tabs)/admin' : null,
        }}
      />
      <Tabs.Screen
        name="company"
        options={{
          title: 'Company',
          tabBarIcon: ({ color, size }) => <Building2 color={color} size={size} />,
          href: profile.role === 'company' ? '/(tabs)/company' : null,
        }}
      />
      <Tabs.Screen
        name="operator"
        options={{
          title: 'Operator',
          tabBarIcon: ({ color, size }) => <UserCheck color={color} size={size} />,
          href: profile.role === 'operator' ? '/(tabs)/operator' : null,
        }}
      />
      <Tabs.Screen
        name="customer"
        options={{
          title: 'Customer',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
          href: profile.role === 'customer' ? '/(tabs)/customer' : null,
        }}
      />
      <Tabs.Screen
        name="branch"
        options={{
          title: 'Branch',
          tabBarIcon: ({ color, size }) => <Store color={color} size={size} />,
          href: profile.role === 'customer_branch' ? '/(tabs)/branch' : null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});
