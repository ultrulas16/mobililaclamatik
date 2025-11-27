import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Package, Beaker, Wrench, Trash2, CreditCard as Edit2, DollarSign, Calendar, Bug } from 'lucide-react-native';

interface Material {
  id: string;
  name: string;
  description: string | null;
  unit: string | null;
  price: number | null;
  is_active: boolean;
}

interface BiocidalProduct {
  id: string;
  name: string;
  description: string | null;
  active_ingredient: string | null;
  concentration: string | null;
  unit: string | null;
  price: number | null;
  is_active: boolean;
}

interface Equipment {
  id: string;
  name: string;
  description: string | null;
  equipment_type: string | null;
  quantity: number;
  is_active: boolean;
}

interface VisitType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface TargetPest {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

type TabType = 'materials' | 'biocidal' | 'equipment' | 'visit_types' | 'target_pests';

export default function CompanyDefinitions() {
  const router = useRouter();
  const { profile } = useAuth();
  const { t } = useLanguage();
  
  const [activeTab, setActiveTab] = useState<TabType>('materials');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [biocidalProducts, setBiocidalProducts] = useState<BiocidalProduct[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [visitTypes, setVisitTypes] = useState<VisitType[]>([]);
  const [targetPests, setTargetPests] = useState<TargetPest[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [price, setPrice] = useState('');
  const [activeIngredient, setActiveIngredient] = useState('');
  const [concentration, setConcentration] = useState('');
  const [equipmentType, setEquipmentType] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [isActive, setIsActive] = useState(true);
  const [currency, setCurrency] = useState('usd');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      switch (activeTab) {
        case 'materials':
          await loadMaterials();
          break;
        case 'biocidal':
          await loadBiocidalProducts();
          break;
        case 'equipment':
          await loadEquipment();
          break;
        case 'visit_types':
          await loadVisitTypes();
          break;
        case 'target_pests':
          await loadTargetPests();
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadMaterials = async () => {
    const { data, error } = await supabase
      .from('company_materials')
      .select('*')
      .eq('company_id', profile?.company_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setMaterials(data || []);
  };

  const loadBiocidalProducts = async () => {
    const { data, error } = await supabase
      .from('company_biocidal_products')
      .select('*')
      .eq('company_id', profile?.company_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setBiocidalProducts(data || []);
  };

  const loadEquipment = async () => {
    const { data, error } = await supabase
      .from('company_equipment')
      .select('*')
      .eq('company_id', profile?.company_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setEquipment(data || []);
  };

  const loadVisitTypes = async () => {
    const { data, error } = await supabase
      .from('company_visit_types')
      .select('*')
      .eq('company_id', profile?.company_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setVisitTypes(data || []);
  };

  const loadTargetPests = async () => {
    const { data, error } = await supabase
      .from('company_target_pests')
      .select('*')
      .eq('company_id', profile?.company_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setTargetPests(data || []);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('error'), 'Name is required');
      return;
    }

    setLoading(true);
    try {
      if (editingItem) {
        await updateItem();
      } else {
        await createItem();
      }
      resetForm();
      await loadData();
    } catch (error: any) {
      Alert.alert(t('error'), error.message || 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  const createItem = async () => {
    const baseData = {
      company_id: profile?.company_id,
      name: name.trim(),
      description: description.trim() || null,
      is_active: isActive,
    };

    switch (activeTab) {
      case 'materials':
        await supabase.from('company_materials').insert({
          ...baseData,
          unit: unit.trim() || null,
          price: price ? parseFloat(price) : null,
          currency: currency,
        });
        break;
      case 'biocidal':
        await supabase.from('company_biocidal_products').insert({
          ...baseData,
          active_ingredient: activeIngredient.trim() || null,
          concentration: concentration.trim() || null,
          unit: unit.trim() || null,
        });
        break;
      case 'equipment':
        await supabase.from('company_equipment').insert({
          ...baseData,
          equipment_type: equipmentType.trim() || null,
          quantity: parseInt(quantity) || 1,
        });
        break;
      case 'visit_types':
        await supabase.from('company_visit_types').insert({
          ...baseData,
        });
        break;
      case 'target_pests':
        await supabase.from('company_target_pests').insert({
          ...baseData,
        });
        break;
    }
  };

  const updateItem = async () => {
    const baseData = {
      name: name.trim(),
      description: description.trim() || null,
      is_active: isActive,
    };

    switch (activeTab) {
      case 'materials':
        await supabase.from('company_materials').update({
          ...baseData,
          unit: unit.trim() || null,
          price: price ? parseFloat(price) : null,
          currency: currency,
        }).eq('id', editingItem.id);
        break;
      case 'biocidal':
        await supabase.from('company_biocidal_products').update({
          ...baseData,
          active_ingredient: activeIngredient.trim() || null,
          concentration: concentration.trim() || null,
          unit: unit.trim() || null,
        }).eq('id', editingItem.id);
        break;
      case 'equipment':
        await supabase.from('company_equipment').update({
          ...baseData,
          equipment_type: equipmentType.trim() || null,
          quantity: parseInt(quantity) || 1,
        }).eq('id', editingItem.id);
        break;
      case 'visit_types':
        await supabase.from('company_visit_types').update({
          ...baseData,
        }).eq('id', editingItem.id);
        break;
      case 'target_pests':
        await supabase.from('company_target_pests').update({
          ...baseData,
        }).eq('id', editingItem.id);
        break;
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      getDeleteTitle(),
      'Are you sure you want to delete this item?',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const tableName = getTableName();
              await supabase.from(tableName).delete().eq('id', id);
              await loadData();
            } catch (error: any) {
              Alert.alert(t('error'), error.message || 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const getDeleteTitle = () => {
    switch (activeTab) {
      case 'materials': return t('deleteMaterial');
      case 'biocidal': return t('deleteBiocidalProduct');
      case 'equipment': return t('deleteEquipment');
      case 'visit_types': return t('deleteVisitType');
      case 'target_pests': return t('deleteTargetPest');
    }
  };

  const startEdit = (item: any) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description || '');
    setUnit(item.unit || '');
    setPrice(item.price?.toString() || '');
    setCurrency(item.currency || 'usd');
    setActiveIngredient(item.active_ingredient || '');
    setConcentration(item.concentration || '');
    setEquipmentType(item.equipment_type || '');
    setQuantity(item.quantity?.toString() || '1');
    setIsActive(item.is_active ?? true);
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setName('');
    setDescription('');
    setUnit('');
    setPrice('');
    setCurrency('usd');
    setActiveIngredient('');
    setConcentration('');
    setEquipmentType('');
    setQuantity('1');
    setIsActive(true);
  };

  const getTableName = () => {
    switch (activeTab) {
      case 'materials': return 'company_materials';
      case 'biocidal': return 'company_biocidal_products';
      case 'equipment': return 'company_equipment';
      case 'visit_types': return 'company_visit_types';
      case 'target_pests': return 'company_target_pests';
    }
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case 'materials': return materials;
      case 'biocidal': return biocidalProducts;
      case 'equipment': return equipment;
      case 'visit_types': return visitTypes;
      case 'target_pests': return targetPests;
    }
  };

  const getTabIcon = (tab: TabType) => {
    switch (tab) {
      case 'materials': return <Package size={20} color={activeTab === tab ? '#4caf50' : '#666'} />;
      case 'biocidal': return <Beaker size={20} color={activeTab === tab ? '#4caf50' : '#666'} />;
      case 'equipment': return <Wrench size={20} color={activeTab === tab ? '#4caf50' : '#666'} />;
      case 'visit_types': return <Calendar size={20} color={activeTab === tab ? '#4caf50' : '#666'} />;
      case 'target_pests': return <Bug size={20} color={activeTab === tab ? '#4caf50' : '#666'} />;
    }
  };

  const getTabTitle = (tab: TabType) => {
    switch (tab) {
      case 'materials': return t('materials');
      case 'biocidal': return t('biocidalProducts');
      case 'equipment': return t('equipment');
      case 'visit_types': return t('visitTypes');
      case 'target_pests': return t('targetPests');
    }
  };

  const getCurrencySymbol = (currencyCode: string) => {
    const symbols: Record<string, string> = {
      usd: '$',
      eur: '€',
      try: '₺',
      azn: '₼',
      sar: '﷼',
      gbp: '£',
    };
    return symbols[currencyCode] || '$';
  };

  const getCurrencyName = (currencyCode: string) => {
    const names: Record<string, string> = {
      usd: 'USD',
      eur: 'EUR',
      try: 'TRY',
      azn: 'AZN',
      sar: 'SAR',
      gbp: 'GBP',
    };
    return names[currencyCode] || 'USD';
  };

  const renderFormFields = () => {
    return (
      <>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={getNamePlaceholder()}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={t('description')}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        {(activeTab === 'materials' || activeTab === 'biocidal') && (
          <>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={t('unit')}
                value={unit}
                onChangeText={setUnit}
              />
            </View>

            {activeTab === 'materials' && (
              <View style={styles.priceContainer}>
                <View style={styles.priceInputContainer}>
                  <DollarSign size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.priceInput}
                    placeholder={`${t('price')} (${getCurrencySymbol(currency)} - ${getCurrencyName(currency)})`}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.currencyContainer}>
                  <Text style={styles.currencyLabel}>{t('currency')}</Text>
                  <ScrollView horizontal style={styles.currencyPicker} showsHorizontalScrollIndicator={false}>
                    {[
                      { code: 'usd', name: t('usd') },
                      { code: 'eur', name: t('eur') },
                      { code: 'try', name: t('try') },
                      { code: 'azn', name: t('azn') },
                      { code: 'sar', name: t('sar') },
                      { code: 'gbp', name: t('gbp') },
                    ].map((curr) => (
                      <TouchableOpacity
                        key={curr.code}
                        style={[
                          styles.currencyOption,
                          currency === curr.code && styles.currencyOptionSelected,
                        ]}
                        onPress={() => setCurrency(curr.code)}
                      >
                        <Text
                          style={[
                            styles.currencyOptionText,
                            currency === curr.code && styles.currencyOptionTextSelected,
                          ]}
                        >
                          {curr.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}
          </>
        )}

        {activeTab === 'biocidal' && (
          <>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={t('activeIngredient')}
                value={activeIngredient}
                onChangeText={setActiveIngredient}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={t('concentration')}
                value={concentration}
                onChangeText={setConcentration}
              />
            </View>
          </>
        )}

        {activeTab === 'equipment' && (
          <>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={t('equipmentType')}
                value={equipmentType}
                onChangeText={setEquipmentType}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={t('quantity')}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />
            </View>
          </>
        )}

        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>{t('active')}</Text>
          <TouchableOpacity
            style={[styles.switch, isActive && styles.switchActive]}
            onPress={() => setIsActive(!isActive)}
          >
            <View style={[styles.switchThumb, isActive && styles.switchThumbActive]} />
          </TouchableOpacity>
        </View>
      </>
    );
  };

  const getNamePlaceholder = () => {
    switch (activeTab) {
      case 'materials': return t('materialName') + ' *';
      case 'biocidal': return t('productName') + ' *';
      case 'equipment': return t('equipmentName') + ' *';
      case 'visit_types': return t('visitTypeName') + ' *';
      case 'target_pests': return t('targetPestName') + ' *';
    }
  };

  const renderListItem = (item: any) => {
    return (
      <View key={item.id} style={styles.listItem}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.itemDescription}>{item.description}</Text>
          )}
          <View style={styles.itemDetails}>
            {item.unit && <Text style={styles.itemDetail}>Unit: {item.unit}</Text>}
            {item.price && activeTab === 'materials' && <Text style={styles.itemDetail}>{t('price')}: {getCurrencySymbol(item.currency || 'usd')}{item.price}</Text>}
            {item.active_ingredient && <Text style={styles.itemDetail}>{t('activeIngredient')}: {item.active_ingredient}</Text>}
            {item.concentration && <Text style={styles.itemDetail}>{t('concentration')}: {item.concentration}</Text>}
            {item.equipment_type && <Text style={styles.itemDetail}>{t('equipmentType')}: {item.equipment_type}</Text>}
            {item.quantity && <Text style={styles.itemDetail}>{t('quantity')}: {item.quantity}</Text>}
          </View>
          <View style={[styles.statusBadge, item.is_active ? styles.activeBadge : styles.inactiveBadge]}>
            <Text style={[styles.statusText, item.is_active ? styles.activeText : styles.inactiveText]}>
              {item.is_active ? t('active') : t('inactive')}
            </Text>
          </View>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity onPress={() => startEdit(item)} style={styles.editButton}>
            <Edit2 size={20} color="#2196f3" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
            <Trash2 size={20} color="#f44336" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('companyDefinitions')}</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} style={styles.addButton}>
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        {(['materials', 'biocidal', 'equipment', 'visit_types', 'target_pests'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            {getTabIcon(tab)}
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {getTabTitle(tab)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>
            {getTabTitle(activeTab)} ({getCurrentData().length})
          </Text>
          {getCurrentData().length === 0 ? (
            <Text style={styles.emptyText}>{t('noData')}</Text>
          ) : (
            getCurrentData().map(renderListItem)
          )}
        </View>
      </ScrollView>

      <Modal visible={showForm} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.formTitle}>
                {editingItem ? t('edit') : t('create')} {getTabTitle(activeTab)}
              </Text>

              {renderFormFields()}

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
                  <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handleSave}
                  disabled={loading}
                >
                  <Text style={styles.submitButtonText}>
                    {loading ? t('loading') : editingItem ? t('update') : t('create')}
                  </Text>
                </TouchableOpacity>
              </View>
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
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: '#e8f5e9',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#4caf50',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  listContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  listItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  itemDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  itemDetail: {
    fontSize: 12,
    color: '#999',
    marginRight: 12,
    marginBottom: 2,
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
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    paddingVertical: 40,
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
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: '#4caf50',
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#4caf50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  priceContainer: {
    marginBottom: 16,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  priceInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
  },
  currencyContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  currencyLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  currencyPicker: {
    flexDirection: 'row',
  },
  currencyOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 80,
  },
  currencyOptionSelected: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  currencyOptionText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  currencyOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
});