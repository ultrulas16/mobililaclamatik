# Google OAuth Kayıt Sorunu - Çözüm Rehberi

Google ile kayıt olmaya çalışan kullanıcılar için profil oluşturulmuyorsa, bu rehberi takip edin.

## Sorunun Kaynağı

OAuth trigger'ı veritabanında düzgün çalışmıyor veya hiç yüklenmemiş olabilir. Bu yüzden Google ile giriş yapan kullanıcılar için otomatik olarak profil oluşturulmuyor.

## Çözüm Adımları

### 1. Supabase Dashboard'a Girin

1. [Supabase Dashboard](https://supabase.com/dashboard) adresine gidin
2. Projenizi seçin: `0ec90b57d6e95fcbda19832f`

### 2. SQL Editor'ü Açın

1. Sol menüden **SQL Editor** seçeneğine tıklayın
2. **New Query** butonuna tıklayın

### 3. Trigger'ı Yükleyin

Aşağıdaki SQL kodunu kopyalayıp SQL Editor'e yapıştırın ve **RUN** butonuna tıklayın:

```sql
-- Drop all existing OAuth triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created_oauth ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_oauth_user() CASCADE;

-- Create the OAuth handler function with proper error handling
CREATE OR REPLACE FUNCTION handle_oauth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id uuid;
  v_full_name text;
  v_company_name text;
  v_profile_exists boolean;
BEGIN
  -- Log the trigger execution for debugging
  RAISE LOG 'OAuth trigger fired for user: %, provider: %', NEW.id, NEW.raw_app_meta_data->>'provider';

  -- Only handle OAuth users (not email/password users)
  IF NEW.raw_app_meta_data ? 'provider' AND NEW.raw_app_meta_data->>'provider' != 'email' THEN

    -- Check if profile already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO v_profile_exists;

    IF NOT v_profile_exists THEN

      RAISE LOG 'Creating profile for OAuth user: %', NEW.id;

      -- Extract full name from OAuth metadata
      v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1),
        'User'
      );

      v_company_name := v_full_name || ' Pest Control';

      -- Create company first
      BEGIN
        INSERT INTO public.companies (
          name,
          owner_id,
          email,
          phone,
          address,
          currency
        ) VALUES (
          v_company_name,
          NEW.id,
          NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'phone', ''),
          '',
          'TRY'
        ) RETURNING id INTO v_company_id;

        RAISE LOG 'Company created with id: % for user: %', v_company_id, NEW.id;

      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error creating company for OAuth user %: %', NEW.id, SQLERRM;
        v_company_id := NULL;
      END;

      -- Create profile
      BEGIN
        INSERT INTO public.profiles (
          id,
          email,
          full_name,
          phone,
          role,
          company_id,
          company_name,
          accepted_privacy_policy,
          accepted_terms_of_service,
          privacy_policy_accepted_at,
          terms_of_service_accepted_at
        ) VALUES (
          NEW.id,
          NEW.email,
          v_full_name,
          COALESCE(NEW.raw_user_meta_data->>'phone', ''),
          'company',
          v_company_id,
          v_company_name,
          true,
          true,
          now(),
          now()
        );

        RAISE LOG 'Profile created successfully for OAuth user: %', NEW.id;

      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error creating profile for OAuth user %: %', NEW.id, SQLERRM;
        RAISE;
      END;

    ELSE
      RAISE LOG 'Profile already exists for OAuth user: %', NEW.id;
    END IF;

  ELSE
    RAISE LOG 'Not an OAuth user (provider: %), skipping trigger', NEW.raw_app_meta_data->>'provider';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created_oauth
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_oauth_user();
```

### 4. Trigger'ın Çalıştığını Doğrulayın

Aşağıdaki SQL sorgusunu çalıştırarak trigger'ın yüklendiğini doğrulayın:

```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created_oauth';

-- Check if function exists
SELECT proname FROM pg_proc WHERE proname = 'handle_oauth_user';
```

Her iki sorgu da sonuç döndürmelidir.

### 5. Mevcut OAuth Kullanıcıları İçin Profil Oluşturma

Eğer daha önce Google ile kayıt olmuş ama profili oluşmamış kullanıcılar varsa, onlar için manuel olarak profil oluşturabilirsiniz:

```sql
-- Find OAuth users without profiles
SELECT
  u.id,
  u.email,
  u.raw_app_meta_data->>'provider' as provider,
  u.raw_user_meta_data->>'name' as name
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
  AND u.raw_app_meta_data->>'provider' != 'email';
```

Bu kullanıcıları görüyorsanız, her biri için:

```sql
-- Replace USER_ID, USER_EMAIL, and USER_NAME with actual values
DO $$
DECLARE
  v_user_id uuid := 'USER_ID'; -- Replace with actual user ID
  v_email text := 'USER_EMAIL'; -- Replace with actual email
  v_full_name text := 'USER_NAME'; -- Replace with actual name
  v_company_id uuid;
  v_company_name text;
BEGIN
  v_company_name := v_full_name || ' Pest Control';

  -- Create company
  INSERT INTO public.companies (name, owner_id, email, phone, address, currency)
  VALUES (v_company_name, v_user_id, v_email, '', '', 'TRY')
  RETURNING id INTO v_company_id;

  -- Create profile
  INSERT INTO public.profiles (
    id, email, full_name, phone, role, company_id, company_name,
    accepted_privacy_policy, accepted_terms_of_service,
    privacy_policy_accepted_at, terms_of_service_accepted_at
  ) VALUES (
    v_user_id, v_email, v_full_name, '', 'company', v_company_id, v_company_name,
    true, true, now(), now()
  );
END $$;
```

### 6. Test Edin

1. Yeni bir Google hesabı ile kayıt olmayı deneyin
2. Kayıt sayfasında gizlilik politikası ve kullanım şartlarını kabul edin
3. "Google ile Kayıt Ol" butonuna tıklayın
4. Google ile giriş yapın
5. "Hesabınız oluşturuluyor" mesajını göreceksiniz
6. Birkaç saniye sonra company dashboard'una yönlendirileceksiniz

### 7. Sorun Giderme

Eğer hala çalışmıyorsa:

1. **Browser Console'u açın** (F12 tuşu) ve Console sekmesine bakın
2. Aşağıdaki sorguyu çalıştırarak son kullanıcıları kontrol edin:

```sql
SELECT
  u.id,
  u.email,
  u.created_at,
  u.raw_app_meta_data->>'provider' as provider,
  p.id as profile_id,
  p.role,
  p.company_id
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 10;
```

3. **Logs'lara bakın**: Supabase Dashboard > Logs > Postgres Logs
   - "OAuth trigger fired" mesajını görmelisiniz
   - Hata varsa burada göreceksiniz

## Özet

Bu işlemler sonrasında:
- ✅ Google ile kayıt olan yeni kullanıcılar otomatik olarak profil alacak
- ✅ Bir şirket kaydı otomatik oluşturulacak
- ✅ Kullanıcı doğrudan company dashboard'una yönlendirilecek
- ✅ Gizlilik politikası ve kullanım şartları otomatik kabul edilecek

## Ek Notlar

- Trigger sadece OAuth kullanıcıları için çalışır (email/password kayıtları etkilenmez)
- Her OAuth kullanıcısı otomatik olarak "company" rolü alır
- Şirket adı kullanıcının adından otomatik oluşturulur
- Para birimi varsayılan olarak TRY'dir
