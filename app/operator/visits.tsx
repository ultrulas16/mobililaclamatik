import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Search, X, Calendar, MapPin, Plus, FileText, CalendarDays, ChevronLeft, ChevronRight, XCircle } from 'lucide-react-native';
import { Visit } from '@/types/visits';
import { formatDate } from '@/lib/utils';

const STATUS_COLORS = {
  pending: '#ff9800',
  assigned: '#2196f3',
  in_progress: '#4caf50',
  completed: '#4caf50',
  cancelled: '#ef4444',
};

const STATUS_LABELS = {
  pending: 'Bekliyor',
  assigned: 'Atandı',
  in_progress: 'Devam Ediyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
};

const ITEMS_PER_PAGE = 10;

export default function OperatorVisits() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [visitToCancel, setVisitToCancel] = useState<string | null>(null);
  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [selectedDayData, setSelectedDayData] = useState<{ date: string; visits: Visit[] } | null>(null);

  useEffect(() => {
    loadOperatorData();
  }, []);

  useEffect(() => {
    if (operatorId) {
      loadVisits();
    }
  }, [operatorId, filterStatus, selectedMonth, selectedYear]);

  const loadOperatorData = async () => {
    try {
      const { data, error } = await supabase
        .from('operators')
        .select('id')
        .eq('profile_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setOperatorId(data.id);
      }
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const loadVisits = async () => {
    try {
      setLoading(true);

      const startDate = new Date(selectedYear, selectedMonth, 1).toISOString();
      const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).toISOString();

      let query = supabase
        .from('service_requests')
        .select(`
          *,
          customers(id, company_name, address),
          customer_branches(id, branch_name, address),
          profiles!service_requests_operator_id_fkey(id, full_name, email)
        `)
        .eq('operator_id', user?.id)
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate)
        .order('scheduled_date', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedData = (data || []).map(item => ({
        id: item.id,
        visit_date: item.scheduled_date,
        status: item.status,
        customer: item.customers,
        branch: item.customer_branches,
        operator: item.profiles,
        service_type: item.service_type,
        notes: item.notes,
        start_time: null,
        end_time: null,
        scheduled_date: item.scheduled_date,
        completed_date: item.completed_date,
        created_at: item.created_at,
      }));

      setVisits(formattedData as any);
    } catch (error: any) {
      console.error('Error loading visits:', error);
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelVisit = async (visitId: string) => {
    try {
      const { error } = await supabase
        .from('service_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', visitId);

      if (error) throw error;

      Alert.alert('Başarılı', 'Ziyaret iptal edildi');
      loadVisits();
      setCancelModalVisible(false);
      setVisitToCancel(null);
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const confirmCancelVisit = (visitId: string) => {
    setVisitToCancel(visitId);
    setCancelModalVisible(true);
  };

  const filteredVisits = visits.filter(visit => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      visit.customer?.company_name?.toLowerCase().includes(searchLower) ||
      visit.branch?.branch_name?.toLowerCase().includes(searchLower) ||
      visit.branch?.address?.toLowerCase().includes(searchLower)
    );
  });

  const paginatedVisits = filteredVisits.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredVisits.length / ITEMS_PER_PAGE);

  const getStatusBadgeColor = (status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#999';
  };

  const getStatusLabel = (status: string) => {
    return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status;
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
    setCurrentPage(1);
  };

  function renderCalendarView() {
    const currentDate = new Date(selectedYear, selectedMonth);
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();

    const visitsByDate: Record<string, Visit[]> = {};
    filteredVisits.forEach(visit => {
      const dateKey = visit.visit_date?.split('T')[0];
      if (dateKey) {
        if (!visitsByDate[dateKey]) visitsByDate[dateKey] = [];
        visitsByDate[dateKey].push(visit);
      }
    });

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayVisits = visitsByDate[dateKey] || [];

      const today = new Date();
      const isToday = day === today.getDate() && selectedMonth === today.getMonth() && selectedYear === today.getFullYear();

      const completedCount = dayVisits.filter(v => v.status === 'completed').length;
      const pendingCount = dayVisits.filter(v => v.status === 'pending' || v.status === 'assigned' || v.status === 'in_progress').length;
      const cancelledCount = dayVisits.filter(v => v.status === 'cancelled').length;

      days.push(
        <TouchableOpacity
          key={day}
          style={[styles.calendarDay, isToday && styles.calendarDayToday]}
          onPress={() => {
            if (dayVisits.length > 0) {
              setSelectedDayData({ date: dateKey, visits: dayVisits });
              setDayModalVisible(true);
            }
          }}
          disabled={dayVisits.length === 0}
        >
          <Text style={[styles.calendarDayNumber, isToday && styles.calendarDayNumberToday]}>{day}</Text>
          <View style={styles.calendarDayIndicators}>
            {completedCount > 0 && (
              <View style={[styles.calendarDayBadge, { backgroundColor: '#4caf50' }]}>
                <Text style={styles.calendarDayBadgeText}>{completedCount}</Text>
              </View>
            )}
            {pendingCount > 0 && (
              <View style={[styles.calendarDayBadge, { backgroundColor: '#ff9800' }]}>
                <Text style={styles.calendarDayBadgeText}>{pendingCount}</Text>
              </View>
            )}
            {cancelledCount > 0 && (
              <View style={[styles.calendarDayBadge, { backgroundColor: '#ef4444' }]}>
                <Text style={styles.calendarDayBadgeText}>{cancelledCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={() => changeMonth('prev')} style={styles.monthButton}>
            <ChevronLeft size={24} color="#059669" />
          </TouchableOpacity>
          <Text style={styles.calendarMonth}>
            {currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => changeMonth('next')} style={styles.monthButton}>
            <ChevronRight size={24} color="#059669" />
          </TouchableOpacity>
        </View>

        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#4caf50' }]} />
            <Text style={styles.legendText}>Tamamlandı</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#ff9800' }]} />
            <Text style={styles.legendText}>Bekliyor</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>İptal</Text>
          </View>
        </View>

        <View style={styles.calendarWeekDays}>
          {['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'].map((day) => (
            <Text key={day} style={styles.calendarWeekDay}>{day}</Text>
          ))}
        </View>
        <View style={styles.calendarGrid}>{days}</View>

        <Text style={styles.sectionTitle}>Ziyaretler ({filteredVisits.length})</Text>
        {paginatedVisits.map(visit => renderVisitCard(visit))}

        {totalPages > 1 && (
          <View style={styles.paginationContainer}>
            <TouchableOpacity
              style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
              onPress={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={20} color={currentPage === 1 ? '#ccc' : '#059669'} />
            </TouchableOpacity>
            <Text style={styles.paginationText}>
              Sayfa {currentPage} / {totalPages}
            </Text>
            <TouchableOpacity
              style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
              onPress={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={20} color={currentPage === totalPages ? '#ccc' : '#059669'} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  function renderVisitCard(visit: any) {
    const isCancelled = visit.status === 'cancelled';

    return (
      <TouchableOpacity
        key={visit.id}
        style={[styles.visitCard, isCancelled && styles.visitCardCancelled]}
        onPress={() => !isCancelled && router.push(`/operator/visit-details?visitId=${visit.id}`)}
        disabled={isCancelled}
      >
        <View style={styles.visitHeader}>
          <View style={styles.visitInfo}>
            <Text style={[styles.visitCustomer, isCancelled && styles.textCancelled]}>
              {visit.customer?.company_name}
            </Text>
            {visit.branch && (
              <Text style={[styles.visitBranch, isCancelled && styles.textCancelled]}>
                {visit.branch.branch_name}
              </Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor(visit.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(visit.status)}</Text>
          </View>
        </View>

        <View style={styles.visitDetails}>
          {visit.branch?.address && (
            <View style={styles.detailRow}>
              <MapPin size={16} color={isCancelled ? '#ccc' : '#666'} />
              <Text style={[styles.detailText, isCancelled && styles.textCancelled]}>
                {visit.branch.address}
              </Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Calendar size={16} color={isCancelled ? '#ccc' : '#666'} />
            <Text style={[styles.detailText, isCancelled && styles.textCancelled]}>
              {formatDate(visit.visit_date, true)}
            </Text>
          </View>
        </View>

        {!isCancelled && (visit.status === 'pending' || visit.status === 'assigned') && (
          <View style={styles.visitActions}>
            <TouchableOpacity
              style={styles.startVisitButton}
              onPress={(e) => {
                e.stopPropagation();
                router.push(`/operator/visit-details?visitId=${visit.id}`);
              }}
            >
              <Text style={styles.startVisitButtonText}>Ziyarete Başla</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={(e) => {
                e.stopPropagation();
                confirmCancelVisit(visit.id);
              }}
            >
              <XCircle size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  function renderListView() {
    const todayVisits = paginatedVisits.filter(v => {
      const today = new Date().toISOString().split('T')[0];
      return v.visit_date?.startsWith(today) && v.status !== 'completed' && v.status !== 'cancelled';
    });

    const upcomingVisits = paginatedVisits.filter(v => {
      const today = new Date().toISOString().split('T')[0];
      return v.visit_date > today && v.status !== 'completed' && v.status !== 'cancelled';
    });

    const completedVisits = paginatedVisits.filter(v => v.status === 'completed');
    const cancelledVisits = paginatedVisits.filter(v => v.status === 'cancelled');

    return (
      <>
        {todayVisits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bugünkü Ziyaretler</Text>
            {todayVisits.map(visit => renderVisitCard(visit))}
          </View>
        )}

        {upcomingVisits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Yaklaşan Ziyaretler</Text>
            {upcomingVisits.map(visit => renderVisitCard(visit))}
          </View>
        )}

        {completedVisits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tamamlanan Ziyaretler</Text>
            {completedVisits.map(visit => renderVisitCard(visit))}
          </View>
        )}

        {cancelledVisits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>İptal Edilen Ziyaretler</Text>
            {cancelledVisits.map(visit => renderVisitCard(visit))}
          </View>
        )}

        {paginatedVisits.length === 0 && (
          <View style={styles.emptyState}>
            <Calendar size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'Ziyaret bulunamadı' : 'Bu ayda ziyaret yok'}
            </Text>
          </View>
        )}

        {totalPages > 1 && (
          <View style={styles.paginationContainer}>
            <TouchableOpacity
              style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
              onPress={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={20} color={currentPage === 1 ? '#ccc' : '#059669'} />
            </TouchableOpacity>
            <Text style={styles.paginationText}>
              Sayfa {currentPage} / {totalPages}
            </Text>
            <TouchableOpacity
              style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
              onPress={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={20} color={currentPage === totalPages ? '#ccc' : '#059669'} />
            </TouchableOpacity>
          </View>
        )}
      </>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ziyaretlerim</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/operator/new-visit')}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Müşteri veya şube ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleButtonActive]}
          onPress={() => setViewMode('list')}
        >
          <FileText size={20} color={viewMode === 'list' ? '#fff' : '#059669'} />
          <Text style={[styles.viewToggleText, viewMode === 'list' && styles.viewToggleTextActive]}>Liste</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewToggleButton, viewMode === 'calendar' && styles.viewToggleButtonActive]}
          onPress={() => setViewMode('calendar')}
        >
          <CalendarDays size={20} color={viewMode === 'calendar' ? '#fff' : '#059669'} />
          <Text style={[styles.viewToggleText, viewMode === 'calendar' && styles.viewToggleTextActive]}>Takvim</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'all' && styles.filterButtonActive]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[styles.filterButtonText, filterStatus === 'all' && styles.filterButtonTextActive]}>
              Tümü ({visits.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'pending' && styles.filterButtonActive]}
            onPress={() => setFilterStatus('pending')}
          >
            <Text style={[styles.filterButtonText, filterStatus === 'pending' && styles.filterButtonTextActive]}>
              Bekliyor
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'in_progress' && styles.filterButtonActive]}
            onPress={() => setFilterStatus('in_progress')}
          >
            <Text style={[styles.filterButtonText, filterStatus === 'in_progress' && styles.filterButtonTextActive]}>
              Devam Ediyor
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'completed' && styles.filterButtonActive]}
            onPress={() => setFilterStatus('completed')}
          >
            <Text style={[styles.filterButtonText, filterStatus === 'completed' && styles.filterButtonTextActive]}>
              Tamamlandı
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'cancelled' && styles.filterButtonActive]}
            onPress={() => setFilterStatus('cancelled')}
          >
            <Text style={[styles.filterButtonText, filterStatus === 'cancelled' && styles.filterButtonTextActive]}>
              İptal
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {viewMode === 'calendar' ? renderCalendarView() : renderListView()}
      </ScrollView>

      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ziyareti İptal Et</Text>
            <Text style={styles.modalText}>Bu ziyareti iptal etmek istediğinizden emin misiniz?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => {
                  setCancelModalVisible(false);
                  setVisitToCancel(null);
                }}
              >
                <Text style={styles.modalButtonCancelText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={() => visitToCancel && handleCancelVisit(visitToCancel)}
              >
                <Text style={styles.modalButtonConfirmText}>İptal Et</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={dayModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDayModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dayModalContent}>
            <View style={styles.dayModalHeader}>
              <Text style={styles.dayModalTitle}>
                {selectedDayData && formatDate(selectedDayData.date, true)}
              </Text>
              <TouchableOpacity onPress={() => setDayModalVisible(false)}>
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedDayData && (
              <ScrollView style={styles.dayModalScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.dayModalStats}>
                  <View style={styles.dayModalStatItem}>
                    <Text style={styles.dayModalStatNumber}>{selectedDayData.visits.length}</Text>
                    <Text style={styles.dayModalStatLabel}>Toplam</Text>
                  </View>
                  <View style={styles.dayModalStatItem}>
                    <Text style={[styles.dayModalStatNumber, { color: '#4caf50' }]}>
                      {selectedDayData.visits.filter(v => v.status === 'completed').length}
                    </Text>
                    <Text style={styles.dayModalStatLabel}>Tamamlandı</Text>
                  </View>
                  <View style={styles.dayModalStatItem}>
                    <Text style={[styles.dayModalStatNumber, { color: '#ff9800' }]}>
                      {selectedDayData.visits.filter(v => v.status === 'pending' || v.status === 'assigned' || v.status === 'in_progress').length}
                    </Text>
                    <Text style={styles.dayModalStatLabel}>Bekliyor</Text>
                  </View>
                  <View style={styles.dayModalStatItem}>
                    <Text style={[styles.dayModalStatNumber, { color: '#ef4444' }]}>
                      {selectedDayData.visits.filter(v => v.status === 'cancelled').length}
                    </Text>
                    <Text style={styles.dayModalStatLabel}>İptal</Text>
                  </View>
                </View>

                <Text style={styles.dayModalSectionTitle}>Ziyaretler</Text>
                {selectedDayData.visits.map(visit => renderVisitCard(visit))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#059669',
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 14,
  },
  viewToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  viewToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  viewToggleButtonActive: {
    backgroundColor: '#059669',
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  viewToggleTextActive: {
    color: '#fff',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterButtonActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
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
  visitCardCancelled: {
    opacity: 0.5,
    backgroundColor: '#f9f9f9',
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  visitInfo: {
    flex: 1,
  },
  visitCustomer: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  visitBranch: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  textCancelled: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  visitDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  visitActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  startVisitButton: {
    flex: 1,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  startVisitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  calendarContainer: {
    marginBottom: 24,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  monthButton: {
    padding: 8,
  },
  calendarMonth: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textTransform: 'capitalize',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  calendarWeekDays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarWeekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    position: 'relative',
  },
  calendarDayToday: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
  },
  calendarDayNumber: {
    fontSize: 14,
    color: '#333',
  },
  calendarDayNumberToday: {
    fontWeight: 'bold',
    color: '#059669',
  },
  calendarDayIndicators: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  calendarDayBadge: {
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDayBadgeText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: 'bold',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  paginationButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#059669',
  },
  paginationButtonDisabled: {
    borderColor: '#e0e0e0',
  },
  paginationText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  modalButtonConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  dayModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  dayModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dayModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dayModalScroll: {
    maxHeight: 500,
  },
  dayModalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  dayModalStatItem: {
    alignItems: 'center',
  },
  dayModalStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  dayModalStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  dayModalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
});
