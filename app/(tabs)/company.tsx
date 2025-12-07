import React from 'react';
import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Building, Users, Calendar, FileText, LogOut, Settings, DollarSign, Package, Warehouse, ArrowLeftRight, ChevronRight, CreditCard } from 'lucide-react-native';
import { SubscriptionStatus } from '@/components/SubscriptionStatus';
import { LinearGradient } from 'expo-linear-gradient';

export default function CompanyDashboard() {
  const router = useRouter();
  const { t } = useLanguage();
  const { profile, signOut } = useAuth();
  const [stats, setStats] = useState({
    operators: 0,
    customers: 0,
    activeJobs: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', profile?.id)
        .maybeSingle();

      if (!companyData) {
        console.log('No company found for user:', profile?.id);
        return;
      }

      const { count: operatorsCount } = await supabase
        .from('operators')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyData.id);

      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('created_by_company_id', companyData.id);

      const { count: activeJobsCount } = await supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyData.id)
        .in('status', ['pending', 'assigned', 'in_progress']);

      setStats({
        operators: operatorsCount || 0,
        customers: customersCount || 0,
        activeJobs: activeJobsCount || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/welcome');
  };

  const menuItems = [
    { icon: CreditCard, label: 'Abonelik Planları', route: '/company/subscription', color: '#7c3aed', gradient: ['#7c3aed', '#6d28d9'] },
    { icon: Users, label: t('manageOperators'), route: '/company/operators', color: '#10b981', gradient: ['#10b981', '#059669'] },
    { icon: Building, label: t('manageCustomers'), route: '/company/customers', color: '#3b82f6', gradient: ['#3b82f6', '#2563eb'] },
    { icon: Building, label: t('manageBranches'), route: '/company/manage-branches', color: '#8b5cf6', gradient: ['#8b5cf6', '#7c3aed'] },
    { icon: Settings, label: t('companyDefinitions'), route: '/company/definitions', color: '#64748b', gradient: ['#64748b', '#475569'] },
    { icon: Calendar, label: t('companySettings'), route: '/company/settings', color: '#f59e0b', gradient: ['#f59e0b', '#d97706'] },
    { icon: FileText, label: 'Ziyaretler ve Raporlar', route: '/company/visits', color: '#06b6d4', gradient: ['#06b6d4', '#0891b2'] },
    { icon: DollarSign, label: 'Ciro Raporları', route: '/company/revenue-reports', color: '#10b981', gradient: ['#10b981', '#059669'] },
    { icon: Package, label: 'Ücretli Ürünler', route: '/company/paid-products', color: '#8b5cf6', gradient: ['#8b5cf6', '#7c3aed'] },
    { icon: DollarSign, label: 'Müşteri Fiyatlandırma', route: '/company/pricing', color: '#14b8a6', gradient: ['#14b8a6', '#0d9488'] },
    { icon: Warehouse, label: 'Ana Depo Yönetimi', route: '/company/warehouse', color: '#f97316', gradient: ['#f97316', '#ea580c'] },
    { icon: ArrowLeftRight, label: 'Transfer Yönetimi', route: '/company/transfer-management', color: '#06b6d4', gradient: ['#06b6d4', '#0891b2'] },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Modern Header with Gradient */}
      <LinearGradient
        colors={['#10b981', '#059669', '#047857']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerInfo}>
            <Text style={styles.greeting}>{t('welcome')}</Text>
            <Text style={styles.name}>{profile?.full_name}</Text>
            <View style={styles.companyBadge}>
              <Building size={12} color="#10b981" />
              <Text style={styles.companyName}>{profile?.company_name || t('company')}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <SubscriptionStatus />

        {/* Modern Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.statGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.statIconContainer}>
                <Users size={24} color="#fff" />
              </View>
              <Text style={styles.statNumber}>{stats.operators}</Text>
              <Text style={styles.statLabel}>{t('operators')}</Text>
            </LinearGradient>
          </View>

          <View style={styles.statCard}>
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              style={styles.statGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.statIconContainer}>
                <Calendar size={24} color="#fff" />
              </View>
              <Text style={styles.statNumber}>{stats.activeJobs}</Text>
              <Text style={styles.statLabel}>{t('activeJobs')}</Text>
            </LinearGradient>
          </View>

          <View style={styles.statCard}>
            <LinearGradient
              colors={['#f59e0b', '#d97706']}
              style={styles.statGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.statIconContainer}>
                <Building size={24} color="#fff" />
              </View>
              <Text style={styles.statNumber}>{stats.customers}</Text>
              <Text style={styles.statLabel}>{t('customers')}</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Modern Menu Grid */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>{t('dashboard')}</Text>
          
          <View style={styles.menuGrid}>
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.menuCard}
                  onPress={() => router.push(item.route)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={item.gradient}
                    style={styles.menuIconContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Icon size={22} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.menuLabel} numberOfLines={2}>
                    {item.label}
                  </Text>
                  <View style={styles.menuArrow}>
                    <ChevronRight size={16} color="#94a3b8" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 60, // Increased from 50
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, // Increased from 0.15
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // Changed from 'flex-start'
  },
  headerInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: '#d1fae5',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  companyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    alignSelf: 'flex-start',
    gap: 6,
  },
  companyName: {
    fontSize: 13,
    color: '#047857',
    fontWeight: '600',
  },
  logoutButton: {
    width: 50, // Increased from 44
    height: 50, // Increased from 44
    borderRadius: 25, // Increased from 22
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 }, // Adjusted shadow
    shadowOpacity: 0.15, // Increased from 0.1
    shadowRadius: 6, // Increased from 4
    elevation: 4, // Increased from 3
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 20, // Increased from 16
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statGradient: {
    padding: 16,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 56, // Increased from 48
    height: 56, // Increased from 48
    borderRadius: 28, // Increased from 24
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 28, // Increased from 24
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#fff',
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.9,
    fontWeight: '500',
  },
  menuContainer: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  menuGrid: {
    gap: 12,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 20, // Increased from 16
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  menuIconContainer: {
    width: 56, // Increased from 48
    height: 56, // Increased from 48
    borderRadius: 16, // Increased from 12
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '600',
    lineHeight: 20,
    marginRight: 8, // Added margin to prevent text from touching arrow
  },
  menuArrow: {
    width: 32, // Increased from 28
    height: 32, // Increased from 28
    borderRadius: 16, // Increased from 14
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

