-- Orders テーブルの作成（存在しない場合のみ）
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    CREATE TABLE public.orders (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      table_number INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'preparing', 'completed')),
      items JSONB NOT NULL,
      total NUMERIC(10, 2) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;
END $$;

-- RLS (Row Level Security) の有効化
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 匿名ユーザーが orders を読み書きできるようにする（既に存在する場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'orders' 
    AND policyname = 'Allow anonymous read access to orders'
  ) THEN
    CREATE POLICY "Allow anonymous read access to orders"
      ON public.orders
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'orders' 
    AND policyname = 'Allow anonymous insert access to orders'
  ) THEN
    CREATE POLICY "Allow anonymous insert access to orders"
      ON public.orders
      FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'orders' 
    AND policyname = 'Allow anonymous update access to orders'
  ) THEN
    CREATE POLICY "Allow anonymous update access to orders"
      ON public.orders
      FOR UPDATE
      USING (true);
  END IF;
END $$;

