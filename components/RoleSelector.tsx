import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { UserRole } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface RoleSelectorProps {
  selectedRole: UserRole | null;
  onSelectRole: (role: UserRole) => void;
}

const roles: UserRole[] = ['company', 'operator', 'customer', 'customer_branch'];

const roleTranslationMap: Record<UserRole, string> = {
  admin: 'admin',
  company: 'company',
  operator: 'operator',
  customer: 'customer',
  customer_branch: 'customerBranch',
};

export function RoleSelector({ selectedRole, onSelectRole }: RoleSelectorProps) {
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('selectRole')}</Text>
      <View style={styles.rolesContainer}>
        {roles.map((role) => (
          <TouchableOpacity
            key={role}
            style={[styles.roleButton, selectedRole === role && styles.activeRoleButton]}
            onPress={() => onSelectRole(role)}
          >
            <Text style={[styles.roleText, selectedRole === role && styles.activeRoleText]}>
              {t(roleTranslationMap[role] as any)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  roleButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: '47%',
    alignItems: 'center',
  },
  activeRoleButton: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  roleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeRoleText: {
    color: '#1976d2',
    fontWeight: '700',
  },
});
