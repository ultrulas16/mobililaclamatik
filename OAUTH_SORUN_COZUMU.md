# 🔧 Google OAuth Sorun Çözümü

## Sorun: Google ile giriş yapıldığında profil oluşturulmuyor

### Neden Olur?

1. **Trigger zamanında çalışmadı** - Sunucu yavaşlığı veya timeout
2. **Network problemi** - Bağlantı kesildi
3. **Sayfa çok erken yenilendi** - Trigger çalışmadan önce sayfa kapatıldı
4. **Supabase yapılandırması** - OAuth sağlayıcı düzgün kurulmamış

### ✅ Çözüm Adımları

#### Adım 1: Diagnostics Sayfasını Kullan

1. Login sayfasının altındaki **"🔧 OAuth Sorun mu var? Buraya tıkla"** linkine tıkla
2. **"Durumu Kontrol Et"** butonuna tıkla
3. Ekranda göreceksin:
   - ✅ Kullanıcı var mı?
   - ✅ Profil var mı?
   - ⚠️ Profil yoksa ne yapmalı?

#### Adım 2: Manuel Profil Oluştur

Eğer **"Profil yok"** diyorsa:

1. Diagnostics sayfasında **"➕ Profil Oluştur"** butonuna bas
2. Bekle (2-3 saniye)
3. Otomatik olarak dashboard'a yönlendirileceksin
4. ✅ İşlem tamam!

### 🎯 Google ile Kayıt Ol - Doğru Akış

```
1. "Google ile Kayıt Ol" butonuna tıkla
   ↓
2. Google "Oturum Aç" ekranı açılır (NORMAL!)
   ↓
3. Google hesabını seç
   ↓
4. Redirect URL'e dön
   ↓
5. [BEKLE 5-10 SANİYE] ← ÖNEMLİ!
   ↓
6. "Hesabınız oluşturuluyor..." mesajı
   ↓
7. Otomatik trigger çalışıyor (arka planda)
   ↓
8. 15 denemeye kadar retry yapılıyor
   ↓
9. Profile yüklendi ✅
   ↓
10. Dashboard'a yönlendirildin
```

### ⚠️ Önemli Noktalar

**SAYFAYI ERKEN KAPATMA!**
- Google ile giriş yaptıktan sonra sayfayı hemen kapatma
- "Hesabınız oluşturuluyor..." yazısını gördüğünde BEKLE
- Loading spinner görüyorsan bekle
- En az 10 saniye bekle

**Console Loglarına Bak:**
Browser console'u aç (F12) ve şunları ara:
```
[AUTH] - Auth işlemleri
[OAUTH] - OAuth callback
[INDEX] - Routing işlemleri
```

Hata varsa göreceksin!

### 🔍 Supabase Dashboard Kontrolü

1. Supabase Dashboard'a git
2. **Authentication > Users** sayfasını aç
3. Google ile giriş yaptığın kullanıcıyı bul
4. **Database > Table Editor > profiles** tablosunu aç
5. Kullanıcının ID'si ile profil var mı kontrol et

**Profil yoksa:**
- Diagnostics sayfasını kullan
- Manuel profil oluştur

### 🛠️ Supabase Yapılandırma Kontrolü

Google OAuth'nun düzgün çalışması için:

1. **Supabase Dashboard > Authentication > Providers**
2. Google provider **enabled** olmalı
3. **Client ID** ve **Client Secret** doğru mu?
4. **Redirect URL** doğru mu?
   ```
   https://multilingual-pest-co-akov.bolt.host/
   ```

5. **Google Cloud Console'da:**
   - OAuth 2.0 Client ID oluşturulmuş mu?
   - Authorized redirect URIs'ye şu eklendi mi?
   ```
   https://0ec90b57d6e95fcbda19832f.supabase.co/auth/v1/callback
   ```

### 📋 Trigger Kontrolü

Supabase SQL Editor'de çalıştır:

```sql
-- Trigger var mı?
SELECT
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created_oauth';

-- Son kullanıcılar ve profilleri
SELECT
  u.id,
  u.email,
  u.created_at,
  u.raw_app_meta_data->>'provider' as provider,
  CASE
    WHEN p.id IS NOT NULL THEN 'HAS PROFILE ✅'
    ELSE 'NO PROFILE ❌'
  END as profile_status,
  p.role,
  p.company_id
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.raw_app_meta_data->>'provider' = 'google'
ORDER BY u.created_at DESC
LIMIT 5;
```

### 🚀 Hızlı Çözüm

**En basit çözüm:**

1. Login sayfasına git
2. **"🔧 OAuth Sorun mu var? Buraya tıkla"**
3. **"Durumu Kontrol Et"**
4. Profil yoksa → **"➕ Profil Oluştur"**
5. ✅ TAMAM!

### 💡 Fallback Sistem

AuthContext otomatik olarak:
- 15 kere profil yükleme dener
- Her denemede bekleme süresi artar (1s, 1.5s, 2.25s...)
- Maksimum 10 saniye bekler
- 15 deneme sonunda başarısız olursa **manuel profil oluşturur**

### 📞 Hala Çalışmıyor mu?

1. Browser console'u aç (F12)
2. Tüm logları kopyala
3. `[AUTH]`, `[OAUTH]`, `[DIAGNOSTICS]` loglarına bak
4. Hata mesajlarını oku

**Yaygın Hatalar:**
- `Failed to fetch` → Network problemi
- `Invalid access token` → Session problemi
- `Permission denied` → RLS policy problemi
- `Null value in column "currency"` → Eski trigger (ama bu düzeltildi)

### ✅ Sistem Şu An Tam Çalışıyor

- ✅ OAuth trigger currency alanı ile güncellendi
- ✅ 15 denemelik retry mekanizması var
- ✅ Fallback manuel profil oluşturma var
- ✅ Diagnostics sayfası eklendi
- ✅ Detaylı logging sistemi var

**Sorun devam ederse:**
Diagnostics sayfasını kullan ve **"Profil Oluştur"** butonuna bas!
