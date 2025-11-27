import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Package, Building, Search, X, CreditCard as Edit, Trash, Warehouse } from 'lucide-react-native';

interface Company {
  id: string;
  name: string;
  owner_id: string;
}

interface AdminWarehouse {
  id: string;
  company_id: string;
  name: string;
  location: string | null;
  warehouse_type: string;
  is_active: boolean;
  company?: Company;
}

interface Material {
  id: string;
  name: string;
  unit: string | null;
  price: number | null;
}

interface WarehouseItem {
  id: string;
  warehouse_id: string;
  product_id: string;
  quantity: number;
  min_quantity: number;
  max_quantity: number;
  unit_cost: number;
  total_value: number;
  material?: Material;
}

export default function AdminWarehouses() {
  const router = useRouter();
  const { profile } = useAuth();
  const { t } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<AdminWarehouse[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<AdminWarehouse | null>(null);
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  
  // Form states
  const [selectedCompany, setSelectedCompany] = useState('');
  const [warehouseName, setWarehouseName] = useState('');
  const [location, setLocation] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [minQuantity, setMinQuantity] = useState('10');
  const [maxQuantity, setMaxQuantity] = useState('1000');
  const [unitCost, setUnitCost] = useState('');

  useEffect(() => {
    if (profile?.role === 'admin') {
      loadData();
    }
  }, [profile]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadWarehouses(),
        loadCompanies(),
      ]);
    } catch (error: any) {
      Alert.alert(t('error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadWarehouses = async () => {
    const { data, error } = await supabase
      .from('admin_warehouses')
      .select(`
        *,
        company:companies(id, name, owner_id)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setWarehouses(data || []);
  };

  const loadCompanies = async () => {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, owner_id')
      .order('name');

    if (error) throw error;
    setCompanies(data || []);
  };

  const loadWarehouseItems = async (warehouseId: string, companyId: string) => {
    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from('admin_warehouse_items')
        .select(`
          *,
          material:company_materials(id, name, unit, price)
        `)
        .eq('warehouse_id', warehouseId)
        .order('created_at', { ascending: false });

      if (itemsError) throw itemsError;
      setWarehouseItems(itemsData || []);

      // Load available materials for this company
      const { data: materialsData, error: materialsError } = await supabase
        .from('company_materials')
        .select('id, name, unit, price')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');

      if (materialsError) throw materialsError;
      setMaterials(materialsData || []);
    } catch (error: any) {
      Alert.alert(t('error'), error.message);
    }
  };

  const handleCreateWarehouse = async () => {
    if (!selectedCompany || !warehouseName.trim()) {
      Alert.alert(t('error'), 'Lütfen şirket ve depo adı seçin');
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_warehouses')
        .insert([{
          company_id: selectedCompany,
          name: warehouseName.trim(),
          location: location.trim() || 'Merkez Ofis',
          warehouse_type: 'company_main',
          created_by: profile?.id,
        }]);

      if (error) throw error;

      Alert.alert(t('success'), 'Depo oluşturuldu');
      resetWarehouseForm();
      loadWarehouses();
    } catch (error: any) {
      Alert.alert(t('error'), error.message);
    }
  };

  const handleAddItem = async () => {
    if (!selectedProduct || !quantity || !unitCost) {
      Alert.alert(t('error'), 'Lütfen tüm alanları doldurun');
      return;
    }

    if (!selectedWarehouse) return;

    try {
      const qty = parseFloat(quantity);
      const minQty = parseFloat(minQuantity);
      const maxQty = parseFloat(maxQuantity);
      const cost = parseFloat(unitCost);

      if (isNaN(qty) || qty < 0 || isNaN(cost) || cost < 0) {
        Alert.alert(t('error'), 'Geçerli değerler girin');
        return;
      }

      const { error } = await supabase
        .from('admin_warehouse_items')
        .insert([{
          warehouse_id: selectedWarehouse.id,
          product_id: selectedProduct,
          quantity: qty,
          min_quantity: minQty,
          max_quantity: maxQty,
          unit_cost: cost,
          last_restocked_at: new Date().toISOString(),
        }]);

      if (error) throw error;

      Alert.alert(t('success'), 'Ürün eklendi');
      resetItemForm();
      loadWarehouseItems(selectedWarehouse.id, selectedWarehouse.company_id);
    } catch (error: any) {
      Alert.alert(t('error'), error.message);
    }
  };

  const handleDeleteWarehouse = async (warehouseId: string) => {
    Alert.alert(
      'Depo Sil',
      'Bu depoyu silmek istediğinize emin misiniz? Tüm stok bilgileri silinecek.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('admin_warehouses')
                .delete()
                .eq('id', warehouseId);

              if (error) throw error;
              Alert.alert(t('success'), 'Depo silindi');
              loadWarehouses();
            } catch (error: any) {
              Alert.alert(t('error'), error.message);
            }
          },
        },
      ]
    );
  };

  const handleDeleteItem = async (itemId: string) => {
    Alert.alert(
      'Ürün Sil',
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
                .eq('id', itemId);

              if (error) throw error;
              Alert.alert(t('success'), 'Ürün silindi');
              if (selectedWarehouse) {
                loadWarehouseItems(selectedWarehouse.id, selectedWarehouse.company_id);
              }
            } catch (error: any) {
              Alert.alert(t('error'), error.message);
            }
          },
        },
      ]
    );
  };

  const resetWarehouseForm = () => {
    setShowWarehouseModal(false);
    setSelectedCompany('');
    setWarehouseName('');
    setLocation('');
  };

  const resetItemForm = () => {
    setShowItemModal(false);
    setSelectedProduct('');
    setQuantity('');
    setMinQuantity('10');
    setMaxQuantity('1000');
    setUnitCost('');
  };

  const filteredWarehouses = warehouses.filter(warehouse =>
    warehouse.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    warehouse.company?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (profile?.role !== 'admin') {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Bu sayfaya erişim yetkiniz yok</Text>
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
        <Text style={styles.headerTitle}>Depo Yönetimi</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowWarehouseModal(true)}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Depo veya şirket ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Warehouse size={24} color="#4caf50" />
          <Text style={styles.statValue}>{warehouses.length}</Text>
          <Text style={styles.statLabel}>Toplam Depo</Text>
        </View>
        <View style={styles.statCard}>
          <Building size={24} color="#2196f3" />
          <Text style={styles.statValue}>{companies.length}</Text>
          <Text style={styles.statLabel}>Şirket Sayısı</Text>
        </View>
      </View>

      {/* Warehouses List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredWarehouses.length === 0 ? (
          <View style={styles.emptyState}>
            <Warehouse size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'Depo bulunamadı' : 'Henüz depo yok'}
            </Text>
            {!searchQuery && (
              <Text style={styles.emptySubtext}>
                + butonuna tıklayarak yeni depo oluşturun
              </Text>
            )}
          </View>
        ) : (
          filteredWarehouses.map(warehouse => (
            <TouchableOpacity
              key={warehouse.id}
              style={styles.warehouseCard}
              onPress={() => {
                setSelectedWarehouse(warehouse);
                loadWarehouseItems(warehouse.id, warehouse.company_id);
              }}
            >
              <View style={styles.warehouseHeader}>
                <View style={styles.warehouseInfo}>
                  <Text style={styles.warehouseName}>{warehouse.name}</Text>
                  <Text style={styles.companyName}>{warehouse.company?.name}</Text>
                  <Text style={styles.warehouseLocation}>{warehouse.location}</Text>
                </View>
                <View style={styles.warehouseActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteWarehouse(warehouse.id)}
                  >
                    <Trash size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={[styles.statusBadge, warehouse.is_active ? styles.activeBadge : styles.inactiveBadge]}>
                <Text style={[styles.statusText, warehouse.is_active ? styles.activeText : styles.inactiveText]}>
                  {warehouse.is_active ? 'Aktif' : 'Pasif'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Create Warehouse Modal */}
      <Modal visible={showWarehouseModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Depo Oluştur</Text>
              <TouchableOpacity onPress={resetWarehouseForm}>
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Şirket Seçin</Text>
              <View style={styles.companyPicker}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {companies.map(company => (
                    <TouchableOpacity
                      key={company.id}
                      style={[
                        styles.companyChip,
                        selectedCompany === company.id && styles.companyChipActive
                      ]}
                      onPress={() => setSelectedCompany(company.id)}
                    >
                      <Text style={[
                        styles.companyChipText,
                        selectedCompany === company.id && styles.companyChipTextActive
                      ]}>
                        {company.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.inputLabel}>Depo Adı</Text>
              <TextInput
                style={styles.input}
                placeholder="Ana Depo"
                value={warehouseName}
                onChangeText={setWarehouseName}
              />

              <Text style={styles.inputLabel}>Konum</Text>
              <TextInput
                style={styles.input}
                placeholder="Merkez Ofis"
                value={location}
                onChangeText={setLocation}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={resetWarehouseForm}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleCreateWarehouse}
              >
                <Text style={styles.saveButtonText}>Oluştur</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Warehouse Items Modal */}
      <Modal visible={!!selectedWarehouse} animationType="slide" transparent={false}>
        <View style={styles.fullModalContainer}>
          <View style={styles.fullModalHeader}>
            <TouchableOpacity onPress={() => setSelectedWarehouse(null)} style={styles.backButton}>
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.fullModalHeaderInfo}>
              <Text style={styles.fullModalTitle}>{selectedWarehouse?.name}</Text>
              <Text style={styles.fullModalSubtitle}>{selectedWarehouse?.company?.name}</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowItemModal(true)}
            >
              <Plus size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.fullModalContent}>
            {warehouseItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Package size={48} color="#ccc" />
                <Text style={styles.emptyText}>Depoda ürün yok</Text>
                <Text style={styles.emptySubtext}>
                  + butonuna tıklayarak ürün ekleyin
                </Text>
              </View>
            ) : (
              warehouseItems.map(item => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.material?.name}</Text>
                      <Text style={styles.itemUnit}>{item.material?.unit}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteItem(item.id)}
                    >
                      <Trash size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.itemDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Mevcut:</Text>
                      <Text style={[
                        styles.detailValue,
                        item.quantity <= item.min_quantity && styles.lowStock
                      ]}>
                        {item.quantity}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Min:</Text>
                      <Text style={styles.detailValue}>{item.min_quantity}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Max:</Text>
                      <Text style={styles.detailValue}>{item.max_quantity}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Birim Maliyet:</Text>
                      <Text style={styles.detailValue}>₺{item.unit_cost.toFixed(2)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Toplam Değer:</Text>
                      <Text style={styles.totalValue}>₺{item.total_value.toFixed(2)}</Text>
                    </View>
                  </View>

                  {item.quantity <= item.min_quantity && (
                    <View style={styles.warningBanner}>
                      <Text style={styles.warningText}>⚠️ Stok seviyesi düşük</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>

          {/* Add Item Modal */}
          <Modal visible={showItemModal} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Ürün Ekle</Text>
                  <TouchableOpacity onPress={resetItemForm}>
                    <X size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <Text style={styles.inputLabel}>Ürün</Text>
                  <View style={styles.productPicker}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {materials.map(material => (
                        <TouchableOpacity
                          key={material.id}
                          style={[
                            styles.productChip,
                            selectedProduct === material.id && styles.productChipActive
                          ]}
                          onPress={() => setSelectedProduct(material.id)}
                        >
                          <Text style={[
                            styles.productChipText,
                            selectedProduct === material.id && styles.productChipTextActive
                          ]}>
                            {material.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <Text style={styles.inputLabel}>Miktar</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    keyboardType="numeric"
                    value={quantity}
                    onChangeText={setQuantity}
                  />

                  <Text style={styles.inputLabel}>Minimum Stok</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10"
                    keyboardType="numeric"
                    value={minQuantity}
                    onChangeText={setMinQuantity}
                  />

                  <Text style={styles.inputLabel}>Maksimum Stok</Text>
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
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={resetItemForm}
                  >
                    <Text style={styles.cancelButtonText}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={handleAddItem}
                  >
                    <Text style={styles.saveButtonText}>Ekle</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
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
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  warehouseCard: {
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
  warehouseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  warehouseInfo: {
    flex: 1,
  },
  warehouseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  companyName: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '500',
    marginTop: 4,
  },
  warehouseLocation: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  warehouseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#e8f5e9',
  },
  inactiveBadge: {
    backgroundColor: '#ffebee',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeText: {
    color: '#4caf50',
  },
  inactiveText: {
    color: '#f44336',
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
    maxHeight: 400,
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
  companyPicker: {
    marginBottom: 8,
  },
  companyChip: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  companyChipActive: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  companyChipText: {
    fontSize: 14,
    color: '#333',
  },
  companyChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  productPicker: {
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
  fullModalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  fullModalHeader: {
    backgroundColor: '#4caf50',
    paddingTop: 44,
    paddingBottom: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fullModalHeaderInfo: {
    flex: 1,
    alignItems: 'center',
  },
  fullModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  fullModalSubtitle: {
    fontSize: 14,
    color: '#e8f5e9',
    marginTop: 2,
  },
  fullModalContent: {
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
  deleteButton: {
    padding: 8,
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
  totalValue: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: 'bold',
  },
  lowStock: {
    color: '#ef4444',
    fontWeight: 'bold',
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
});