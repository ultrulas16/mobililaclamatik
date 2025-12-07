import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, Platform } from 'react-native';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { Globe, ChevronDown, X, Check } from 'lucide-react-native';

const languages: { code: Language; name: string; flag: string }[] = [
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'az', name: 'Azərbaycan', flag: '🇦🇿' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },  
  { code: 'ru', name: 'Русский', flag: '🇷🇺' }, // Rusça Eklendi
];

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);

  const currentLang = languages.find((l) => l.code === language) || languages[0];

  return (
    <View>
      <TouchableOpacity
        style={styles.triggerButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.triggerContent}>
          <Globe size={18} color="#4caf50" style={styles.icon} />
          <Text style={styles.triggerText}>{currentLang.name}</Text>
          <Text style={styles.triggerFlag}>{currentLang.flag}</Text>
        </View>
        <ChevronDown size={16} color="#666" />
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Dil Seçin / Select Language</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={languages}
              keyExtractor={(item) => item.code}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageItem,
                    language === item.code && styles.activeItem,
                  ]}
                  onPress={() => {
                    setLanguage(item.code);
                    setModalVisible(false);
                  }}
                >
                  <View style={styles.languageInfo}>
                    <Text style={styles.itemFlag}>{item.flag}</Text>
                    <Text
                      style={[
                        styles.itemText,
                        language === item.code && styles.activeItemText,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </View>
                  {language === item.code && (
                    <Check size={18} color="#4caf50" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 160,
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  triggerText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginRight: 8,
  },
  triggerFlag: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 340,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  activeItem: {
    backgroundColor: '#f0fdf4',
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  itemText: {
    fontSize: 15,
    color: '#333',
  },
  activeItemText: {
    color: '#4caf50',
    fontWeight: '700',
  },
});