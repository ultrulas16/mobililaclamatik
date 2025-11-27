import React from 'react';
import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Building, Calendar, FileText, Plus, Users } from 'lucide-react-native';
import { AppLayout } from '@/components/AppLayout';
import { StatsCard } from '@/components/StatsCard';
import { MenuCard } from '@/components/MenuCard';
import { LinearGradient } from 'expo-linear-gradient';

export default function CustomerDashboard() {
  const router = useRouter();
  const { t } = useLanguage();
  const { profile, user } = useAuth();
  const [stats, setStats] = useState({
    branches: 0,
    activeServices: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: customerData } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', user?.id)
        .maybeSingle();

      if (customerData) {
        const { count: branchesCount } = await supabase
          .from('customer_branches')
          .select('*', { count: 'exact', head: true })
          .eq('customer_id', customerData.id);

        const { count: activeServicesCount } = await supabase
          .from('service_requests')
          .select('*', { count: 'exact', head: true })
          .eq('customer_id', customerData.id)
          .in('status', ['pending', 'assigned', 'in_progress']);

        setStats({
          branches: branchesCount || 0,
          activeServices: activeServicesCount || 0,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <AppLayout
      title={profile?.full_name}
      subtitle={t('welcome')}
      headerGradient={['#f59e0b', '#d97706', '#b45309']}
      badge={{
        icon: <Users size={12} color="#f59e0b" />,
        text: t('customer'),
      }}
    >
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginTop: 20, marginBottom: 24, gap: 12 }}>
        <StatsCard
          icon={Building}
          number={stats.branches}
          label={t('branches')}
          gradient={['#10b981', '#059669']}
        />
        <StatsCard
          icon={Calendar}
          number={stats.activeServices}
          label={t('activeServices')}
          gradient={['#3b82f6', '#2563eb']}
        />
      </View>

      <TouchableOpacity
        style={{
          marginHorizontal: 20,
          marginBottom: 24,
          borderRadius: 16,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <LinearGradient
          colors={['#10b981', '#059669']}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 18,
            gap: 10,
          }}
        >
          <Plus size={24} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 }}>
            {t('requestService')}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={{ paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 16, letterSpacing: -0.5 }}>
          {t('myAccount')}
        </Text>

        <MenuCard
          icon={Building}
          label={t('myBranches')}
          gradient={['#10b981', '#059669']}
          onPress={() => router.push('/customer/branches')}
        />

        <MenuCard
          icon={Calendar}
          label={t('serviceHistory')}
          gradient={['#3b82f6', '#2563eb']}
          onPress={() => router.push('/customer/visits')}
        />

        <MenuCard
          icon={FileText}
          label={t('serviceReports')}
          gradient={['#f59e0b', '#d97706']}
          onPress={() => router.push('/customer/visits')}
        />
      </View>

      <View style={{
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 40,
        marginHorizontal: 20,
        marginTop: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 8 }}>
          {t('noActiveServices')}
        </Text>
        <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
          {t('requestServiceToStart')}
        </Text>
      </View>
    </AppLayout>
  );
}
