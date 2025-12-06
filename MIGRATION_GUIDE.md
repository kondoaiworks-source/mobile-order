# マイグレーション実行ガイド

## checkout_completedステータス追加マイグレーション

このガイドでは、`checkout_completed`ステータスをデータベースに追加する手順を説明します。

### 方法1: Supabaseダッシュボードから実行（推奨）

#### 手順

1. **Supabaseダッシュボードにアクセス**
   - https://supabase.com/dashboard にログイン
   - 対象のプロジェクトを選択

2. **SQL Editorを開く**
   - 左サイドバーから「**SQL Editor**」をクリック
   - 「**New query**」ボタンをクリックして新しいクエリを作成

3. **SQLを実行**
   - 以下のSQLをコピー&ペースト（または`add-checkout-completed-status.sql`ファイルの内容をコピー）

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

4. **実行**
   - 「**Run**」ボタンをクリック（または `Cmd+Enter` / `Ctrl+Enter`）

5. **結果の確認**
   - 下部の「Messages」タブに「statusカラムにcheckout_completedステータスを追加しました」と表示されれば成功
   - エラーが表示された場合は、エラーメッセージを確認してください

### 方法2: スクリプトを使用

#### 前提条件

- Node.jsがインストールされていること

#### 手順

1. **スクリプトを実行**
   ```bash
   node scripts/apply-checkout-completed-migration.js
   ```

2. **出力されたSQLをSupabaseダッシュボードで実行**
   - スクリプトがSQLを表示するので、それをコピー
   - 方法1の手順3以降を実行

### 実行後の確認

マイグレーションが正常に実行されたことを確認するには、以下のSQLをSupabaseのSQL Editorで実行してください：

```sql
-- 現在のordersテーブルの制約を確認
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.orders'::regclass
  AND contype = 'c';
```

このクエリの結果に`checkout_completed`が含まれていれば成功です。

### 動作確認

マイグレーション実行後、以下の動作を確認してください：

1. **アプリケーションを再起動**
   ```bash
   npm run dev
   ```

2. **会計機能のテスト**
   - 注文を作成
   - 会計リクエストを送信
   - 会計を完了
   - 会計画面で、会計完了済みの注文が履歴から消えていることを確認

### トラブルシューティング

#### エラー: "constraint already exists"

このエラーは既に制約が存在する場合に発生します。問題ありません。マイグレーションは成功しています。

#### エラー: "relation 'orders' does not exist"

`orders`テーブルが存在しません。先にテーブルを作成してください。

#### その他のエラー

エラーメッセージを確認し、以下をチェックしてください：
- Supabaseプロジェクトが正しく選択されているか
- データベースへの接続が正常か
- 必要な権限があるか

### ロールバック方法

万が一、マイグレーションをロールバックする必要がある場合：

```sql
-- CHECK制約を削除
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- 元の制約に戻す（checkout_completedを除く）
ALTER TABLE public.orders 
  ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'preparing', 'completed', 'checkout_requested'));
```

**注意**: ロールバック後、既に`checkout_completed`ステータスの注文がある場合は、別のステータスに更新してください。

## 次のステップ

マイグレーション実行後：
1. アプリケーションを再起動
2. 会計機能をテスト
3. 問題がなければ本番環境にも同様に適用

