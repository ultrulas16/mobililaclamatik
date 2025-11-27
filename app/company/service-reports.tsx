import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Calendar, MapPin, Building, User, Clock, FileText, Eye, Search, X, ChevronLeft, ChevronRight } from 'lucide-react-native';

interface Visit {
  id: string;
  customer_id: string;
  branch_id: string | null;
  operator_id: string;
  visit_date: string;
  status: string;
  visit_type: string | null;
  pest_types: string[] | null;
  density_level: string;
  equipment_checks: Record<string, any> | null;
  notes: string | null;
  customer_notes: string | null;
  start_time: string | null;
  end_time: string | null;
  report_number: string | null;
  report_photo_url: string | null;
  is_checked: boolean;
  created_at: string;
  updated_at: string;
  is_invoiced: boolean;
  customer: {
    company_name: string;
  } | null;
  branch: {
    branch_name: string;
    address: string;
  } | null;
  operator: {
    full_name: string;
    email: string;
  } | null;
  paid_material_sales: Array<{
    id: string;
    total_amount: number;
    status: string;
    paid_material_sale_items: Array<{
      quantity: number;
      unit_price: number;
      total_price: number;
      paid_products: {
        name: string;
        unit: string;
      } | null;
    }>;
  }>;
}

interface ChecklistData {
  visit_types?: string[];
  target_pests?: string[];
  density_level?: string;
  equipment?: string[];
  biocidal_products?: Array<{ productId: string; amount: string; unit: string; name?: string }>;
  materials?: Array<{ materialId: string; amount: string; unit: string; name?: string }>;
  start_time?: string;
  end_time?: string;
  operator_notes?: string;
  customer_notes?: string;
  report_number?: string;
  report_photo?: string;
}

