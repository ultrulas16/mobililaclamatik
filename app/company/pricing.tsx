import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, DollarSign, Search, X, CreditCard as Edit, Building, User } from 'lucide-react-native';
import { Customer, Branch, CustomerPricing, BranchPricing } from '@/types/visits';

type PricingMode = 'customer' | 'branch';

interface CustomerWithPricing extends Customer {
  pricing?: CustomerPricing;
}

interface BranchWithPricing extends Branch {
  pricing?: BranchPricing;
  customer?: {
    company_name: string;
  };
}

export default function Pricing() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<PricingMode>('customer');
  const [customers, setCustomers] = useState<CustomerWithPricing[]>([]);
  const [branches, setBranches] = useState<BranchWithPricing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const [formData, setFormData] = useState({
    monthly_price: '',
    per_visit_price: '',
  });

  // IYILESTIRME 1: `loadData` fonksiyonunu `useCallback` içine aldık.
  // Bu, fonksiyonun gereksiz yere yeniden oluşmasını engeller ve `useEffect` içinde güvenle kullanılmasını sağlar.
  const loadData = useCallback(async () => {
    if (!profile?.company_id) {
      console.warn('[Pricing] loadData: Company ID not available, skipping data load.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[Pricing] Starting loadData for mode:', mode, 'Company ID:', profile.company_id);

      if (mode === 'customer') {
        // Müşteri modu için veri çekme (Bu kısım zaten doğruydu)
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('*')
          .eq('created_by_company_id', profile.company_id)
          .order('company_name');

        if (customersError) throw customersError;

        const customerIds = (customersData || []).map(c => c.id);
        if (customerIds.length > 0) {
            const { data: pricingData, error: pricingError } = await supabase
              .from('customer_pricing')
              .select('*')
              .in('customer_id', customerIds);

            if (pricingError) throw pricingError;

            const customersWithPricing = (customersData || []).map(customer => ({
              ...customer,
              pricing: (pricingData || []).find(p => p.customer_id === customer.id),
            }));
            setCustomers(customersWithPricing);
        } else {
            setCustomers([]);
        }

      } else {
        // ŞUBE MODU İÇİN DÜZELTİLMİŞ VE İYİLEŞTİRİLMİŞ SORGULAMA
        // DEĞİŞİKLİK 2: Artık tek ve daha verimli bir sorgu kullanıyoruz.
        // `customer_branches` tablosundan veri çekerken, `customers` tablosundaki `created_by_company_id`'ye göre filtreleme yapıyoruz.
        const { data: branchesData, error: branchesError } = await supabase
          .from('customer_branches')
          .select(`
            *,
            customer:customers!inner(company_name)
          `)
          .eq('customers.created_by_company_id', profile.company_id)
          .order('branch_name');

        if (branchesError) throw branchesError;

        const branchIds = (branchesData || []).map(b => b.id);
        if (branchIds.length > 0) {
            const { data: pricingData, error: pricingError } = await supabase
              .from('branch_pricing')
              .select('*')
              .in('branch_id', branchIds);

            if (pricingError) throw pricingError;

            const branchesWithPricing = (branchesData || []).map(branch => ({
              ...branch,
              pricing: (pricingData || []).find(p => p.branch_id === branch.id),
            }));

            setBranches(branchesWithPricing);
        } else {
            setBranches([]);
        }
      }
    } catch (error: any) {
      console.error('[Pricing] Error in loadData:', error);
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
      console.log('[Pricing] loadData finished, setting local loading to false.');
    }
  }, [mode, profile?.company_id]); // Bağımlılıkları doğru şekilde belirledik.

  useEffect(() => {
    if (!authLoading && profile?.company_id) {
      loadData();
    } else if (!authLoading && !profile) {
      setLoading(false);
    }
  }, [authLoading, profile, loadData]); // `loadData`'yı bağımlılıklara ekledik.

  const handleEdit = (id: string, name: string, pricing?: CustomerPricing | BranchPricing) => {
    setEditingId(id);
    setEditingName(name);
    setFormData({
      monthly_price: pricing?.monthly_price?.toString() || '',
      per_visit_price: pricing?.per_visit_price?.toString() || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editingId) return;

    const monthlyPrice = formData.monthly_price ? parseFloat(formData.monthly_price) : null;
    const perVisitPrice = formData.per_visit_price ? parseFloat(formData.per_visit_price) : null;

    if (monthlyPrice !== null && (isNaN(monthlyPrice) || monthlyPrice < 0)) {
      Alert.alert('Hata', 'Geçerli bir aylık fiyat girin');
      return;
    }
    if (perVisitPrice !== null && (isNaN(perVisitPrice) || perVisitPrice < 0)) {
      Alert.alert('Hata', 'Geçerli bir ziyaret başı fiyat girin');
      return;
    }
    if (monthlyPrice === null && perVisitPrice === null) {
      Alert.alert('Hata', 'En az bir fiyat türü girilmelidir');
      return;
    }

    try {
      if (mode === 'customer') {
        const { error } = await supabase
          .from('customer_pricing')
          .upsert({
            customer_id: editingId,
            monthly_price: monthlyPrice,
            per_visit_price: perVisitPrice,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'customer_id' });

        if (error) throw error;
        Alert.alert('Başarılı', 'Müşteri fiyatlandırması güncellendi');
      } else {
        const { error } = await supabase
          .from('branch_pricing')
          .upsert({
            branch_id: editingId,
            monthly_price: monthlyPrice,
            per_visit_price: perVisitPrice,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'branch_id' });

        if (error) throw error;
        Alert.alert('Başarılı', 'Şube fiyatlandırması güncellendi');
      }

      handleCloseModal();
      loadData();
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setEditingName('');
    setFormData({
      monthly_price: '',
      per_visit_price: '',
    });
  };

  const filteredCustomers = customers.filter(customer =>
    customer.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBranches = branches.filter(branch =>
    branch.branch_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.customer?.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalWithPricing = mode === 'customer'
    ? customers.filter(c => c.pricing).length
    : branches.filter(b => b.pricing).length;

  if (loading || authLoading) {
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
        <Text style={styles.headerTitle}>Fiyatlandırma</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'customer' && styles.modeButtonActive]}
          onPress={() => setMode('customer')}
        >
          <User size={20} color={mode === 'customer' ? '#fff' : '#4caf50'} />
          <Text style={[styles.modeButtonText, mode === 'customer' && styles.modeButtonTextActive]}>
            Müşteriler
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'branch' && styles.modeButtonActive]}
          onPress={() => setMode('branch')}
        >
          <Building size={20} color={mode === 'branch' ? '#fff' : '#4caf50'} />
          <Text style={[styles.modeButtonText, mode === 'branch' && styles.modeButtonTextActive]}>
            Şubeler
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <DollarSign size={24} color="#4caf50" />
          <Text style={styles.statValue}>
            {mode === 'customer' ? customers.length : branches.length}
          </Text>
          <Text style={styles.statLabel}>
            Toplam {mode === 'customer' ? 'Müşteri' : 'Şube'}
          </Text>
        </View>
        <View style={styles.statCard}>
          <DollarSign size={24} color="#2196f3" />
          <Text style={styles.statValue}>{totalWithPricing}</Text>
          <Text style={styles.statLabel}>Fiyatlandırılmış</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder={mode === 'customer' ? 'Müşteri ara...' : 'Şube ara...'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {mode === 'customer' ? (
          filteredCustomers.length === 0 ? (
            <View style={styles.emptyState}>
              <User size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'Müşteri bulunamadı' : 'Henüz müşteri yok'}
              </Text>
            </View>
          ) : (
            filteredCustomers.map(customer => (
              <View key={customer.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{customer.company_name}</Text>
                    {customer.pricing ? (
                      <View style={styles.pricingInfo}>
                        {customer.pricing.monthly_price != null && (
                          <Text style={styles.pricingText}>
                            Aylık: {customer.pricing.monthly_price.toFixed(2)} ₺
                          </Text>
                        )}
                        {customer.pricing.per_visit_price != null && (
                          <Text style={styles.pricingText}>
                            Ziyaret: {customer.pricing.per_visit_price.toFixed(2)} ₺
                          </Text>
                        )}
                      </View>
                    ) : (
                      <Text style={styles.noPricing}>Fiyatlandırma yapılmamış</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEdit(customer.id, customer.company_name || '', customer.pricing)}
                  >
                    <Edit size={18} color="#2196f3" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        ) : (
          filteredBranches.length === 0 ? (
            <View style={styles.emptyState}>
              <Building size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'Şube bulunamadı' : 'Henüz şube yok'}
              </Text>
            </View>
          ) : (
            filteredBranches.map(branch => (
              <View key={branch.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{branch.branch_name}</Text>
                    <Text style={styles.itemSubtext}>{branch.customer?.company_name}</Text>
                    {branch.pricing ? (
                      <View style={styles.pricingInfo}>
                        {branch.pricing.monthly_price != null && (
                          <Text style={styles.pricingText}>
                            Aylık: {branch.pricing.monthly_price.toFixed(2)} ₺
                          </Text>
                        )}
                        {branch.pricing.per_visit_price != null && (
                          <Text style={styles.pricingText}>
                            Ziyaret: {branch.pricing.per_visit_price.toFixed(2)} ₺
                          </Text>
                        )}
                      </View>
                    ) : (
                      <Text style={styles.noPricing}>Fiyatlandırma yapılmamış</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEdit(branch.id, branch.branch_name, branch.pricing)}
                  >
                    <Edit size={18} color="#2196f3" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Fiyatlandırma</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSubtitle}>{editingName}</Text>

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  Aylık fiyat: Ay boyunca yapılacak tüm ziyaretler için toplam ücret
                </Text>
                <Text style={styles.infoText}>
                  Ziyaret başı fiyat: Her ziyaret için ödenecek ücret
                </Text>
              </View>

              <Text style={styles.inputLabel}>Aylık Fiyat (₺)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="numeric"
                value={formData.monthly_price}
                onChangeText={(text) => setFormData({ ...formData, monthly_price: text })}
              />

              <Text style={styles.inputLabel}>Ziyaret Başı Fiyat (₺)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="numeric"
                value={formData.per_visit_price}
                onChangeText={(text) => setFormData({ ...formData, per_visit_price: text })}
              />

              <Text style={styles.helperText}>
                En az bir fiyat türü girilmelidir. Her ikisi de girilebilir.
              </Text>

              {mode === 'branch' && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    ⚠️ Şube fiyatlandırması müşteri fiyatlandırmasını geçersiz kılar
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCloseModal}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
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
  headerButton: {
    width: 40,
  },
  modeSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4caf50',
    gap: 8,
  },
  modeButtonActive: {
    backgroundColor: '#4caf50',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4caf50',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
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
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
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
  itemCard: {
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
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  itemSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  pricingInfo: {
    marginTop: 8,
  },
  pricingText: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '600',
    marginTop: 2,
  },
  noPricing: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  editButton: {
    padding: 8,
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 12,
    color: '#1976d2',
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 16,
    fontStyle: 'italic',
  },
  warningBox: {
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  warningText: {
    fontSize: 12,
    color: '#f57c00',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#4caf50',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
