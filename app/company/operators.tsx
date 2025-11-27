import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, User, Mail, Phone, Trash2, CreditCard as Edit2, Eye, EyeOff, Key } from 'lucide-react-native';

interface Operator {
  id: string;
  profile_id: string;
  full_name: string;
  email: string;
  phone: string;
}

interface UserPassword {
  encrypted_password: string;
}

export default function ManageOperators() {
  const router = useRouter();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadOperators();
  }, []);

  const loadOperators = async () => {
    try {
      const profileCompanyId = profile?.role === 'company' ? profile.id : profile?.company_id;

      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', profileCompanyId)
        .maybeSingle();

      if (companyError || !companyData) {
        console.error('Company not found');
        setOperators([]);
        return;
      }

      const { data, error } = await supabase
        .from('operators')
        .select('*')
        .eq('company_id', companyData.id);

      if (error) throw error;
      setOperators(data || []);

      for (const operator of data || []) {
        await loadPassword(operator.profile_id);
      }
    } catch (error) {
      console.error('Error loading operators:', error);
    }
  };

  const loadPassword = async (profileId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_passwords')
        .select('encrypted_password')
        .eq('profile_id', profileId)
        .maybeSingle();

      if (data && !error) {
        const decrypted = atob(data.encrypted_password);
        setPasswords(prev => ({ ...prev, [profileId]: decrypted }));
      }
    } catch (error) {
      console.error('Error loading password:', error);
    }
  };

  const togglePasswordVisibility = (profileId: string) => {
    setShowPassword(prev => ({ ...prev, [profileId]: !prev[profileId] }));
  };

  const handleAddOperator = async () => {
    if (!email || !password || !fullName) {
      setError(t('fillAllFields'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const profileCompanyId = profile?.role === 'company' ? profile.id : profile?.company_id;

      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/create-operator`, {
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
          company_id: profileCompanyId,
          company_name: profile?.company_name,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add operator');
      }

      const passwordBase64 = btoa(password);
      await supabase
        .from('user_passwords')
        .insert({
          profile_id: result.user_id,
          encrypted_password: passwordBase64,
          created_by: profile?.id,
        });

      Alert.alert(t('success'), t('operatorAddedSuccess'));
      resetForm();
      await loadOperators();
    } catch (error: any) {
      console.error('Error adding operator:', error);
      setError(error.message || t('failedToAddOperator'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditOperator = async () => {
    if (!editingOperator || !fullName) {
      setError('Please fill all required fields');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { error: operatorError } = await supabase
        .from('operators')
        .update({
          full_name: fullName,
          phone,
        })
        .eq('id', editingOperator.id);

      if (operatorError) throw operatorError;

      const updateData: any = { full_name: fullName };
      if (phone) updateData.phone = phone;

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', editingOperator.profile_id);

      if (profileError) throw profileError;

      if (password) {
        const passwordBase64 = btoa(password);
        const { error: passwordError } = await supabase
          .from('user_passwords')
          .upsert({
            profile_id: editingOperator.profile_id,
            encrypted_password: passwordBase64,
            created_by: profile?.id,
          });

        if (passwordError) throw passwordError;
      }

      Alert.alert(t('success'), 'Operator updated successfully');
      resetForm();
      await loadOperators();
    } catch (error: any) {
      console.error('Error updating operator:', error);
      setError(error.message || 'Failed to update operator');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOperator = async (operatorId: string, profileId: string) => {
    Alert.alert(
      t('deleteOperator'),
      'Are you sure you want to delete this operator?',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error: operatorError } = await supabase
                .from('operators')
                .delete()
                .eq('id', operatorId);

              if (operatorError) throw operatorError;

              await supabase.from('user_passwords').delete().eq('profile_id', profileId);
              await supabase.from('profiles').delete().eq('id', profileId);

              await loadOperators();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete operator');
            }
          },
        },
      ]
    );
  };

  const startEdit = (operator: Operator) => {
    setEditingOperator(operator);
    setFullName(operator.full_name);
    setEmail(operator.email);
    setPhone(operator.phone || '');
    setPassword('');
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingOperator(null);
    setEmail('');
    setPassword('');
    setFullName('');
    setPhone('');
    setError('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('manageOperators')}</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} style={styles.addButton}>
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>{t('operators')} ({operators.length})</Text>
          {operators.length === 0 ? (
            <Text style={styles.emptyText}>No operators yet</Text>
          ) : (
            operators.map((operator) => (
              <View key={operator.id} style={styles.operatorCard}>
                <View style={styles.operatorInfo}>
                  <Text style={styles.operatorName}>{operator.full_name}</Text>
                  <Text style={styles.operatorDetail}>{operator.email}</Text>
                  {operator.phone && (
                    <Text style={styles.operatorDetail}>{operator.phone}</Text>
                  )}
                  {passwords[operator.profile_id] && (
                    <View style={styles.passwordRow}>
                      <Key size={14} color="#666" />
                      <Text style={styles.passwordText}>
                        {showPassword[operator.profile_id]
                          ? passwords[operator.profile_id]
                          : '••••••••'}
                      </Text>
                      <TouchableOpacity
                        onPress={() => togglePasswordVisibility(operator.profile_id)}
                        style={styles.eyeButton}
                      >
                        {showPassword[operator.profile_id] ? (
                          <EyeOff size={16} color="#666" />
                        ) : (
                          <Eye size={16} color="#666" />
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity onPress={() => startEdit(operator)} style={styles.editButton}>
                    <Edit2 size={20} color="#2196f3" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteOperator(operator.id, operator.profile_id)}
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
            <Text style={styles.formTitle}>
              {editingOperator ? 'Edit Operator' : t('addNewOperator')}
            </Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.inputContainer}>
              <User size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('fullName')}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            {!editingOperator && (
              <View style={styles.inputContainer}>
                <Mail size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('email')}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Phone size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('phone')}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Mail size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={editingOperator ? 'New Password (leave empty to keep current)' : t('password')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={editingOperator ? handleEditOperator : handleAddOperator}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? 'Saving...' : editingOperator ? 'Update' : t('addOperator')}
                </Text>
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
  operatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  operatorInfo: {
    flex: 1,
  },
  operatorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  operatorDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  passwordText: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'monospace',
  },
  eyeButton: {
    padding: 4,
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
    maxHeight: '80%',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
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

