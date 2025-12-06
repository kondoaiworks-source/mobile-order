# 🚨 緊急：データベースマイグレーション実行

## 問題
会計済みの注文が会計タブに表示され続ける問題を解決するために、**Supabase側に`checkout_completed`ステータスを追加する必要があります**。

## 実行手順（5分）

### ステップ1: Supabaseダッシュボードを開く

1. https://supabase.com/dashboard にログイン
2. **⚠️ 本番環境のプロジェクトを選択**

### ステップ2: SQL Editorで実行

1. 左サイドバー → 「**SQL Editor**」
2. 「**New query**」をクリック
3. 以下のSQLをコピー&ペースト：

```sql
-- ordersテーブルのstatusカラムに'checkout_completed'ステータスを追加

-- 既存のCHECK制約を削除
DO $$
BEGIN
  -- CHECK制約を削除
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

4. 「**Run**」ボタンをクリック（または `Cmd+Enter` / `Ctrl+Enter`）

### ステップ3: 実行結果を確認

- 下部の「Messages」タブに「statusカラムにcheckout_completedステータスを追加しました」と表示されれば成功 ✅

### ステップ4: 確認クエリ（オプション）

実行後の確認：

```sql
-- 現在の制約を確認
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.orders'::regclass
  AND contype = 'c';
```

`checkout_completed`が含まれていれば成功です。

## 実行後の確認

マイグレーション実行後：

1. **アプリケーションを再起動**（またはページをリロード）
2. **会計機能をテスト**
3. **会計済みの注文が会計タブに表示されないことを確認**

---

⚠️ **重要**: このマイグレーションを実行しないと、会計済みの注文が表示され続けます。

