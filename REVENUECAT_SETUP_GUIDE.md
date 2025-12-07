# RevenueCat Abonelik Sistemi - Kurulum Kılavuzu

Bu kılavuz, Google Play üzerinden abonelik ödemelerini almak için RevenueCat entegrasyonunu tamamlamanıza yardımcı olacaktır.

## Yapılanlar ✅

Aşağıdaki özellikler başarıyla eklendi:

1. **RevenueCat Context ve Provider** - Abonelik yönetimi için
2. **Abonelik Planları Sayfası** - Aylık, 6 Aylık ve Yıllık planlar
3. **Webhook Handler** - RevenueCat'ten gelen ödeme olaylarını işlemek için
4. **Veritabanı Entegrasyonu** - Abonelik durumunu takip etmek için
5. **Otomatik Yönlendirme** - Süresi dolan kullanıcılar abonelik sayfasına yönlendiriliyor

## Sonraki Adımlar 🚀

### 1. Projeyi Export Edin

RevenueCat native kod gerektirdiğinden, projenizi export edip yerel olarak açmalısınız:

```bash
npx expo prebuild
```

Bu komut `ios` ve `android` dizinlerini oluşturacaktır.

### 2. RevenueCat Dashboard Kurulumu

#### A. RevenueCat'e Kaydolun
- [RevenueCat Dashboard](https://app.revenuecat.com/signup)'a gidin
- Yeni bir hesap oluşturun (aylık 10,000 kullanıcıya kadar ücretsiz)

#### B. Uygulama Oluşturun
- Dashboard'da "New Project" tıklayın
- Proje adı: "Pest Control App" (veya istediğiniz isim)
- Platform seçin: **Android** (Google Play için)

#### C. Google Play Store Entegrasyonu

1. **Google Play Console'da:**
   - Uygulamanızı oluşturun
   - "Monetization" > "Subscriptions" bölümüne gidin
   - Üç abonelik ürünü oluşturun:
     - **Aylık**: `pest_control_monthly` (30 gün)
     - **6 Aylık**: `pest_control_6_month` (180 gün)
     - **Yıllık**: `pest_control_annual` (365 gün)
   - Her biri için fiyat belirleyin (örn: ₺299, ₺1499, ₺2499)

2. **Service Account Oluşturun:**
   - [Google Cloud Console](https://console.cloud.google.com)
   - "IAM & Admin" > "Service Accounts"
   - "Create Service Account" tıklayın
   - JSON key dosyasını indirin

3. **RevenueCat'e Google Play Credentials Ekleyin:**
   - RevenueCat Dashboard > Project Settings > Integrations
   - "Google Play" seçin
   - Service Account JSON dosyasını yükleyin

#### D. Abonelik Paketlerini Yapılandırın (Offerings)

RevenueCat Dashboard'da:

1. **Offerings** bölümüne gidin
2. "Create New Offering" tıklayın
3. Identifier: `default`
4. Üç paket ekleyin:
   - **Package 1:**
     - Identifier: `monthly`
     - Product: `pest_control_monthly`
   - **Package 2:**
     - Identifier: `6_month`
     - Product: `pest_control_6_month`
   - **Package 3:**
     - Identifier: `annual`
     - Product: `pest_control_annual`

#### E. Webhook URL'ini Kaydedin

1. RevenueCat Dashboard > Project Settings > Webhooks
2. Webhook URL: `https://evomncmndwsoeezubhmf.supabase.co/functions/v1/revenuecat-webhook`
3. Authorization Header: `Bearer YOUR_SUPABASE_ANON_KEY`
4. Events to send: Tümünü seçin (INITIAL_PURCHASE, RENEWAL, EXPIRATION, vb.)

### 3. Mobil Uygulama Build

#### Android Build:

```bash
# Development build için
eas build --profile development --platform android

# Production build için
eas build --profile production --platform android
```

#### iOS Build (isteğe bağlı):

```bash
eas build --profile production --platform ios
```

### 4. Test Etme

#### A. Google Play Test Hesapları

1. Google Play Console > "Internal testing" veya "Closed testing"
2. Test kullanıcıları ekleyin
3. Test build'inizi yükleyin
4. Test kullanıcıları ile giriş yapın ve abonelik satın alın

#### B. RevenueCat Sandbox Mode

- RevenueCat otomatik olarak development build'lerde sandbox modunda çalışır
- Test satın alımlar gerçek para gerektirmez
- RevenueCat Dashboard'dan test işlemlerini görebilirsiniz

## Kullanım Akışı

### Kullanıcı Perspektifi:

1. **Kayıt:** Kullanıcı kayıt olduğunda otomatik 7 günlük deneme süresi başlar
2. **Deneme Süresi:** 7 gün boyunca tüm özelliklere erişim
3. **Süre Bitti:** 7 gün sonra abonelik planları sayfasına yönlendirilir
4. **Plan Seçimi:** Aylık, 6 Aylık veya Yıllık plan seçer
5. **Ödeme:** Google Play üzerinden ödeme yapar
6. **Aktivasyon:** RevenueCat webhook'u tetiklenir ve abonelik aktif olur
7. **Devam:** Kullanıcı uygulamayı kullanmaya devam eder

### Abonelik Yenileme:

- Google Play otomatik olarak abonelikleri yeniler
- RevenueCat webhook'u tetiklenir ve veritabanı güncellenir
- Kullanıcı kesintisiz hizmet alır

### İptal:

- Kullanıcı Google Play'den aboneliği iptal edebilir
- Mevcut dönem sonuna kadar erişim devam eder
- Dönem bittiğinde RevenueCat webhook'u tetiklenir ve status "expired" olur

## Önemli Dosyalar

- **`contexts/RevenueCatContext.tsx`** - RevenueCat SDK yönetimi
- **`app/company/subscription-plans.tsx`** - Abonelik planları UI
- **`supabase/functions/revenuecat-webhook/index.ts`** - Webhook handler
- **`app/subscription-expired.tsx`** - Süre bitmiş kullanıcılar için sayfa
- **`contexts/AuthContext.tsx`** - Abonelik durumu kontrolü

## Veritabanı Tabloları

### subscriptions
```sql
- id: uuid
- company_id: uuid (profiles.id referansı)
- status: 'trial' | 'active' | 'expired' | 'cancelled'
- trial_ends_at: timestamptz
- current_period_start: timestamptz
- current_period_end: timestamptz
- revenuecat_customer_id: text (yeni eklendi)
- revenuecat_product_id: text (yeni eklendi)
```

### payment_history
```sql
- id: uuid
- subscription_id: uuid
- amount: numeric
- currency: text
- status: 'pending' | 'completed' | 'failed'
- payment_method: 'google_play' | 'apple_pay' | 'manual'
- transaction_id: text
```

## Destek ve Sorun Giderme

### RevenueCat Logları

RevenueCat Dashboard'da her işlem için detaylı loglar görebilirsiniz:
- Satın alımlar
- Yenilemeler
- İptaller
- Webhook çağrıları

### Supabase Edge Function Logları

Webhook işlemlerini görmek için:
```bash
supabase functions logs revenuecat-webhook
```

### Sık Karşılaşılan Sorunlar

1. **Abonelik aktif olmuyor:**
   - Webhook URL'ini kontrol edin
   - Authorization header'ı kontrol edin
   - Edge function loglarına bakın

2. **Satın alım başarısız:**
   - Google Play Console'da ürünlerin yayında olduğundan emin olun
   - Test hesaplarının doğru yapılandırıldığından emin olun

3. **Paketler görünmüyor:**
   - RevenueCat API key'in doğru olduğundan emin olun
   - Offerings'in doğru yapılandırıldığından emin olun

## Dokümantasyon Linkleri

- [RevenueCat Documentation](https://www.revenuecat.com/docs)
- [RevenueCat React Native SDK](https://www.revenuecat.com/docs/getting-started/installation/reactnative)
- [Google Play Billing](https://developer.android.com/google/play/billing)
- [Expo Custom Development Client](https://docs.expo.dev/develop/development-builds/introduction/)

## Sonuç

Tüm adımları tamamladıktan sonra:
- ✅ Kullanıcılar Google Play üzerinden abonelik satın alabilecek
- ✅ Otomatik yenilemeler çalışacak
- ✅ Abonelik durumları gerçek zamanlı güncellenecek
- ✅ Süresi dolan kullanıcılar otomatik yönlendirilecek

Herhangi bir sorunla karşılaşırsanız RevenueCat destek ekibine veya Supabase dokümantasyonuna başvurabilirsiniz.
