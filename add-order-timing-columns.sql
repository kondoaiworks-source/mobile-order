-- orders テーブルに start_time, end_time, duration_seconds カラムを追加
DO $$
BEGIN
  -- orders テーブルが存在するか確認
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    -- start_time 列が存在しない場合のみ追加
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'orders' 
      AND column_name = 'start_time'
    ) THEN
      ALTER TABLE public.orders 
      ADD COLUMN start_time TIMESTAMP WITH TIME ZONE;
      
      RAISE NOTICE 'start_time 列を追加しました';
    END IF;

    -- end_time 列が存在しない場合のみ追加
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'orders' 
      AND column_name = 'end_time'
    ) THEN
      ALTER TABLE public.orders 
      ADD COLUMN end_time TIMESTAMP WITH TIME ZONE;
      
      RAISE NOTICE 'end_time 列を追加しました';
    END IF;

    -- duration_seconds 列が存在しない場合のみ追加
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'orders' 
      AND column_name = 'duration_seconds'
    ) THEN
      ALTER TABLE public.orders 
      ADD COLUMN duration_seconds INTEGER;
      
      RAISE NOTICE 'duration_seconds 列を追加しました';
    END IF;
  ELSE
    RAISE NOTICE 'orders テーブルが存在しません。先にテーブルを作成してください。';
  END IF;
END $$;


