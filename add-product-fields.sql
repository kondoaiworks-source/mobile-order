-- productsテーブルにimage_url、category、is_featuredカラムを追加

-- image_urlカラムの追加（存在しない場合のみ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.products ADD COLUMN image_url TEXT;
  END IF;
END $$;

-- categoryカラムの追加（存在しない場合のみ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'category'
  ) THEN
    ALTER TABLE public.products ADD COLUMN category TEXT;
  END IF;
END $$;

-- is_featuredカラムの追加（存在しない場合のみ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'is_featured'
  ) THEN
    ALTER TABLE public.products ADD COLUMN is_featured BOOLEAN DEFAULT false;
  END IF;
END $$;

-- インデックスの追加（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON public.products(is_featured) WHERE is_featured = true;

