-- 特定のステータスの注文のみを削除するスクリプト
-- 会計完了済み（checkout_completed）の注文を削除する場合の例

-- ステータス別の削除オプション（必要なもののコメントを外して実行）

-- 1. 会計完了済みの注文のみを削除
-- DELETE FROM public.orders WHERE status = 'checkout_completed';

-- 2. 完了済み（completed）の注文を削除
-- DELETE FROM public.orders WHERE status = 'completed';

-- 3. 会計リクエスト済み（checkout_requested）の注文を削除
-- DELETE FROM public.orders WHERE status = 'checkout_requested';

-- 4. 完了済みと会計関連の注文を全て削除
-- DELETE FROM public.orders WHERE status IN ('completed', 'checkout_requested', 'checkout_completed');

-- 5. 過去の特定の日付より前の注文を削除（例: 30日前より前）
-- DELETE FROM public.orders WHERE created_at < NOW() - INTERVAL '30 days';

-- 削除実行後の確認
-- 残っている注文数を確認
SELECT 
  status,
  COUNT(*) as count
FROM public.orders
GROUP BY status
ORDER BY status;

