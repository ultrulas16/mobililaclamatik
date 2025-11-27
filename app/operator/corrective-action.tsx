import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { X, ChevronDown } from 'lucide-react-native';

interface Customer {
  id: string;
  company_name: string;
}

interface Branch {
  id: string;
  branch_name: string;
}

export default function CorrectiveAction() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const { t } = useLanguage();
  
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  
  // Form states
  const [actionType, setActionType] = useState('customer'); // 'visit' or 'customer'
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [applicationType, setApplicationType] = useState('');
  const [applicationDescription, setApplicationDescription] = useState('');
  const [rootCauseAnalysis, setRootCauseAnalysis] = useState('');
  const [correctiveActivity, setCorrectiveActivity] = useState('');
  const [preventiveActivity, setPreventiveActivity] = useState('');
  const [responsible, setResponsible] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [relatedStandard, setRelatedStandard] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  
  // Dropdown states
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showApplicationTypeDropdown, setShowApplicationTypeDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showStandardDropdown, setShowStandardDropdown] = useState(false);

  const applicationTypes = [
    { id: 'pest_control', label: 'Haşere Kontrolü' },
    { id: 'rodent_control', label: 'Kemirgen Kontrolü' },
    { id: 'bird_control', label: 'Kuş Kontrolü' },
    { id: 'disinfection', label: 'Dezenfeksiyon' },
    { id: 'fumigation', label: 'Fumigasyon' },
    { id: 'inspection', label: 'İnceleme' },
  ];

  const standards = [
    { id: 'iso_22000', label: 'ISO 22000' },
    { id: 'haccp', label: 'HACCP' },
    { id: 'brc', label: 'BRC' },
    { id: 'ifs', label: 'IFS' },
    { id: 'fssc_22000', label: 'FSSC 22000' },
    { id: 'halal', label: 'Helal Sertifikası' },
  ];

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      loadBranches(selectedCustomer);
    } else {
      setBranches([]);
      setSelectedBranch('');
    }
  }, [selectedCustomer]);

  const loadCustomers = async () => {
    try {
      console.log('Loading customers for operator:', user?.id);
      
      // Get operator's company_id from operators table
      const { data: operatorData, error: operatorError } = await supabase
        .from('operators')
        .select('company_id')
        .eq('profile_id', user?.id)
        .maybeSingle();

      if (operatorError) {
        console.error('Error loading operator data:', operatorError);
        return;
      }

      if (!operatorData?.company_id) {
        console.log('No company_id found for operator:', user?.id);
        return;
      }

      console.log('Operator company_id:', operatorData.company_id);

      // Load customers created by this company
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, company_name')
        .eq('created_by_company_id', operatorData.company_id)
        .order('company_name');

      if (customersError) {
        console.error('Error loading customers:', customersError);
        return;
      }

      console.log('Loaded customers for operator:', customersData);
      setCustomers(customersData || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadBranches = async (customerId: string) => {
    try {
      console.log('Loading branches for customer:', customerId);
      
      const { data: branchesData, error: branchesError } = await supabase
        .from('customer_branches')
        .select('id, branch_name')
        .eq('customer_id', customerId)
        .order('branch_name');

      if (branchesError) {
        console.error('Error loading branches:', branchesError);
        return;
      }

      console.log('Loaded branches:', branchesData);
      setBranches(branchesData || []);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCustomer || !applicationType || !applicationDescription) {
      Alert.alert('Hata', 'Lütfen gerekli alanları doldurun');
      return;
    }

    setLoading(true);
    try {
      // Get operator's company_id for service request
      const { data: operatorData } = await supabase
        .from('operators')
        .select('company_id')
        .eq('profile_id', user?.id)
        .maybeSingle();

      if (!operatorData?.company_id) {
        throw new Error('Operator company not found');
      }

      // Create a service request for corrective action
      const { error } = await supabase
        .from('service_requests')
        .insert({
          customer_id: selectedCustomer,
          branch_id: selectedBranch || null,
          company_id: operatorData.company_id,
          operator_id: user?.id,
          service_type: `DÖF - ${applicationType}`,
          status: 'assigned',
          scheduled_date: dueDate ? new Date(dueDate).toISOString() : null,
          notes: JSON.stringify({
            type: 'corrective_action',
            application_type: applicationType,
            application_description: applicationDescription,
            root_cause_analysis: rootCauseAnalysis,
            corrective_activity: correctiveActivity,
            preventive_activity: preventiveActivity,
            responsible: responsible,
            related_standard: relatedStandard,
          }),
        });

      if (error) throw error;

      Alert.alert('Başarılı', 'Düzeltici Önleyici Faaliyet oluşturuldu');
      router.back();
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'DÖF oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Düzeltici Önleyici Faaliyet</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Action Type Selection */}
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={styles.radioItem}
            onPress={() => setActionType('visit')}
          >
            <View style={styles.radioButton}>
              <View style={[styles.radioInner, actionType === 'visit' && styles.radioSelected]} />
            </View>
            <Text style={styles.radioLabel}>Ziyaret Seç</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.radioItem}
            onPress={() => setActionType('customer')}
          >
            <View style={styles.radioButton}>
              <View style={[styles.radioInner, actionType === 'customer' && styles.radioSelected]} />
            </View>
            <Text style={styles.radioLabel}>Müşteri/Şube Seç</Text>
          </TouchableOpacity>
        </View>

        {/* Customer Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Müşteri</Text>
          <TouchableOpacity 
            style={styles.dropdown}
            onPress={() => setShowCustomerDropdown(!showCustomerDropdown)}
          >
            <Text style={styles.dropdownText}>
              {selectedCustomer 
                ? customers.find(c => c.id === selectedCustomer)?.company_name || 'Müşteri Seçiniz'
                : 'Müşteri Seçiniz'
              }
            </Text>
            <ChevronDown size={20} color="#666" />
          </TouchableOpacity>

          {showCustomerDropdown && (
            <View style={styles.dropdownList}>
              {customers.map((customer) => (
                <TouchableOpacity
                  key={customer.id}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedCustomer(customer.id);
                    setShowCustomerDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{customer.company_name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Branch Selection */}
        {branches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Şube</Text>
            <TouchableOpacity 
              style={styles.dropdown}
              onPress={() => setShowBranchDropdown(!showBranchDropdown)}
            >
              <Text style={styles.dropdownText}>
                {selectedBranch 
                  ? branches.find(b => b.id === selectedBranch)?.branch_name || 'Şube Seçiniz (Opsiyonel)'
                  : 'Şube Seçiniz (Opsiyonel)'
                }
              </Text>
              <ChevronDown size={20} color="#666" />
            </TouchableOpacity>

            {showBranchDropdown && (
              <View style={styles.dropdownList}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedBranch('');
                    setShowBranchDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>Şube Seçiniz (Opsiyonel)</Text>
                </TouchableOpacity>
                {branches.map((branch) => (
                  <TouchableOpacity
                    key={branch.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedBranch(branch.id);
                      setShowBranchDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{branch.branch_name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Application Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uygunsuzluk Tipi</Text>
          <TouchableOpacity 
            style={styles.dropdown}
            onPress={() => setShowApplicationTypeDropdown(!showApplicationTypeDropdown)}
          >
            <Text style={styles.dropdownText}>
              {applicationType 
                ? applicationTypes.find(t => t.id === applicationType)?.label || 'Seçiniz'
                : 'Seçiniz'
              }
            </Text>
            <ChevronDown size={20} color="#666" />
          </TouchableOpacity>

          {showApplicationTypeDropdown && (
            <View style={styles.dropdownList}>
              {applicationTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setApplicationType(type.id);
                    setShowApplicationTypeDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{type.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Application Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uygunsuzluk Tanımı</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Uygunsuzluğun detaylı açıklaması..."
            value={applicationDescription}
            onChangeText={setApplicationDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Root Cause Analysis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kök Neden Analizi</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Uygunsuzluğun kök nedeni..."
            value={rootCauseAnalysis}
            onChangeText={setRootCauseAnalysis}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Corrective Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Düzeltici Faaliyet</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Uygunsuzluğu gidermek için yapılacak faaliyet..."
            value={correctiveActivity}
            onChangeText={setCorrectiveActivity}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Preventive Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Önleyici Faaliyet</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Uygunsuzluğun tekrarını önlemek için yapılacak faaliyet..."
            value={preventiveActivity}
            onChangeText={setPreventiveActivity}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Responsible and Due Date */}
        <View style={styles.row}>
          <View style={styles.halfSection}>
            <Text style={styles.sectionTitle}>Sorumlu</Text>
            <TextInput
              style={styles.input}
              placeholder="Faaliyetten sorumlu kişi..."
              value={responsible}
              onChangeText={setResponsible}
            />
          </View>

          <View style={styles.halfSection}>
            <Text style={styles.sectionTitle}>Termin Tarihi</Text>
            <TouchableOpacity 
              style={styles.dropdown}
              onPress={() => setShowDateDropdown(!showDateDropdown)}
            >
              <Text style={styles.dropdownText}>
                {dueDate ? formatDate(dueDate) : '04.10.2025'}
              </Text>
              <ChevronDown size={20} color="#666" />
            </TouchableOpacity>

            {showDateDropdown && (
              <View style={styles.dropdownList}>
                {generateDateOptions().map((date) => (
                  <TouchableOpacity
                    key={date}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setDueDate(date);
                      setShowDateDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{formatDate(date)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Related Standard */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İlgili Standart</Text>
          <TouchableOpacity 
            style={styles.dropdown}
            onPress={() => setShowStandardDropdown(!showStandardDropdown)}
          >
            <Text style={styles.dropdownText}>
              {relatedStandard 
                ? standards.find(s => s.id === relatedStandard)?.label || 'Seçiniz'
                : 'Seçiniz'
              }
            </Text>
            <ChevronDown size={20} color="#666" />
          </TouchableOpacity>

          {showStandardDropdown && (
            <View style={styles.dropdownList}>
              {standards.map((standard) => (
                <TouchableOpacity
                  key={standard.id}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setRelatedStandard(standard.id);
                    setShowStandardDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{standard.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Email Notification */}
        <View style={styles.checkboxContainer}>
          <TouchableOpacity 
            style={styles.checkbox}
            onPress={() => setSendEmail(!sendEmail)}
          >
            <View style={[styles.checkboxInner, sendEmail && styles.checkboxChecked]} />
          </TouchableOpacity>
          <Text style={styles.checkboxLabel}>Müşteriye e-posta bildirimi gönder</Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Oluşturuluyor...' : 'DÖF Oluştur'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 44,
    paddingBottom: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  radioContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 20,
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
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'transparent',
  },
  radioSelected: {
    backgroundColor: '#4caf50',
  },
  radioLabel: {
    fontSize: 16,
    color: '#333',
  },
  section: {
    marginBottom: 20,
    position: 'relative',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dropdown: {
    backgroundColor: '#e8e8e8',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  halfSection: {
    flex: 1,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#4caf50',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#4caf50',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});