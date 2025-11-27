import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Calendar, User, MapPin, Clock, FileText, Package, AlertCircle, X, ChevronLeft, ChevronRight, Search, ChevronDown, ChevronUp } from 'lucide-react-native';
import { Visit } from '@/types/visits';

export default function CompanyVisits() {
  const router = useRouter();
  const { user } = useAuth();
  // useLanguage hook'u ile t fonksiyonunu alıyoruz
  const { t, language } = useLanguage(); 
  
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'planned'>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [materialSummaryVisible, setMaterialSummaryVisible] = useState(false);
  const [materialSummary, setMaterialSummary] = useState<any[]>([]);
  const [visitMaterials, setVisitMaterials] = useState<Record<string, any[]>>({});
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dayVisitsModalVisible, setDayVisitsModalVisible] = useState(false);
  const [visitRevenues, setVisitRevenues] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedVisits, setExpandedVisits] = useState<Set<string>>(new Set());
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    loadVisits();
  }, [filter, language, selectedMonth, selectedYear]);

  const loadVisits = async () => {
    try {
      setLoading(true);

      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', user?.id)
        .maybeSingle();

      if (companyError || !companyData) {
        console.error('Error loading company:', companyError);
        setVisits([]);
        return;
      }

      const startDate = new Date(selectedYear, selectedMonth, 1).toISOString();
      const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).toISOString();

      let completedQuery = supabase
        .from('visits')
        .select(`
          *,
          customers(id, company_name, address),
          customer_branches(id, branch_name, address)
        `)
        .gte('visit_date', startDate)
        .lte('visit_date', endDate);

      if (filter === 'completed') {
        completedQuery = completedQuery.eq('status', 'completed');
      }

      const { data: completedData, error: completedError } = await completedQuery;

      if (completedError) {
        console.error('Error loading completed visits:', completedError);
      }

      let plannedQuery = supabase
        .from('service_requests')
        .select(`
          *,
          customers(id, company_name, address),
          customer_branches(id, branch_name, address),
          profiles!service_requests_operator_id_fkey(id, full_name, email)
        `)
        .eq('company_id', companyData.id)
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate);

      if (filter === 'planned') {
        plannedQuery = plannedQuery.in('status', ['pending', 'assigned', 'in_progress']);
      } else if (filter === 'completed') {
        plannedQuery = plannedQuery.eq('status', 'completed');
      }

      const { data: plannedData, error: plannedError } = await plannedQuery;

      if (plannedError) {
        console.error('Error loading planned visits:', plannedError);
      }

      const completedOperatorIds = (completedData || []).map(v => v.operator_id).filter(Boolean);
      const plannedOperatorProfileIds = (plannedData || []).map(v => v.operator_id).filter(Boolean);

      const { data: operatorData } = await supabase
        .from('operators')
        .select('id, profile_id, company_id')
        .eq('company_id', companyData.id);

      const companyOperators = operatorData || [];
      const companyOperatorIds = companyOperators.map(op => op.id);
      const companyOperatorProfileIds = companyOperators.map(op => op.profile_id);

      const operatorProfileMap = new Map();
      for (const op of companyOperators) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', op.profile_id)
          .maybeSingle();

        if (profileData) {
          operatorProfileMap.set(op.id, profileData);
        }
      }

      const formattedCompleted = (completedData || [])
        .filter(item => companyOperatorIds.includes(item.operator_id))
        .map(item => {
          const operatorProfile = operatorProfileMap.get(item.operator_id);

          return {
            id: item.id,
            visit_date: item.visit_date,
            status: item.status,
            customer: item.customers,
            branch: item.customer_branches,
            operator: operatorProfile || null,
            visit_type: item.visit_type,
            pest_types: item.pest_types || [],
            density_level: item.density_level,
            notes: item.notes,
            customer_notes: item.customer_notes,
            start_time: item.start_time,
            end_time: item.end_time,
            report_number: item.report_number,
            equipment_checks: item.equipment_checks,
            is_invoiced: item.is_invoiced || false,
            customer_id: item.customer_id,
            branch_id: item.branch_id,
            operator_id: item.operator_id,
          };
        });

      const formattedPlanned = (plannedData || [])
        .filter(item => companyOperatorProfileIds.includes(item.operator_id))
        .map(item => ({
          id: item.id,
          visit_date: item.scheduled_date,
          status: item.status,
          customer: item.customers,
          branch: item.customer_branches,
          operator: item.profiles,
          visit_type: item.service_type,
          pest_types: [],
          density_level: null,
          notes: item.notes,
          customer_notes: null,
          start_time: null,
          end_time: null,
          report_number: null,
          equipment_checks: null,
          is_invoiced: false,
          customer_id: item.customer_id,
          branch_id: item.branch_id,
          operator_id: item.operator_id,
        }));

      const allVisitsData = [...formattedCompleted, ...formattedPlanned]
        .sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());

      setVisits(allVisitsData as any);

      const completedVisitIds = formattedCompleted.map(v => v.id);
      if (completedVisitIds.length > 0) {
        await loadAllVisitMaterials(completedVisitIds);
        await calculateVisitRevenues([...formattedCompleted, ...formattedPlanned]);
      }
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
      case 'pending':
      case 'assigned':
      case 'in_progress':
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
      case 'pending':
        return 'Bekliyor';
      case 'assigned':
        return 'Atandı';
      case 'in_progress':
        return 'Devam Ediyor';
      case 'cancelled':
        return t('cancelled');
      default:
        return status;
    }
  };

  // Çeviri anahtarlarını kullanacak şekilde güncellendi
  const getDensityText = (level: string) => {
    switch (level) {
      case 'none':
        return t('none');
      case 'low':
        return t('low');
      case 'medium':
        return t('medium');
      case 'high':
        return t('high');
      default:
        return level;
    }
  };

  const filteredByStatus = visits.filter(visit => {
    if (filter === 'completed') return visit.status === 'completed';
    if (filter === 'planned') return visit.status !== 'completed';
    return true;
  });

  const allVisits = filteredByStatus.filter(visit => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      visit.customer?.company_name?.toLowerCase().includes(query) ||
      visit.branch?.branch_name?.toLowerCase().includes(query) ||
      visit.report_number?.toString().includes(query) ||
      visit.operator?.full_name?.toLowerCase().includes(query)
    );
  });

  const completedCount = (visits || []).filter(v => v.status === 'completed').length;
  const plannedCount = (visits || []).filter(v => ['pending', 'assigned', 'in_progress'].includes(v.status)).length;
  const totalCount = (visits || []).length;

  const paginatedVisits = allVisits.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(allVisits.length / ITEMS_PER_PAGE);

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

  const getCalendarDays = () => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getVisitsForDay = (day: number) => {
    return allVisits.filter(visit => {
      const visitDate = new Date(visit.visit_date);
      return visitDate.getDate() === day &&
             visitDate.getMonth() === selectedMonth &&
             visitDate.getFullYear() === selectedYear;
    });
  };

  const calculateVisitRevenues = async (allVisitsData: any[]) => {
    try {
      const { data: customers } = await supabase
        .from('customers')
        .select('id, pricing_type, per_visit_price, monthly_price');

      const revenueMap: Record<string, number> = {};

      for (const visit of allVisitsData) {
        if (visit.status !== 'completed') {
          revenueMap[visit.id] = 0;
          continue;
        }

        const customer = (customers || []).find(c => c.id === visit.customer_id);
        let visitRevenue = 0;

        if (customer) {
          if (customer.pricing_type === 'per_visit') {
            visitRevenue = parseFloat(customer.per_visit_price || '0');
          } else if (customer.pricing_type === 'monthly') {
            const monthVisits = allVisitsData.filter(
              v => v.customer_id === visit.customer_id &&
                   v.branch_id === visit.branch_id &&
                   v.status === 'completed'
            ).length;
            visitRevenue = parseFloat(customer.monthly_price || '0') / Math.max(monthVisits, 1);
          }
        }

        const materials = visitMaterials[visit.id] || [];
        const materialRevenue = materials.reduce((sum, m) => sum + m.totalPrice, 0);

        revenueMap[visit.id] = visitRevenue + materialRevenue;
      }

      setVisitRevenues(revenueMap);
    } catch (error: any) {
      console.error('Error calculating revenues:', error);
    }
  };

  const toggleInvoiced = async (visitId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('visits')
        .update({ is_invoiced: !currentStatus })
        .eq('id', visitId);

      if (error) throw error;

      setVisits(prev => prev.map(v =>
        v.id === visitId ? { ...v, is_invoiced: !currentStatus } : v
      ));
    } catch (error: any) {
      console.error('Error toggling invoice status:', error);
    }
  };

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
    setDayVisitsModalVisible(true);
  };

  const loadAllVisitMaterials = async (visitIds: string[]) => {
    try {
      setLoadingMaterials(true);

      const { data: salesData } = await supabase
        .from('paid_material_sales')
        .select(`
          *,
          paid_material_sale_items(
            *,
            paid_products(id, name, unit, price, currency)
          )
        `)
        .in('visit_id', visitIds);

      const materialsByVisit: Record<string, any[]> = {};

      (salesData || []).forEach(sale => {
        if (!sale.visit_id) return;

        const materials = (sale.paid_material_sale_items || []).map((item: any) => ({
          name: item.paid_products?.name || 'Bilinmeyen Ürün',
          quantity: parseFloat(item.quantity) || 0,
          unit: item.paid_products?.unit || 'adet',
          unitPrice: parseFloat(item.unit_price) || 0,
          totalPrice: parseFloat(item.total_price) || 0,
          currency: item.paid_products?.currency || 'TRY',
        }));

        if (!materialsByVisit[sale.visit_id]) {
          materialsByVisit[sale.visit_id] = [];
        }
        materialsByVisit[sale.visit_id].push(...materials);
      });

      setVisitMaterials(materialsByVisit);
    } catch (error: any) {
      console.error('Error loading visit materials:', error);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const loadMaterialSummary = async (customerId: string, branchId?: string) => {
    try {
      const { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', user?.id)
        .maybeSingle();

      if (!companyData) return;

      const startDate = new Date(selectedYear, selectedMonth, 1).toISOString();
      const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).toISOString();

      let salesQuery = supabase
        .from('paid_material_sales')
        .select(`
          *,
          paid_material_sale_items(
            *,
            paid_products(id, name, unit, price, currency)
          )
        `)
        .eq('customer_id', customerId)
        .gte('sale_date', startDate.split('T')[0])
        .lte('sale_date', endDate.split('T')[0]);

      if (branchId) {
        salesQuery = salesQuery.eq('branch_id', branchId);
      }

      const { data: salesData } = await salesQuery;

      const summary: Record<string, { name: string; total: number; unit: string; totalPrice: number; currency: string }> = {};

      (salesData || []).forEach(sale => {
        sale.paid_material_sale_items?.forEach((item: any) => {
          const productId = item.product_id;
          const productName = item.paid_products?.name || 'Bilinmeyen Ürün';
          const productUnit = item.paid_products?.unit || 'adet';
          const productCurrency = item.paid_products?.currency || 'TRY';
          const quantity = parseFloat(item.quantity) || 0;
          const totalPrice = parseFloat(item.total_price) || 0;

          if (!summary[productId]) {
            summary[productId] = { name: productName, total: 0, unit: productUnit, totalPrice: 0, currency: productCurrency };
          }
          summary[productId].total += quantity;
          summary[productId].totalPrice += totalPrice;
        });
      });

      setMaterialSummary(Object.values(summary));
      setMaterialSummaryVisible(true);
    } catch (error: any) {
      console.error('Error loading material summary:', error);
    }
  };
  
  // Dil kodunu alarak tarih formatını belirleme
  const locale = language === 'tr' ? 'tr-TR' : 'en-US';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        {/* Çeviri kullanıldı: visitsReports */}
        <Text style={styles.headerTitle}>{t('visitsReports')}</Text> 
        <View style={styles.placeholder} />
      </View>

      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={() => changeMonth('prev')} style={styles.monthButton}>
          <ChevronLeft size={24} color="#4caf50" />
        </TouchableOpacity>
        <Text style={styles.monthText}>
          {new Date(selectedYear, selectedMonth).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => changeMonth('next')} style={styles.monthButton}>
          <ChevronRight size={24} color="#4caf50" />
        </TouchableOpacity>
      </View>

      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('list')}
        >
          <Text style={[styles.viewModeButtonText, viewMode === 'list' && styles.viewModeButtonTextActive]}>
            Liste
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'calendar' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('calendar')}
        >
          <Text style={[styles.viewModeButtonText, viewMode === 'calendar' && styles.viewModeButtonTextActive]}>
            Takvim
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'list' && (
        <View style={styles.searchContainer}>
          <Search size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Ara: Müşteri, Şube, Rapor No..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      )}

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
          {/* Çeviri kullanıldı: loading */}
          <Text style={styles.loadingText}>{t('loading')}...</Text>
        </View>
      ) : viewMode === 'calendar' ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.calendarContainer}>
            <View style={styles.weekDaysRow}>
              {['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'].map((day, index) => (
                <Text key={index} style={styles.weekDayText}>{day}</Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {getCalendarDays().map((day, index) => {
                const dayVisits = day ? getVisitsForDay(day) : [];
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.calendarDay,
                      dayVisits.length > 0 && styles.calendarDayWithVisits
                    ]}
                    onPress={() => day && dayVisits.length > 0 && handleDayClick(day)}
                    disabled={!day || dayVisits.length === 0}
                  >
                    {day && (
                      <>
                        <Text style={styles.calendarDayNumber}>{day}</Text>
                        {dayVisits.length > 0 && (
                          <View style={styles.dayVisitsContainer}>
                            {dayVisits.slice(0, 3).map((visit, vIndex) => (
                              <View
                                key={vIndex}
                                style={[
                                  styles.dayVisitDot,
                                  { backgroundColor: getStatusColor(visit.status) }
                                ]}
                              />
                            ))}
                            {dayVisits.length > 3 && (
                              <Text style={styles.moreVisitsText}>+{dayVisits.length - 3}</Text>
                            )}
                          </View>
                        )}
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {allVisits.length > 0 && (
            <View style={styles.calendarVisitsList}>
              <Text style={styles.calendarVisitsListTitle}>Bu Ayki Ziyaretler</Text>
              {allVisits.map((visit) => (
                <View key={visit.id} style={styles.calendarVisitCard}>
                  <View style={styles.calendarVisitHeader}>
                    <Text style={styles.calendarVisitDate}>
                      {new Date(visit.visit_date).toLocaleDateString(locale)}
                    </Text>
                    <View style={[styles.calendarVisitStatus, { backgroundColor: getStatusColor(visit.status) }]}>
                      <Text style={styles.calendarVisitStatusText}>{getStatusText(visit.status)}</Text>
                    </View>
                  </View>
                  <Text style={styles.calendarVisitCustomer}>
                    {visit.customer?.company_name || t('unknown')}
                  </Text>
                  {visit.branch && (
                    <Text style={styles.calendarVisitBranch}>
                      {visit.branch.branch_name}
                    </Text>
                  )}
                  {visit.report_number && (
                    <Text style={styles.calendarVisitReport}>
                      Rapor: #{visit.report_number}
                    </Text>
                  )}
                  <Text style={styles.calendarVisitOperator}>
                    {visit.operator?.full_name || t('unknown')}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {allVisits.length === 0 ? (
            <View style={styles.emptyState}>
              <Calendar size={48} color="#ccc" />
              <Text style={styles.emptyText}>{t('noVisitRecords')}</Text>
            </View>
          ) : (
            paginatedVisits.map((visit) => {
              const isExpanded = expandedVisits.has(visit.id);
              return (
              <View
                key={visit.id}
                style={[
                  styles.visitCard,
                  visit.is_invoiced && styles.visitCardInvoiced
                ]}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardTopLeft}>
                    <Text style={styles.customerName}>
                      {visit.customer?.company_name || t('unknown')}
                    </Text>
                    {visit.branch && (
                      <Text style={styles.branchName}>{visit.branch.branch_name}</Text>
                    )}
                  </View>
                  <View style={styles.cardTopRight}>
                    {visit.status === 'completed' && (
                      <TouchableOpacity
                        style={styles.invoiceCheckboxMobile}
                        onPress={() => toggleInvoiced(visit.id, visit.is_invoiced)}
                        activeOpacity={0.7}
                      >
                        <View style={[
                          styles.checkboxLarge,
                          visit.is_invoiced && styles.checkboxChecked
                        ]}>
                          {visit.is_invoiced && <Text style={styles.checkmarkLarge}>✓</Text>}
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View style={styles.cardMeta}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Tarih</Text>
                    <Text style={styles.metaValue}>
                      {new Date(visit.visit_date).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Operatör</Text>
                    <Text style={styles.metaValue} numberOfLines={1}>{visit.operator?.full_name || t('unknown')}</Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Durum</Text>
                    <View style={[styles.statusBadgeSmall, { backgroundColor: getStatusColor(visit.status) }]}>
                      <Text style={styles.statusTextSmall}>{getStatusText(visit.status)}</Text>
                    </View>
                  </View>
                </View>

                {visit.status === 'completed' && (
                  <View style={styles.cardRevenue}>
                    <View style={styles.revenueItem}>
                      <Text style={styles.revenueLabel}>Ciro</Text>
                      <Text style={styles.revenueValue}>
                        {visitRevenues[visit.id] ? visitRevenues[visit.id].toFixed(2) : '0.00'} TRY
                      </Text>
                    </View>
                    {visit.report_number && (
                      <>
                        <View style={styles.revenueDivider} />
                        <View style={styles.revenueItem}>
                          <Text style={styles.revenueLabel}>Rapor No</Text>
                          <Text style={styles.revenueValue}>#{visit.report_number}</Text>
                        </View>
                      </>
                    )}
                  </View>
                )}

                {visit.status === 'completed' && (
                  <>
                    <TouchableOpacity
                      style={styles.expandButton}
                      onPress={() => {
                        const newExpanded = new Set(expandedVisits);
                        if (isExpanded) {
                          newExpanded.delete(visit.id);
                        } else {
                          newExpanded.add(visit.id);
                        }
                        setExpandedVisits(newExpanded);
                      }}
                    >
                      <Text style={styles.expandButtonText}>
                        {isExpanded ? 'Detayları Gizle' : 'Detayları Göster'}
                      </Text>
                      {isExpanded ? <ChevronUp size={14} color="#4caf50" /> : <ChevronDown size={14} color="#4caf50" />}
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.detailsContainer}>
                        {(visit.start_time || visit.end_time) && (
                          <View style={styles.detailRow}>
                            <Clock size={12} color="#999" />
                            <Text style={styles.detailText}>
                              {visit.start_time && visit.end_time
                                ? `${visit.start_time} - ${visit.end_time}`
                                : visit.start_time || visit.end_time}
                            </Text>
                          </View>
                        )}

                        {visit.visit_type && (
                          <View style={styles.detailRow}>
                            <FileText size={12} color="#999" />
                            <Text style={styles.detailText}>{visit.visit_type}</Text>
                          </View>
                        )}

                        {visit.pest_types && visit.pest_types.length > 0 && (
                          <View style={styles.detailRow}>
                            <AlertCircle size={12} color="#999" />
                            <View style={styles.pestChipsCompact}>
                              {visit.pest_types.map((pest: string, idx: number) => (
                                <Text key={idx} style={styles.pestChipCompact}>{pest}</Text>
                              ))}
                            </View>
                          </View>
                        )}

                        {visit.density_level && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Yoğunluk:</Text>
                            <Text style={styles.detailValue}>{getDensityText(visit.density_level)}</Text>
                          </View>
                        )}

                        {visit.notes && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Not:</Text>
                            <Text style={styles.detailText}>{visit.notes}</Text>
                          </View>
                        )}

                        {visitMaterials[visit.id] && visitMaterials[visit.id].length > 0 && (
                          <View style={styles.materialsCompact}>
                            <Text style={styles.materialsTitle}>Ücretli Ürünler:</Text>
                            {visitMaterials[visit.id].map((material: any, idx: number) => (
                              <View key={idx} style={styles.materialLineCompact}>
                                <Text style={styles.materialTextCompact} numberOfLines={1}>
                                  {material.name} ({material.quantity.toFixed(1)} {material.unit})
                                </Text>
                                <Text style={styles.materialPriceCompact}>
                                  {material.totalPrice.toFixed(2)} {material.currency}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                  </>
                )}
              </View>
            );
            })
          )}

          {totalPages > 1 && (
            <View style={styles.paginationContainer}>
              <TouchableOpacity
                style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                onPress={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={20} color={currentPage === 1 ? '#ccc' : '#4caf50'} />
              </TouchableOpacity>
              <Text style={styles.paginationText}>
                Sayfa {currentPage} / {totalPages}
              </Text>
              <TouchableOpacity
                style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
                onPress={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={20} color={currentPage === totalPages ? '#ccc' : '#4caf50'} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        visible={dayVisitsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDayVisitsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedDay} {new Date(selectedYear, selectedMonth).toLocaleDateString(locale, { month: 'long' })} Ziyaretleri
              </Text>
              <TouchableOpacity onPress={() => setDayVisitsModalVisible(false)}>
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {selectedDay && getVisitsForDay(selectedDay).map((visit) => (
                <View
                  key={visit.id}
                  style={[
                    styles.dayModalVisitCard,
                    visit.is_invoiced && styles.dayModalVisitCardInvoiced
                  ]}
                >
                  <View style={styles.dayModalVisitHeader}>
                    <View style={styles.dayModalVisitHeaderLeft}>
                      <Text style={styles.dayModalVisitCustomer}>
                        {visit.customer?.company_name || 'Bilinmeyen'}
                      </Text>
                      {visit.branch && (
                        <Text style={styles.dayModalVisitBranch}>{visit.branch.branch_name}</Text>
                      )}
                      {visit.report_number && (
                        <Text style={styles.dayModalVisitReport}>Rapor: #{visit.report_number}</Text>
                      )}
                    </View>
                    <View style={styles.dayModalVisitHeaderRight}>
                      <View style={[styles.dayModalVisitStatus, { backgroundColor: getStatusColor(visit.status) }]}>
                        <Text style={styles.dayModalVisitStatusText}>{getStatusText(visit.status)}</Text>
                      </View>
                      {visit.status === 'completed' && (
                        <TouchableOpacity
                          style={styles.dayModalInvoiceCheckbox}
                          onPress={() => toggleInvoiced(visit.id, visit.is_invoiced)}
                        >
                          <View style={[
                            styles.checkbox,
                            visit.is_invoiced && styles.checkboxChecked
                          ]}>
                            {visit.is_invoiced && <Text style={styles.checkmark}>✓</Text>}
                          </View>
                          <Text style={styles.invoiceLabel}>Fatura</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <Text style={styles.dayModalVisitOperator}>
                    Operatör: {visit.operator?.full_name || 'Bilinmeyen'}
                  </Text>
                  {visit.status === 'completed' && visitRevenues[visit.id] > 0 && (
                    <Text style={styles.dayModalVisitRevenue}>
                      Ciro: {visitRevenues[visit.id].toFixed(2)} TRY
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={materialSummaryVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMaterialSummaryVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Kullanılan Üretli Malzemeler
              </Text>
              <TouchableOpacity onPress={() => setMaterialSummaryVisible(false)}>
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {selectedCustomer?.company_name} - {new Date(selectedYear, selectedMonth).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
            </Text>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {materialSummary.length === 0 ? (
                <View style={styles.emptyModalState}>
                  <Package size={48} color="#ccc" />
                  <Text style={styles.emptyModalText}>Bu dönemde kullanılan ücretli malzeme yok</Text>
                </View>
              ) : (
                <>
                  {materialSummary.map((item, index) => (
                    <View key={index} style={styles.materialItem}>
                      <View style={styles.materialInfo}>
                        <Text style={styles.materialName}>{item.name}</Text>
                        <Text style={styles.materialUnit}>Toplam Miktar: {item.total.toFixed(2)} {item.unit}</Text>
                      </View>
                      <View style={styles.materialPriceInfo}>
                        <Text style={styles.materialQuantity}>{item.totalPrice.toFixed(2)} {item.currency}</Text>
                      </View>
                    </View>
                  ))}
                  <View style={styles.modalTotalSection}>
                    <Text style={styles.modalTotalLabel}>Toplam Tutar:</Text>
                    <Text style={styles.modalTotalValue}>
                      {materialSummary.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)}{' '}
                      {materialSummary[0]?.currency || 'TRY'}
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    padding: 0,
  },
  visitCard: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 1,
    elevation: 1,
  },
  visitCardInvoiced: {
    backgroundColor: '#f1f8f4',
    borderLeftWidth: 3,
    borderLeftColor: '#4caf50',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTopLeft: {
    flex: 1,
  },
  cardTopRight: {
    marginLeft: 8,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 1,
  },
  branchName: {
    fontSize: 11,
    color: '#666',
  },
  invoiceCheckboxMobile: {
    padding: 6,
    marginRight: -6,
    marginTop: -6,
  },
  checkboxLarge: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  checkmarkLarge: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    padding: 6,
    marginBottom: 6,
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 9,
    color: '#999',
    marginBottom: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 11,
    color: '#333',
    fontWeight: '600',
  },
  metaDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#ddd',
  },
  statusBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  statusTextSmall: {
    fontSize: 9,
    fontWeight: '600',
    color: '#fff',
  },
  cardRevenue: {
    flexDirection: 'row',
    backgroundColor: '#f0f9ff',
    borderRadius: 4,
    padding: 6,
    marginBottom: 6,
  },
  revenueItem: {
    flex: 1,
    alignItems: 'center',
  },
  revenueLabel: {
    fontSize: 9,
    color: '#666',
    marginBottom: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  revenueValue: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '700',
  },
  revenueDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#d0e7f5',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  expandButtonText: {
    fontSize: 11,
    color: '#4caf50',
    fontWeight: '600',
  },
  detailsContainer: {
    paddingTop: 8,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 11,
    color: '#666',
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 11,
    color: '#333',
    fontWeight: '600',
  },
  pestChipsCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
  },
  pestChipCompact: {
    fontSize: 10,
    color: '#2e7d32',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  materialsCompact: {
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
    padding: 6,
    gap: 4,
  },
  materialsTitle: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  materialLineCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  materialTextCompact: {
    fontSize: 11,
    color: '#333',
    flex: 1,
  },
  materialPriceCompact: {
    fontSize: 11,
    color: '#4caf50',
    fontWeight: '600',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  monthButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textTransform: 'capitalize',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 16,
  },
  paginationButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#4caf50',
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
    padding: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  modalScroll: {
    maxHeight: 400,
  },
  emptyModalState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyModalText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
  },
  materialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  materialInfo: {
    flex: 1,
  },
  materialName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  materialUnit: {
    fontSize: 12,
    color: '#666',
  },
  materialQuantity: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  materialPriceInfo: {
    alignItems: 'flex-end',
  },
  materialsSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b3e5fc',
  },
  materialsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#b3e5fc',
  },
  materialsSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4caf50',
  },
  materialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    borderRadius: 6,
    marginBottom: 6,
  },
  materialRowLeft: {
    flex: 1,
  },
  materialRowName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  materialRowQuantity: {
    fontSize: 11,
    color: '#666',
  },
  materialRowPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4caf50',
    marginLeft: 12,
  },
  modalTotalSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#4caf50',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  modalTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  viewModeContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  viewModeButtonActive: {
    backgroundColor: '#4caf50',
  },
  viewModeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  viewModeButtonTextActive: {
    color: '#fff',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  calendarDayWithVisits: {
    backgroundColor: '#f0f9ff',
  },
  calendarDayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  dayVisitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    alignItems: 'center',
  },
  dayVisitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moreVisitsText: {
    fontSize: 8,
    color: '#666',
    fontWeight: '600',
  },
  calendarVisitsList: {
    margin: 16,
    marginTop: 0,
  },
  calendarVisitsListTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  calendarVisitCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  calendarVisitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calendarVisitDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  calendarVisitStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  calendarVisitStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  calendarVisitCustomer: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4caf50',
    marginBottom: 4,
  },
  calendarVisitBranch: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  calendarVisitReport: {
    fontSize: 12,
    color: '#2196f3',
    marginBottom: 4,
    fontWeight: '600',
  },
  calendarVisitOperator: {
    fontSize: 12,
    color: '#999',
  },
  dayModalVisitCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  dayModalVisitCardInvoiced: {
    backgroundColor: '#e8f5e9',
    borderWidth: 2,
    borderColor: '#4caf50',
  },
  dayModalVisitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dayModalVisitHeaderLeft: {
    flex: 1,
  },
  dayModalVisitHeaderRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  dayModalVisitCustomer: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4caf50',
    marginBottom: 2,
  },
  dayModalVisitBranch: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  dayModalVisitReport: {
    fontSize: 12,
    color: '#2196f3',
    fontWeight: '600',
    marginBottom: 4,
  },
  dayModalVisitStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  dayModalVisitStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  dayModalInvoiceCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dayModalVisitOperator: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  dayModalVisitRevenue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4caf50',
  },
});