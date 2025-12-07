import React from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Briefcase, Calendar, CircleCheck as CheckCircle, Clock, Package, ArrowLeftRight, UserCheck } from 'lucide-react-native';
import { AppLayout } from '@/components/AppLayout';
import { StatsCard } from '@/components/StatsCard';
import { MenuCard } from '@/components/MenuCard';

export default function OperatorDashboard() {
  const router = useRouter();
  const { t } = useLanguage();
  const { profile } = useAuth();

  return (
    <AppLayout
      title={profile?.full_name}
      subtitle={t('welcome')}
      headerGradient={['#06b6d4', '#0891b2', '#0e7490']}
      badge={{
        icon: <UserCheck size={12} color="#06b6d4" />,
        text: t('operator'),
      }}
    >
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginTop: 20, marginBottom: 24, gap: 12 }}>
        <StatsCard
          icon={Clock}
          number={0}
          label={t('pending')}
          gradient={['#f59e0b', '#d97706']}
        />
        <StatsCard
          icon={Briefcase}
          number={0}
          label={t('inProgress')}
          gradient={['#3b82f6', '#2563eb']}
        />
        <StatsCard
          icon={CheckCircle}
          number={0}
          label={t('completed')}
          gradient={['#10b981', '#059669']}
        />
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 16, letterSpacing: -0.5 }}>
          {t('myTasks')}
        </Text>

        <MenuCard
          icon={Calendar}
          label={t('myVisits')} // Düzeltildi: "Ziyaretlerim" -> t('myVisits')
          gradient={['#06b6d4', '#0891b2']}
          onPress={() => router.push('/operator/visits')}
        />

        <MenuCard
          icon={CheckCircle}
          label={t('completedJobs')}
          gradient={['#10b981', '#059669']}
          onPress={() => {}}
        />

        <MenuCard
          icon={Package}
          label={t('myWarehouse')} // Düzeltildi: "Depom" -> t('myWarehouse')
          gradient={['#f59e0b', '#d97706']}
          onPress={() => router.push('/operator/warehouse')}
        />

        <MenuCard
          icon={ArrowLeftRight}
          label={t('transferRequests')} // Düzeltildi: "Malzeme Talebi" -> t('transferRequests')
          gradient={['#3b82f6', '#2563eb']}
          onPress={() => router.push('/operator/transfer-request')}
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
          {t('noAssignedTasks')}
        </Text>
        <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
          {t('assignedTasksWillAppear')}
        </Text>
      </View>
    </AppLayout>
  );
}