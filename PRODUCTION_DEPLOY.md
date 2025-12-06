# 本番環境への実装手順

## 実装内容

`checkout_completed`ステータスを追加し、会計完了済みの注文がデータベースに残りつつ、会計画面の履歴から非表示になる機能を実装します。

## 実装チェックリスト

### ステップ1: データベースマイグレーション実行

- [ ] Supabaseダッシュボードにログイン
- [ ] **本番環境のプロジェクト**を選択
- [ ] SQL Editorを開く
- [ ] マイグレーションSQLを実行
- [ ] 実行結果を確認

### ステップ2: アプリケーションコードのデプロイ

- [ ] 変更をGitにコミット
- [ ] 本番環境にプッシュ（Vercelなど）
- [ ] デプロイの完了を確認

### ステップ3: 動作確認

- [ ] アプリケーションが正常に動作することを確認
- [ ] 会計機能をテスト
- [ ] 会計完了後、履歴から注文が消えることを確認

---

## 詳細手順

### ステップ1: データベースマイグレーション実行

#### 1.1 SQLを取得

ターミナルで以下を実行してSQLを表示：

```bash
npm run migration:show
```

または、以下のファイルの内容をコピー：
- `add-checkout-completed-status.sql`

#### 1.2 Supabaseダッシュボードで実行

1. **Supabaseダッシュボードにアクセス**
   - https://supabase.com/dashboard にログイン
   - **⚠️ 重要: 本番環境のプロジェクトを選択してください**

2. **SQL Editorを開く**
   - 左サイドバーから「**SQL Editor**」をクリック
   - 「**New query**」ボタンをクリック

3. **SQLを実行**
   - 以下のSQLをコピー&ペースト：

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

4. **実行ボタンをクリック**
   - 「**Run**」ボタンをクリック（または `Cmd+Enter` / `Ctrl+Enter`）

5. **結果を確認**
   - 下部の「Messages」タブに成功メッセージが表示されればOK
   - エラーが表示された場合は、エラーメッセージを確認

#### 1.3 マイグレーション実行の確認

以下のSQLを実行して、マイグレーションが正常に適用されたことを確認：

```sql
-- 現在のordersテーブルの制約を確認
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.orders'::regclass
  AND contype = 'c';
```

実行結果に`checkout_completed`が含まれていれば成功です。

---

### ステップ2: アプリケーションコードのデプロイ

#### 2.1 変更をコミット

```bash
# 変更内容を確認
git status

# 変更をステージング
git add .

# コミット
git commit -m "feat: checkout_completedステータスを追加し、会計完了済み注文を履歴から非表示にする機能を実装"
```

#### 2.2 本番環境にプッシュ

```bash
# メインブランチにプッシュ（またはデプロイブランチ）
git push origin main
```

#### 2.3 Vercelでデプロイ確認

Vercelを使用している場合：

1. Vercelダッシュボードにアクセス
2. プロジェクトのデプロイメントを確認
3. 自動デプロイが開始されていることを確認
4. デプロイが完了するまで待機

**注意**: 環境変数が本番環境に正しく設定されていることを確認してください：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

### ステップ3: 動作確認

#### 3.1 基本的な動作確認

1. **アプリケーションにアクセス**
   - 本番環境のURLにアクセス
   - ページが正常に読み込まれることを確認

2. **エラーの確認**
   - ブラウザのコンソールでエラーがないか確認
   - ネットワークタブでAPIリクエストが正常に完了しているか確認

#### 3.2 会計機能のテスト

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
   - 注文履歴が空になっていることを確認（`checkout_completed`は履歴に表示されない）

#### 3.3 データベースの確認（オプション）

SupabaseのTable Editorで確認：

1. **Table Editorを開く**
   - Supabaseダッシュボード → Table Editor → orders

2. **ステータスを確認**
   - 会計完了済みの注文の`status`が`checkout_completed`になっていることを確認
   - データが削除されずに残っていることを確認

---

## ロールバック方法（必要に応じて）

万が一、問題が発生した場合のロールバック手順：

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

## トラブルシューティング

### 問題: マイグレーション実行時にエラーが発生

**確認事項**:
- 本番環境のプロジェクトを選択しているか
- `orders`テーブルが存在するか
- 必要な権限があるか

**対処法**:
- エラーメッセージを確認
- 開発環境で一度テスト実行してから本番環境で実行

### 問題: アプリケーションが正常に動作しない

**確認事項**:
- 環境変数が正しく設定されているか
- デプロイが正常に完了しているか
- ブラウザのコンソールでエラーを確認

**対処法**:
- 環境変数を再確認
- Vercelのログを確認
- ブラウザのキャッシュをクリア

### 問題: 会計完了後も注文が履歴に表示される

**確認事項**:
- マイグレーションが正常に実行されたか
- ステータスが`checkout_completed`になっているか
- `fetchOrderHistory`が`completed`ステータスのみを取得しているか

**対処法**:
- データベースの制約を確認
- ブラウザのコンソールでAPIリクエストを確認
- アプリケーションを再読み込み

---

## 実装完了確認

以下の項目が全て完了していれば実装成功です：

- [x] データベースマイグレーションが正常に実行された
- [x] アプリケーションが正常にデプロイされた
- [x] 会計機能が正常に動作する
- [x] 会計完了後、注文が履歴から消える
- [x] データベースに注文データが残っている

---

## 連絡先・サポート

問題が発生した場合：
1. エラーメッセージを記録
2. ブラウザのコンソールログを確認
3. SupabaseとVercelのログを確認
4. 必要に応じてロールバックを実行

