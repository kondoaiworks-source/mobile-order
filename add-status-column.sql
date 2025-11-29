-- status 列が存在するか確認し、存在しない場合は TEXT 型として追加
DO $$
BEGIN
  -- orders テーブルが存在するか確認
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    -- status 列が存在しない場合のみ追加
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'orders' 
      AND column_name = 'status'
    ) THEN
      -- status 列を追加（初期値 'pending'、CHECK 制約付き）
      ALTER TABLE public.orders 
      ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' 
      CHECK (status IN ('pending', 'preparing', 'completed'));
      
      RAISE NOTICE 'status 列を TEXT 型として追加しました（初期値: pending）';
    ELSE
      RAISE NOTICE 'status 列は既に存在します';
      
      -- 既存の status 列に CHECK 制約が存在するか確認し、存在しない場合は追加
      IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_schema = 'public'
        AND tc.table_name = 'orders'
        AND tc.constraint_type = 'CHECK'
        AND ccu.column_name = 'status'
      ) THEN
        -- CHECK 制約を追加
        ALTER TABLE public.orders 
        ADD CONSTRAINT orders_status_check 
        CHECK (status IN ('pending', 'preparing', 'completed'));
        
        RAISE NOTICE 'status 列に CHECK 制約を追加しました';
      END IF;
    END IF;
  ELSE
    RAISE NOTICE 'orders テーブルが存在しません。先にテーブルを作成してください。';
  END IF;
END $$;

