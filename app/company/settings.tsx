import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { PageLayout } from '@/components/PageLayout';
import { Card } from '@/components/Card';
import { Building, Mail, Phone, MapPin, FileText, Globe, Camera, Trash2, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { LanguageSelector } from '@/components/LanguageSelector';

interface CompanySettings {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_number: string | null;
  tax_office: string | null;
  logo_url: string | null;
  currency: string;
}

export default function CompanySettings() {
  const router = useRouter();
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  
  const [loading, setLoading] = useState(false);
  const [companyData, setCompanyData] = useState<CompanySettings | null>(null);
  
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [currency, setCurrency] = useState('TRY');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const currencies = [
    { code: 'TRY', symbol: '₺', name: 'Türk Lirası' },
    { code: 'USD', symbol: '$', name: 'Amerikan Doları' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'İngiliz Sterlini' },
  ];

  useEffect(() => {
    if (profile?.id) {
      loadCompanyData();
    }
  }, []);

  useEffect(() => {
    if (profile?.id && companyData === null) {
      loadCompanyData();
    }
  }, [profile?.id]);

  const loadCompanyData = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', profile?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCompanyData(data);
        setCompanyName(data.name || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setAddress(data.address || '');
        setTaxNumber(data.tax_number || '');
        setTaxOffice(data.tax_office || '');
        setLogoUrl(data.logo_url || '');
        setCurrency(data.currency || 'TRY');
      }
    } catch (error) {
      console.error('Error loading company data:', error);
      Alert.alert(t('error'), 'Şirket bilgileri yüklenemedi');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'SIL') return;

    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const apiUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-user-account`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || t('accountDeletionFailed'));
      }

      await supabase.auth.signOut();
      router.replace('/auth/login');
    } catch (error: any) {
      Alert.alert(t('error'), error.message || t('accountDeletionFailed'));
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeleteConfirmText('');
    }
  };

  const handleSave = async () => {
    if (!companyName.trim()) {
      Alert.alert(t('error'), `${t('companyName')} ${t('required')}`);
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        name: companyName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        tax_number: taxNumber.trim() || null,
        currency: currency,
        tax_office: taxOffice.trim() || null,
        logo_url: logoUrl.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('owner_id', profile?.id);

      if (error) throw error;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ company_name: companyName.trim() })
        .eq('id', profile?.id);

      if (profileError) {
        console.error('Error updating profile company name:', profileError);
      }

      Alert.alert(t('success'), t('settingsUpdatedSuccess'));
      
      setTimeout(async () => {
        await loadCompanyData();
      }, 500);
    } catch (error: any) {
      Alert.alert(t('error'), error.message || t('actionFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout
      title={t('companySettings')}
      headerGradient={['#10b981', '#059669', '#047857']}
    >
      <Card style={{ marginBottom: 20 }}>
        <Text style={styles.sectionTitle}>{t('companyLogo')}</Text>
        <View style={styles.logoContainer}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.logoImage} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Camera size={32} color="#999" />
              <Text style={styles.logoPlaceholderText}>{t('noLogo')}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.logoButton}>
            <Text style={styles.logoButtonText}>{t('changeLogo')}</Text>
          </TouchableOpacity>
        </View>
      </Card>

      <Card style={{ marginBottom: 20 }}>
        <Text style={styles.sectionTitle}>{t('companyInformation')}</Text>

        <View style={styles.inputContainer}>
          <Building size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={`${t('companyName')} *`}
            value={companyName}
            onChangeText={setCompanyName}
          />
        </View>

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
          <MapPin size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={t('address')}
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={3}
          />
        </View>
      </Card>

      <Card style={{ marginBottom: 20 }}>
        <Text style={styles.sectionTitle}>{t('taxInformation')}</Text>

        <View style={styles.inputContainer}>
          <FileText size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={t('taxNumber')}
            value={taxNumber}
            onChangeText={setTaxNumber}
          />
        </View>

        <View style={styles.inputContainer}>
          <Building size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={t('taxOffice')}
            value={taxOffice}
            onChangeText={setTaxOffice}
          />
        </View>
      </Card>

      <Card style={{ marginBottom: 20 }}>
        <Text style={styles.sectionTitle}>Para Birimi Ayarları</Text>
        <Text style={styles.sectionDescription}>
          Tüm fiyatlandırmalar ve finansal işlemler için kullanılacak para birimi
        </Text>

        <View style={styles.currencyGrid}>
          {currencies.map(curr => (
            <TouchableOpacity
              key={curr.code}
              style={[
                styles.currencyCard,
                currency === curr.code && styles.currencyCardActive
              ]}
              onPress={() => setCurrency(curr.code)}
            >
              <Text style={[
                styles.currencySymbol,
                currency === curr.code && styles.currencySymbolActive
              ]}>
                {curr.symbol}
              </Text>
              <Text style={[
                styles.currencyCode,
                currency === curr.code && styles.currencyCodeActive
              ]}>
                {curr.code}
              </Text>
              <Text style={[
                styles.currencyName,
                currency === curr.code && styles.currencyNameActive
              ]}>
                {curr.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card style={{ marginBottom: 20 }}>
        <Text style={styles.sectionTitle}>
          <Globe size={20} color="#333" /> {t('languageSettings')}
        </Text>
        <Text style={styles.sectionDescription}>
          {t('currentLanguage')}: {language.toUpperCase()}
        </Text>
        <View style={styles.languageContainer}>
          <LanguageSelector />
        </View>
      </Card>

      <TouchableOpacity
        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        <Text style={styles.saveButtonText}>
          {loading ? t('saving') : t('saveSettings')}
        </Text>
      </TouchableOpacity>

      <Card style={{ marginBottom: 40 }}>
        <Text style={styles.sectionTitle}>
          <AlertTriangle size={20} color="#f44336" /> {t('dataAndPrivacy')}
        </Text>
        <Text style={styles.sectionDescription}>
          Google Play politikaları gereği hesabınızı ve tüm verilerinizi silebilirsiniz.
        </Text>
        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={() => setShowDeleteModal(true)}
        >
          <Trash2 size={20} color="#fff" />
          <Text style={styles.deleteAccountButtonText}>{t('deleteAccountAndData')}</Text>
        </TouchableOpacity>
      </Card>

      <Modal visible={showDeleteModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AlertTriangle size={48} color="#f44336" />
              <Text style={styles.modalTitle}>{t('accountDeletion')}</Text>
            </View>

            <Text style={styles.warningText}>{t('deleteAccountWarning')}</Text>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>{t('deleteAccountInfo')}</Text>
              <Text style={styles.infoText}>{t('deleteAccountInfoCompany')}</Text>
            </View>

            <View style={styles.confirmInputContainer}>
              <Text style={styles.confirmLabel}>{t('typeDeleteToConfirm')}</Text>
              <TextInput
                style={styles.confirmInput}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder="SIL"
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                disabled={isDeleting}
              >
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmDeleteButton,
                  (deleteConfirmText !== 'SIL' || isDeleting) && styles.confirmDeleteButtonDisabled
                ]}
                onPress={handleDeleteAccount}
                disabled={deleteConfirmText !== 'SIL' || isDeleting}
              >
                <Text style={styles.confirmDeleteButtonText}>
                  {isDeleting ? t('deleting') : t('confirmDelete')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: 'center',
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  logoPlaceholderText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  logoButton: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  logoButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1e293b',
  },
  languageContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  saveButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  currencyCard: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  currencyCardActive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 8,
  },
  currencySymbolActive: {
    color: '#10b981',
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  currencyCodeActive: {
    color: '#10b981',
  },
  currencyName: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  currencyNameActive: {
    color: '#059669',
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  deleteAccountButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 12,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  infoBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 22,
  },
  confirmInputContainer: {
    marginBottom: 24,
  },
  confirmLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  confirmInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmDeleteButtonDisabled: {
    opacity: 0.5,
  },
  confirmDeleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
