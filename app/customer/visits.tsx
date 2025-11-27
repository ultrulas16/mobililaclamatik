import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Calendar, User, MapPin, Clock, FileText } from 'lucide-react-native';

interface Visit {
  id: string;
  scheduled_date: string;
  completed_date: string | null;
  status: string;
  service_type: string;
  notes: string | null;
  customer_branches: {
    id: string;
    branch_name: string;
    address: string;
  } | null;
  profiles: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export default function CustomerVisits() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'planned'>('all');

  useEffect(() => {
    loadVisits();
  }, [filter, language]);

  const loadVisits = async () => {
    try {
      setLoading(true);

      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', user?.id)
        .maybeSingle();

      if (customerError || !customerData) {
        console.error('Error loading customer:', customerError);
        setVisits([]);
        return;
      }

      let query = supabase
        .from('service_requests')
        .select(`
          *,
          customer_branches(id, branch_name, address),
          profiles!service_requests_operator_id_fkey(id, full_name, email)
        `)
        .eq('customer_id', customerData.id)
        .order('scheduled_date', { ascending: false });

      if (filter === 'completed') {
        query = query.eq('status', 'completed');
      } else if (filter === 'planned') {
        query = query.in('status', ['pending', 'assigned', 'in_progress']);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading visits:', error);
        setVisits([]);
        return;
      }

      setVisits(data || []);
    } catch (error: any) {
      console.error('Error loading visits:', error);
      setVisits([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#4caf50';
      case 'in_progress':
        return '#ff9800';
      case 'assigned':
      case 'pending':
        return '#2196f3';
      case 'cancelled':
        return '#f44336';
      default:
        return '#999';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return t('completed');
      case 'in_progress':
        return 'Devam Ediyor';
      case 'assigned':
        return 'Atandı';
      case 'pending':
        return t('planned');
      case 'cancelled':
        return t('cancelled');
      default:
        return status;
    }
  };

  const allVisits = visits;
  const completedCount = allVisits.filter(v => v.status === 'completed').length;
  const plannedCount = allVisits.filter(v => ['pending', 'assigned', 'in_progress'].includes(v.status)).length;
  const totalCount = allVisits.length;

  const locale = language === 'tr' ? 'tr-TR' : 'en-US';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('serviceHistory')}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
            {t('all')} ({totalCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'completed' && styles.filterButtonActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterButtonText, filter === 'completed' && styles.filterButtonTextActive]}>
            {t('completed')} ({completedCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'planned' && styles.filterButtonActive]}
          onPress={() => setFilter('planned')}
        >
          <Text style={[styles.filterButtonText, filter === 'planned' && styles.filterButtonTextActive]}>
            {t('planned')} ({plannedCount})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4caf50" />
          <Text style={styles.loadingText}>{t('loading')}...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {allVisits.length === 0 ? (
            <View style={styles.emptyState}>
              <Calendar size={48} color="#ccc" />
              <Text style={styles.emptyText}>{t('noVisitRecords')}</Text>
            </View>
          ) : (
            allVisits.map((visit) => (
              <View key={visit.id} style={styles.visitCard}>
                <View style={styles.visitHeader}>
                  <View style={styles.visitHeaderLeft}>
                    <Text style={styles.visitDate}>
                      {new Date(visit.scheduled_date).toLocaleDateString(locale)}
                    </Text>
                    <Text style={styles.visitTime}>
                      {new Date(visit.scheduled_date).toLocaleTimeString(locale, {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(visit.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(visit.status)}</Text>
                  </View>
                </View>

                <View style={styles.visitInfo}>
                  {visit.profiles && (
                    <View style={styles.infoRow}>
                      <User size={16} color="#666" />
                      <Text style={styles.infoText}>
                        {t('operator')}: {visit.profiles.full_name}
                      </Text>
                    </View>
                  )}

                  {visit.customer_branches && (
                    <View style={styles.infoRow}>
                      <MapPin size={16} color="#666" />
                      <Text style={styles.infoText}>
                        {visit.customer_branches.branch_name}
                      </Text>
                    </View>
                  )}

                  {visit.service_type && (
                    <View style={styles.infoRow}>
                      <FileText size={16} color="#666" />
                      <Text style={styles.infoText}>
                        {t('type')}: {visit.service_type}
                      </Text>
                    </View>
                  )}

                  {visit.completed_date && (
                    <View style={styles.infoRow}>
                      <Clock size={16} color="#666" />
                      <Text style={styles.infoText}>
                        Tamamlanma: {new Date(visit.completed_date).toLocaleDateString(locale)}
                      </Text>
                    </View>
                  )}

                  {visit.notes && (
                    <View style={styles.notesContainer}>
                      <Text style={styles.notesLabel}>{t('operatorNotes')}:</Text>
                      <Text style={styles.notesText}>{visit.notes}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4caf50',
    paddingTop: 44,
    paddingBottom: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterButtonActive: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  visitCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  visitHeaderLeft: {
    flex: 1,
  },
  visitDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  visitTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  visitInfo: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  notesContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
});
