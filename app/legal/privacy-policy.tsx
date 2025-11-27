import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function PrivacyPolicy() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gizlilik Politikası</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Son Güncelleme: {new Date().toLocaleDateString('tr-TR')}</Text>

        <Text style={styles.sectionTitle}>1. Giriş</Text>
        <Text style={styles.paragraph}>
          Bu gizlilik politikası, zararlı organizmaların kontrolü ve ilaçlama hizmetleri yönetim uygulamasının kullanıcılarının kişisel verilerinin nasıl toplandığını, kullanıldığını ve korunduğunu açıklamaktadır.
        </Text>

        <Text style={styles.sectionTitle}>2. Toplanan Veriler</Text>
        <Text style={styles.paragraph}>
          Uygulamamız aşağıdaki kişisel verileri toplamaktadır:
        </Text>
        <Text style={styles.listItem}>• Ad Soyad</Text>
        <Text style={styles.listItem}>• E-posta adresi</Text>
        <Text style={styles.listItem}>• Telefon numarası</Text>
        <Text style={styles.listItem}>• Şirket bilgileri</Text>
        <Text style={styles.listItem}>• Konum verileri (ziyaret takibi için)</Text>
        <Text style={styles.listItem}>• Çekilmiş fotoğraflar (hizmet kayıtları için)</Text>

        <Text style={styles.sectionTitle}>3. Verilerin Kullanım Amacı</Text>
        <Text style={styles.paragraph}>
          Toplanan veriler aşağıdaki amaçlarla kullanılmaktadır:
        </Text>
        <Text style={styles.listItem}>• Kullanıcı hesaplarının yönetimi</Text>
        <Text style={styles.listItem}>• İlaçlama hizmetlerinin planlanması ve takibi</Text>
        <Text style={styles.listItem}>• Müşteri ilişkilerinin yönetimi</Text>
        <Text style={styles.listItem}>• Hizmet kalitesinin artırılması</Text>
        <Text style={styles.listItem}>• Yasal yükümlülüklerin yerine getirilmesi</Text>

        <Text style={styles.sectionTitle}>4. Veri Güvenliği</Text>
        <Text style={styles.paragraph}>
          Kişisel verileriniz, endüstri standardı güvenlik önlemleriyle korunmaktadır. Verileriniz şifrelenmiş olarak saklanır ve yetkisiz erişime karşı korunur. Supabase altyapısı kullanılarak veriler güvenli bir şekilde saklanmaktadır.
        </Text>

        <Text style={styles.sectionTitle}>5. Veri Paylaşımı</Text>
        <Text style={styles.paragraph}>
          Kişisel verileriniz, açık rızanız olmadan üçüncü şahıslarla paylaşılmaz. Verileriniz sadece aşağıdaki durumlarda paylaşılabilir:
        </Text>
        <Text style={styles.listItem}>• Yasal zorunluluklar</Text>
        <Text style={styles.listItem}>• Hizmet sağlayıcılar (veri saklama, altyapı hizmetleri)</Text>
        <Text style={styles.listItem}>• Açık kullanıcı onayı ile</Text>

        <Text style={styles.sectionTitle}>6. Kullanıcı Hakları</Text>
        <Text style={styles.paragraph}>
          KVKK kapsamında aşağıdaki haklara sahipsiniz:
        </Text>
        <Text style={styles.listItem}>• Kişisel verilerinizin işlenip işlenmediğini öğrenme</Text>
        <Text style={styles.listItem}>• Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme</Text>
        <Text style={styles.listItem}>• Kişisel verilerinizin işlenme amacını öğrenme</Text>
        <Text style={styles.listItem}>• Kişisel verilerinizin düzeltilmesini isteme</Text>
        <Text style={styles.listItem}>• Kişisel verilerinizin silinmesini talep etme</Text>

        <Text style={styles.sectionTitle}>7. Çerezler</Text>
        <Text style={styles.paragraph}>
          Uygulamamız, kullanıcı deneyimini iyileştirmek için oturum bilgilerini saklar. Bu veriler cihazınızda yerel olarak saklanır ve güvenli bir şekilde işlenir.
        </Text>

        <Text style={styles.sectionTitle}>8. Konum Verileri</Text>
        <Text style={styles.paragraph}>
          Ziyaret takibi özelliği için GPS konum verileriniz toplanmaktadır. Bu veriler yalnızca hizmet kayıtlarının doğrulanması için kullanılır ve açık izniniz olmadan paylaşılmaz.
        </Text>

        <Text style={styles.sectionTitle}>9. Kamera ve Fotoğraflar</Text>
        <Text style={styles.paragraph}>
          Hizmet kayıtları için fotoğraf çekme özelliği kullanılmaktadır. Çekilen fotoğraflar yalnızca hizmet dokümantasyonu amacıyla saklanır ve müşteri raporlarında kullanılır.
        </Text>

        <Text style={styles.sectionTitle}>10. Veri Saklama Süresi</Text>
        <Text style={styles.paragraph}>
          Kişisel verileriniz, ilgili mevzuat ve hizmet sözleşmeleri gereği gerekli olan süre boyunca saklanır. Hizmet ilişkisi sona erdikten sonra, yasal saklama süreleri dikkate alınarak verileriniz silinir veya anonim hale getirilir.
        </Text>

        <Text style={styles.sectionTitle}>11. Değişiklikler</Text>
        <Text style={styles.paragraph}>
          Bu gizlilik politikası, gerektiğinde güncellenebilir. Önemli değişiklikler olduğunda kullanıcılar bilgilendirilecektir.
        </Text>

        <Text style={styles.sectionTitle}>12. İletişim</Text>
        <Text style={styles.paragraph}>
          Gizlilik politikası ile ilgili sorularınız için lütfen uygulama içinden bizimle iletişime geçin.
        </Text>

        <View style={styles.spacer} />
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
    textAlign: 'justify',
  },
  listItem: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    marginLeft: 10,
    marginBottom: 6,
  },
  spacer: {
    height: 40,
  },
});
