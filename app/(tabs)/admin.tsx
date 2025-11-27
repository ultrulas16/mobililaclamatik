import React from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Users, Building, FileText, Warehouse } from 'lucide-react-native';
import { AppLayout } from '@/components/AppLayout';
import { StatsCard } from '@/components/StatsCard';
import { MenuCard } from '@/components/MenuCard';

export default function AdminDashboard() {
  const router = useRouter();
  const { t } = useLanguage();
  const { profile } = useAuth();

  return (
    <AppLayout
      title={profile?.full_name}
      subtitle={t('welcome')}
      headerGradient={['#7c3aed', '#6d28d9', '#5b21b6']}
      badge={{
        icon: <Shield size={12} color="#7c3aed" />,
        text: t('admin'),
      }}
    >
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginTop: 20, marginBottom: 24, gap: 12 }}>
        <StatsCard
          icon={Shield}
          number={0}
          label={t('totalCompanies')}
          gradient={['#10b981', '#059669']}
        />
        <StatsCard
          icon={Users}
          number={0}
          label={t('totalUsers')}
          gradient={['#3b82f6', '#2563eb']}
        />
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 16, letterSpacing: -0.5 }}>
          {t('management')}
        </Text>

        <MenuCard
          icon={Building}
          label={t('registerNewCompany')}
          gradient={['#10b981', '#059669']}
          onPress={() => router.push('/auth/register')}
        />

        <MenuCard
          icon={Users}
          label={t('manageUsers')}
          gradient={['#3b82f6', '#2563eb']}
          onPress={() => router.push('/admin/users')}
        />

        <MenuCard
          icon={Warehouse}
          label="Depo Yönetimi"
          gradient={['#f59e0b', '#d97706']}
          onPress={() => router.push('/admin/warehouses')}
        />

        <MenuCard
          icon={FileText}
          label={t('serviceReports')}
          gradient={['#ec4899', '#db2777']}
          onPress={() => {}}
        />
      </View>
    </AppLayout>
  );
}
