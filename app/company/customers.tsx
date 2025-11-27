import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, User, Mail, Phone, Building, Trash2 } from 'lucide-react-native';

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Customers</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)} style={styles.addButton}>
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Add New Customer</Text>

            <View style={styles.inputContainer}>
              <User size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Building size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Company Name"
                value={companyName}
                onChangeText={setCompanyName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Mail size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
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
                placeholder="Phone"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Mail size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
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
                {loading ? 'Adding...' : 'Add Customer'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>Customers ({customers.length})</Text>
          {customers.length === 0 ? (
            <Text style={styles.emptyText}>No customers yet</Text>
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
});
