import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Minus, Trash, Check, ChevronDown } from 'lucide-react-native';
import { Visit, BranchEquipment, Equipment, BiocidalProduct, PaidProduct, BiocidalUsage, PaidProductUsage } from '@/types/visits';
import { formatDate, calculateDistance } from '@/lib/utils';

const DENSITY_OPTIONS = [
  { id: 'none', label: 'Yok' },
  { id: 'low', label: 'Az' },
  { id: 'medium', label: 'Orta' },
  { id: 'high', label: 'İstila' },
];

interface VisitType {
  id: string;
  name: string;
}

interface TargetPest {
  id: string;
  name: string;
}

export default function VisitDetails() {
  const router = useRouter();
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [branchEquipment, setBranchEquipment] = useState<BranchEquipment[]>([]);
  const [biocidalProducts, setBiocidalProducts] = useState<BiocidalProduct[]>([]);
  const [paidProducts, setPaidProducts] = useState<PaidProduct[]>([]);
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [visitTypes, setVisitTypes] = useState<VisitType[]>([]);
  const [targetPests, setTargetPests] = useState<TargetPest[]>([]);

  const [selectedVisitTypes, setSelectedVisitTypes] = useState<string[]>([]);
  const [selectedPests, setSelectedPests] = useState<string[]>([]);
  const [densityLevel, setDensityLevel] = useState<'none' | 'low' | 'medium' | 'high'>('none');
  const [equipmentChecks, setEquipmentChecks] = useState<Record<string, any>>({});
  const [biocidalUsage, setBiocidalUsage] = useState<BiocidalUsage[]>([{ productId: '', quantity: '', unit: '' }]);
  const [paidProductUsage, setPaidProductUsage] = useState<PaidProductUsage[]>([{ productId: '', quantity: '', unit: '' }]);
  const [noPaidProductsUsed, setNoPaidProductsUsed] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [operatorNotes, setOperatorNotes] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [reportNumber, setReportNumber] = useState('');
  const [distanceFromPrevious, setDistanceFromPrevious] = useState<number | null>(null);

  const [biocidalPickerVisible, setBiocidalPickerVisible] = useState<number | null>(null);
  const [paidPickerVisible, setPaidPickerVisible] = useState<number | null>(null);

  useEffect(() => {
    if (visitId) {
      loadVisitData();
    }
    loadCompanyData();
    setDefaultTimes();
  }, [visitId]);

  const setDefaultTimes = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    setStartTime(`${hours}:${minutes}`);
    setEndTime(`${hours}:${minutes}`);
  };

  const loadVisitData = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('service_requests')
        .select(`
          *,
          customer:customers(id, company_name),
          branch:customer_branches(id, branch_name, latitude, longitude, address),
          operator:profiles!service_requests_operator_id_fkey(id, full_name)
        `)
        .eq('id', visitId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const formattedData = {
          ...data,
          visit_date: data.scheduled_date,
          customer_id: data.customer_id,
          branch_id: data.branch_id,
        };
        setVisit(formattedData as any);

        if (data.equipment_checks) {
          setEquipmentChecks(data.equipment_checks);
        }

        if (data.pest_types && Array.isArray(data.pest_types)) {
          setSelectedPests(data.pest_types);
        }

        if (data.visit_type) {
          setSelectedVisitTypes(Array.isArray(data.visit_type) ? data.visit_type : [data.visit_type]);
        }

        if (data.density_level) {
          setDensityLevel(data.density_level);
        }

        if (data.notes) {
          setOperatorNotes(data.notes);
        }

        if (data.customer_notes) {
          setCustomerNotes(data.customer_notes);
        }

        if (data.report_number) {
          setReportNumber(data.report_number);
        }

        if (data.branch?.id) {
          loadBranchEquipment(data.branch.id);
        }

        await calculateDistanceFromPrevious(data);
      }
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistanceFromPrevious = async (currentVisit: any) => {
    try {
      if (!currentVisit.branch?.latitude || !currentVisit.branch?.longitude) {
        return;
      }

      const { data: operatorData } = await supabase
        .from('operators')
        .select('id')
        .eq('profile_id', user?.id)
        .maybeSingle();

      if (!operatorData) return;

      const { data: previousVisit } = await supabase
        .from('visits')
        .select(`
          id,
          branch:customer_branches(latitude, longitude)
        `)
        .eq('operator_id', operatorData.id)
        .eq('status', 'completed')
        .lt('visit_date', currentVisit.visit_date)
        .order('visit_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (previousVisit?.branch && !Array.isArray(previousVisit.branch)) {
        const prevBranch = previousVisit.branch as any;
        if (prevBranch.latitude && prevBranch.longitude) {
          const distance = calculateDistance(
            currentVisit.branch.latitude,
            currentVisit.branch.longitude,
            prevBranch.latitude,
            prevBranch.longitude
          );
          setDistanceFromPrevious(distance);
        }
      }
    } catch (error) {
      console.error('Error calculating distance:', error);
    }
  };

  const loadBranchEquipment = async (branchId: string) => {
    try {
      const { data, error } = await supabase
        .from('branch_equipment')
        .select(`
          *,
          equipment:equipment_id(id, name, properties)
        `)
        .eq('branch_id', branchId)
        .order('department', { ascending: true });

      if (error) throw error;
      setBranchEquipment(data || []);
    } catch (error: any) {
      console.error('Error loading branch equipment:', error);
    }
  };

  const loadCompanyData = async () => {
    try {
      const { data: operatorData } = await supabase
        .from('operators')
        .select('id, company_id')
        .eq('profile_id', user?.id)
        .maybeSingle();

      if (!operatorData) return;

      setOperatorId(operatorData.id);
      setCompanyId(operatorData.company_id);

      const { data: visitTypesData } = await supabase
        .from('company_visit_types')
        .select('id, name')
        .eq('company_id', operatorData.company_id)
        .eq('is_active', true)
        .order('name');

      setVisitTypes(visitTypesData || []);

      const { data: targetPestsData } = await supabase
        .from('company_target_pests')
        .select('id, name')
        .eq('company_id', operatorData.company_id)
        .eq('is_active', true)
        .order('name');

      setTargetPests(targetPestsData || []);

      const { data: biocidalData } = await supabase
        .from('company_biocidal_products')
        .select('*')
        .eq('company_id', operatorData.company_id)
        .eq('is_active', true)
        .order('name');

      setBiocidalProducts(biocidalData || []);

      const { data: paidData } = await supabase
        .from('company_materials')
        .select('*')
        .eq('company_id', operatorData.company_id)
        .eq('is_active', true)
        .order('name');

      setPaidProducts(paidData || []);
    } catch (error: any) {
      console.error('Error loading company data:', error);
    }
  };

  const handleSaveVisit = async () => {
    if (!reportNumber) {
      Alert.alert('Hata', 'Lütfen faaliyet rapor numarası giriniz');
      return;
    }

    if (selectedVisitTypes.length === 0) {
      Alert.alert('Hata', 'Lütfen en az bir ziyaret türü seçiniz');
      return;
    }

    if (!noPaidProductsUsed) {
      const validPaidProducts = paidProductUsage.filter(
        item => item.productId && item.quantity && parseFloat(item.quantity) > 0
      );
      if (validPaidProducts.length === 0) {
        Alert.alert('Hata', 'Lütfen ücretli ürün ekleyin veya "Ücretli ürün kullanılmadı" seçeneğini işaretleyin');
        return;
      }
    }

    try {
      setSaving(true);

      const { error: serviceRequestError } = await supabase
        .from('service_requests')
        .update({
          status: 'completed',
          completed_date: new Date().toISOString(),
          notes: operatorNotes,
        })
        .eq('id', visitId);

      if (serviceRequestError) throw serviceRequestError;

      const visitTypeNames = visitTypes
        .filter(vt => selectedVisitTypes.includes(vt.id))
        .map(vt => vt.name);

      const pestNames = targetPests
        .filter(pt => selectedPests.includes(pt.id))
        .map(pt => pt.name);

      if (!operatorId) {
        throw new Error('Operatör bilgisi bulunamadı');
      }

      const { error: visitInsertError } = await supabase
        .from('visits')
        .insert({
          id: visitId,
          customer_id: visit?.customer_id,
          branch_id: visit?.branch_id || null,
          operator_id: operatorId,
          visit_date: visit?.visit_date || new Date().toISOString(),
          status: 'completed',
          visit_type: visitTypeNames.length > 0 ? visitTypeNames.join(', ') : null,
          pest_types: pestNames.length > 0 ? pestNames : null,
          density_level: densityLevel,
          equipment_checks: Object.keys(equipmentChecks).length > 0 ? equipmentChecks : null,
          notes: operatorNotes,
          customer_notes: customerNotes,
          start_time: startTime || null,
          end_time: endTime || null,
          report_number: reportNumber,
        });

      if (visitInsertError) throw visitInsertError;

      if (!noPaidProductsUsed) {
        await savePaidMaterialSales();
      }

      Alert.alert('Başarılı', 'Ziyaret tamamlandı', [
        {
          text: 'Tamam',
          onPress: () => router.push('/operator/visits'),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Ziyaret kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const savePaidMaterialSales = async () => {
    const validProducts = paidProductUsage.filter(
      item => item.productId && item.quantity && parseFloat(item.quantity) > 0
    );

    if (validProducts.length === 0) return;

    try {
      let totalAmount = 0;
      const saleItems = validProducts.map(item => {
        const product = paidProducts.find(p => p.id === item.productId);
        if (!product) throw new Error('Ürün bulunamadı');

        const quantity = parseFloat(item.quantity);
        const unitPrice = product.price;
        const totalPrice = quantity * unitPrice;

        totalAmount += totalPrice;

        return {
          product_id: item.productId,
          quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
        };
      });

      const { data: saleData, error: saleError } = await supabase
        .from('paid_material_sales')
        .insert([{
          visit_id: visitId,
          customer_id: visit?.customer_id,
          branch_id: visit?.branch_id || null,
          sale_date: new Date().toISOString().split('T')[0],
          status: 'pending',
          total_amount: totalAmount,
          notes: `Ziyaret sırasında satılan ürünler`,
          created_by: user?.id,
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      const itemsWithSaleId = saleItems.map(item => ({
        ...item,
        sale_id: saleData.id,
      }));

      const { error: itemsError } = await supabase
        .from('paid_material_sale_items')
        .insert(itemsWithSaleId);

      if (itemsError) throw itemsError;

      for (const item of validProducts) {
        await updateWarehouseStock(item.productId, parseFloat(item.quantity));
      }
    } catch (error: any) {
      console.error('Error saving paid materials:', error);
      throw error;
    }
  };

  const updateWarehouseStock = async (productId: string, quantity: number) => {
    if (!operatorId) return;

    try {
      const { data: warehouse } = await supabase
        .from('warehouses')
        .select('id')
        .eq('operator_id', operatorId)
        .maybeSingle();

      if (!warehouse) return;

      const { data: stockItem } = await supabase
        .from('warehouse_items')
        .select('id, quantity')
        .eq('warehouse_id', warehouse.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (stockItem) {
        const newQuantity = Math.max(0, stockItem.quantity - quantity);
        await supabase
          .from('warehouse_items')
          .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
          .eq('id', stockItem.id);
      }
    } catch (error) {
      console.error('Error updating warehouse stock:', error);
    }
  };

  const toggleVisitType = (typeId: string) => {
    setSelectedVisitTypes(prev =>
      prev.includes(typeId)
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  const togglePestType = (pestId: string) => {
    setSelectedPests(prev =>
      prev.includes(pestId)
        ? prev.filter(id => id !== pestId)
        : [...prev, pestId]
    );
  };

  const handleEquipmentCheckChange = (equipmentId: string, field: string, value: any) => {
    setEquipmentChecks(prev => ({
      ...prev,
      [equipmentId]: {
        ...(prev[equipmentId] || {}),
        [field]: value,
      },
    }));
  };

  const addBiocidalProduct = () => {
    setBiocidalUsage([...biocidalUsage, { productId: '', quantity: '', unit: '' }]);
  };

  const removeBiocidalProduct = (index: number) => {
    if (biocidalUsage.length > 1) {
      const newUsage = [...biocidalUsage];
      newUsage.splice(index, 1);
      setBiocidalUsage(newUsage);
    }
  };

  const updateBiocidalUsage = (index: number, field: keyof BiocidalUsage, value: string) => {
    const newUsage = [...biocidalUsage];
    newUsage[index] = { ...newUsage[index], [field]: value };

    if (field === 'productId') {
      const product = biocidalProducts.find(p => p.id === value);
      if (product) {
        newUsage[index].unit = product.unit || '';
      }
    }

    setBiocidalUsage(newUsage);
  };

  const adjustBiocidalQuantity = (index: number, delta: number) => {
    const newUsage = [...biocidalUsage];
    const currentQty = parseFloat(newUsage[index].quantity) || 0;
    const newQty = Math.max(0, currentQty + delta);
    newUsage[index].quantity = newQty.toString();
    setBiocidalUsage(newUsage);
  };

  const addPaidProduct = () => {
    setPaidProductUsage([...paidProductUsage, { productId: '', quantity: '', unit: '' }]);
    setNoPaidProductsUsed(false);
  };

  const removePaidProduct = (index: number) => {
    if (paidProductUsage.length > 1) {
      const newUsage = [...paidProductUsage];
      newUsage.splice(index, 1);
      setPaidProductUsage(newUsage);
    }
  };

  const updatePaidProductUsage = (index: number, field: keyof PaidProductUsage, value: string) => {
    const newUsage = [...paidProductUsage];
    newUsage[index] = { ...newUsage[index], [field]: value };

    if (field === 'productId') {
      const product = paidProducts.find(p => p.id === value);
      if (product) {
        newUsage[index].unit = product.unit || '';
      }
    }

    setPaidProductUsage(newUsage);
  };

  const adjustPaidQuantity = (index: number, delta: number) => {
    const newUsage = [...paidProductUsage];
    const currentQty = parseFloat(newUsage[index].quantity) || 0;
    const newQty = Math.max(0, currentQty + delta);
    newUsage[index].quantity = newQty.toString();
    setPaidProductUsage(newUsage);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  if (!visit) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Ziyaret bulunamadı</Text>
        </View>
      </View>
    );
  }

  const groupedEquipment = branchEquipment.reduce((acc, item) => {
    if (!acc[item.department]) {
      acc[item.department] = [];
    }
    acc[item.department].push(item);
    return acc;
  }, {} as Record<string, BranchEquipment[]>);

  const handleStartVisit = async () => {
    try {
      const { error } = await supabase
        .from('service_requests')
        .update({ status: 'in_progress' })
        .eq('id', visitId);

      if (error) throw error;

      loadVisitData();
      Alert.alert('Başarılı', 'Ziyaret başlatıldı');
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerDate}>{formatDate(visit.visit_date, true)}</Text>
          <Text style={styles.headerCustomer}>{visit.customer?.company_name || 'Müşteri'}</Text>
          {visit.branch && (
            <Text style={styles.headerBranch}>{visit.branch.branch_name}</Text>
          )}
        </View>
      </View>

      {visit.status === 'pending' && (
        <TouchableOpacity
          style={styles.startVisitButton}
          onPress={handleStartVisit}
        >
          <Text style={styles.startVisitButtonText}>Ziyarete Başla</Text>
        </TouchableOpacity>
      )}

      {distanceFromPrevious !== null && (
        <View style={styles.distanceBanner}>
          <Text style={styles.distanceText}>
            Önceki ziyaretten mesafe: {distanceFromPrevious.toFixed(2)} km
          </Text>
        </View>
      )}

      {visit.status === 'pending' ? (
        <View style={styles.pendingContainer}>
          <Text style={styles.pendingText}>Ziyarete başlamak için yukarıdaki butona tıklayın</Text>
        </View>
      ) : visit.status === 'completed' ? (
        <View style={styles.completedContainer}>
          <Text style={styles.completedTitle}>Ziyaret Tamamlandı</Text>
          <Text style={styles.completedText}>Bu ziyaret tamamlanmıştır. Değişiklik yapamazsınız.</Text>
          <TouchableOpacity
            style={styles.backToListButton}
            onPress={() => router.push('/operator/visits')}
          >
            <Text style={styles.backToListButtonText}>Ziyaretlerime Dön</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {Object.keys(groupedEquipment).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Şube Ekipmanları</Text>
            {Object.entries(groupedEquipment).map(([department, items]) => (
              <View key={department} style={styles.departmentSection}>
                <Text style={styles.departmentTitle}>{department}</Text>
                {items.map((item, index) => (
                  <View key={item.id} style={styles.equipmentCard}>
                    <Text style={styles.equipmentName}>
                      Ekipman {index + 1} ({item.equipment_code})
                    </Text>
                    <Text style={styles.equipmentType}>{item.equipment?.name}</Text>

                    {item.equipment?.properties && Object.entries(item.equipment.properties).length > 0 ? (
                      <View style={styles.propertiesContainer}>
                        {Object.entries(item.equipment.properties).map(([key, prop]: [string, any]) => (
                          <View key={key} style={styles.propertyRow}>
                            <Text style={styles.propertyLabel}>{prop.label}</Text>
                            {prop.type === 'boolean' ? (
                              <View style={styles.booleanButtons}>
                                <TouchableOpacity
                                  style={[
                                    styles.booleanButton,
                                    equipmentChecks[item.id]?.[key] === 'true' && styles.booleanButtonActive,
                                  ]}
                                  onPress={() => visit.status !== 'completed' && handleEquipmentCheckChange(item.id, key, 'true')}
                                  disabled={visit.status === 'completed'}
                                >
                                  <Text
                                    style={[
                                      styles.booleanButtonText,
                                      equipmentChecks[item.id]?.[key] === 'true' && styles.booleanButtonTextActive,
                                    ]}
                                  >
                                    Evet
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[
                                    styles.booleanButton,
                                    equipmentChecks[item.id]?.[key] === 'false' && styles.booleanButtonActive,
                                  ]}
                                  onPress={() => visit.status !== 'completed' && handleEquipmentCheckChange(item.id, key, 'false')}
                                  disabled={visit.status === 'completed'}
                                >
                                  <Text
                                    style={[
                                      styles.booleanButtonText,
                                      equipmentChecks[item.id]?.[key] === 'false' && styles.booleanButtonTextActive,
                                    ]}
                                  >
                                    Hayır
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            ) : prop.type === 'number' ? (
                              <TextInput
                                style={styles.propertyInput}
                                keyboardType="numeric"
                                value={equipmentChecks[item.id]?.[key] || ''}
                                onChangeText={(value) => handleEquipmentCheckChange(item.id, key, value)}
                                editable={visit.status !== 'completed'}
                              />
                            ) : (
                              <TextInput
                                style={styles.propertyInput}
                                value={equipmentChecks[item.id]?.[key] || ''}
                                onChangeText={(value) => handleEquipmentCheckChange(item.id, key, value)}
                                editable={visit.status !== 'completed'}
                              />
                            )}
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.noPropertiesText}>
                        Bu ekipman için tanımlanmış özellik bulunmuyor
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ziyaret Türü</Text>
          {visitTypes.length > 0 ? (
            <View style={styles.compactCheckboxContainer}>
              {visitTypes.map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.compactChip,
                    selectedVisitTypes.includes(type.id) && styles.compactChipActive
                  ]}
                  onPress={() => visit.status !== 'completed' && toggleVisitType(type.id)}
                  disabled={visit.status === 'completed'}
                >
                  <Text style={[
                    styles.compactChipText,
                    selectedVisitTypes.includes(type.id) && styles.compactChipTextActive
                  ]}>
                    {type.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>
              Kayıtlı ziyaret türü yok. Lütfen tanımlamalar sayfasından ekleyin.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hedef Zararlılar</Text>
          {targetPests.length > 0 ? (
            <View style={styles.compactCheckboxContainer}>
              {targetPests.map(pest => (
                <TouchableOpacity
                  key={pest.id}
                  style={[
                    styles.compactChip,
                    selectedPests.includes(pest.id) && styles.compactChipActive
                  ]}
                  onPress={() => visit.status !== 'completed' && togglePestType(pest.id)}
                  disabled={visit.status === 'completed'}
                >
                  <Text style={[
                    styles.compactChipText,
                    selectedPests.includes(pest.id) && styles.compactChipTextActive
                  ]}>
                    {pest.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>
              Kayıtlı hedef zararlı yok. Lütfen tanımlamalar sayfasından ekleyin.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yoğunluk</Text>
          <View style={styles.radioRow}>
            {DENSITY_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.id}
                style={styles.radioItem}
                onPress={() => visit.status !== 'completed' && setDensityLevel(option.id as any)}
                disabled={visit.status === 'completed'}
              >
                <View style={styles.radioButton}>
                  {densityLevel === option.id && (
                    <View style={styles.radioSelected} />
                  )}
                </View>
                <Text style={styles.radioLabel}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Biyosidal Ürünler</Text>
          {biocidalProducts.length > 0 ? (
            <>
              {biocidalUsage.map((item, index) => (
                <View key={index} style={styles.productCard}>
                  <View style={styles.productHeader}>
                    <Text style={styles.productTitle}>Biyosidal Ürün {index + 1}</Text>
                    {index > 0 && visit.status !== 'completed' && (
                      <TouchableOpacity onPress={() => removeBiocidalProduct(index)}>
                        <Trash size={20} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={styles.inputLabel}>Ürün Adı</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => visit.status !== 'completed' && setBiocidalPickerVisible(index)}
                    disabled={visit.status === 'completed'}
                  >
                    <Text style={styles.pickerButtonText}>
                      {biocidalProducts.find(p => p.id === item.productId)?.name || 'Ürün seçin...'}
                    </Text>
                    <ChevronDown size={20} color="#666" />
                  </TouchableOpacity>

                  <Text style={styles.inputLabel}>Miktar / Doz</Text>
                  <View style={styles.quantityRow}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => adjustBiocidalQuantity(index, -1)}
                      disabled={visit.status === 'completed'}
                    >
                      <Minus size={20} color="#fff" />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.quantityInput}
                      keyboardType="numeric"
                      placeholder="0"
                      value={item.quantity}
                      onChangeText={(value) => updateBiocidalUsage(index, 'quantity', value)}
                      editable={visit.status !== 'completed'}
                    />
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => adjustBiocidalQuantity(index, 1)}
                      disabled={visit.status === 'completed'}
                    >
                      <Plus size={20} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.unitBadge}>
                      <Text style={styles.unitText}>{item.unit || 'birim'}</Text>
                    </View>
                  </View>

                  {index === biocidalUsage.length - 1 && visit.status !== 'completed' && (
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={addBiocidalProduct}
                    >
                      <Plus size={16} color="#fff" />
                      <Text style={styles.addButtonText}>Ürün Ekle</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.emptyText}>
              Kayıtlı biyosidal ürün yok. Lütfen tanımlamalar sayfasından ekleyin.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ücretli Ürünler</Text>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => {
              if (visit.status !== 'completed') {
                setNoPaidProductsUsed(!noPaidProductsUsed);
                if (!noPaidProductsUsed) {
                  setPaidProductUsage([{ productId: '', quantity: '', unit: '' }]);
                }
              }
            }}
            disabled={visit.status === 'completed'}
          >
            <View style={styles.checkbox}>
              {noPaidProductsUsed && <Check size={16} color="#4caf50" />}
            </View>
            <Text style={styles.checkboxLabel}>Ücretli ürün kullanılmadı</Text>
          </TouchableOpacity>

          {!noPaidProductsUsed && (
            paidProducts.length > 0 ? (
              <>
                {paidProductUsage.map((item, index) => (
                  <View key={index} style={styles.productCard}>
                    <View style={styles.productHeader}>
                      <Text style={styles.productTitle}>Ücretli Ürün {index + 1}</Text>
                      {index > 0 && visit.status !== 'completed' && (
                        <TouchableOpacity onPress={() => removePaidProduct(index)}>
                          <Trash size={20} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <Text style={styles.inputLabel}>Ürün Adı</Text>
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => visit.status !== 'completed' && setPaidPickerVisible(index)}
                      disabled={visit.status === 'completed'}
                    >
                      <Text style={styles.pickerButtonText}>
                        {paidProducts.find(p => p.id === item.productId)?.name || 'Ürün seçin...'}
                      </Text>
                      <ChevronDown size={20} color="#666" />
                    </TouchableOpacity>

                    <Text style={styles.inputLabel}>Miktar</Text>
                    <View style={styles.quantityRow}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => adjustPaidQuantity(index, -1)}
                        disabled={visit.status === 'completed'}
                      >
                        <Minus size={20} color="#fff" />
                      </TouchableOpacity>
                      <TextInput
                        style={styles.quantityInput}
                        keyboardType="numeric"
                        placeholder="0"
                        value={item.quantity}
                        onChangeText={(value) => updatePaidProductUsage(index, 'quantity', value)}
                        editable={visit.status !== 'completed'}
                      />
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => adjustPaidQuantity(index, 1)}
                        disabled={visit.status === 'completed'}
                      >
                        <Plus size={20} color="#fff" />
                      </TouchableOpacity>
                      <View style={styles.unitBadge}>
                        <Text style={styles.unitText}>{item.unit || 'birim'}</Text>
                      </View>
                    </View>

                    {index === paidProductUsage.length - 1 && visit.status !== 'completed' && (
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={addPaidProduct}
                      >
                        <Plus size={16} color="#fff" />
                        <Text style={styles.addButtonText}>Ürün Ekle</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </>
            ) : (
              <Text style={styles.emptyText}>
                Kayıtlı ücretli ürün yok. Lütfen tanımlamalar sayfasından ekleyin.
              </Text>
            )
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notlar (Sadece Operatör Görür)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Operatör notları (müşteri göremez)..."
            value={operatorNotes}
            onChangeText={setOperatorNotes}
            multiline
            numberOfLines={4}
            editable={visit.status !== 'completed'}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Açıklamalar (Müşteri Görebilir)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Müşterinin göreceği açıklamalar..."
            value={customerNotes}
            onChangeText={setCustomerNotes}
            multiline
            numberOfLines={4}
            editable={visit.status !== 'completed'}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.timeRow}>
            <View style={styles.timeColumn}>
              <Text style={styles.inputLabel}>Başlama Saati</Text>
              <TextInput
                style={styles.timeInput}
                placeholder="00:00"
                value={startTime}
                onChangeText={setStartTime}
                editable={visit.status !== 'completed'}
              />
            </View>
            <View style={styles.timeColumn}>
              <Text style={styles.inputLabel}>Bitiş Saati</Text>
              <TextInput
                style={styles.timeInput}
                placeholder="00:00"
                value={endTime}
                onChangeText={setEndTime}
                editable={visit.status !== 'completed'}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.inputLabel}>Faaliyet Rapor No *</Text>
          <TextInput
            style={styles.input}
            placeholder="Rapor numarası..."
            value={reportNumber}
            onChangeText={setReportNumber}
            editable={visit.status !== 'completed'}
          />
        </View>

          {visit.status !== 'completed' && (
            <TouchableOpacity
              style={[styles.submitButton, (saving || !reportNumber || selectedVisitTypes.length === 0) && styles.submitButtonDisabled]}
              onPress={handleSaveVisit}
              disabled={saving || !reportNumber || selectedVisitTypes.length === 0}
            >
              <Text style={styles.submitButtonText}>
                {saving ? 'Kaydediliyor...' : 'Tamamlandı'}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      <Modal
        visible={biocidalPickerVisible !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setBiocidalPickerVisible(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <Text style={styles.pickerModalTitle}>Biyosidal Ürün Seçin</Text>
            <ScrollView style={styles.pickerList}>
              {biocidalProducts.map(product => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.pickerItem}
                  onPress={() => {
                    if (biocidalPickerVisible !== null) {
                      updateBiocidalUsage(biocidalPickerVisible, 'productId', product.id);
                    }
                    setBiocidalPickerVisible(null);
                  }}
                >
                  <Text style={styles.pickerItemText}>{product.name}</Text>
                  <Text style={styles.pickerItemSubtext}>{product.active_ingredient}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.pickerCloseButton}
              onPress={() => setBiocidalPickerVisible(null)}
            >
              <Text style={styles.pickerCloseButtonText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={paidPickerVisible !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPaidPickerVisible(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <Text style={styles.pickerModalTitle}>Ücretli Ürün Seçin</Text>
            <ScrollView style={styles.pickerList}>
              {paidProducts.map(product => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.pickerItem}
                  onPress={() => {
                    if (paidPickerVisible !== null) {
                      updatePaidProductUsage(paidPickerVisible, 'productId', product.id);
                    }
                    setPaidPickerVisible(null);
                  }}
                >
                  <Text style={styles.pickerItemText}>{product.name}</Text>
                  <Text style={styles.pickerItemSubtext}>{product.price} TL / {product.unit}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.pickerCloseButton}
              onPress={() => setPaidPickerVisible(null)}
            >
              <Text style={styles.pickerCloseButtonText}>Kapat</Text>
            </TouchableOpacity>
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
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerDate: {
    color: '#e8f5e9',
    fontSize: 14,
  },
  headerCustomer: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  headerBranch: {
    color: '#e8f5e9',
    fontSize: 14,
    marginTop: 2,
  },
  distanceBanner: {
    backgroundColor: '#2196f3',
    padding: 12,
    alignItems: 'center',
  },
  distanceText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 16,
  },
  departmentSection: {
    marginBottom: 16,
  },
  departmentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  equipmentCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  equipmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  equipmentType: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 12,
  },
  propertiesContainer: {
    gap: 12,
  },
  propertyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  propertyLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  propertyInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 8,
    width: 100,
    fontSize: 14,
  },
  booleanButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  booleanButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  booleanButtonActive: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  booleanButtonText: {
    fontSize: 14,
    color: '#333',
  },
  booleanButtonTextActive: {
    color: '#fff',
  },
  noPropertiesText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  compactCheckboxContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  compactChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  compactChipActive: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  compactChipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  compactChipTextActive: {
    color: '#fff',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#4caf50',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  radioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4caf50',
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4caf50',
  },
  radioLabel: {
    fontSize: 14,
    color: '#333',
  },
  productCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  pickerButtonText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  unitBadge: {
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  unitText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#4caf50',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeColumn: {
    flex: 1,
  },
  timeInput: {
    backgroundColor: '#007bff',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 40,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  startVisitButton: {
    backgroundColor: '#059669',
    padding: 16,
    alignItems: 'center',
    borderRadius: 0,
  },
  startVisitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  pendingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  pendingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f0f9ff',
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196f3',
    marginBottom: 16,
    textAlign: 'center',
  },
  completedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  backToListButton: {
    backgroundColor: '#2196f3',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  backToListButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingTop: 20,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  pickerItemSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  pickerCloseButton: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  pickerCloseButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
});
