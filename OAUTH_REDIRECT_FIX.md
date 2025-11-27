# 🔧 Google OAuth Redirect URI Sorunu - Çözüm

## Hata: `redirect_uri_mismatch`

Bu hata, Google Cloud Console'da tanımlanan redirect URI'ların Supabase ile eşleşmediğini gösterir.

## ✅ Çözüm Adımları

### 1. Google Cloud Console Ayarları

1. [Google Cloud Console](https://console.cloud.google.com/) adresine git
2. Projenizi seçin (PestGoPest)
3. **APIs & Services > Credentials** sayfasına git
4. OAuth 2.0 Client ID'nizi bulun ve düzenleyin

### 2. Authorized Redirect URIs Düzeltmesi

**Mevcut URI'ları SİL ve şunları EKLE:**

```
https://0ec90b57d6e95fcbda19832f.supabase.co/auth/v1/callback
https://multilingual-pest-co-akov.bolt.host/
```

**ÖNEMLİ:** 
- URI'ların sonunda `/` olmasına dikkat et
- Tam olarak yukarıdaki gibi olmalı
- Başka URI varsa silin

### 3. Supabase Dashboard Kontrolü

1. [Supabase Dashboard](https://supabase.com/dashboard) > Projeniz
2. **Authentication > Providers > Google**
3. **Redirect URL** şu olmalı:
   ```
   https://0ec90b57d6e95fcbda19832f.supabase.co/auth/v1/callback
   ```

### 4. Site URL Ayarı

Supabase Dashboard'da:
1. **Authentication > URL Configuration**
2. **Site URL** şu olmalı:
   ```
   https://multilingual-pest-co-akov.bolt.host/
   ```

### 5. Test Etme

1. Değişiklikleri kaydet
2. 2-3 dakika bekle (Google'ın cache'lemesi için)
3. Uygulamayı yenile
4. "Google ile Kayıt Ol" butonunu test et

## 🔍 Doğrulama

### Google Cloud Console'da:
```
Authorized redirect URIs:
✅ https://0ec90b57d6e95fcbda19832f.supabase.co/auth/v1/callback
✅ https://multilingual-pest-co-akov.bolt.host/
```

### Supabase Dashboard'da:
```
Google Provider:
✅ Enabled: true
✅ Redirect URL: https://0ec90b57d6e95fcbda19832f.supabase.co/auth/v1/callback

URL Configuration:
✅ Site URL: https://multilingual-pest-co-akov.bolt.host/
```

## 🚨 Yaygın Hatalar

1. **URI sonunda `/` eksik** → Ekle
2. **HTTP yerine HTTPS** → HTTPS kullan
3. **Yanlış domain** → Bolt hosting URL'ini kullan
4. **Cache problemi** → 5 dakika bekle

## 📱 Test Senaryosu

1. Kayıt sayfasına git
2. Gizlilik ve kullanım şartlarını kabul et
3. "Google ile Kayıt Ol" butonuna tıkla
4. Google hesabını seç
5. **Hata almamalısın!**
6. "Hesabınız oluşturuluyor..." mesajını görmelisin
7. Dashboard'a yönlendirilmelisin

## 🔧 Hala Çalışmıyor mu?

1. Browser'ı tamamen kapat ve aç
2. Incognito/Private mode'da dene
3. Farklı Google hesabı ile dene
4. Console loglarını kontrol et (F12)

## 📞 Geliştirici Notları

OAuth flow şu şekilde çalışır:
```
1. User clicks "Google ile Kayıt Ol"
2. Redirect to: https://accounts.google.com/oauth/authorize?...
3. User selects Google account
4. Google redirects to: https://0ec90b57d6e95fcbda19832f.supabase.co/auth/v1/callback
5. Supabase processes OAuth
6. Supabase redirects to: https://multilingual-pest-co-akov.bolt.host/
7. App handles callback and sets session
8. Trigger creates profile
9. User is redirected to dashboard
```

Bu akışta herhangi bir URI eşleşmezse `redirect_uri_mismatch` hatası alırsınız.