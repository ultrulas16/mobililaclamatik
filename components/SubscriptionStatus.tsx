import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface Subscription {
  id: string;
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  trial_ends_at: string;
  current_period_end: string;
}

export function SubscriptionStatus() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    if (profile?.role === 'company' || profile?.company_id) {
      loadSubscription();
    } else {
      setLoading(false);
    }
  }, [profile]);

  const loadSubscription = async () => {
    try {
      let companyId: string | undefined;

      if (profile?.role === 'company') {
        const { data: companyData } = await supabase
          .from('companies')
          .select('id')
          .eq('owner_id', profile.id)
          .maybeSingle();

        companyId = companyData?.id;
      } else {
        companyId = profile?.company_id;
      }

      if (!companyId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSubscription(data);
        calculateDaysRemaining(data);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysRemaining = (sub: Subscription) => {
    const endDate = sub.status === 'trial'
      ? new Date(sub.trial_ends_at)
      : new Date(sub.current_period_end);

    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    setDaysRemaining(Math.max(0, days));
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#4caf50" />
      </View>
    );
  }

  if (!subscription || profile?.role === 'admin') {
    return null;
  }

  const getStatusConfig = () => {
    switch (subscription.status) {
      case 'trial':
        return {
          icon: <Clock size={20} color="#ff9800" />,
          color: '#fff3e0',
          textColor: '#e65100',
          borderColor: '#ff9800',
          title: t('trialPeriod'),
          message: `${daysRemaining} ${t('daysRemaining')}`,
        };
      case 'active':
        return {
          icon: <CheckCircle size={20} color="#4caf50" />,
          color: '#e8f5e9',
          textColor: '#2e7d32',
          borderColor: '#4caf50',
          title: t('subscriptionActive'),
          message: `${daysRemaining} ${t('daysUntilRenewal')}`,
        };
      case 'expired':
      case 'cancelled':
        return {
          icon: <AlertTriangle size={20} color="#f44336" />,
          color: '#ffebee',
          textColor: '#c62828',
          borderColor: '#f44336',
          title: t('subscriptionExpired'),
          message: t('renewToAccess'),
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <View style={[styles.container, { backgroundColor: config.color, borderColor: config.borderColor }]}>
      <View style={styles.content}>
        {config.icon}
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: config.textColor }]}>{config.title}</Text>
          <Text style={[styles.message, { color: config.textColor }]}>{config.message}</Text>
        </View>
      </View>
      {(subscription.status === 'expired' || subscription.status === 'cancelled') && (
        <TouchableOpacity style={styles.renewButton}>
          <Text style={styles.renewButtonText}>{t('renewNow')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    fontSize: 14,
    marginTop: 4,
  },
  renewButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  renewButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
