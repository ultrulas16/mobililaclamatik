import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function TermsOfService() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kullanıcı Sözleşmesi</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Son Güncelleme: {new Date().toLocaleDateString('tr-TR')}</Text>

        <Text style={styles.sectionTitle}>1. Hizmetin Kapsamı</Text>
        <Text style={styles.paragraph}>
          Bu uygulama, zararlı organizmaların kontrolü ve ilaçlama hizmetlerinin yönetimi için geliştirilmiş bir mobil platformdur. Uygulama, ilaçlama firmalarının operasyonlarını, müşteri ilişkilerini ve ziyaret kayıtlarını dijital ortamda yönetmelerine olanak sağlar.
        </Text>

        <Text style={styles.sectionTitle}>2. Kullanıcı Hesapları</Text>
        <Text style={styles.paragraph}>
          Uygulamayı kullanmak için bir hesap oluşturmanız gerekmektedir. Hesap oluştururken verdiğiniz bilgilerin doğru ve güncel olmasından sorumlusunuz. Hesap güvenliğiniz sizin sorumluluğunuzdadır.
        </Text>

        <Text style={styles.sectionTitle}>3. Kullanıcı Rolleri</Text>
        <Text style={styles.paragraph}>
          Uygulama farklı kullanıcı rollerini desteklemektedir:
        </Text>
        <Text style={styles.listItem}>• <Text style={styles.bold}>Sistem Yöneticisi:</Text> Tüm sistemi yönetir</Text>
        <Text style={styles.listItem}>• <Text style={styles.bold}>İlaçlama Firması:</Text> Şirket yönetimi ve operasyonları</Text>
        <Text style={styles.listItem}>• <Text style={styles.bold}>Operatör:</Text> Saha çalışanları ve ziyaret kayıtları</Text>
        <Text style={styles.listItem}>• <Text style={styles.bold}>Müşteri:</Text> Hizmet alan firmalar</Text>
        <Text style={styles.listItem}>• <Text style={styles.bold}>Müşteri Şubesi:</Text> Müşteri şube yönetimi</Text>

        <Text style={styles.sectionTitle}>4. Kullanım Kuralları</Text>
        <Text style={styles.paragraph}>
          Uygulamayı kullanırken aşağıdaki kurallara uymayı kabul ediyorsunuz:
        </Text>
        <Text style={styles.listItem}>• Uygulamayı yalnızca yasal amaçlarla kullanmak</Text>
        <Text style={styles.listItem}>• Başkalarının hesaplarına yetkisiz erişim sağlamamak</Text>
        <Text style={styles.listItem}>• Yanıltıcı veya yanlış bilgi girmemek</Text>
        <Text style={styles.listItem}>• Diğer kullanıcıların haklarına saygı göstermek</Text>
        <Text style={styles.listItem}>• Uygulamanın normal çalışmasını engelleyecek eylemlerden kaçınmak</Text>

        <Text style={styles.sectionTitle}>5. Abonelik ve Ücretlendirme</Text>
        <Text style={styles.paragraph}>
          Uygulama abonelik tabanlı bir hizmet sunmaktadır. İlaçlama firmalarının aktif abonelikleri olması gerekmektedir. Abonelik ücretleri ve koşulları periyodik olarak güncellenebilir.
        </Text>

        <Text style={styles.sectionTitle}>6. Veri Sorumluluğu</Text>
        <Text style={styles.paragraph}>
          Uygulamaya girdiğiniz tüm veriler (müşteri bilgileri, ziyaret kayıtları, fotoğraflar vb.) sizin sorumluluğunuzdadır. Verilerin doğruluğundan ve güncelliğinden siz sorumlusunuz.
        </Text>

        <Text style={styles.sectionTitle}>7. Fikri Mülkiyet Hakları</Text>
        <Text style={styles.paragraph}>
          Uygulamanın tasarımı, kaynak kodu, logoları ve içeriği fikri mülkiyet yasalarıyla korunmaktadır. İzinsiz kopyalama, dağıtma veya türev eserler oluşturma yasaktır.
        </Text>

        <Text style={styles.sectionTitle}>8. Hizmet Garantisi ve Sorumluluk</Text>
        <Text style={styles.paragraph}>
          Uygulama "olduğu gibi" sunulmaktadır. Kesintisiz veya hatasız çalışma garantisi verilmemektedir. Uygulamanın kullanımından kaynaklanan dolaylı veya doğrudan zararlardan sorumlu değiliz.
        </Text>

        <Text style={styles.sectionTitle}>9. Hizmet Değişiklikleri</Text>
        <Text style={styles.paragraph}>
          Uygulama özelliklerini, içeriğini ve kullanım koşullarını önceden haber vermeksizin değiştirme hakkını saklı tutarız. Önemli değişiklikler kullanıcılara bildirilecektir.
        </Text>

        <Text style={styles.sectionTitle}>10. Hesap İptali</Text>
        <Text style={styles.paragraph}>
          Kullanım koşullarını ihlal eden hesaplar uyarı vermeksizin askıya alınabilir veya kalıcı olarak kapatılabilir. Hesabınızı istediğiniz zaman kapatabilirsiniz.
        </Text>

        <Text style={styles.sectionTitle}>11. Yedekleme</Text>
        <Text style={styles.paragraph}>
          Verileriniz düzenli olarak yedeklenmektedir, ancak kendi verilerinizin yedeğini almanız önerilir. Veri kaybından dolayı sorumlu tutulamayız.
        </Text>

        <Text style={styles.sectionTitle}>12. Üçüncü Taraf Hizmetler</Text>
        <Text style={styles.paragraph}>
          Uygulama, harita servisleri ve bulut depolama gibi üçüncü taraf hizmetleri kullanmaktadır. Bu hizmetlerin kullanımı ilgili hizmet sağlayıcıların şartlarına tabidir.
        </Text>

        <Text style={styles.sectionTitle}>13. Uygulanacak Hukuk</Text>
        <Text style={styles.paragraph}>
          Bu sözleşme Türkiye Cumhuriyeti yasalarına tabidir. Sözleşmeden doğan uyuşmazlıklar Türkiye mahkemelerinde çözülecektir.
        </Text>

        <Text style={styles.sectionTitle}>14. İletişim</Text>
        <Text style={styles.paragraph}>
          Bu kullanım koşulları ile ilgili sorularınız veya önerileriniz için lütfen uygulama içinden bizimle iletişime geçin.
        </Text>

        <Text style={styles.sectionTitle}>15. Sözleşmenin Kabulü</Text>
        <Text style={styles.paragraph}>
          Uygulamayı kullanarak bu kullanım koşullarını okuduğunuzu, anladığınızı ve kabul ettiğinizi beyan etmiş olursunuz.
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
  bold: {
    fontWeight: 'bold',
  },
  spacer: {
    height: 40,
  },
});
