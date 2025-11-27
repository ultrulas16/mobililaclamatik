import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Calendar, FileText, Plus, Store } from 'lucide-react-native';
import { AppLayout } from '@/components/AppLayout';
import { StatsCard } from '@/components/StatsCard';
import { MenuCard } from '@/components/MenuCard';
import { LinearGradient } from 'expo-linear-gradient';

export default function BranchDashboard() {
  const router = useRouter();
  const { t } = useLanguage();
  const { profile } = useAuth();

  return (
    <AppLayout
      title={profile?.full_name}
      subtitle={t('welcome')}
      headerGradient={['#8b5cf6', '#7c3aed', '#6d28d9']}
      badge={{
        icon: <Store size={12} color="#8b5cf6" />,
        text: t('customerBranch'),
      }}
    >
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginTop: 20, marginBottom: 24, gap: 12 }}>
        <StatsCard
          icon={Calendar}
          number={0}
          label={t('activeServices')}
          gradient={['#3b82f6', '#2563eb']}
        />
        <StatsCard
          icon={FileText}
          number={0}
          label={t('completed')}
          gradient={['#10b981', '#059669']}
        />
      </View>

      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f1f5f9',
      }}>
        <View style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: '#f0fdf4',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 16,
        }}>
          <MapPin size={24} color="#10b981" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 }}>
            {t('branchLocation')}
          </Text>
          <Text style={{ fontSize: 14, color: '#666' }}>
            {t('noLocationSet')}
          </Text>
        </View>
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
          {t('branchManagement')}
        </Text>

        <MenuCard
          icon={Calendar}
          label={t('scheduledServices')}
          gradient={['#3b82f6', '#2563eb']}
          onPress={() => {}}
        />

        <MenuCard
          icon={FileText}
          label={t('serviceReports')}
          gradient={['#f59e0b', '#d97706']}
          onPress={() => {}}
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
          {t('noScheduledServices')}
        </Text>
        <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
          {t('requestServiceForBranch')}
        </Text>
      </View>
    </AppLayout>
  );
}
