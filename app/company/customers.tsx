import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, User, Mail, Phone, Building, Trash2, Upload, Download } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

interface Customer {
  id: string;
  profile_id: string;
  company_name: string;
  profile: {
    full_name: string;
    email: string;
    phone: string;
  } | null;
}

export default function ManageCustomers() {
  const router = useRouter();
  const { profile } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      console.log('Loading customers for company:', profile?.company_id);
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          profile:profiles!customers_profile_id_fkey(full_name, email, phone)
        `)
        .eq('created_by_company_id', profile?.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Loaded customers raw data:', data);
      console.log('Loaded customers:', data);
      const validCustomers = (data || []).filter(c => c.profile !== null);
      console.log('Valid customers after filtering:', validCustomers);
      setCustomers(validCustomers);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const handleAddCustomer = async () => {
    if (!email || !password || !fullName || !companyName) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      console.log('Creating customer with data:', {
        email,
        full_name: fullName,
        company_name: companyName,
        created_by_company_id: profile?.company_id,
      });

      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/create-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseAnonKey}`,
        },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          phone,
          company_name: companyName,
          created_by_company_id: profile?.company_id,
        }),
      });

      const result = await response.json();
      console.log('Customer creation response:', result);

      if (!response.ok) {
        console.error('Customer creation failed:', result);
        throw new Error(result.error || 'Failed to add customer');
      }

      Alert.alert('Success', 'Customer added successfully');
      setShowForm(false);
      setEmail('');
      setPassword('');
      setFullName('');
      setPhone('');
      setCompanyName('');
      // Wait a bit before reloading to ensure data is committed
      setTimeout(() => {
        loadCustomers();
      }, 1000);
    } catch (error: any) {
      console.error('Error adding customer:', error);
      Alert.alert('Error', error.message || 'Failed to add customer');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async (customerId: string, profileId: string) => {
    Alert.alert(
      'Delete Customer',
      'Are you sure you want to delete this customer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error: customerError } = await supabase
                .from('customers')
                .delete()
                .eq('id', customerId);

              if (customerError) throw customerError;

              const { error: profileError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', profileId);

              if (profileError) throw profileError;

              loadCustomers();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete customer');
            }
          },
        },
      ]
    );
  };

  const handleDownloadTemplate = async () => {
    try {
      const templateData = [
        {
          'Ad Soyad': 'Örnek Müşteri',
          'Şirket Adı': 'Örnek Şirket A.Ş.',
          'E-posta': 'ornek@firma.com',
          'Telefon': '05001234567',
          'Şifre': 'Guvenli123!'
        },
        {
          'Ad Soyad': 'Ahmet Yılmaz',
          'Şirket Adı': 'ABC Restoran',
          'E-posta': 'ahmet@abcrestoran.com',
          'Telefon': '05321234567',
          'Şifre': 'Sifre123!'
        },
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Müşteriler');

      if (Platform.OS === 'web') {
        const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'musteri_sablonu.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Alert.alert('Başarılı', 'Şablon dosyası indirildi');
      } else {
        const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const fileUri = FileSystem.cacheDirectory + 'musteri_sablonu.xlsx';
        await FileSystem.writeAsStringAsync(fileUri, wbout, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await Sharing.shareAsync(fileUri);
        Alert.alert('Başarılı', 'Şablon dosyası indirildi');
      }
    } catch (error) {
      console.error('Error downloading template:', error);
      Alert.alert('Hata', 'Şablon dosyası indirilemedi: ' + error);
    }
  };

  const processExcelData = async (workbook: XLSX.WorkBook) => {
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      Alert.alert('Hata', 'Excel dosyası boş');
      return;
    }

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const row of data as any[]) {
      try {
        const fullName = row['Ad Soyad'] || row['Full Name'];
        const companyName = row['Şirket Adı'] || row['Company Name'];
        const email = row['E-posta'] || row['Email'];
        const phone = row['Telefon'] || row['Phone'];
        const password = row['Şifre'] || row['Password'];

        if (!fullName || !companyName || !email || !password) {
          errors.push(`Satır atlandı: Eksik bilgi - ${email || 'bilinmeyen'}`);
          errorCount++;
          continue;
        }

        const response = await fetch(`${supabase.supabaseUrl}/functions/v1/create-customer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabase.supabaseAnonKey}`,
          },
          body: JSON.stringify({
            email,
            password,
            full_name: fullName,
            phone: phone || '',
            company_name: companyName,
            created_by_company_id: profile?.company_id,
          }),
        });

        if (response.ok) {
          successCount++;
        } else {
          const result = await response.json();
          errors.push(`${email}: ${result.error || 'Bilinmeyen hata'}`);
          errorCount++;
        }
      } catch (error: any) {
        errors.push(`Hata: ${error.message}`);
        errorCount++;
      }
    }

    setLoading(false);
    loadCustomers();

    let message = `Başarılı: ${successCount}\nHatalı: ${errorCount}`;
    if (errors.length > 0) {
      message += '\n\nHatalar:\n' + errors.slice(0, 5).join('\n');
      if (errors.length > 5) {
        message += `\n... ve ${errors.length - 5} hata daha`;
      }
    }

    Alert.alert('İçe Aktarma Tamamlandı', message);
  };

  const handleImportExcel = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls';
        input.onchange = async (e: any) => {
          try {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event: any) => {
              try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                await processExcelData(workbook);
              } catch (error: any) {
                console.error('Error reading Excel:', error);
                Alert.alert('Hata', 'Excel dosyası okunamadı: ' + error.message);
              }
            };
            reader.readAsArrayBuffer(file);
          } catch (error: any) {
            console.error('Error handling file:', error);
            Alert.alert('Hata', 'Dosya işlenemedi: ' + error.message);
          }
        };
        input.click();
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
          ],
          copyToCacheDirectory: true,
        });

        if (result.canceled) {
          return;
        }

        const fileUri = result.assets[0].uri;
        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const workbook = XLSX.read(fileContent, { type: 'base64' });
        await processExcelData(workbook);
      }
    } catch (error: any) {
      setLoading(false);
      console.error('Error importing Excel:', error);
      Alert.alert('Hata', 'Excel dosyası okunamadı: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Müşterileri Yönet</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)} style={styles.addButton}>
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.excelActionsContainer}>
          <TouchableOpacity
            style={styles.excelButton}
            onPress={handleDownloadTemplate}
          >
            <Download size={20} color="#fff" />
            <Text style={styles.excelButtonText}>Şablon İndir</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.excelButton, styles.excelButtonImport]}
            onPress={handleImportExcel}
            disabled={loading}
          >
            <Upload size={20} color="#fff" />
            <Text style={styles.excelButtonText}>
              {loading ? 'Yükleniyor...' : 'Excel İçe Aktar'}
            </Text>
          </TouchableOpacity>
        </View>
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Yeni Müşteri Ekle</Text>

            <View style={styles.inputContainer}>
              <User size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ad Soyad"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Building size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Şirket Adı"
                value={companyName}
                onChangeText={setCompanyName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Mail size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="E-posta"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Phone size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Telefon"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Mail size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Şifre"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleAddCustomer}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Ekleniyor...' : 'Müşteri Ekle'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>Müşteriler ({customers.length})</Text>
          {customers.length === 0 ? (
            <Text style={styles.emptyText}>Henüz müşteri yok</Text>
          ) : (
            customers.map((customer) => (
              <View key={customer.id} style={styles.customerCard}>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{customer.profile?.full_name || 'N/A'}</Text>
                  <Text style={styles.customerCompany}>{customer.company_name}</Text>
                  <Text style={styles.customerDetail}>{customer.profile?.email || 'N/A'}</Text>
                  {customer.profile?.phone && (
                    <Text style={styles.customerDetail}>{customer.profile.phone}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteCustomer(customer.id, customer.profile_id)}
                  style={styles.deleteButton}
                >
                  <Trash2 size={20} color="#f44336" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
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
  content: {
    flex: 1,
    padding: 20,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  submitButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  customerCompany: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4caf50',
    marginBottom: 4,
  },
  customerDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  deleteButton: {
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    paddingVertical: 20,
  },
  excelActionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  excelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4caf50',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  excelButtonImport: {
    backgroundColor: '#2196f3',
  },
  excelButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
