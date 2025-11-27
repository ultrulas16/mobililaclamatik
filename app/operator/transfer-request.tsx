import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Package, Clock, CircleCheck as CheckCircle, Circle as XCircle } from 'lucide-react-native';
import { PaidProduct } from '@/types/visits';

interface Transfer {
  id: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  product_id: string;
  quantity: number;
  transfer_date: string;
  status: string;
  notes: string;
  product?: PaidProduct;
  from_warehouse?: { name: string };
  to_warehouse?: { name: string };
}

export default function TransferRequest() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [products, setProducts] = useState<PaidProduct[]>([]);
  const [operatorWarehouse, setOperatorWarehouse] = useState<any>(null);
  const [mainWarehouse, setMainWarehouse] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [operatorData, setOperatorData] = useState<any>(null);

  useEffect(() => {
    if (profile?.id && !authLoading) {
      loadData();
    }
  }, [profile?.id, authLoading]);

  const loadData = async () => {
    try {
      setLoading(true);

      if (!profile?.id) {
        console.error('Profile not loaded yet!');
        Alert.alert('Hata', 'Profil yükleniyor, lütfen bekleyin...');
        setLoading(false);
        return;
      }

      console.log('=== TRANSFER REQUEST DEBUG START ===');
      console.log('Auth User ID:', user?.id);
      console.log('Profile ID:', profile?.id);
      console.log('Profile Role:', profile?.role);

      // Operatör bilgilerini çek
      const { data: operator, error: opError } = await supabase
        .from('operators')
        .select('id, company_id')
        .eq('profile_id', profile?.id)
        .maybeSingle();

      console.log('Operator query result:', { operator, opError });

      if (opError) {
        console.error('Operator query error:', opError);
        throw opError;
      }
      
      if (!operator) {
        console.error('NO OPERATOR DATA FOUND');
        Alert.alert('Hata', 'Operatör bilgisi bulunamadı');
        setLoading(false);
        return;
      }

      console.log('Found operator:', operator);
      setOperatorData(operator);

      // Operatör deposunu çek
      const { data: opWarehouse, error: opWarehouseError } = await supabase
        .from('warehouses')
        .select('*')
        .eq('operator_id', operator.id)
        .maybeSingle();

      if (opWarehouseError) {
        console.error('Operator warehouse error:', opWarehouseError);
        throw opWarehouseError;
      }
      setOperatorWarehouse(opWarehouse);
      console.log('Operator warehouse:', opWarehouse);

      // Ana depoyu çek
      const { data: mainWh, error: mainWhError } = await supabase
        .from('warehouses')
        .select('*')
        .eq('company_id', operator.company_id)
        .eq('warehouse_type', 'main')
        .maybeSingle();

      if (mainWhError) {
        console.error('Main warehouse error:', mainWhError);
        throw mainWhError;
      }
      setMainWarehouse(mainWh);
      console.log('Main warehouse:', mainWh);

      // Transferleri çek
      if (opWarehouse) {
        const { data: transfersData, error: transfersError } = await supabase
          .from('warehouse_transfers')
          .select(`
            *,
            product:company_materials(*),
            from_warehouse:warehouses!from_warehouse_id(name),
            to_warehouse:warehouses!to_warehouse_id(name)
          `)
          .eq('to_warehouse_id', opWarehouse.id)
          .order('created_at', { ascending: false });

        if (transfersError) {
          console.error('Transfers error:', transfersError);
          throw transfersError;
        }
        setTransfers(transfersData || []);
        console.log('Transfers loaded:', transfersData?.length || 0);
      }

      // Ürünleri çek
      await loadProducts(operator.company_id);

    } catch (error: any) {
      console.error('LoadData error:', error);
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async (companyId: string) => {
    try {
      console.log('=== LOADING PRODUCTS ===');
      console.log('Company ID:', companyId);

      // Auth durumunu kontrol et
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      console.log('Current auth user:', currentUser?.id);
      if (authError) {
        console.error('Auth error:', authError);
        throw authError;
      }

      // Ürünleri çek
      const { data: productsData, error: productsError } = await supabase
        .from('company_materials')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');

      console.log('Products query result:', {
        count: productsData?.length || 0,
        error: productsError,
        data: productsData
      });

      if (productsError) {
        console.error('Products error details:', JSON.stringify(productsError, null, 2));
        
        // RLS hatası kontrolü
        if (productsError.code === 'PGRST301' || productsError.message?.includes('policy')) {
          Alert.alert(
            'Yetki Hatası', 
            'Ürünleri görüntüleme yetkiniz yok. Lütfen sistem yöneticinizle iletişime geçin.'
          );
        }
        throw productsError;
      }

      console.log('Products loaded successfully:', productsData?.length || 0);
      setProducts(productsData || []);
      
      return productsData || [];
    } catch (error: any) {
      console.error('LoadProducts error:', error);
      throw error;
    }
  };

  const handleRequestTransfer = async () => {
    console.log('=== HANDLE REQUEST TRANSFER ===');
    console.log('Selected product:', selectedProduct);
    console.log('Quantity:', quantity);
    console.log('Main warehouse:', mainWarehouse);
    console.log('Operator warehouse:', operatorWarehouse);
    console.log('Profile:', profile);

    if (!selectedProduct || !quantity) {
      console.error('Missing product or quantity');
      Alert.alert('Hata', 'Lütfen ürün ve miktar seçin');
      return;
    }

    if (!mainWarehouse || !operatorWarehouse) {
      console.error('Missing warehouses:', { mainWarehouse, operatorWarehouse });
      Alert.alert('Hata', 'Depo bilgileri bulunamadı');
      return;
    }

    try {
      const qty = parseFloat(quantity);
      if (isNaN(qty) || qty <= 0) {
        console.error('Invalid quantity:', quantity);
        Alert.alert('Hata', 'Geçerli bir miktar girin');
        return;
      }

      const transferData = {
        from_warehouse_id: mainWarehouse.id,
        to_warehouse_id: operatorWarehouse.id,
        product_id: selectedProduct,
        quantity: qty,
        status: 'pending',
        notes,
        requested_by: profile?.id,
      };

      console.log('Inserting transfer:', transferData);

      const { data, error } = await supabase
        .from('warehouse_transfers')
        .insert([transferData])
        .select();

      console.log('Insert result:', { data, error });

      if (error) {
        console.error('Insert error:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('Transfer created successfully:', data);
      Alert.alert('Başarılı', 'Transfer talebi oluşturuldu');
      setModalVisible(false);
      resetForm();
      await loadData();
    } catch (error: any) {
      console.error('Transfer request error:', error);
      Alert.alert('Hata', error.message);
    }
  };

  const resetForm = () => {
    setSelectedProduct('');
    setQuantity('');
    setNotes('');
  };

  const handleOpenModal = async () => {
    console.log('=== OPENING MODAL ===');
    console.log('Current products count:', products.length);
    
    // Ürünler boşsa veya eskiyse yeniden yükle
    if (products.length === 0 && operatorData?.company_id) {
      console.log('Products empty, reloading...');
      try {
        await loadProducts(operatorData.company_id);
        console.log('Products reloaded:', products.length);
      } catch (error) {
        console.error('Error reloading products:', error);
      }
    }
    
    setModalVisible(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={20} color="#ff9800" />;
      case 'approved':
      case 'completed':
        return <CheckCircle size={20} color="#4caf50" />;
      case 'rejected':
        return <XCircle size={20} color="#ef4444" />;
      default:
        return <Clock size={20} color="#999" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Beklemede';
      case 'approved':
        return 'Onaylandı';
      case 'completed':
        return 'Tamamlandı';
      case 'rejected':
        return 'Reddedildi';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#ff9800';
      case 'approved':
      case 'completed':
        return '#4caf50';
      case 'rejected':
        return '#ef4444';
      default:
        return '#999';
    }
  };

  if (loading || authLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Profil yükleniyor...</Text>
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
        <Text style={styles.headerTitle}>Transfer Talepleri</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleOpenModal}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {transfers.map(transfer => (
          <View key={transfer.id} style={styles.transferCard}>
            <View style={styles.transferHeader}>
              <View style={styles.transferInfo}>
                <Text style={styles.productName}>{transfer.product?.name}</Text>
                <Text style={styles.transferDate}>
                  {new Date(transfer.transfer_date).toLocaleDateString('tr-TR')}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transfer.status) }]}>
                {getStatusIcon(transfer.status)}
                <Text style={styles.statusText}>{getStatusText(transfer.status)}</Text>
              </View>
            </View>

            <View style={styles.transferDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Miktar:</Text>
                <Text style={styles.detailValue}>
                  {transfer.quantity} {transfer.product?.unit}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Kaynak:</Text>
                <Text style={styles.detailValue}>{transfer.from_warehouse?.name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Hedef:</Text>
                <Text style={styles.detailValue}>{transfer.to_warehouse?.name}</Text>
              </View>
              {transfer.notes && (
                <View style={styles.notesContainer}>
                  <Text style={styles.detailLabel}>Not:</Text>
                  <Text style={styles.notesText}>{transfer.notes}</Text>
                </View>
              )}
            </View>
          </View>
        ))}

        {transfers.length === 0 && (
          <View style={styles.emptyState}>
            <Package size={48} color="#ccc" />
            <Text style={styles.emptyText}>Henüz transfer talebi yok</Text>
            <Text style={styles.emptySubtext}>
              + butonuna tıklayarak talep oluşturun
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Transfer Talebi</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Ürün ({products.length} malzeme)</Text>
              <View style={styles.pickerContainer}>
                {products.length === 0 ? (
                  <View style={{ padding: 16, alignItems: 'center', backgroundColor: '#fff3cd', borderRadius: 8, marginBottom: 12 }}>
                    <Text style={{ color: '#856404', fontSize: 14, textAlign: 'center' }}>
                      ⚠️ Hiç malzeme bulunamadı.
                      {'\n'}
                      Lütfen firma tanımlamalarından malzeme ekleyin veya
                      {'\n'}
                      yöneticinizle iletişime geçin.
                    </Text>
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {products.map(product => (
                      <TouchableOpacity
                        key={product.id}
                        style={[
                          styles.productChip,
                          selectedProduct === product.id && styles.productChipActive
                        ]}
                        onPress={() => setSelectedProduct(product.id)}
                      >
                        <Text style={[
                          styles.productChipText,
                          selectedProduct === product.id && styles.productChipTextActive
                        ]}>
                          {product.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              <Text style={styles.inputLabel}>Miktar</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
              />

              <Text style={styles.inputLabel}>Not (Opsiyonel)</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Transfer ile ilgili notlar..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!selectedProduct || !quantity) && styles.submitButtonDisabled
                ]}
                onPress={handleRequestTransfer}
                disabled={!selectedProduct || !quantity}
              >
                <Text style={styles.submitButtonText}>Talep Oluştur</Text>
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
  addButton: {
    width: 40,
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  transferCard: {
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
  transferHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transferInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  transferDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  transferDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
  },
  detailValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  notesContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  notesText: {
    fontSize: 13,
    color: '#333',
    marginTop: 4,
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
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
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
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#999',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    marginBottom: 8,
  },
  productChip: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  productChipActive: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  productChipText: {
    fontSize: 14,
    color: '#333',
  },
  productChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#4caf50',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});