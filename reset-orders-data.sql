-- 過去の注文データを全て削除するスクリプト
-- ⚠️ 注意: このスクリプトは全ての注文データを削除します。実行前に必ずバックアップを取得してください。

-- 全ての注文を削除
DELETE FROM public.orders;

-- 削除された行数を確認
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '削除された注文数: %', deleted_count;
END $$;

