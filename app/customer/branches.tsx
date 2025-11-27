import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, User, Mail, Phone, MapPin, Building, Trash2 } from 'lucide-react-native';

interface Branch {
  id: string;
  profile_id: string;
  branch_name: string;
  address: string;
  profile: {
    full_name: string;
    email: string;
    phone: string;
  } | null;
}

export default function ManageBranches() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [branchName, setBranchName] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    loadCustomerId();
  }, []);

  useEffect(() => {
    if (customerId) {
      loadBranches();
    }
  }, [customerId]);

  const loadCustomerId = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setCustomerId(data?.id || null);
    } catch (error) {
      console.error('Error loading customer ID:', error);
    }
  };

  const loadBranches = async () => {
    if (!customerId) return;

    try {
      const { data, error } = await supabase
        .from('customer_branches')
        .select(`
          *,
          profile:profiles!customer_branches_profile_id_fkey(full_name, email, phone)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Loaded branches:', data);
      const validBranches = (data || []).filter(b => b.profile !== null);
      setBranches(validBranches);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const handleAddBranch = async () => {
    if (!email || !password || !fullName || !branchName || !address) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (!customerId) {
      Alert.alert('Error', 'Customer ID not found');
      return;
    }

    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email,
            full_name: fullName,
            phone,
            role: 'customer_branch',
            company_name: profile?.company_name,
          });

        if (profileError) throw profileError;

        const { error: branchError } = await supabase
          .from('customer_branches')
          .insert({
            profile_id: authData.user.id,
            customer_id: customerId,
            branch_name: branchName,
            address: address,
          });

        if (branchError) throw branchError;

        Alert.alert('Success', 'Branch added successfully');
        setShowForm(false);
        setEmail('');
        setPassword('');
        setFullName('');
        setPhone('');
        setBranchName('');
        setAddress('');
        loadBranches();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add branch');
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

              const { error: profileError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', profileId);

              if (profileError) throw profileError;

              loadBranches();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete branch');
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
        <Text style={styles.headerTitle}>My Branches</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)} style={styles.addButton}>
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Add New Branch</Text>

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
              />
            </View>

            <View style={styles.inputContainer}>
              <User size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Manager Full Name"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

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
              <Phone size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Manager Phone"
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
              onPress={handleAddBranch}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Adding...' : 'Add Branch'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>Branches ({branches.length})</Text>
          {branches.length === 0 ? (
            <Text style={styles.emptyText}>No branches yet</Text>
          ) : (
            branches.map((branch) => (
              <View key={branch.id} style={styles.branchCard}>
                <View style={styles.branchInfo}>
                  <Text style={styles.branchName}>{branch.branch_name}</Text>
                  <Text style={styles.branchAddress}>{branch.address}</Text>
                  <Text style={styles.branchManager}>Manager: {branch.profile?.full_name || 'N/A'}</Text>
                  <Text style={styles.branchDetail}>{branch.profile?.email || 'N/A'}</Text>
                  {branch.profile?.phone && (
                    <Text style={styles.branchDetail}>{branch.profile.phone}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteBranch(branch.id, branch.profile_id)}
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
  branchAddress: {
    fontSize: 14,
    color: '#4caf50',
    marginBottom: 6,
  },
  branchManager: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  branchDetail: {
    fontSize: 13,
    color: '#999',
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
