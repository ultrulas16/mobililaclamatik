import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Minus, Package, CreditCard as Edit, Trash, Search, X, ChevronDown } from 'lucide-react-native';
import { PaidProduct, WarehouseItem } from '@/types/visits';

interface WarehouseWithItems {
  id: string;
  operator_id: string;
  name: string;
  location: string | null;
  items: (WarehouseItem & {
    company_materials?: PaidProduct;
  })[];
}

export default function OperatorWarehouse() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [warehouse, setWarehouse] = useState<WarehouseWithItems | null>(null);
  const [availableProducts, setAvailableProducts] = useState<PaidProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [showProductPicker, setShowProductPicker] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      loadWarehouseData();
    }
  }, [profile?.id]);

  const loadWarehouseData = async () => {
    try {
      setLoading(true);

      console.log('=== WAREHOUSE DEBUG START ===');
      console.log('Current user:', user);
      console.log('Current profile:', profile);
      console.log('User ID:', user?.id);
      console.log('Profile ID:', profile?.id);

      if (!profile?.id) {
        console.error('Profile not loaded yet!');
        Alert.alert('Hata', 'Profil yükleniyor, lütfen bekleyin...');
        setLoading(false);
        return;
      }

      // Get operator ID
      const { data: operatorData, error: operatorError } = await supabase
        .from('operators')
        .select('id, company_id')
        .eq('profile_id', profile?.id)
        .maybeSingle();

      console.log('Operator query result:', { operatorData, operatorError });

      if (operatorError) throw operatorError;
      if (!operatorData) {
        console.error('NO OPERATOR DATA FOUND for profile:', profile?.id);
        Alert.alert('Hata', 'Operatör bilgisi bulunamadı. Lütfen yeniden giriş yapın.');
        return;
      }

      console.log('Found operator:', operatorData);

      // Get or create warehouse
      let { data: warehouseData, error: warehouseError } = await supabase
        .from('warehouses')
        .select('*')
        .eq('operator_id', operatorData.id)
        .maybeSingle();

      if (warehouseError && warehouseError.code !== 'PGRST116') throw warehouseError;

      // Create warehouse if doesn't exist
      if (!warehouseData) {
        const { data: newWarehouse, error: createError } = await supabase
          .from('warehouses')
          .insert([{
            operator_id: operatorData.id,
            name: 'Operatör Deposu',
            location: 'Operatör Aracı',
          }])
          .select()
          .single();

        if (createError) throw createError;
        warehouseData = newWarehouse;
      }

      // Get warehouse items with product details
      const { data: itemsData, error: itemsError } = await supabase
        .from('warehouse_items')
        .select(`
          *,
          company_materials:product_id(id, name, unit, price)
        `)
        .eq('warehouse_id', warehouseData.id)
        .order('updated_at', { ascending: false });

      if (itemsError) throw itemsError;

      setWarehouse({
        ...warehouseData,
        items: itemsData || [],
      });

      // Get available products from company
      console.log('Loading products for company:', operatorData.company_id);
      const { data: productsData, error: productsError } = await supabase
        .from('company_materials')
        .select('*')
        .eq('company_id', operatorData.company_id)
        .eq('is_active', true)
        .order('name');

      console.log('Products query result:', { productsData, productsError });
      if (productsError) {
        console.error('Error loading products:', productsError);
        throw productsError;
      }
      console.log('Setting available products:', productsData?.length || 0, 'products');
      setAvailableProducts(productsData || []);

    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async () => {
    if (!selectedProduct || !quantity || parseFloat(quantity) <= 0) {
      Alert.alert('Hata', 'Lütfen ürün ve miktar seçiniz');
      return;
    }

    try {
      const quantityNum = parseFloat(quantity);

      // Check if product already exists in warehouse
      const existingItem = warehouse?.items.find(item => item.product_id === selectedProduct);

      if (existingItem) {
        // Update existing item
        const { error } = await supabase
          .from('warehouse_items')
          .update({
            quantity: existingItem.quantity + quantityNum,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingItem.id);

        if (error) throw error;
      } else {
        // Insert new item
        const { error } = await supabase
          .from('warehouse_items')
          .insert([{
            warehouse_id: warehouse?.id,
            product_id: selectedProduct,
            quantity: quantityNum,
          }]);

        if (error) throw error;
      }

      Alert.alert('Başarılı', 'Stok eklendi');
      setShowAddModal(false);
      setSelectedProduct('');
      setQuantity('');
      loadWarehouseData();
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const handleUpdateStock = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 0) {
      Alert.alert('Hata', 'Miktar sıfırdan küçük olamaz');
      return;
    }

    try {
      const { error } = await supabase
        .from('warehouse_items')
        .update({
          quantity: newQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (error) throw error;

      loadWarehouseData();
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    Alert.alert(
      'Emin misiniz?',
      'Bu ürünü depodan silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('warehouse_items')
                .delete()
                .eq('id', itemId);

              if (error) throw error;

              Alert.alert('Başarılı', 'Ürün silindi');
              loadWarehouseData();
            } catch (error: any) {
              Alert.alert('Hata', error.message);
            }
          },
        },
      ]
    );
  };

  const filteredItems = warehouse?.items.filter(item =>
    item.company_materials?.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const totalItems = warehouse?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const totalValue = warehouse?.items.reduce((sum, item) =>
    sum + (item.quantity * (item.company_materials?.price || 0)), 0
  ) || 0;

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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Depom</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.headerButton}>
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Package size={24} color="#4caf50" />
          <Text style={styles.statValue}>{warehouse?.items.length || 0}</Text>
          <Text style={styles.statLabel}>Ürün Çeşidi</Text>
        </View>
        <View style={styles.statCard}>
          <Package size={24} color="#2196f3" />
          <Text style={styles.statValue}>{totalItems.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Toplam Stok</Text>
        </View>
        <View style={styles.statCard}>
          <Package size={24} color="#ff9800" />
          <Text style={styles.statValue}>{totalValue.toFixed(0)} ₺</Text>
          <Text style={styles.statLabel}>Toplam Değer</Text>
        </View>
      </View>

      {/* Search */}
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

      {/* Items List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'Ürün bulunamadı' : 'Henüz depoda ürün yok'}
            </Text>
            {!searchQuery && (
              <Text style={styles.emptySubtext}>
                Yeni ürün eklemek için + butonuna tıklayın
              </Text>
            )}
          </View>
        ) : (
          filteredItems.map(item => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.company_materials?.name}</Text>
                  <Text style={styles.itemUnit}>{item.company_materials?.unit}</Text>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setEditingItem(item.id);
                      setQuantity(item.quantity.toString());
                      setShowEditModal(true);
                    }}
                  >
                    <Edit size={18} color="#2196f3" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteItem(item.id)}
                  >
                    <Trash size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.itemDetails}>
                <View style={styles.itemDetailRow}>
                  <Text style={styles.itemDetailLabel}>Miktar:</Text>
                  <Text style={styles.itemDetailValue}>{item.quantity}</Text>
                </View>
                <View style={styles.itemDetailRow}>
                  <Text style={styles.itemDetailLabel}>Birim Fiyat:</Text>
                  <Text style={styles.itemDetailValue}>{item.company_materials?.price.toFixed(2)} ₺</Text>
                </View>
                <View style={styles.itemDetailRow}>
                  <Text style={styles.itemDetailLabel}>Toplam Değer:</Text>
                  <Text style={[styles.itemDetailValue, styles.totalValue]}>
                    {(item.quantity * (item.company_materials?.price || 0)).toFixed(2)} ₺
                  </Text>
                </View>
              </View>

              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleUpdateStock(item.id, item.quantity - 1)}
                >
                  <Minus size={18} color="#fff" />
                </TouchableOpacity>
                <View style={styles.quantityDisplay}>
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                </View>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleUpdateStock(item.id, item.quantity + 1)}
                >
                  <Plus size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Stock Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Stok Ekle</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Ürün Seçin ({availableProducts.length} ürün)</Text>
              {availableProducts.length === 0 ? (
                <View style={styles.emptyProductList}>
                  <Text style={styles.emptyProductText}>Hiç ürün bulunamadı</Text>
                  <Text style={styles.emptyProductSubtext}>
                    Lütfen firma tanımlamalarından ürün ekleyin
                  </Text>
                </View>
              ) : (
                <View>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowProductPicker(!showProductPicker)}
                  >
                    <Text style={[
                      styles.dropdownButtonText,
                      !selectedProduct && styles.dropdownPlaceholder
                    ]}>
                      {selectedProduct
                        ? availableProducts.find(p => p.id === selectedProduct)?.name
                        : 'Ürün seçiniz'}
                    </Text>
                    <ChevronDown size={20} color="#666" style={[
                      styles.dropdownIcon,
                      showProductPicker && styles.dropdownIconOpen
                    ]} />
                  </TouchableOpacity>

                  {showProductPicker && (
                    <View style={styles.dropdownList}>
                      <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                        {availableProducts.map(product => (
                          <TouchableOpacity
                            key={product.id}
                            style={[
                              styles.dropdownItem,
                              selectedProduct === product.id && styles.dropdownItemActive
                            ]}
                            onPress={() => {
                              setSelectedProduct(product.id);
                              setShowProductPicker(false);
                            }}
                          >
                            <View style={styles.dropdownItemContent}>
                              <Text style={[
                                styles.dropdownItemText,
                                selectedProduct === product.id && styles.dropdownItemTextActive
                              ]}>
                                {product.name}
                              </Text>
                              {product.unit && (
                                <Text style={styles.dropdownItemUnit}>
                                  {product.unit}
                                </Text>
                              )}
                            </View>
                            {selectedProduct === product.id && (
                              <Text style={styles.checkmark}>✓</Text>
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}

              <Text style={styles.inputLabel}>Miktar</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="0"
                value={quantity}
                onChangeText={setQuantity}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  setSelectedProduct('');
                  setQuantity('');
                  setShowProductPicker(false);
                }}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddStock}
              >
                <Text style={styles.saveButtonText}>Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Stock Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Stok Güncelle</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Yeni Miktar</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="0"
                value={quantity}
                onChangeText={setQuantity}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowEditModal(false);
                  setEditingItem(null);
                  setQuantity('');
                }}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => {
                  if (editingItem) {
                    handleUpdateStock(editingItem, parseFloat(quantity) || 0);
                    setShowEditModal(false);
                    setEditingItem(null);
                    setQuantity('');
                  }
                }}
              >
                <Text style={styles.saveButtonText}>Güncelle</Text>
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
    alignItems: 'flex-end',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
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
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
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
    color: '#666',
    marginTop: 4,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  itemDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginBottom: 12,
  },
  itemDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemDetailLabel: {
    fontSize: 14,
    color: '#666',
  },
  itemDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    color: '#4caf50',
    fontSize: 16,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  quantityButton: {
    backgroundColor: '#4caf50',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityDisplay: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dropdownButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: '#999',
  },
  dropdownIcon: {
    transform: [{ rotate: '0deg' }],
  },
  dropdownIconOpen: {
    transform: [{ rotate: '180deg' }],
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemActive: {
    backgroundColor: '#e8f5e9',
  },
  dropdownItemContent: {
    flex: 1,
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  dropdownItemTextActive: {
    color: '#4caf50',
    fontWeight: '600',
  },
  dropdownItemUnit: {
    fontSize: 12,
    color: '#999',
  },
  checkmark: {
    fontSize: 18,
    color: '#4caf50',
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
  emptyProductList: {
    padding: 20,
    alignItems: 'center',
  },
  emptyProductText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  emptyProductSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
