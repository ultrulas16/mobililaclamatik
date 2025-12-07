# Excel ile Müşteri İçe Aktarma Rehberi

## Özellik Özeti

İlaçlama firmaları artık müşterilerini Excel dosyası ile toplu olarak sisteme aktarabilir. Bu özellik, çok sayıda müşteriyi hızlı bir şekilde sisteme eklemek için idealdir.

## Nasıl Kullanılır?

### Adım 1: Şablon İndir

1. "Müşterileri Yönet" sayfasına gidin
2. Üst kısımda bulunan **"Şablon İndir"** butonuna tıklayın
3. Excel şablon dosyası (`musteri_sablonu.xlsx`) cihazınıza indirilecektir

### Adım 2: Excel Dosyasını Doldurun

İndirdiğiniz şablon dosyasını açın ve aşağıdaki sütunları doldurun:

| Sütun Adı | Açıklama | Zorunlu | Örnek |
|-----------|----------|---------|-------|
| **Ad Soyad** | Müşterinin tam adı | ✅ Evet | Ahmet Yılmaz |
| **Şirket Adı** | Müşterinin şirket adı | ✅ Evet | ABC Restoran |
| **E-posta** | Müşterinin e-posta adresi (giriş için kullanılacak) | ✅ Evet | ahmet@abcrestoran.com |
| **Telefon** | Müşterinin telefon numarası | ❌ Hayır | 05321234567 |
| **Şifre** | Müşterinin giriş şifresi | ✅ Evet | Guvenli123! |

### Şablon Örneği

```
Ad Soyad        | Şirket Adı          | E-posta                  | Telefon      | Şifre
----------------|---------------------|--------------------------|--------------|-------------
Ahmet Yılmaz    | ABC Restoran        | ahmet@abcrestoran.com    | 05321234567  | Sifre123!
Mehmet Demir    | XYZ Kafe            | mehmet@xyzkafe.com       | 05331234567  | Guvenli456!
Ayşe Kaya       | Lezzet Lokantası    | ayse@lezzet.com          | 05341234567  | Parola789!
```

### Adım 3: Excel Dosyasını İçe Aktar

1. "Müşterileri Yönet" sayfasında **"Excel İçe Aktar"** butonuna tıklayın
2. Doldurduğunuz Excel dosyasını seçin
3. Sistem dosyayı okuyacak ve müşterileri otomatik olarak oluşturacaktır

### Sonuç Ekranı

İçe aktarma işlemi tamamlandığında, sistem size bir özet gösterecektir:

```
İçe Aktarma Tamamlandı

Başarılı: 45
Hatalı: 2

Hatalar:
ahmet@firma.com: E-posta zaten kullanılıyor
ornek@test.com: Geçersiz şifre formatı
```

## Önemli Notlar

### E-posta Adresleri
- Her e-posta adresi benzersiz olmalıdır
- Sistemde zaten kayıtlı olan e-posta adresleri hata verecektir
- E-posta formatı geçerli olmalıdır (örn: kullanici@domain.com)

### Şifre Gereksinimleri
- Minimum 6 karakter uzunluğunda olmalıdır
- En az bir büyük harf, bir küçük harf ve bir rakam içermelidir

### Telefon Numarası
- Opsiyoneldir (boş bırakılabilir)
- Türk telefon numarası formatında olmalıdır (05XXXXXXXXX)

### Toplu İşlem
- Sistem her satırı sırayla işler
- Hatalı satırlar atlanır ve diğer satırlar işlenmeye devam eder
- Tüm hatalar sonuç ekranında gösterilir

## Hata Giderme

### "Excel dosyası okunamadı"
- Dosyanın Excel formatında (.xlsx veya .xls) olduğundan emin olun
- Dosyanın bozuk olmadığını kontrol edin
- Şablon dosyasını tekrar indirip deneyin

### "Eksik bilgi" hatası
- Tüm zorunlu sütunların dolu olduğundan emin olun
- Sütun isimlerinin şablondaki ile aynı olduğunu kontrol edin

### "E-posta zaten kullanılıyor"
- Bu e-posta adresi sistemde zaten kayıtlı
- Farklı bir e-posta adresi kullanın

## Web vs Mobil

### Web Platformu
- Şablon dosyası direkt olarak indirilir
- Standart dosya seçici kullanılır

### Mobil Platformlar (iOS/Android)
- Şablon dosyası paylaşım menüsü ile açılır
- Cihazınızın dosya yöneticisi kullanılır
- İndirilen dosyaları "İndirilenler" veya "Dosyalarım" klasöründe bulabilirsiniz

## Teknik Detaylar

- Maximum dosya boyutu: 5 MB
- Desteklenen formatlar: .xlsx, .xls
- Maksimum satır sayısı: 1000
- İşlem süresi: Satır başına ~1-2 saniye

## Destek

Herhangi bir sorun yaşarsanız veya yardıma ihtiyacınız olursa:
- Teknik destek ekibimizle iletişime geçin
- Hata mesajlarını kaydedin ve bizimle paylaşın
