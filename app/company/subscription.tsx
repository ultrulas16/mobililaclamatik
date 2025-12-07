import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CreditCard, Check, Crown, Zap, ArrowLeft } from 'lucide-react-native';
import { useRevenueCat } from '@/contexts/RevenueCatContext';
import { useAuth } from '@/contexts/AuthContext';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { offerings, purchasePackage, restorePurchases, isLoading } = useRevenueCat();
  const { profile } = useAuth();
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async (packageToPurchase: any) => {
    try {
      setPurchasing(true);
      await purchasePackage(packageToPurchase);
      Alert.alert(
        'Başarılı!',
        'Aboneliğiniz başarıyla aktif edildi.',
        [{ text: 'Tamam', onPress: () => router.back() }]
      );
    } catch (error: any) {
      if (!error.userCancelled) {
        Alert.alert('Hata', 'Satın alma işlemi başarısız oldu. Lütfen tekrar deneyin.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setPurchasing(true);
      const customerInfo = await restorePurchases();
      if (Object.keys(customerInfo.entitlements.active).length > 0) {
        Alert.alert(
          'Başarılı!',
          'Abonelikleriniz geri yüklendi.',
          [{ text: 'Tamam', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Bilgi', 'Geri yüklenecek aktif abonelik bulunamadı.');
      }
    } catch (error) {
      Alert.alert('Hata', 'Abonelikler geri yüklenemedi.');
    } finally {
      setPurchasing(false);
    }
  };

  const getPackageIcon = (identifier: string) => {
    if (identifier.includes('monthly')) {
      return <Zap size={32} color="#fff" />;
    }
    if (identifier.includes('annual') || identifier.includes('yearly')) {
      return <Crown size={32} color="#fff" />;
    }
    return <CreditCard size={32} color="#fff" />;
  };

  const getPackageGradient = (identifier: string) => {
    if (identifier.includes('monthly')) {
      return ['#3b82f6', '#2563eb'];
    }
    if (identifier.includes('annual') || identifier.includes('yearly')) {
      return ['#f59e0b', '#d97706'];
    }
    return ['#10b981', '#059669'];
  };

  const getPackageFeatures = (packageType: string) => {
    const commonFeatures = [
      'Sınırsız operatör',
      'Sınırsız müşteri',
      'Sınırsız ziyaret kaydı',
      'Depo yönetimi',
      'Raporlama ve analiz',
      '7/24 teknik destek',
    ];

    if (packageType.includes('annual') || packageType.includes('yearly')) {
      return [...commonFeatures, '2 ay ücretsiz', 'Öncelikli destek'];
    }

    return commonFeatures;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Abonelik planları yükleniyor...</Text>
      </View>
    );
  }

  const currentOffering = offerings?.current;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#10b981', '#059669']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Abonelik Planları</Text>
        <Text style={styles.headerSubtitle}>
          İşletmeniz için en uygun planı seçin
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {currentOffering && currentOffering.availablePackages.length > 0 ? (
          <>
            <View style={styles.packagesContainer}>
              {currentOffering.availablePackages.map((pkg: any) => {
                const gradient = getPackageGradient(pkg.identifier);
                const features = getPackageFeatures(pkg.identifier);

                return (
                  <View key={pkg.identifier} style={styles.packageCard}>
                    <LinearGradient
                      colors={gradient}
                      style={styles.packageHeader}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.packageIconContainer}>
                        {getPackageIcon(pkg.identifier)}
                      </View>
                      <Text style={styles.packageTitle}>
                        {pkg.product.title}
                      </Text>
                      <Text style={styles.packageDescription}>
                        {pkg.product.description}
                      </Text>
                    </LinearGradient>

                    <View style={styles.packageBody}>
                      <View style={styles.priceContainer}>
                        <Text style={styles.price}>
                          {pkg.product.priceString}
                        </Text>
                        <Text style={styles.pricePeriod}>
                          / {pkg.packageType.toLowerCase()}
                        </Text>
                      </View>

                      <View style={styles.featuresContainer}>
                        {features.map((feature, index) => (
                          <View key={index} style={styles.featureRow}>
                            <View style={styles.checkContainer}>
                              <Check size={16} color="#10b981" />
                            </View>
                            <Text style={styles.featureText}>{feature}</Text>
                          </View>
                        ))}
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.purchaseButton,
                          purchasing && styles.purchaseButtonDisabled,
                        ]}
                        onPress={() => handlePurchase(pkg)}
                        disabled={purchasing}
                      >
                        <LinearGradient
                          colors={gradient}
                          style={styles.purchaseButtonGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          {purchasing ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <>
                              <CreditCard size={20} color="#fff" />
                              <Text style={styles.purchaseButtonText}>
                                Satın Al
                              </Text>
                            </>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={purchasing}
            >
              <Text style={styles.restoreButtonText}>
                Satın Alımları Geri Yükle
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <CreditCard size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>
              Abonelik Planları Yüklenemedi
            </Text>
            <Text style={styles.emptyText}>
              Şu anda hiçbir abonelik planı mevcut değil. Lütfen daha sonra
              tekrar deneyin.
            </Text>
          </View>
        )}

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Abonelik Hakkında</Text>
          <Text style={styles.infoText}>
            • Abonelikler otomatik olarak yenilenir
          </Text>
          <Text style={styles.infoText}>
            • İstediğiniz zaman iptal edebilirsiniz
          </Text>
          <Text style={styles.infoText}>
            • İptal sonrası mevcut süreniz sonuna kadar erişim devam eder
          </Text>
          <Text style={styles.infoText}>
            • Faturalar otomatik olarak oluşturulur
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#d1fae5',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  packagesContainer: {
    gap: 20,
  },
  packageCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  packageHeader: {
    padding: 24,
    alignItems: 'center',
  },
  packageIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  packageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  packageDescription: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
  },
  packageBody: {
    padding: 24,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 24,
  },
  price: {
    fontSize: 48,
    fontWeight: '700',
    color: '#0f172a',
  },
  pricePeriod: {
    fontSize: 18,
    color: '#64748b',
    marginLeft: 8,
  },
  featuresContainer: {
    gap: 12,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: '#475569',
    fontWeight: '500',
  },
  purchaseButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  purchaseButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  restoreButton: {
    marginTop: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 32,
  },
  infoContainer: {
    marginTop: 32,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    lineHeight: 20,
  },
});
