import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ChevronDown, Calendar, MapPin, Save, Clock } from 'lucide-react-native';

interface Customer {
  id: string;
  company_name: string;
}

interface Branch {
  id: string;
  branch_name: string;
  address: string;
  latitude?: string;
  longitude?: string;
}

export default function NewVisitScreen() {
  const { t } = useLanguage();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [notes, setNotes] = useState('');

  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      loadBranches(selectedCustomer.id);
    } else {
      setBranches([]);
      setSelectedBranch(null);
    }
  }, [selectedCustomer]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: operatorData, error: operatorError } = await supabase
        .from('operators')
        .select('company_id')
        .eq('profile_id', profile?.id)
        .maybeSingle();

      if (operatorError) throw operatorError;
      if (!operatorData) {
        setError(t('noOperatorData'));
        return;
      }

      const { data, error: customersError } = await supabase
        .from('customers')
        .select('id, company_name')
        .eq('created_by_company_id', operatorData.company_id)
        .order('company_name');

      if (customersError) throw customersError;
      setCustomers(data || []);
    } catch (err: any) {
      console.error('Error loading customers:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('customer_branches')
        .select('id, branch_name, address, latitude, longitude')
        .eq('customer_id', customerId)
        .order('branch_name');

      if (error) throw error;
      setBranches(data || []);

      if (data && data.length === 1) {
        setSelectedBranch(data[0]);
      }
    } catch (err: any) {
      console.error('Error loading branches:', err);
      setError(err.message);
    }
  };

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTime = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDateTime = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = '00';
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  const formatDisplayDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(day);
    setSelectedDate(newDate);
  };

  const handleTimeSelect = (hours: number, minutes: number) => {
    const newDate = new Date(selectedDate);
    newDate.setHours(hours, minutes, 0, 0);
    setSelectedDate(newDate);
  };

  const handleSave = async () => {
    if (!selectedCustomer) {
      Alert.alert(t('error'), t('pleaseSelectCustomer'));
      return;
    }

    if (!selectedBranch) {
      Alert.alert(t('error'), t('pleaseSelectBranch'));
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const { data: operatorData } = await supabase
        .from('operators')
        .select('company_id')
        .eq('profile_id', profile?.id)
        .single();

      const { error: insertError } = await supabase
        .from('service_requests')
        .insert({
          customer_id: selectedCustomer.id,
          branch_id: selectedBranch.id,
          company_id: operatorData?.company_id,
          operator_id: profile?.id,
          status: 'pending',
          service_type: 'routine',
          scheduled_date: formatDateTime(selectedDate),
          notes: notes || null,
        });

      if (insertError) throw insertError;

      router.replace('/operator/visits');
    } catch (err: any) {
      console.error('Error creating visit:', err);
      setError(err.message);
      Alert.alert(t('error'), err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderDatePicker = () => {
    const today = new Date();
    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = day === selectedDate.getDate();
      const isToday = day === today.getDate() &&
                      currentMonth === today.getMonth() &&
                      currentYear === today.getFullYear();

      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.dayCell,
            isSelected && styles.selectedDay,
            isToday && !isSelected && styles.todayDay,
          ]}
          onPress={() => {
            handleDateSelect(day);
            setShowDatePicker(false);
          }}
        >
          <Text style={[
            styles.dayText,
            isSelected && styles.selectedDayText,
            isToday && !isSelected && styles.todayDayText,
          ]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.pickerContainer}>
        <View style={styles.pickerHeader}>
          <TouchableOpacity
            onPress={() => {
              const newDate = new Date(selectedDate);
              newDate.setMonth(newDate.getMonth() - 1);
              setSelectedDate(newDate);
            }}
          >
            <Text style={styles.pickerArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.pickerTitle}>
            {selectedDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity
            onPress={() => {
              const newDate = new Date(selectedDate);
              newDate.setMonth(newDate.getMonth() + 1);
              setSelectedDate(newDate);
            }}
          >
            <Text style={styles.pickerArrow}>→</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.weekDays}>
          {['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'].map((day) => (
            <Text key={day} style={styles.weekDayText}>{day}</Text>
          ))}
        </View>
        <View style={styles.daysGrid}>{days}</View>
      </View>
    );
  };

  const renderTimePicker = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = [0, 15, 30, 45];

    return (
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerTitle}>{t('selectTime')}</Text>
        <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
          {hours.map((hour) => (
            <View key={hour}>
              {minutes.map((minute) => {
                const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                const isSelected = hour === selectedDate.getHours() && minute === selectedDate.getMinutes();

                return (
                  <TouchableOpacity
                    key={`${hour}-${minute}`}
                    style={[styles.timeOption, isSelected && styles.selectedTimeOption]}
                    onPress={() => {
                      handleTimeSelect(hour, minute);
                      setShowTimePicker(false);
                    }}
                  >
                    <Text style={[styles.timeText, isSelected && styles.selectedTimeText]}>
                      {timeString}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('newVisit')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>
            {t('customer')} <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowCustomerDropdown(!showCustomerDropdown)}
          >
            <Text style={selectedCustomer ? styles.dropdownText : styles.dropdownPlaceholder}>
              {selectedCustomer ? selectedCustomer.company_name : t('selectCustomer')}
            </Text>
            <ChevronDown size={20} color="#6b7280" />
          </TouchableOpacity>

          {showCustomerDropdown && (
            <View style={styles.dropdownMenu}>
              {customers.length === 0 ? (
                <Text style={styles.emptyText}>{t('noCustomersFound')}</Text>
              ) : (
                customers.map((customer) => (
                  <TouchableOpacity
                    key={customer.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedCustomer(customer);
                      setShowCustomerDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{customer.company_name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>
            {t('branch')} <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={[styles.dropdown, !selectedCustomer && styles.dropdownDisabled]}
            onPress={() => selectedCustomer && setShowBranchDropdown(!showBranchDropdown)}
            disabled={!selectedCustomer}
          >
            <Text style={selectedBranch ? styles.dropdownText : styles.dropdownPlaceholder}>
              {selectedBranch ? selectedBranch.branch_name : t('selectBranch')}
            </Text>
            <ChevronDown size={20} color="#6b7280" />
          </TouchableOpacity>

          {showBranchDropdown && (
            <View style={styles.dropdownMenu}>
              {branches.length === 0 ? (
                <Text style={styles.emptyText}>{t('noBranchesFound')}</Text>
              ) : (
                branches.map((branch) => (
                  <TouchableOpacity
                    key={branch.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedBranch(branch);
                      setShowBranchDropdown(false);
                    }}
                  >
                    <View>
                      <Text style={styles.dropdownItemText}>{branch.branch_name}</Text>
                      {branch.address && (
                        <Text style={styles.dropdownItemSubtext}>{branch.address}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {selectedBranch && selectedBranch.address && (
            <View style={styles.addressContainer}>
              <MapPin size={16} color="#6b7280" />
              <Text style={styles.addressText}>{selectedBranch.address}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>
            {t('scheduledDate')} <Text style={styles.required}>*</Text>
          </Text>

          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowDatePicker(!showDatePicker)}
            >
              <Calendar size={20} color="#059669" />
              <Text style={styles.dateTimeButtonText}>
                {formatDisplayDate(selectedDate)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowTimePicker(!showTimePicker)}
            >
              <Clock size={20} color="#059669" />
              <Text style={styles.dateTimeButtonText}>
                {formatTime(selectedDate)}
              </Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && renderDatePicker()}
          {showTimePicker && renderTimePicker()}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('notes')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('addNotesOptional')}
            placeholderTextColor="#9ca3af"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Save size={20} color="#ffffff" />
              <Text style={styles.saveButtonText}>{t('planVisit')}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 28,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#1f2937',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#dc2626',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
  },
  dropdownDisabled: {
    backgroundColor: '#f3f4f6',
    opacity: 0.6,
  },
  dropdownText: {
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: '#9ca3af',
    flex: 1,
  },
  dropdownMenu: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#1f2937',
  },
  dropdownItemSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  emptyText: {
    padding: 16,
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  addressText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    flex: 1,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  dateTimeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  pickerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickerArrow: {
    fontSize: 24,
    color: '#059669',
    fontWeight: '600',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  selectedDay: {
    backgroundColor: '#059669',
    borderRadius: 8,
  },
  todayDay: {
    borderWidth: 2,
    borderColor: '#059669',
    borderRadius: 8,
  },
  dayText: {
    fontSize: 14,
    color: '#1f2937',
  },
  selectedDayText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  todayDayText: {
    color: '#059669',
    fontWeight: '600',
  },
  timeScroll: {
    maxHeight: 300,
    marginTop: 12,
  },
  timeOption: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#f9fafb',
  },
  selectedTimeOption: {
    backgroundColor: '#059669',
  },
  timeText: {
    fontSize: 16,
    color: '#1f2937',
    textAlign: 'center',
  },
  selectedTimeText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  input: {
    fontSize: 16,
    color: '#1f2937',
    padding: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#6ee7b7',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  bottomPadding: {
    height: 40,
  },
});
