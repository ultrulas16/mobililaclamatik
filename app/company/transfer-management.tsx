import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft,
  Plus,
  X,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  User,
  RefreshCw,
} from 'lucide-react-native';

interface Product {
  id: string;
  name: string;
  unit: string;
}

interface Operator {
  id: string;
  full_name: string;
  warehouse_id?: string;
  warehouse_name?: string;
}

interface Transfer {
  id: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  product_id: string;
  quantity: number;
  status: string;
  notes: string;
  created_at: string;
  product?: Product;
  to_operator?: string;
  requester_name?: string;
}

export default function TransferManagement() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  const [selectedOperator, setSelectedOperator] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const [companyId, setCompanyId] = useState<string>('');
  const [mainWarehouseId, setMainWarehouseId] = useState<string>('');

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    try {
      setLoading(true);
      await fetchInitialData();
    } catch (error: any) {
      console.error('Initialize error:', error);
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchInitialData = async () => {
    // 1. Profil ve Şirket Bilgisi
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user?.id)
      .single();

    if (!profile?.company_id) {
      throw new Error('Firma bilgisi bulunamadı');
    }

    setCompanyId(profile.company_id);

    // 2. Ana Depo Bilgisi
    // admin_warehouses view olmayabilir, direkt warehouses'dan çekelim
    const { data: warehouse, error: whError } = await supabase
      .from('warehouses')
      .select('id')
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      // Ana depoyu bulmak için warehouse_type kontrolü veya sıralama yapabiliriz
      // Genelde ilk oluşturulan depo ana depodur veya type='main' dir.
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (whError) throw whError;

    if (!warehouse) {
      Alert.alert('Uyarı', 'Ana depo bulunamadı. Lütfen şirket ayarlarından deponuzu oluşturun.');
      return;
    }

    setMainWarehouseId(warehouse.id);

    // 3. Diğer verileri paralel yükle
    await Promise.all([
      loadTransfers(warehouse.id),
      loadOperators(profile.company_id),
      loadProducts(profile.company_id),
    ]);
  };

  const loadTransfers = async (warehouseId: string) => {
    try {
      // Hem giden (from) hem gelen (to) transferleri getir
      // .or() filtresi ile iki durumu da kapsıyoruz
      const { data, error } = await supabase
        .from('warehouse_transfers')
        .select(`
          id,
          from_warehouse_id,
          to_warehouse_id,
          product_id,
          quantity,
          status,
          notes,
          created_at,
          product:company_materials(id, name, unit),
          requester:profiles!requested_by(full_name)
        `)
        .or(`from_warehouse_id.eq.${warehouseId},to_warehouse_id.eq.${warehouseId}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Transfer listesi çekilemedi:', error);
        throw error;
      }

      console.log('Çekilen transfer sayısı:', data?.length || 0);

      const formattedTransfers = (data || []).map((t: any) => ({
        id: t.id,
        from_warehouse_id: t.from_warehouse_id,
        to_warehouse_id: t.to_warehouse_id,
        product_id: t.product_id,
        quantity: t.quantity,
        status: t.status,
        notes: t.notes,
        created_at: t.created_at,
        product: t.product,
        requester_name: t.requester?.full_name,
      }));

      setTransfers(formattedTransfers);
    } catch (error: any) {
      console.error('Load transfers error:', error);
      Alert.alert('Hata', 'Transfer listesi yüklenirken hata oluştu');
    }
  };

  const loadOperators = async (compId: string) => {
    try {
      const { data: operatorsList, error: opsError } = await supabase
        .from('operators')
        .select('id, full_name')
        .eq('company_id', compId);

      if (opsError) throw opsError;

      if (!operatorsList || operatorsList.length === 0) {
        setOperators([]);
        return;
      }

      const { data: warehousesList, error: whError } = await supabase
        .from('warehouses')
        .select('id, name, operator_id')
        .in('operator_id', operatorsList.map(op => op.id));

      if (whError) throw whError;

      const formattedOperators = operatorsList.map((op) => {
        const warehouse = warehousesList?.find(wh => wh.operator_id === op.id);
        return {
          id: op.id,
          full_name: op.full_name,
          warehouse_id: warehouse?.id,
          warehouse_name: warehouse?.name,
        };
      });

      setOperators(formattedOperators);
    } catch (error: any) {
      console.error('Load operators error:', error);
    }
  };

  const loadProducts = async (compId: string) => {
    try {
      const { data, error } = await supabase
        .from('company_materials')
        .select('id, name, unit')
        .eq('company_id', compId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Load products error:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (mainWarehouseId) {
        await loadTransfers(mainWarehouseId);
      } else {
        await fetchInitialData();
      }
    } finally {
      setRefreshing(false);
    }
  }, [mainWarehouseId]);

  const handleCreateTransfer = async () => {
    if (isSubmitting) return;

    if (!selectedOperator || !selectedProduct || !quantity) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Hata', 'Geçerli bir miktar girin');
      return;
    }

    const operator = operators.find(op => op.id === selectedOperator);
    if (!operator) return;

    // Company ID kontrolü
    if (!companyId) {
      Alert.alert('Hata', 'Firma bilgisi eksik. Lütfen sayfayı yenileyin.');
      return;
    }

    try {
      setIsSubmitting(true);
      let targetWarehouseId = operator.warehouse_id;

      // 1. Depo Kontrolü ve Düzeltme
      if (targetWarehouseId) {
        // Mevcut deponun company_id'sini kontrol et
        // Eğer önceki hatalı koddan dolayı yanlış company_id varsa düzelt
        const { data: currentWh } = await supabase
            .from('warehouses')
            .select('company_id')
            .eq('id', targetWarehouseId)
            .single();
        
        if (currentWh && currentWh.company_id !== companyId) {
            console.log('Depo sahipliği düzeltiliyor...', { old: currentWh.company_id, new: companyId });
            const { error: fixError } = await supabase
                .from('warehouses')
                .update({ company_id: companyId })
                .eq('id', targetWarehouseId);
            
            if (fixError) console.error('Depo düzeltme hatası:', fixError);
        }
      } else {
        // Depo yoksa yeni oluştur
        console.log('Yeni operatör deposu oluşturuluyor...');
        const { data: newWh, error: whError } = await supabase
          .from('warehouses')
          .insert({
            name: `${operator.full_name} Deposu`,
            warehouse_type: 'operator',
            company_id: companyId, // DOĞRU ID
            operator_id: operator.id,
            location: 'Mobil',
            is_active: true
          })
          .select('id')
          .single();
        
        if (whError) throw new Error(`Depo oluşturulamadı: ${whError.message}`);
        targetWarehouseId = newWh.id;
        
        setOperators(prev => prev.map(op => 
          op.id === operator.id ? { ...op, warehouse_id: newWh.id } : op
        ));
      }

      // 2. Transfer Oluştur (Pending)
      const { data: transferData, error: insertError } = await supabase
        .from('warehouse_transfers')
        .insert({
          from_warehouse_id: mainWarehouseId,
          to_warehouse_id: targetWarehouseId,
          product_id: selectedProduct,
          quantity: qty,
          status: 'pending',
          notes: notes || null,
          requested_by: user?.id,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // 3. Transferi Onayla
      const { error: updateError } = await supabase
        .from('warehouse_transfers')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', transferData.id);

      if (updateError) throw updateError;

      Alert.alert('Başarılı', 'Transfer oluşturuldu ve stoklar güncellendi');
      setModalVisible(false);
      resetForm();
      
      // Listeyi hemen güncelle
      if (mainWarehouseId) {
        await loadTransfers(mainWarehouseId);
      }
    } catch (error: any) {
      console.error('Create transfer error:', error);
      if (error.message?.includes('yeterli stok')) {
        Alert.alert('Stok Yetersiz', 'Ana depoda yeterli stok bulunmuyor');
      } else {
        Alert.alert('Hata', error.message || 'Transfer oluşturulamadı');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (transfer: Transfer) => {
    try {
      const { error } = await supabase
        .from('warehouse_transfers')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', transfer.id);

      if (error) throw error;

      Alert.alert('Başarılı', 'Transfer onaylandı');
      loadTransfers(mainWarehouseId);
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const handleReject = async (transfer: Transfer) => {
    Alert.alert(
      'Transfer Reddet',
      'Bu transferi reddetmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Reddet',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('warehouse_transfers')
                .update({
                  status: 'rejected',
                  approved_by: user?.id,
                  approved_at: new Date().toISOString(),
                })
                .eq('id', transfer.id);

              if (error) throw error;
              loadTransfers(mainWarehouseId);
            } catch (error: any) {
              Alert.alert('Hata', error.message);
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setSelectedOperator('');
    setSelectedProduct('');
    setQuantity('');
    setNotes('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#ff9800';
      case 'approved':
      case 'completed': return '#4caf50';
      case 'rejected': return '#ef4444';
      default: return '#999';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Beklemede';
      case 'approved': return 'Onaylandı';
      case 'completed': return 'Tamamlandı';
      case 'rejected': return 'Reddedildi';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={18} color="#fff" />;
      case 'approved':
      case 'completed': return <CheckCircle size={18} color="#fff" />;
      case 'rejected': return <XCircle size={18} color="#fff" />;
      default: return <Clock size={18} color="#fff" />;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transfer Yönetimi</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4caf50" />
          <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
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
        <Text style={styles.headerTitle}>Transfer Yönetimi</Text>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.addButton}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {transfers.map(transfer => (
          <View key={transfer.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={styles.productName}>{transfer.product?.name}</Text>
                {transfer.requester_name && (
                  <Text style={styles.requesterText}>
                    Talep: {transfer.requester_name}
                  </Text>
                )}
                <Text style={styles.dateText}>
                  {new Date(transfer.created_at).toLocaleDateString('tr-TR')}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(transfer.status) },
                ]}
              >
                {getStatusIcon(transfer.status)}
                <Text style={styles.statusText}>{getStatusText(transfer.status)}</Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Miktar:</Text>
                <Text style={styles.detailValue}>
                  {transfer.quantity} {transfer.product?.unit}
                </Text>
              </View>
              {transfer.notes && (
                <View style={styles.notesBox}>
                  <Text style={styles.detailLabel}>Not:</Text>
                  <Text style={styles.notesText}>{transfer.notes}</Text>
                </View>
              )}
            </View>

            {transfer.status === 'pending' && (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  onPress={() => handleApprove(transfer)}
                >
                  <CheckCircle size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>Onayla</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => handleReject(transfer)}
                >
                  <XCircle size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>Reddet</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}

        {transfers.length === 0 && (
          <View style={styles.emptyState}>
            <Package size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>Transfer Yok</Text>
            <Text style={styles.emptySubtitle}>
              + butonuna basarak yeni transfer oluşturabilirsiniz.
            </Text>
            <TouchableOpacity 
                style={styles.refreshButton}
                onPress={onRefresh}
            >
                <RefreshCw size={20} color="#4caf50" />
                <Text style={styles.refreshButtonText}>Listeyi Yenile</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => !isSubmitting && setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Transfer</Text>
              <TouchableOpacity onPress={() => !isSubmitting && setModalVisible(false)}>
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Operatör</Text>
              <ScrollView style={styles.selectBox} nestedScrollEnabled>
                {operators.map(op => (
                  <TouchableOpacity
                    key={op.id}
                    style={[
                      styles.selectItem,
                      selectedOperator === op.id && styles.selectItemActive,
                    ]}
                    onPress={() => setSelectedOperator(op.id)}
                    disabled={isSubmitting}
                  >
                    <User
                      size={16}
                      color={selectedOperator === op.id ? '#4caf50' : '#999'}
                    />
                    <Text
                      style={[
                        styles.selectItemText,
                        selectedOperator === op.id && styles.selectItemTextActive,
                      ]}
                    >
                      {op.full_name}
                    </Text>
                  </TouchableOpacity>
                ))}
                {operators.length === 0 && (
                  <Text style={styles.emptyText}>Operatör bulunamadı</Text>
                )}
              </ScrollView>

              <Text style={styles.label}>Ürün</Text>
              <ScrollView style={styles.selectBox} nestedScrollEnabled>
                {products.map(product => (
                  <TouchableOpacity
                    key={product.id}
                    style={[
                      styles.selectItem,
                      selectedProduct === product.id && styles.selectItemActive,
                    ]}
                    onPress={() => setSelectedProduct(product.id)}
                    disabled={isSubmitting}
                  >
                    <Package
                      size={16}
                      color={selectedProduct === product.id ? '#4caf50' : '#999'}
                    />
                    <Text
                      style={[
                        styles.selectItemText,
                        selectedProduct === product.id && styles.selectItemTextActive,
                      ]}
                    >
                      {product.name} ({product.unit})
                    </Text>
                  </TouchableOpacity>
                ))}
                {products.length === 0 && (
                  <Text style={styles.emptyText}>Ürün bulunamadı</Text>
                )}
              </ScrollView>

              <Text style={styles.label}>Miktar</Text>
              <TextInput
                style={styles.input}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="Örn: 10"
                keyboardType="decimal-pad"
                editable={!isSubmitting}
              />

              <Text style={styles.label}>Not (Opsiyonel)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Transfer hakkında not"
                multiline
                numberOfLines={3}
                editable={!isSubmitting}
              />

              <TouchableOpacity
                style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                onPress={handleCreateTransfer}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Transfer Oluştur</Text>
                )}
              </TouchableOpacity>
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
    paddingBottom: 12,
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
  headerRight: {
    width: 40,
  },
  addButton: {
    width: 40,
    alignItems: 'center',
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
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  requesterText: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  cardBody: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  notesBox: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  notesText: {
    fontSize: 13,
    color: '#333',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  approveBtn: {
    backgroundColor: '#4caf50',
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    gap: 16
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#4caf50',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  selectBox: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    maxHeight: 150,
    backgroundColor: '#fff',
  },
  selectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 8,
  },
  selectItemActive: {
    backgroundColor: '#e8f5e9',
  },
  selectItemText: {
    fontSize: 14,
    color: '#333',
  },
  selectItemTextActive: {
    color: '#4caf50',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#4caf50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  submitBtnDisabled: {
    opacity: 0.7,
    backgroundColor: '#a5d6a7',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    padding: 16,
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
  },
});