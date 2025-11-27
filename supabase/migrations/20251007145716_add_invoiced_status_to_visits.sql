/*
  # Ziyaretlere Fatura Durumu Ekleme

  1. Değişiklikler
    - `visits` tablosuna `is_invoiced` boolean kolonu ekleniyor
    - Varsayılan değer: false
    - Fatura kesilmiş ziyaretleri işaretlemek için kullanılacak
  
  2. Notlar
    - Sadece tamamlanmış ziyaretler için fatura kesilebilir
    - Checkbox ile kolayca işaretlenebilir/kaldırılabilir
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visits' AND column_name = 'is_invoiced'
  ) THEN
    ALTER TABLE visits ADD COLUMN is_invoiced boolean DEFAULT false;
  END IF;
END $$;
