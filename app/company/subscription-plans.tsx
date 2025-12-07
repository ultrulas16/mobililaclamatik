import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useRevenueCat } from '@/contexts/RevenueCatContext';
import { ArrowLeft, Check, Crown } from 'lucide-react-native';

const SUBSCRIPTION_FEATURES = [
  'Sınırsız ziyaret kaydı',
  'Operatör yönetimi',
  'Müşteri ve şube takibi',
  'Depo yönetimi',
  'Raporlama ve analiz',
  'Teknik destek',
];

export default function SubscriptionPlans() {
  const router = useRouter();
  const { profile } = useAuth();
  const { offerings, isLoading, purchasePackage } = useRevenueCat();
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const handlePurchase = async (packageIdentifier: string) => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Mobil Uygulama Gerekli',
        'Abonelik satın alımı sadece iOS ve Android uygulamalarında yapılabilir. Lütfen mobil cihazınızdan uygulamayı indirin.'
      );
      return;
    }

    const pkg = offerings?.availablePackages.find(p => p.identifier === packageIdentifier);

    if (!pkg) {
      Alert.alert('Hata', 'Paket bulunamadı');
      return;
    }

    setPurchasing(packageIdentifier);

    try {
      const success = await purchasePackage(pkg);

      if (success) {
        Alert.alert(
          'Başarılı!',
          'Aboneliğiniz aktif hale getirildi.',
          [
            {
              text: 'Tamam',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert('İptal', 'Satın alma işlemi iptal edildi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Satın alma sırasında bir hata oluştu');
    } finally {
      setPurchasing(null);
    }
  };

  const getPlanDetails = (identifier: string) => {
    if (identifier.toLowerCase().includes('monthly') || identifier.includes('1_month')) {
      return {
        name: 'Aylık Plan',
        duration: '30 gün',
        icon: '📅',
        color: '#4caf50',
      };
    } else if (identifier.toLowerCase().includes('6_month') || identifier.includes('6')) {
      return {
        name: '6 Aylık Plan',
        duration: '180 gün',
        icon: '📊',
        color: '#2196f3',
        badge: '10% İndirim',
      };
    } else if (identifier.toLowerCase().includes('annual') || identifier.toLowerCase().includes('yearly')) {
      return {
        name: 'Yıllık Plan',
        duration: '365 gün',
        icon: '👑',
        color: '#ff9800',
        badge: '20% İndirim',
      };
    }
    return {
      name: identifier,
      duration: '',
      icon: '📦',
      color: '#4caf50',
    };
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Abonelik Planları</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4caf50" />
          <Text style={styles.loadingText}>Abonelik planları yükleniyor...</Text>
        </View>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Abonelik Planları</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.webNoticeContainer}>
          <Crown size={64} color="#ff9800" />
          <Text style={styles.webNoticeTitle}>Mobil Uygulama Gerekli</Text>
          <Text style={styles.webNoticeText}>
            Abonelik satın alımı sadece iOS ve Android uygulamalarımızdan yapılabilir.
          </Text>
          <Text style={styles.webNoticeSubtext}>
            Lütfen Google Play Store veya Apple App Store'dan uygulamamızı indirin.
          </Text>
        </View>
      </View>
    );
  }

  const packages = offerings?.availablePackages || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Abonelik Planları</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Premium'a Geçin</Text>
          <Text style={styles.introText}>
            İşinizi daha verimli yönetin ve tüm özelliklere erişin
          </Text>
        </View>

        {packages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Şu anda abonelik planı bulunmamaktadır</Text>
            <Text style={styles.emptySubtext}>
              Lütfen daha sonra tekrar deneyin veya destek ekibimizle iletişime geçin
            </Text>
          </View>
        ) : (
          packages.map((pkg) => {
            const details = getPlanDetails(pkg.identifier);
            const isPurchasing = purchasing === pkg.identifier;

            return (
              <View
                key={pkg.identifier}
                style={[
                  styles.planCard,
                  details.badge && styles.planCardHighlighted,
                ]}
              >
                {details.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{details.badge}</Text>
                  </View>
                )}

                <View style={styles.planHeader}>
                  <Text style={styles.planIcon}>{details.icon}</Text>
                  <View style={styles.planInfo}>
                    <Text style={styles.planName}>{details.name}</Text>
                    <Text style={styles.planDuration}>{details.duration}</Text>
                  </View>
                </View>

                <View style={styles.priceSection}>
                  <Text style={styles.price}>{pkg.product.priceString}</Text>
                  <Text style={styles.priceLabel}>/ {details.duration}</Text>
                </View>

                <View style={styles.featuresSection}>
                  {SUBSCRIPTION_FEATURES.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <Check size={16} color="#4caf50" />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.purchaseButton,
                    { backgroundColor: details.color },
                    isPurchasing && styles.purchaseButtonDisabled,
                  ]}
                  onPress={() => handlePurchase(pkg.identifier)}
                  disabled={isPurchasing}
                >
                  {isPurchasing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.purchaseButtonText}>Bu Planı Seç</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}

        <View style={styles.footerSection}>
          <Text style={styles.footerText}>
            Abonelikler Google Play Store üzerinden yönetilir
          </Text>
          <Text style={styles.footerSubtext}>
            İstediğiniz zaman iptal edebilirsiniz
          </Text>
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerButton: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
  webNoticeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  webNoticeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 24,
    textAlign: 'center',
  },
  webNoticeText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  webNoticeSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  introSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  introTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  introText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  planCardHighlighted: {
    borderWidth: 2,
    borderColor: '#ff9800',
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#ff9800',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planIcon: {
    fontSize: 40,
    marginRight: 12,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  planDuration: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  priceLabel: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  featuresSection: {
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  purchaseButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  footerSection: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
});
