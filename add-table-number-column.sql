-- table_number 列が存在するか確認し、存在しない場合は VARCHAR 型として追加
DO $$
BEGIN
  -- orders テーブルが存在するか確認
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    -- table_number 列が存在しない場合のみ追加
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'orders' 
      AND column_name = 'table_number'
    ) THEN
      ALTER TABLE public.orders 
      ADD COLUMN table_number VARCHAR(50);
      
      RAISE NOTICE 'table_number 列を VARCHAR 型として追加しました';
    ELSE
      RAISE NOTICE 'table_number 列は既に存在します';
    END IF;
  ELSE
    RAISE NOTICE 'orders テーブルが存在しません。先にテーブルを作成してください。';
  END IF;
END $$;