export default function ServiceReports() {
  const router = useRouter();
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'invoiced' | 'not_invoiced'>('all');

  useEffect(() => {
    loadVisits();
  }, [selectedMonth, selectedYear, filterStatus]);

  const loadVisits = async () => {
    try {
      setLoading(true);

      // Get company table ID from companies table
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', profile?.id)
        .maybeSingle();

      if (companyError) {
        console.error('Error loading company data:', companyError);
        return;
      }

      if (!companyData) {
        console.log('No company found for user:', profile?.id);
        setVisits([]);
        return;
      }

      const startDate = new Date(selectedYear, selectedMonth, 1).toISOString();
      const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).toISOString();

      // Get operators for this company
      const { data: operatorsData } = await supabase
        .from('operators')
        .select('id, profile_id, full_name, email')
        .eq('company_id', companyData.id);

      const operatorIds = (operatorsData || []).map(op => op.id);

      if (operatorIds.length === 0) {
        setVisits([]);
        return;
      }

      let query = supabase
        .from('visits')
        .select(`
          *,
          customer:customers!visits_customer_id_fkey(company_name),
          branch:customer_branches!visits_branch_id_fkey(branch_name, address),
          paid_material_sales(
            id,
            total_amount,
            status,
            paid_material_sale_items(
              quantity,
              unit_price,
              total_price,
              paid_products(name, unit)
            )
          )
        `)
        .in('operator_id', operatorIds)
        .gte('visit_date', startDate)
        .lte('visit_date', endDate)
        .order('visit_date', { ascending: false });

      if (filterStatus === 'completed') {
        query = query.eq('status', 'completed');
      } else if (filterStatus === 'invoiced') {
        query = query.eq('is_invoiced', true);
      } else if (filterStatus === 'not_invoiced') {
        query = query.eq('is_invoiced', false);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Add operator information to visits
      const visitsWithOperators = (data || []).map(visit => {
        const operator = operatorsData?.find(op => op.id === visit.operator_id);
        return {
          ...visit,
          operator: operator ? {
            full_name: operator.full_name,
            email: operator.email,
          } : null,
        };
      });

      setVisits(visitsWithOperators);
    } catch (error) {
      console.error('Error loading visits:', error);
      Alert.alert(t('error'), 'Ziyaretler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const parseChecklistData = (notes: string | null): ChecklistData | null => {
    if (!notes) return null;
    try {
      return JSON.parse(notes);
    } catch {
      return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDensityLabel = (level: string) => {
    const labels: Record<string, string> = {
      none: 'Yok',
      low: 'Az',
      medium: 'Orta',
      high: 'İstila',
    };
    return labels[level] || level;
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
  };

  const filteredVisits = visits.filter(visit => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      visit.customer?.company_name?.toLowerCase().includes(searchLower) ||
      visit.branch?.branch_name?.toLowerCase().includes(searchLower) ||
      visit.operator?.full_name?.toLowerCase().includes(searchLower) ||
      visit.report_number?.toLowerCase().includes(searchLower)
    );
  });

  const totalVisits = filteredVisits.length;
  const completedVisits = filteredVisits.filter(v => v.status === 'completed').length;
  const invoicedVisits = filteredVisits.filter(v => v.is_invoiced).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hizmet Raporları</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Month Selector */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={() => changeMonth('prev')} style={styles.monthButton}>
          <ChevronLeft size={24} color="#4caf50" />
        </TouchableOpacity>
        <Text style={styles.monthText}>
          {new Date(selectedYear, selectedMonth).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => changeMonth('next')} style={styles.monthButton}>
          <ChevronRight size={24} color="#4caf50" />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalVisits}</Text>
          <Text style={styles.statLabel}>Toplam Ziyaret</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{completedVisits}</Text>
          <Text style={styles.statLabel}>Tamamlanan</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{invoicedVisits}</Text>
          <Text style={styles.statLabel}>Faturalandı</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Müşteri, şube, operatör veya rapor no ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'all' && styles.filterButtonActive]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[styles.filterButtonText, filterStatus === 'all' && styles.filterButtonTextActive]}>
              Tümü
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'completed' && styles.filterButtonActive]}
            onPress={() => setFilterStatus('completed')}
          >
            <Text style={[styles.filterButtonText, filterStatus === 'completed' && styles.filterButtonTextActive]}>
              Tamamlanan
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'invoiced' && styles.filterButtonActive]}
            onPress={() => setFilterStatus('invoiced')}
          >
            <Text style={[styles.filterButtonText, filterStatus === 'invoiced' && styles.filterButtonTextActive]}>
              Faturalandı
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'not_invoiced' && styles.filterButtonActive]}
            onPress={() => setFilterStatus('not_invoiced')}
          >
            <Text style={[styles.filterButtonText, filterStatus === 'not_invoiced' && styles.filterButtonTextActive]}>
              Faturalanmadı
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Visits List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredVisits.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'Ziyaret bulunamadı' : 'Bu ayda ziyaret raporu yok'}
            </Text>
          </View>
        ) : (
          filteredVisits.map((visit) => (
            <TouchableOpacity
              key={visit.id}
              style={styles.visitCard}
              onPress={() => {
                setSelectedVisit(visit);
                setShowDetailsModal(true);
              }}
            >
              {/* Date and Status */}
              <View style={styles.visitHeader}>
                <Text style={styles.visitDate}>
                  {formatDate(visit.visit_date)} {formatTime(visit.visit_date)}
                </Text>
                <View style={styles.statusContainer}>
                  <View style={[styles.statusBadge, { backgroundColor: visit.status === 'completed' ? '#4caf50' : '#ff9800' }]}>
                    <Text style={styles.statusText}>
                      {visit.status === 'completed' ? 'Tamamlandı' : 'Devam Ediyor'}
                    </Text>
                  </View>
                  {visit.is_invoiced && (
                    <View style={[styles.statusBadge, { backgroundColor: '#2196f3' }]}>
                      <Text style={styles.statusText}>Faturalandı</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Customer and Branch */}
              <Text style={styles.customerName}>
                {visit.customer?.company_name || 'Bilinmeyen Müşteri'}
              </Text>
              {visit.branch && (
                <Text style={styles.branchName}>
                  {visit.branch.branch_name}
                </Text>
              )}

              {/* Operator */}
              <View style={styles.operatorInfo}>
                <User size={14} color="#666" />
                <Text style={styles.operatorName}>
                  {visit.operator?.full_name || 'Operatör Bilinmiyor'}
                </Text>
              </View>

              {/* Visit Type */}
              {visit.visit_type && (
                <View style={styles.visitTypeInfo}>
                  <Calendar size={14} color="#666" />
                  <Text style={styles.visitTypeText}>
                    {visit.visit_type}
                  </Text>
                </View>
              )}

              {/* Report Number */}
              {visit.report_number && (
                <View style={styles.reportInfo}>
                  <FileText size={14} color="#666" />
                  <Text style={styles.reportText}>
                    Rapor No: {visit.report_number}
                  </Text>
                </View>
              )}

              {/* Revenue Info */}
              {visit.paid_material_sales && visit.paid_material_sales.length > 0 && (
                <View style={styles.revenueInfo}>
                  <Text style={styles.revenueText}>
                    Ücretli Ürün: {visit.paid_material_sales.reduce((sum, sale) => sum + sale.total_amount, 0).toFixed(2)} ₺
                  </Text>
                </View>
              )}

              {/* Action Button */}
              <TouchableOpacity 
                style={styles.detailsButton}
                onPress={() => {
                  setSelectedVisit(visit);
                  setShowDetailsModal(true);
                }}
              >
                <Eye size={16} color="#fff" />
                <Text style={styles.detailsButtonText}>Detayları Gör</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Visit Details Modal */}
      <Modal visible={showDetailsModal} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDetailsModal(false)} style={styles.modalBackButton}>
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Ziyaret Detayları</Text>
            <View style={styles.modalPlaceholder} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedVisit && (
              <>
                {/* Basic Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Genel Bilgiler</Text>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Tarih:</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(selectedVisit.visit_date)} {formatTime(selectedVisit.visit_date)}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Müşteri:</Text>
                    <Text style={styles.detailValue}>
                      {selectedVisit.customer?.company_name || 'Bilinmiyor'}
                    </Text>
                  </View>

                  {selectedVisit.branch && (
                    <>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Şube:</Text>
                        <Text style={styles.detailValue}>{selectedVisit.branch.branch_name}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Adres:</Text>
                        <Text style={styles.detailValue}>{selectedVisit.branch.address}</Text>
                      </View>
                    </>
                  )}

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Operatör:</Text>
                    <Text style={styles.detailValue}>
                      {selectedVisit.operator?.full_name || 'Bilinmiyor'}
                    </Text>
                  </View>

                  {selectedVisit.operator?.email && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Operatör Email:</Text>
                      <Text style={styles.detailValue}>{selectedVisit.operator.email}</Text>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Durum:</Text>
                    <Text style={[styles.detailValue, { color: selectedVisit.status === 'completed' ? '#4caf50' : '#ff9800' }]}>
                      {selectedVisit.status === 'completed' ? 'Tamamlandı' : 'Devam Ediyor'}
                    </Text>
                  </View>

                  {selectedVisit.report_number && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Rapor Numarası:</Text>
                      <Text style={styles.detailValue}>{selectedVisit.report_number}</Text>
                    </View>
                  )}
                </View>

                {/* Visit Details */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Ziyaret Detayları</Text>

                  {selectedVisit.visit_type && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Ziyaret Türü:</Text>
                      <Text style={styles.detailValue}>{selectedVisit.visit_type}</Text>
                    </View>
                  )}

                  {selectedVisit.pest_types && selectedVisit.pest_types.length > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Hedef Zararlılar:</Text>
                      <Text style={styles.detailValue}>{selectedVisit.pest_types.join(', ')}</Text>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Yoğunluk Seviyesi:</Text>
                    <Text style={styles.detailValue}>{getDensityLabel(selectedVisit.density_level)}</Text>
                  </View>

                  {selectedVisit.start_time && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Başlangıç Saati:</Text>
                      <Text style={styles.detailValue}>{selectedVisit.start_time}</Text>
                    </View>
                  )}

                  {selectedVisit.end_time && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Bitiş Saati:</Text>
                      <Text style={styles.detailValue}>{selectedVisit.end_time}</Text>
                    </View>
                  )}
                </View>

                {/* Equipment Checks */}
                {selectedVisit.equipment_checks && Object.keys(selectedVisit.equipment_checks).length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Ekipman Kontrolleri</Text>
                    {Object.entries(selectedVisit.equipment_checks).map(([equipmentId, checks]) => (
                      <View key={equipmentId} style={styles.equipmentCheckCard}>
                        <Text style={styles.equipmentTitle}>Ekipman {equipmentId}</Text>
                        {Object.entries(checks as Record<string, any>).map(([property, value]) => (
                          <View key={property} style={styles.checkRow}>
                            <Text style={styles.checkLabel}>{property}:</Text>
                            <Text style={styles.checkValue}>{value}</Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                )}

                {/* Paid Products */}
                {selectedVisit.paid_material_sales && selectedVisit.paid_material_sales.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Ücretli Ürünler</Text>
                    {selectedVisit.paid_material_sales.map((sale, saleIndex) => (
                      <View key={sale.id} style={styles.saleCard}>
                        <Text style={styles.saleTitle}>Satış {saleIndex + 1}</Text>
                        <Text style={styles.saleTotal}>
                          Toplam: {sale.total_amount.toFixed(2)} ₺
                        </Text>
                        {sale.paid_material_sale_items.map((item, itemIndex) => (
                          <View key={itemIndex} style={styles.saleItem}>
                            <Text style={styles.saleItemName}>
                              {item.paid_products?.name || 'Bilinmeyen Ürün'}
                            </Text>
                            <Text style={styles.saleItemDetails}>
                              {item.quantity} {item.paid_products?.unit} × {item.unit_price.toFixed(2)} ₺ = {item.total_price.toFixed(2)} ₺
                            </Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                )}

                {/* Notes */}
                {selectedVisit.notes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Operatör Notları</Text>
                    <View style={styles.notesCard}>
                      <Text style={styles.notesText}>{selectedVisit.notes}</Text>
                    </View>
                  </View>
                )}

                {selectedVisit.customer_notes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Müşteri Açıklamaları</Text>
                    <View style={styles.notesCard}>
                      <Text style={styles.notesText}>{selectedVisit.customer_notes}</Text>
                    </View>
                  </View>
                )}

                {/* Checklist Data from JSON */}
                {(() => {
                  const checklistData = parseChecklistData(selectedVisit.notes);
                  if (!checklistData) return null;

                  return (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Kontrol Listesi Detayları</Text>

                      {checklistData.biocidal_products && checklistData.biocidal_products.length > 0 && (
                        <View style={styles.checklistSubsection}>
                          <Text style={styles.checklistSubtitle}>Biyosidal Ürünler:</Text>
                          {checklistData.biocidal_products.map((product, index) => (
                            <Text key={index} style={styles.checklistItem}>
                              • {product.name || 'Ürün'}: {product.amount} {product.unit}
                            </Text>
                          ))}
                        </View>
                      )}

                      {checklistData.materials && checklistData.materials.length > 0 && (
                        <View style={styles.checklistSubsection}>
                          <Text style={styles.checklistSubtitle}>Kullanılan Malzemeler:</Text>
                          {checklistData.materials.map((material, index) => (
                            <Text key={index} style={styles.checklistItem}>
                              • {material.name || 'Malzeme'}: {material.amount} {material.unit}
                            </Text>
                          ))}
                        </View>
                      )}

                      {checklistData.equipment && checklistData.equipment.length > 0 && (
                        <View style={styles.checklistSubsection}>
                          <Text style={styles.checklistSubtitle}>Kontrol Edilen Ekipmanlar:</Text>
                          {checklistData.equipment.map((equipment, index) => (
                            <Text key={index} style={styles.checklistItem}>
                              • {equipment}
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })()}

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowDetailsModal(false)}
                  >
                    <Text style={styles.closeButtonText}>Kapat</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
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
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  monthButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4caf50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
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
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  visitDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  branchName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  operatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  operatorName: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '500',
  },
  visitTypeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  visitTypeText: {
    fontSize: 14,
    color: '#2196f3',
    fontWeight: '500',
  },
  reportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  reportText: {
    fontSize: 14,
    color: '#ff9800',
    fontWeight: '500',
  },
  revenueInfo: {
    marginBottom: 12,
  },
  revenueText: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '600',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196f3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  detailsButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    backgroundColor: '#4caf50',
    paddingTop: 44,
    paddingBottom: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalBackButton: {
    width: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  modalPlaceholder: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  equipmentCheckCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  equipmentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  checkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  checkLabel: {
    fontSize: 13,
    color: '#666',
  },
  checkValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  saleCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  saleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  saleTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4caf50',
    marginBottom: 8,
  },
  saleItem: {
    marginBottom: 6,
  },
  saleItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  saleItemDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  notesCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  checklistSubsection: {
    marginBottom: 12,
  },
  checklistSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  checklistItem: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },
  modalFooter: {
    paddingVertical: 20,
  },
  closeButton: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
});