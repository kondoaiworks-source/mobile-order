# 本番環境への最終実装手順

## 🚨 重要：2つのステップが必要です

### ステップ1: データベースマイグレーション（必須）

**⚠️ このステップを実行しないと、会計済みの注文が表示され続けます！**

### ステップ2: アプリケーションコードのデプロイ

---

## ステップ1: データベースマイグレーション実行（5分）

### 1.1 Supabaseダッシュボードにアクセス

1. https://supabase.com/dashboard にログイン
2. **⚠️ 本番環境のプロジェクトを選択してください**

### 1.2 SQL Editorで実行

1. 左サイドバー → 「**SQL Editor**」
2. 「**New query**」をクリック

### 1.3 SQLを実行

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

### 1.4 実行結果を確認

- 下部の「Messages」タブに「statusカラムにcheckout_completedステータスを追加しました」と表示されれば成功 ✅

### 1.5 確認クエリ（オプション）

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

## ステップ2: アプリケーションコードのデプロイ（3分）

### 2.1 変更をコミット・プッシュ

```bash
# 変更内容を確認
git status

# 変更をステージング
git add .

# コミット
git commit -m "fix: 会計済み注文を会計タブから除外する機能を実装
- fetchOrderHistory関数を改善
- checkout_completedステータスのサポートを追加
- クライアント側で会計済み注文を確実に除外"

# 本番環境にプッシュ
git push origin main
```

### 2.2 Vercelでデプロイ確認

1. **Vercelダッシュボードにアクセス**
   - https://vercel.com/dashboard
   - プロジェクトを選択

2. **デプロイメントの確認**
   - 最新のデプロイメントが開始されていることを確認
   - デプロイが完了するまで待機（通常1-3分）

3. **デプロイログの確認**
   - エラーがないことを確認

---

## ステップ3: 動作確認（5分）

### 3.1 アプリケーションの確認

1. **アプリケーションにアクセス**
   - 本番環境のURLにアクセス
   - ページが正常に読み込まれることを確認

2. **エラーの確認**
   - ブラウザのコンソールでエラーがないか確認
   - ネットワークタブでAPIリクエストが正常に完了しているか確認

### 3.2 会計機能のテスト

1. **注文を作成**
   - 商品をカートに追加
   - 注文を完了
   - 注文が「completed」ステータスになるまで待機

2. **会計リクエストを送信**
   - 会計タブに移動
   - 「会計する」ボタンをクリック
   - 注文履歴から該当注文が消えることを確認（`checkout_requested`になったため）

3. **厨房側で会計完了**
   - 厨房画面で「会計完了」ボタンをクリック
   - ステータスが`checkout_completed`に変更される

4. **会計画面の確認**
   - ユーザー側の会計画面を確認
   - **会計済みの注文が表示されないことを確認** ✅
   - 新しい注文のみが表示されることを確認

### 3.3 同じテーブルで複数回会計するテスト

1. **複数の注文を作成**
   - 同じテーブル番号で複数の注文を完了
   - 会計リクエストを複数回送信

2. **会計完了の確認**
   - 厨房側で「会計完了」をクリック
   - **最新の会計リクエストのみが完了されることを確認** ✅
   - 前回の会計リクエストはそのまま保持されることを確認

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

### 問題: デプロイ後も会計済みの注文が表示される

**原因の可能性**:
1. **マイグレーションが実行されていない**
   - `checkout_completed`ステータスがデータベースに追加されていない
   - `completeCheckout`関数が`checkout_completed`に更新できない

2. **ブラウザのキャッシュ**
   - 古いデータがキャッシュされている

**対処法**:
1. **マイグレーションの確認**
   ```sql
   -- 制約を確認
   SELECT 
       conname AS constraint_name,
       pg_get_constraintdef(oid) AS constraint_definition
   FROM pg_constraint
   WHERE conrelid = 'public.orders'::regclass
     AND contype = 'c';
   ```
   `checkout_completed`が含まれているか確認

2. **ブラウザのキャッシュをクリア**
   - ブラウザのキャッシュを完全にクリア
   - アプリケーションを強制リロード（`Cmd+Shift+R` / `Ctrl+Shift+R`）

3. **データベースの状態を確認**
   - Supabase Table Editor → orders
   - 会計完了後の注文のステータスが`checkout_completed`になっているか確認

### 問題: アプリケーションが正常に動作しない

**確認事項**:
- 環境変数が正しく設定されているか
- デプロイが正常に完了しているか
- ブラウザのコンソールでエラーを確認

**対処法**:
- 環境変数を再確認
- Vercelのログを確認
- ブラウザのキャッシュをクリア

---

## ロールバック方法（必要に応じて）

### データベースのロールバック

```sql
-- CHECK制約を削除
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- 元の制約に戻す（checkout_completedを除く）
ALTER TABLE public.orders 
  ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'preparing', 'completed', 'checkout_requested'));
```

**注意**: ロールバック後、既に`checkout_completed`ステータスの注文がある場合は、別のステータスに更新してください。

### アプリケーションのロールバック

Vercelを使用している場合：

1. Vercelダッシュボード → Deployments
2. 前の正常に動作していたデプロイメントを選択
3. 「...」メニュー → 「Promote to Production」をクリック

---

## 実装完了確認チェックリスト

以下の項目が全て完了していれば実装成功です：

- [ ] データベースマイグレーションが正常に実行された
- [ ] `checkout_completed`ステータスがデータベースに追加されたことを確認
- [ ] アプリケーションコードが本番環境にデプロイされた
- [ ] アプリケーションが正常に動作する
- [ ] 会計機能が正常に動作する
- [ ] 会計済みの注文が会計タブに表示されない
- [ ] 最新の会計リクエストのみが完了される
- [ ] 新規注文が正常に作成・表示される

---

## 更新内容まとめ

### 実装された機能

1. **会計完了処理の改善**
   - 同じテーブルで複数の会計リクエストがある場合、最新のリクエストのみを完了
   - `completeCheckout`関数を改善

2. **会計タブの表示改善**
   - 会計済みの注文（`checkout_completed`、`checkout_requested`）を除外
   - `fetchOrderHistory`関数を改善

3. **データベースマイグレーション**
   - `checkout_completed`ステータスを追加

---

## 関連ファイル

- `URGENT_MIGRATION.md` - マイグレーション実行手順（詳細版）
- `PRODUCTION_UPDATE.md` - 以前の更新手順
- `add-checkout-completed-status.sql` - マイグレーションSQLファイル

---

**実装完了後、必ず動作確認を行ってください！**

