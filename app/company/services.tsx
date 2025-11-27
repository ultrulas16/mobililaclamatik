import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Calendar, MapPin, Building, User, Clock, CircleCheck as CheckCircle, FileText, Eye } from 'lucide-react-native';

interface ServiceRequest {
  id: string;
  customer_id: string;
  branch_id: string | null;
  operator_id: string | null;
  service_type: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_date: string | null;
  completed_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer: {
    company_name: string;
    profile: {
      full_name: string;
      phone: string;
    } | null;
  } | null;
  branch: {
    branch_name: string;
    address: string;
    phone: string | null;
  } | null;
  operator: {
    full_name: string;
    email: string;
  } | null;
}

interface ChecklistData {
  visit_types?: string[];
  target_pests?: string[];
  density_level?: string;
  equipment?: string[];
  biocidal_products?: Array<{ productId: string; amount: string; unit: string }>;
  materials?: Array<{ materialId: string; amount: string; unit: string }>;
  start_time?: string;
  end_time?: string;
  operator_notes?: string;
  customer_notes?: string;
  report_number?: string;
  report_photo?: string;
}

export default function CompanyServices() {
  const router = useRouter();
  const { profile } = useAuth();
  const { t } = useLanguage();
  
  const [services, setServices] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceRequest | null>(null);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [checklistData, setChecklistData] = useState<ChecklistData | null>(null);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      // First get the company table ID from companies table
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
        setServices([]);
        return;
      }

      console.log('Company table ID:', companyData.id);

      // Get services for this company
      const { data, error } = await supabase
        .from('service_requests')
        .select(`
          *,
          customer:customers!service_requests_customer_id_fkey(
            company_name,
            profile:profiles!customers_profile_id_fkey(full_name, phone)
          ),
          branch:customer_branches!service_requests_branch_id_fkey(
            branch_name,
            address,
            phone
          ),
          operator:profiles!service_requests_operator_id_fkey(full_name, email)
        `)
        .eq('company_id', companyData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Loaded services:', data);
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#ff9800';
      case 'assigned': return '#2196f3';
      case 'in_progress': return '#9c27b0';
      case 'completed': return '#4caf50';
      case 'cancelled': return '#f44336';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Beklemede';
      case 'assigned': return 'Atanmış';
      case 'in_progress': return 'Devam Ediyor';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal Edildi';
      default: return status;
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'pending': return '#fff3e0';
      case 'assigned': return '#e3f2fd';
      case 'in_progress': return '#f3e5f5';
      case 'completed': return '#e8f5e9';
      case 'cancelled': return '#ffebee';
      default: return '#f5f5f5';
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

  const parseChecklistData = (notes: string | null): ChecklistData | null => {
    if (!notes) return null;
    try {
      return JSON.parse(notes);
    } catch {
      return null;
    }
  };

  const showChecklist = (service: ServiceRequest) => {
    const data = parseChecklistData(service.notes);
    if (data) {
      setChecklistData(data);
      setSelectedService(service);
      setShowChecklistModal(true);
    } else {
      Alert.alert('Bilgi', 'Bu ziyaret için kontrol listesi verisi bulunamadı');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hizmetlerim - Ziyaretlerim</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{services.filter(s => s.status === 'assigned').length}</Text>
          <Text style={styles.statLabel}>Atanmış</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{services.filter(s => s.status === 'in_progress').length}</Text>
          <Text style={styles.statLabel}>Devam Eden</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{services.filter(s => s.status === 'completed').length}</Text>
          <Text style={styles.statLabel}>Tamamlanan</Text>
        </View>
      </View>

      {/* Services List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>
          Tüm Ziyaretler ({services.length})
        </Text>
        
        {services.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Henüz ziyaret bulunmuyor</Text>
            <Text style={styles.emptySubtext}>Operatörleriniz ziyaret yaptığında burada görünecek</Text>
          </View>
        ) : (
          services.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={styles.serviceCard}
              onPress={() => {
                setSelectedService(service);
                setShowDetailsModal(true);
              }}
            >
              {/* Date and Status */}
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceDate}>
                  {service.scheduled_date 
                    ? `${formatDate(service.scheduled_date)} ${formatTime(service.scheduled_date)}`
                    : formatDate(service.created_at)
                  }
                </Text>
                <View style={styles.statusContainer}>
                  <View style={[
                    styles.statusBadge, 
                    { backgroundColor: getStatusBgColor(service.status) }
                  ]}>
                    <Text style={[styles.statusText, { color: getStatusColor(service.status) }]}>
                      {getStatusText(service.status)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Customer Name */}
              <Text style={styles.customerName}>
                {service.customer?.company_name || 'N/A'}
              </Text>

              {/* Branch Name */}
              {service.branch && (
                <Text style={styles.branchName}>
                  {service.branch.branch_name}
                </Text>
              )}

              {/* Service Type */}
              <Text style={styles.serviceType}>
                {service.service_type}
              </Text>

              {/* Operator */}
              {service.operator && (
                <View style={styles.operatorInfo}>
                  <User size={14} color="#666" />
                  <Text style={styles.operatorName}>
                    {service.operator.full_name}
                  </Text>
                </View>
              )}

              {/* Service Details */}
              <View style={styles.serviceDetails}>
                <View style={styles.serviceDetailRow}>
                  <Building size={14} color="#666" />
                  <Text style={styles.serviceDetailText}>
                    {service.customer?.company_name || 'Müşteri'}
                  </Text>
                </View>
                
                {service.branch && (
                  <View style={styles.serviceDetailRow}>
                    <MapPin size={14} color="#666" />
                    <Text style={styles.serviceDetailText}>
                      {service.branch.branch_name}
                    </Text>
                  </View>
                )}
                
                <View style={styles.serviceDetailRow}>
                  <Calendar size={14} color="#666" />
                  <Text style={styles.serviceDetailText}>
                    {service.scheduled_date 
                      ? `${formatDate(service.scheduled_date)} ${formatTime(service.scheduled_date)}`
                      : 'Tarih belirlenmemiş'
                    }
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                {service.status === 'completed' && service.notes && (
                  <TouchableOpacity 
                    style={styles.checklistButton}
                    onPress={() => showChecklist(service)}
                  >
                    <FileText size={14} color="#4caf50" />
                    <Text style={styles.checklistButtonText}>Kontrol Listesi</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  style={[styles.actionButton, styles.detailsButton]}
                  onPress={() => {
                    setSelectedService(service);
                    setShowDetailsModal(true);
                  }}
                >
                  <Eye size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Detaylar</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Service Details Modal */}
      <Modal visible={showDetailsModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              {selectedService && (
                <>
                  <Text style={styles.modalTitle}>Ziyaret Detayları</Text>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Hizmet Türü</Text>
                    <Text style={styles.detailValue}>{selectedService.service_type}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Durum</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(selectedService.status) }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(selectedService.status) }]}>
                        {getStatusText(selectedService.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Müşteri</Text>
                    <Text style={styles.detailValue}>{selectedService.customer?.company_name || 'N/A'}</Text>
                    {selectedService.customer?.profile?.phone && (
                      <Text style={styles.detailSubValue}>{selectedService.customer.profile.phone}</Text>
                    )}
                  </View>

                  {selectedService.branch && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Şube</Text>
                      <Text style={styles.detailValue}>{selectedService.branch.branch_name}</Text>
                      <Text style={styles.detailSubValue}>{selectedService.branch.address}</Text>
                      {selectedService.branch.phone && (
                        <Text style={styles.detailSubValue}>{selectedService.branch.phone}</Text>
                      )}
                    </View>
                  )}

                  {selectedService.operator && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Operatör</Text>
                      <Text style={styles.detailValue}>{selectedService.operator.full_name}</Text>
                      <Text style={styles.detailSubValue}>{selectedService.operator.email}</Text>
                    </View>
                  )}

                  {selectedService.scheduled_date && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Planlanan Tarih</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(selectedService.scheduled_date)} {formatTime(selectedService.scheduled_date)}
                      </Text>
                    </View>
                  )}

                  {selectedService.completed_date && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Tamamlanma Tarihi</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(selectedService.completed_date)} {formatTime(selectedService.completed_date)}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowDetailsModal(false)}
                  >
                    <Text style={styles.closeButtonText}>Kapat</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Checklist Modal */}
      <Modal visible={showChecklistModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              {selectedService && checklistData && (
                <>
                  <Text style={styles.modalTitle}>Kontrol Listesi</Text>
                  
                  <View style={styles.checklistHeader}>
                    <Text style={styles.checklistCustomer}>{selectedService.customer?.company_name}</Text>
                    {selectedService.branch && (
                      <Text style={styles.checklistBranch}>{selectedService.branch.branch_name}</Text>
                    )}
                    <Text style={styles.checklistDate}>
                      {new Date(selectedService.completed_date || selectedService.updated_at).toLocaleDateString('tr-TR')}
                    </Text>
                    {selectedService.operator && (
                      <Text style={styles.checklistOperator}>Operatör: {selectedService.operator.full_name}</Text>
                    )}
                  </View>

                  {checklistData.visit_types && checklistData.visit_types.length > 0 && (
                    <View style={styles.checklistSection}>
                      <Text style={styles.checklistSectionTitle}>Ziyaret Türü</Text>
                      {checklistData.visit_types.map((type, index) => (
                        <Text key={index} style={styles.checklistItem}>• {type}</Text>
                      ))}
                    </View>
                  )}

                  {checklistData.target_pests && checklistData.target_pests.length > 0 && (
                    <View style={styles.checklistSection}>
                      <Text style={styles.checklistSectionTitle}>Hedef Zararlılar</Text>
                      {checklistData.target_pests.map((pest, index) => (
                        <Text key={index} style={styles.checklistItem}>• {pest}</Text>
                      ))}
                    </View>
                  )}

                  {checklistData.density_level && (
                    <View style={styles.checklistSection}>
                      <Text style={styles.checklistSectionTitle}>Yoğunluk Seviyesi</Text>
                      <Text style={styles.checklistItem}>
                        {checklistData.density_level === 'none' ? 'Yok' :
                         checklistData.density_level === 'low' ? 'Az' :
                         checklistData.density_level === 'medium' ? 'Orta' :
                         checklistData.density_level === 'high' ? 'Yüksek' : checklistData.density_level}
                      </Text>
                    </View>
                  )}

                  {checklistData.biocidal_products && checklistData.biocidal_products.length > 0 && (
                    <View style={styles.checklistSection}>
                      <Text style={styles.checklistSectionTitle}>Kullanılan Biyosidal Ürünler</Text>
                      {checklistData.biocidal_products.map((product, index) => (
                        <Text key={index} style={styles.checklistItem}>
                          • {product.amount} {product.unit}
                        </Text>
                      ))}
                    </View>
                  )}

                  {checklistData.materials && checklistData.materials.length > 0 && (
                    <View style={styles.checklistSection}>
                      <Text style={styles.checklistSectionTitle}>Kullanılan Malzemeler</Text>
                      {checklistData.materials.map((material, index) => (
                        <Text key={index} style={styles.checklistItem}>
                          • {material.amount} {material.unit}
                        </Text>
                      ))}
                    </View>
                  )}

                  {(checklistData.start_time || checklistData.end_time) && (
                    <View style={styles.checklistSection}>
                      <Text style={styles.checklistSectionTitle}>Ziyaret Saatleri</Text>
                      {checklistData.start_time && (
                        <Text style={styles.checklistItem}>Başlangıç: {checklistData.start_time}</Text>
                      )}
                      {checklistData.end_time && (
                        <Text style={styles.checklistItem}>Bitiş: {checklistData.end_time}</Text>
                      )}
                    </View>
                  )}

                  {checklistData.operator_notes && (
                    <View style={styles.checklistSection}>
                      <Text style={styles.checklistSectionTitle}>Operatör Notları</Text>
                      <Text style={styles.checklistNotes}>{checklistData.operator_notes}</Text>
                    </View>
                  )}

                  {checklistData.customer_notes && (
                    <View style={styles.checklistSection}>
                      <Text style={styles.checklistSectionTitle}>Müşteri Açıklamaları</Text>
                      <Text style={styles.checklistNotes}>{checklistData.customer_notes}</Text>
                    </View>
                  )}

                  {checklistData.report_number && (
                    <View style={styles.checklistSection}>
                      <Text style={styles.checklistSectionTitle}>Rapor Numarası</Text>
                      <Text style={styles.checklistItem}>{checklistData.report_number}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowChecklistModal(false)}
                  >
                    <Text style={styles.closeButtonText}>Kapat</Text>
                  </TouchableOpacity>
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
    height: 40,
    justifyContent: 'center',
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 20,
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  serviceCard: {
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
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  serviceDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
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
  serviceType: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  operatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  operatorName: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '500',
  },
  serviceDetails: {
    marginBottom: 16,
    gap: 8,
  },
  serviceDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serviceDetailText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  detailsButton: {
    backgroundColor: '#2196f3',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  checklistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  checklistButtonText: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '600',
    marginLeft: 4,
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
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  detailSubValue: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  closeButton: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checklistHeader: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  checklistCustomer: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  checklistBranch: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  checklistDate: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  checklistOperator: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '500',
  },
  checklistSection: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  checklistSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  checklistItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  checklistNotes: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
});