import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Package, CreditCard as Edit, Trash, Search, X } from 'lucide-react-native';
import { PaidProduct } from '@/types/visits';

interface WarehouseItem {
  id: string;
  warehouse_id: string;
  product_id: string;
  quantity: number;
  min_quantity: number;
  max_quantity: number;
  unit_cost: number;
  product?: PaidProduct;
}

interface Warehouse {
  id: string;
  name: string;
  warehouse_type: string;
  company_id: string;
  is_active: boolean;
  location?: string;
}

export default function CompanyWarehouse() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [products, setProducts] = useState<PaidProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<WarehouseItem | null>(null);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [minQuantity, setMinQuantity] = useState('10');
  const [maxQuantity, setMaxQuantity] = useState('1000');
  const [unitCost, setUnitCost] = useState('0');

  useEffect(() => {
    loadCompanyAndWarehouse();
  }, []);

  useEffect(() => {
    if (companyId) {
      loadProducts();
    }
  }, [companyId]);

  const loadCompanyAndWarehouse = async () => {
    try {
      setLoading(true);

      if (!user?.id) throw new Error('User not found');

      // Get company info - materials are stored with this company_id
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', user?.id)
        .maybeSingle();

      if (companyError) throw companyError;

      const actualCompanyId = companyData?.id || user.id;
      setCompanyId(actualCompanyId);

      let { data: warehouseData, error: warehouseError } = await supabase
        .from('admin_warehouses')
        .select('*')
        .eq('company_id', actualCompanyId)
        .eq('warehouse_type', 'company_main')
        .maybeSingle();

      if (warehouseError) throw warehouseError;

      if (!warehouseData) {
        const { data: newWarehouse, error: createError } = await supabase
          .from('admin_warehouses')
          .insert([{
            name: 'Şirket Ana Deposu',
            warehouse_type: 'company_main',
            company_id: actualCompanyId,
            location: 'Merkez',
            is_active: true,
            created_by: user?.id,
          }])
          .select()
          .single();

        if (createError) throw createError;
        warehouseData = newWarehouse;
      }

      setWarehouse(warehouseData);

      const { data: itemsData, error: itemsError } = await supabase
        .from('admin_warehouse_items')
        .select(`
          *,
          product:company_materials(*)
        `)
        .eq('warehouse_id', warehouseData.id)
        .order('product_id');

      if (itemsError) throw itemsError;
      setItems(itemsData || []);
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    if (!companyId) return;
    
    try {
      const { data, error } = await supabase
        .from('company_materials')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const handleAddOrUpdate = async () => {
    if (!selectedProduct || !quantity) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    if (!warehouse) return;

    try {
      const qty = parseFloat(quantity);
      const minQty = parseFloat(minQuantity);
      const maxQty = parseFloat(maxQuantity);
      const cost = parseFloat(unitCost);

      if (isNaN(qty) || qty < 0) {
        Alert.alert('Hata', 'Geçerli bir miktar girin');
        return;
      }

      if (editingItem) {
        const { error } = await supabase
          .from('admin_warehouse_items')
          .update({
            quantity: qty,
            min_quantity: minQty,
            max_quantity: maxQty,
            unit_cost: cost,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        Alert.alert('Başarılı', 'Ürün güncellendi');
      } else {
        const existingItem = items.find(item => item.product_id === selectedProduct);
        if (existingItem) {
          Alert.alert('Hata', 'Bu ürün zaten depoda mevcut');
          return;
        }

        const { error } = await supabase
          .from('admin_warehouse_items')
          .insert([{
            warehouse_id: warehouse.id,
            product_id: selectedProduct,
            quantity: qty,
            min_quantity: minQty,
            max_quantity: maxQty,
            unit_cost: cost,
          }]);

        if (error) throw error;
        Alert.alert('Başarılı', 'Ürün eklendi');
      }

      setModalVisible(false);
      resetForm();
      loadCompanyAndWarehouse();
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const handleEdit = (item: WarehouseItem) => {
    setEditingItem(item);
    setSelectedProduct(item.product_id);
    setQuantity(item.quantity.toString());
    setMinQuantity(item.min_quantity.toString());
    setMaxQuantity(item.max_quantity.toString());
    setUnitCost(item.unit_cost.toString());
    setModalVisible(true);
  };

  const handleDelete = (item: WarehouseItem) => {
    Alert.alert(
      'Ürünü Sil',
      'Bu ürünü depodan silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('admin_warehouse_items')
                .delete()
                .eq('id', item.id);

              if (error) throw error;
              Alert.alert('Başarılı', 'Ürün silindi');
              loadCompanyAndWarehouse();
            } catch (error: any) {
              Alert.alert('Hata', error.message);
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setEditingItem(null);
    setSelectedProduct('');
    setQuantity('');
    setMinQuantity('10');
    setMaxQuantity('1000');
    setUnitCost('0');
  };

  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    return item.product?.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalValue = items.reduce((sum, item) => {
    return sum + (item.quantity * (item.product?.price || 0));
  }, 0);

  const lowStockItems = items.filter(item => item.quantity <= item.min_quantity);

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
        <Text style={styles.headerTitle}>Ana Depo Yönetimi</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setModalVisible(true);
          }}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Package size={24} color="#4caf50" />
          <Text style={styles.statNumber}>{items.length}</Text>
          <Text style={styles.statLabel}>Toplam Ürün</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statCurrency}>₺</Text>
          <Text style={styles.statNumber}>{totalValue.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Toplam Değer</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statWarning}>⚠️</Text>
          <Text style={styles.statNumber}>{lowStockItems.length}</Text>
          <Text style={styles.statLabel}>Düşük Stok</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Ürün ara..."
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
        {filteredItems.map(item => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product?.name}</Text>
                <Text style={styles.itemUnit}>{item.product?.unit}</Text>
              </View>
              <View style={styles.itemActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEdit(item)}
                >
                  <Edit size={20} color="#2196f3" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(item)}
                >
                  <Trash size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.itemDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Mevcut Stok:</Text>
                <Text style={[
                  styles.detailValue,
                  item.quantity <= item.min_quantity && styles.lowStock
                ]}>
                  {item.quantity} {item.product?.unit}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Min. Stok:</Text>
                <Text style={styles.detailValue}>
                  {item.min_quantity} {item.product?.unit}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Birim Fiyat:</Text>
                <Text style={styles.detailValue}>
                  ₺{item.product?.price?.toFixed(2) || '0.00'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Toplam Değer:</Text>
                <Text style={styles.detailValueBold}>
                  ₺{(item.quantity * (item.product?.price || 0)).toFixed(2)}
                </Text>
              </View>
            </View>

            {item.quantity <= item.min_quantity && (
              <View style={styles.warningBanner}>
                <Text style={styles.warningText}>⚠️ Stok seviyesi düşük</Text>
              </View>
            )}
          </View>
        ))}

        {filteredItems.length === 0 && (
          <View style={styles.emptyState}>
            <Package size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'Ürün bulunamadı' : 'Depoda ürün yok'}
            </Text>
            {!searchQuery && (
              <Text style={styles.emptySubtext}>
                + butonuna tıklayarak ürün ekleyin
              </Text>
            )}
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
              <Text style={styles.modalTitle}>
                {editingItem ? 'Ürün Güncelle' : 'Ürün Ekle'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Ürün</Text>
              {products.length === 0 ? (
                <View style={styles.noProductsContainer}>
                  <Text style={styles.noProductsText}>
                    Henüz tanımlanmış malzeme yok.
                  </Text>
                  <TouchableOpacity
                    style={styles.goToDefinitionsButton}
                    onPress={() => {
                      setModalVisible(false);
                      router.push('/company/definitions');
                    }}
                  >
                    <Text style={styles.goToDefinitionsButtonText}>
                      Tanımlamalara Git
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.pickerContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {products.map(product => (
                      <TouchableOpacity
                        key={product.id}
                        style={[
                          styles.productChip,
                          selectedProduct === product.id && styles.productChipActive
                        ]}
                        onPress={() => setSelectedProduct(product.id)}
                        disabled={!!editingItem}
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
                </View>
              )}

              {products.length > 0 && (
                <>
                  <Text style={styles.inputLabel}>Miktar</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    keyboardType="numeric"
                    value={quantity}
                    onChangeText={setQuantity}
                  />

                  <Text style={styles.inputLabel}>Minimum Stok Seviyesi</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10"
                    keyboardType="numeric"
                    value={minQuantity}
                    onChangeText={setMinQuantity}
                  />

                  <Text style={styles.inputLabel}>Maksimum Stok Seviyesi</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1000"
                    keyboardType="numeric"
                    value={maxQuantity}
                    onChangeText={setMaxQuantity}
                  />

                  <Text style={styles.inputLabel}>Birim Maliyet (₺)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    keyboardType="numeric"
                    value={unitCost}
                    onChangeText={setUnitCost}
                  />

                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleAddOrUpdate}
                  >
                    <Text style={styles.submitButtonText}>
                      {editingItem ? 'Güncelle' : 'Ekle'}
                    </Text>
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
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
  statCurrency: {
    fontSize: 24,
    color: '#4caf50',
  },
  statWarning: {
    fontSize: 24,
  },
  statNumber: {
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
  content: {
    flex: 1,
    padding: 16,
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
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  itemUnit: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  itemDetails: {
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
  detailValueBold: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  lowStock: {
    color: '#ef4444',
  },
  warningBanner: {
    backgroundColor: '#fff3cd',
    padding: 8,
    borderRadius: 6,
    marginTop: 12,
  },
  warningText: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
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
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noProductsContainer: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  noProductsText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 12,
    textAlign: 'center',
  },
  goToDefinitionsButton: {
    backgroundColor: '#ff9800',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  goToDefinitionsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
