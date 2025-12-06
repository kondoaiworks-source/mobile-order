# 本番環境マイグレーション実行ガイド

## 🚨 重要：このマイグレーションを実行しないと、会計済み注文機能が正常に動作しません

---

## 方法1: 手動実行（推奨・最も確実）

### ステップ1: Supabaseダッシュボードにアクセス

1. https://supabase.com/dashboard にログイン
2. **⚠️ 本番環境のプロジェクトを選択してください**

### ステップ2: SQL Editorを開く

1. 左サイドバー → 「**SQL Editor**」
2. 「**New query**」をクリック

### ステップ3: SQLを実行

以下のSQLをコピー&ペースト：

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

### ステップ4: 実行結果を確認

- 下部の「Messages」タブに「statusカラムにcheckout_completedステータスを追加しました」と表示されれば成功 ✅

### ステップ5: 確認クエリ（オプション）

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

---

## 方法2: 自動実行スクリプト（環境変数が必要）

### 前提条件

1. `pg`パッケージがインストールされている（既にインストール済み ✅）
2. Supabaseのデータベース接続文字列が必要

### ステップ1: データベース接続文字列を取得

1. Supabaseダッシュボード → Settings → Database
2. 「Connection string」セクション
3. 「URI」タブを選択
4. 接続文字列をコピー（形式: `postgresql://postgres:[password]@[host]:5432/postgres`）

### ステップ2: 環境変数を設定

```bash
export SUPABASE_DB_URL="postgresql://postgres:[password]@[host]:5432/postgres"
```

⚠️ **重要**: このURLは秘密情報です。絶対にGitHubにコミットしないでください！

### ステップ3: マイグレーションを実行

```bash
npm run migration:production
```

または直接：

```bash
SUPABASE_DB_URL="postgresql://..." node scripts/execute-production-migration.js
```

### 実行結果

- ✅ 成功: 制約が正常に追加されたことが表示されます
- ❌ 失敗: エラーメッセージが表示され、手動実行方法が案内されます

---

## 実行後の確認

### 1. データベースの確認

上記の確認クエリを実行して、`checkout_completed`が制約に含まれていることを確認してください。

### 2. アプリケーションの動作確認

1. 本番アプリケーションにアクセス
2. 注文を作成
3. 会計リクエストを送信
4. 厨房側で会計完了をクリック
5. **会計済みの注文が会計タブに表示されないことを確認** ✅

---

## トラブルシューティング

### 問題: マイグレーション実行時にエラーが発生

**確認事項**:
- 本番環境のプロジェクトを選択しているか
- `orders`テーブルが存在するか
- 必要な権限があるか

**対処法**:
- エラーメッセージを確認
- 開発環境で一度テスト実行してから本番環境で実行

### 問題: 自動実行スクリプトが動作しない

**対処法**:
- 環境変数が正しく設定されているか確認
- 接続文字列の形式が正しいか確認
- 手動実行方法（方法1）を使用してください

---

## 関連ファイル

- `add-checkout-completed-status-clean.sql` - マイグレーションSQLファイル
- `scripts/execute-production-migration.js` - 自動実行スクリプト
- `PRODUCTION_FINAL_DEPLOY.md` - 詳細なデプロイ手順

---

**✅ マイグレーション実行後、必ず動作確認を行ってください！**

