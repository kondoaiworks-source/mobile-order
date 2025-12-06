# クイックデプロイガイド

## 🚀 本番環境への実装（5分で完了）

### ステップ1: SQLマイグレーション実行（2分）

1. **Supabaseダッシュボードを開く**
   - https://supabase.com/dashboard
   - **本番環境のプロジェクト**を選択

2. **SQL Editorを開く**
   - 左サイドバー → 「SQL Editor」
   - 「New query」をクリック

3. **以下のSQLをコピー&ペーストして実行**

```sql
-- ordersテーブルのstatusカラムに'checkout_completed'ステータスを追加

-- 既存のCHECK制約を削除
DO $$
BEGIN
  ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
END $$;

-- 新しいCHECK制約を追加（'checkout_completed'を含む）
DO $$
BEGIN
  ALTER TABLE public.orders 
    ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('pending', 'preparing', 'completed', 'checkout_requested', 'checkout_completed'));
  
  RAISE NOTICE 'statusカラムにcheckout_completedステータスを追加しました';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE '制約は既に存在します';
END $$;
```

4. **「Run」ボタンをクリック**（または `Cmd+Enter` / `Ctrl+Enter`）

5. **成功メッセージを確認**
   - 下部の「Messages」に「statusカラムにcheckout_completedステータスを追加しました」と表示されればOK ✅

---

### ステップ2: アプリケーションをデプロイ（3分）

```bash
# 変更をコミット
git add .
git commit -m "feat: checkout_completedステータスを追加"

# 本番環境にプッシュ
git push origin main
```

Vercelを使用している場合、自動デプロイが開始されます。

---

### ✅ 完了！

デプロイが完了したら、以下を確認：

1. アプリケーションが正常に動作する
2. 会計機能をテスト
3. 会計完了後、注文が履歴から消えることを確認

---

## 📋 詳細な手順が必要な場合

`PRODUCTION_DEPLOY.md` を参照してください。

