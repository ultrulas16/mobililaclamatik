import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, User, Mail, Phone, MapPin, Building, Trash2, CreditCard as Edit2, Search } from 'lucide-react-native';

interface Customer {
  id: string;
  profile_id: string;
  company_name: string;
  profile: {
    full_name: string;
    email: string;
  } | null;
}

interface Branch {
  id: string;
  customer_id: string;
  profile_id: string;
  branch_name: string;
  address: string;
  phone: string | null;
  customer: {
    company_name: string;
  } | null;
  profile: {
    full_name: string;
    email: string;
    phone: string;
  } | null;
}

export default function ManageCustomerBranches() {
  const router = useRouter();
  const { profile } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [branchName, setBranchName] = useState('');
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCustomers();
    loadBranches();
  }, []);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          profile:profiles!customers_profile_id_fkey(full_name, email)
        `)
        .eq('created_by_company_id', profile?.company_id)
        .order('company_name', { ascending: true });

      if (error) throw error;
      const validCustomers = (data || []).filter(c => c.profile !== null);
      setCustomers(validCustomers);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_branches')
        .select(`
          *,
          customer:customers!customer_branches_customer_id_fkey(company_name),
          profile:profiles!customer_branches_profile_id_fkey(full_name, email, phone)
        `)
        .eq('created_by_company_id', profile?.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const handleAddBranch = async () => {
    if (!selectedCustomer || !email || !password || !fullName || !branchName || !address) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/create-branch`, {
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
          branch_name: branchName,
          address,
          customer_id: selectedCustomer,
          created_by_company_id: profile?.company_id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add branch');
      }

      Alert.alert('Success', 'Branch added successfully');
      resetForm();
      loadBranches();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add branch');
    } finally {
      setLoading(false);
    }
  };

  const handleEditBranch = async () => {
    if (!editingBranch || !branchName || !address) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const { error: branchError } = await supabase
        .from('customer_branches')
        .update({
          branch_name: branchName,
          address,
          phone,
        })
        .eq('id', editingBranch.id);

      if (branchError) throw branchError;

      if (fullName || email || phone) {
        const updateData: any = {};
        if (fullName) updateData.full_name = fullName;
        if (phone) updateData.phone = phone;

        const { error: profileError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', editingBranch.profile_id);

        if (profileError) throw profileError;
      }

      if (password) {
        const passwordBase64 = btoa(password);
        const { error: passwordError } = await supabase
          .from('user_passwords')
          .upsert({
            profile_id: editingBranch.profile_id,
            encrypted_password: passwordBase64,
            created_by: profile?.id,
          });

        if (passwordError) throw passwordError;
      }

      Alert.alert('Success', 'Branch updated successfully');
      resetForm();
      loadBranches();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update branch');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBranch = async (branchId: string, profileId: string) => {
    Alert.alert(
      'Delete Branch',
      'Are you sure you want to delete this branch?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error: branchError } = await supabase
                .from('customer_branches')
                .delete()
                .eq('id', branchId);

              if (branchError) throw branchError;

              await supabase.from('user_passwords').delete().eq('profile_id', profileId);
              await supabase.from('profiles').delete().eq('id', profileId);

              loadBranches();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete branch');
            }
          },
        },
      ]
    );
  };

  const startEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setSelectedCustomer(branch.customer_id);
    setBranchName(branch.branch_name);
    setAddress(branch.address);
    setPhone(branch.phone || '');
    setFullName(branch.profile?.full_name || '');
    setEmail(branch.profile?.email || '');
    setPassword('');
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingBranch(null);
    setSelectedCustomer('');
    setEmail('');
    setPassword('');
    setFullName('');
    setPhone('');
    setBranchName('');
    setAddress('');
  };

  const filteredBranches = branches.filter(branch =>
    branch.branch_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.customer?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customer Branches</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} style={styles.addButton}>
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search branches..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>Branches ({filteredBranches.length})</Text>
          {filteredBranches.length === 0 ? (
            <Text style={styles.emptyText}>No branches yet</Text>
          ) : (
            filteredBranches.map((branch) => (
              <View key={branch.id} style={styles.branchCard}>
                <View style={styles.branchInfo}>
                  <Text style={styles.branchName}>{branch.branch_name}</Text>
                  <Text style={styles.customerName}>{branch.customer?.company_name}</Text>
                  <Text style={styles.branchAddress}>{branch.address}</Text>
                  <Text style={styles.branchDetail}>Manager: {branch.profile?.full_name || 'N/A'}</Text>
                  <Text style={styles.branchDetail}>{branch.profile?.email || 'N/A'}</Text>
                  {branch.profile?.phone && (
                    <Text style={styles.branchDetail}>{branch.profile.phone}</Text>
                  )}
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity onPress={() => startEdit(branch)} style={styles.editButton}>
                    <Edit2 size={20} color="#2196f3" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteBranch(branch.id, branch.profile_id)}
                    style={styles.deleteButton}
                  >
                    <Trash2 size={20} color="#f44336" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={showForm} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.formTitle}>
                {editingBranch ? 'Edit Branch' : 'Add New Branch'}
              </Text>

              {!editingBranch && (
                <View style={styles.pickerContainer}>
                  <Building size={20} color="#666" style={styles.inputIcon} />
                  <View style={styles.pickerWrapper}>
                    <Text style={styles.pickerLabel}>Select Customer</Text>
                    <ScrollView horizontal style={styles.customerPicker}>
                      {customers.map((customer) => (
                        <TouchableOpacity
                          key={customer.id}
                          style={[
                            styles.customerOption,
                            selectedCustomer === customer.id && styles.customerOptionSelected,
                          ]}
                          onPress={() => setSelectedCustomer(customer.id)}
                        >
                          <Text
                            style={[
                              styles.customerOptionText,
                              selectedCustomer === customer.id && styles.customerOptionTextSelected,
                            ]}
                          >
                            {customer.company_name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              )}

              <View style={styles.inputContainer}>
                <Building size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Branch Name"
                  value={branchName}
                  onChangeText={setBranchName}
                />
              </View>

              <View style={styles.inputContainer}>
                <MapPin size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Address"
                  value={address}
                  onChangeText={setAddress}
                  multiline
                />
              </View>

              <View style={styles.inputContainer}>
                <Phone size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Branch Phone"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <Text style={styles.sectionTitle}>Manager Details</Text>

              <View style={styles.inputContainer}>
                <User size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Manager Full Name"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>

              {!editingBranch && (
                <>
                  <View style={styles.inputContainer}>
                    <Mail size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Manager Email"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
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
                </>
              )}

              {editingBranch && (
                <View style={styles.inputContainer}>
                  <Mail size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="New Password (leave empty to keep current)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={editingBranch ? handleEditBranch : handleAddBranch}
                  disabled={loading}
                >
                  <Text style={styles.submitButtonText}>
                    {loading ? 'Saving...' : editingBranch ? 'Update' : 'Add Branch'}
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
  content: {
    flex: 1,
    padding: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
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
  branchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  branchInfo: {
    flex: 1,
  },
  branchName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4caf50',
    marginBottom: 4,
  },
  branchAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  branchDetail: {
    fontSize: 13,
    color: '#999',
    marginBottom: 2,
  },
  actionButtons: {
    flexDirection: 'row',
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
    paddingVertical: 20,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 12,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pickerWrapper: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  customerPicker: {
    flexDirection: 'row',
  },
  customerOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  customerOptionSelected: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  customerOptionText: {
    fontSize: 14,
    color: '#666',
  },
  customerOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
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
});
