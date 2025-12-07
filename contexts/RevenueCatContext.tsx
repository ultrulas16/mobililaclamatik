import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  PurchasesOffering,
  CustomerInfo,
  PurchasesPackage
} from 'react-native-purchases';
import { supabase } from '@/lib/supabase';

interface RevenueCatContextType {
  offerings: PurchasesOffering | null;
  customerInfo: CustomerInfo | null;
  isLoading: boolean;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
}

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(undefined);

export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeRevenueCat();
  }, []);

  const initializeRevenueCat = async () => {
    if (Platform.OS === 'web') {
      setIsLoading(false);
      return;
    }

    try {
      const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

      if (!apiKey) {
        console.error('RevenueCat API key not found');
        setIsLoading(false);
        return;
      }

      Purchases.configure({ apiKey });

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await Purchases.logIn(user.id);
      }

      const offerings = await Purchases.getOfferings();
      if (offerings.current) {
        setOfferings(offerings.current);
      }

      const customerInfo = await Purchases.getCustomerInfo();
      setCustomerInfo(customerInfo);

    } catch (error) {
      console.error('Error initializing RevenueCat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const purchasePackage = async (pkg: PurchasesPackage): Promise<boolean> => {
    if (Platform.OS === 'web') {
      console.warn('In-app purchases not available on web');
      return false;
    }

    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(customerInfo);

      const activeSubscription = Object.keys(customerInfo.entitlements.active).length > 0;

      if (activeSubscription) {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .single();

          const companyId = profile?.company_id || user.id;

          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + getPeriodDuration(pkg.identifier)).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('company_id', companyId);
        }
      }

      return activeSubscription;
    } catch (error: any) {
      if (!error.userCancelled) {
        console.error('Error purchasing package:', error);
      }
      return false;
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return false;
    }

    try {
      const customerInfo = await Purchases.restorePurchases();
      setCustomerInfo(customerInfo);

      const activeSubscription = Object.keys(customerInfo.entitlements.active).length > 0;
      return activeSubscription;
    } catch (error) {
      console.error('Error restoring purchases:', error);
      return false;
    }
  };

  const getPeriodDuration = (identifier: string): number => {
    if (identifier.includes('monthly')) {
      return 30 * 24 * 60 * 60 * 1000;
    } else if (identifier.includes('6_month')) {
      return 180 * 24 * 60 * 60 * 1000;
    } else if (identifier.includes('annual')) {
      return 365 * 24 * 60 * 60 * 1000;
    }
    return 30 * 24 * 60 * 60 * 1000;
  };

  return (
    <RevenueCatContext.Provider
      value={{
        offerings,
        customerInfo,
        isLoading,
        purchasePackage,
        restorePurchases,
      }}
    >
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat() {
  const context = useContext(RevenueCatContext);
  if (context === undefined) {
    throw new Error('useRevenueCat must be used within a RevenueCatProvider');
  }
  return context;
}
