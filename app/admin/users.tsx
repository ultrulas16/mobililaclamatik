import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Search, Edit2, Trash2, Calendar, CheckCircle, XCircle } from 'lucide-react-native';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  company_name: string | null;
  created_at: string;
}

interface Subscription {
  id: string;
  company_id: string;
  status: string;
  trial_ends_at: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export default function AdminUsersManagement() {
  const router = useRouter();
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', email: '' });
  const [subscriptionData, setSubscriptionData] = useState<Subscription | null>(null);
  const [subscriptionForm, setSubscriptionForm] = useState({
    status: 'active',
    trial_ends_at: '',
    current_period_end: '',
  });

  useEffect(() => {
    if (profile?.role !== 'admin') {
      router.replace('/');
      return;
    }
    fetchUsers();
  }, [profile]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscription = async (userId: string) => {
    try {
      const { data: companies } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', userId)
        .single();

      if (companies) {
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('company_id', companies.id)
          .single();

        setSubscriptionData(subscription);
        if (subscription) {
          setSubscriptionForm({
            status: subscription.status,
            trial_ends_at: subscription.trial_ends_at?.split('T')[0] || '',
            current_period_end: subscription.current_period_end?.split('T')[0] || '',
          });
        }
      }
    } catch (error: any) {
      console.error('Subscription fetch error:', error);
    }
  };

  const handleEditUser = (user: Profile) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name,
      phone: user.phone || '',
      email: user.email,
    });
    setEditModalVisible(true);
  };

  const handleManageSubscription = async (user: Profile) => {
    setSelectedUser(user);
    await fetchSubscription(user.id);
    setSubscriptionModalVisible(true);
  };

  const saveUserChanges = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          phone: editForm.phone,
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      Alert.alert('Başarılı', 'Kullanıcı bilgileri güncellendi');
      setEditModalVisible(false);
      fetchUsers();
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const saveSubscriptionChanges = async () => {
    if (!subscriptionData) return;

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: subscriptionForm.status,
          trial_ends_at: subscriptionForm.trial_ends_at,
          current_period_end: subscriptionForm.current_period_end,
        })
        .eq('id', subscriptionData.id);

      if (error) throw error;

      Alert.alert('Başarılı', 'Abonelik güncellendi');
      setSubscriptionModalVisible(false);
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    Alert.alert(
      'Kullanıcıyı Sil',
      `${userEmail} kullanıcısını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('profiles').delete().eq('id', userId);
              if (error) throw error;
              Alert.alert('Başarılı', 'Kullanıcı silindi');
              fetchUsers();
            } catch (error: any) {
              Alert.alert('Hata', error.message);
            }
          },
        },
      ]
    );
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#f44336';
      case 'company':
        return '#4caf50';
      case 'operator':
        return '#2196f3';
      case 'customer':
        return '#ff9800';
      default:
        return '#9e9e9e';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4caf50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('manageUsers')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Kullanıcı ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{users.length}</Text>
            <Text style={styles.statLabel}>Toplam Kullanıcı</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{users.filter((u) => u.role === 'company').length}</Text>
            <Text style={styles.statLabel}>Firma</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{users.filter((u) => u.role === 'operator').length}</Text>
            <Text style={styles.statLabel}>Operatör</Text>
          </View>
        </View>

        {filteredUsers.map((user) => (
          <View key={user.id} style={styles.userCard}>
            <View style={styles.userInfo}>
              <View style={styles.userHeader}>
                <Text style={styles.userName}>{user.full_name}</Text>
                <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(user.role) }]}>
                  <Text style={styles.roleText}>{user.role}</Text>
                </View>
              </View>
              <Text style={styles.userEmail}>{user.email}</Text>
              {user.phone && <Text style={styles.userPhone}>{user.phone}</Text>}
              {user.company_name && <Text style={styles.userCompany}>Firma: {user.company_name}</Text>}
              <Text style={styles.userDate}>
                Kayıt: {new Date(user.created_at).toLocaleDateString('tr-TR')}
              </Text>
            </View>

            <View style={styles.userActions}>
              {user.role === 'company' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.subscriptionButton]}
                  onPress={() => handleManageSubscription(user)}
                >
                  <Calendar size={18} color="#fff" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => handleEditUser(user)}
              >
                <Edit2 size={18} color="#fff" />
              </TouchableOpacity>
              {user.role !== 'admin' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => deleteUser(user.id, user.email)}
                >
                  <Trash2 size={18} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Kullanıcıyı Düzenle</Text>

            <Text style={styles.inputLabel}>Ad Soyad</Text>
            <TextInput
              style={styles.input}
              value={editForm.full_name}
              onChangeText={(text) => setEditForm({ ...editForm, full_name: text })}
            />

            <Text style={styles.inputLabel}>Telefon</Text>
            <TextInput
              style={styles.input}
              value={editForm.phone}
              onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>E-posta (değiştirilemez)</Text>
            <TextInput style={[styles.input, styles.disabledInput]} value={editForm.email} editable={false} />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={saveUserChanges}>
                <Text style={styles.saveButtonText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={subscriptionModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Abonelik Yönetimi</Text>

            {subscriptionData ? (
              <>
                <Text style={styles.inputLabel}>Durum</Text>
                <View style={styles.statusButtons}>
                  {['trial', 'active', 'expired', 'cancelled'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusButton,
                        subscriptionForm.status === status && styles.statusButtonActive,
                      ]}
                      onPress={() => setSubscriptionForm({ ...subscriptionForm, status })}
                    >
                      <Text
                        style={[
                          styles.statusButtonText,
                          subscriptionForm.status === status && styles.statusButtonTextActive,
                        ]}
                      >
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Deneme Bitiş Tarihi</Text>
                <TextInput
                  style={styles.input}
                  value={subscriptionForm.trial_ends_at}
                  onChangeText={(text) => setSubscriptionForm({ ...subscriptionForm, trial_ends_at: text })}
                  placeholder="YYYY-MM-DD"
                />

                <Text style={styles.inputLabel}>Abonelik Bitiş Tarihi</Text>
                <TextInput
                  style={styles.input}
                  value={subscriptionForm.current_period_end}
                  onChangeText={(text) =>
                    setSubscriptionForm({ ...subscriptionForm, current_period_end: text })
                  }
                  placeholder="YYYY-MM-DD"
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setSubscriptionModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={saveSubscriptionChanges}
                  >
                    <Text style={styles.saveButtonText}>Kaydet</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={styles.noSubscriptionText}>Bu kullanıcının aboneliği bulunmuyor</Text>
            )}
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4caf50',
    paddingTop: 44,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
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
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userCompany: {
    fontSize: 14,
    color: '#4caf50',
    marginBottom: 4,
    fontWeight: '600',
  },
  userDate: {
    fontSize: 12,
    color: '#999',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#2196f3',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  subscriptionButton: {
    backgroundColor: '#ff9800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  disabledInput: {
    backgroundColor: '#e0e0e0',
    color: '#999',
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  statusButtonActive: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  statusButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  statusButtonTextActive: {
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  saveButton: {
    backgroundColor: '#4caf50',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noSubscriptionText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    paddingVertical: 20,
  },
});
