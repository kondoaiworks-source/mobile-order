# 本番環境デプロイ状況

## ✅ 完了した作業

### 1. アプリケーションコードのデプロイ
- ✅ 変更をコミット
- ✅ 本番環境にプッシュ完了
- ✅ Vercelでの自動デプロイが開始されました

**コミットハッシュ**: `1908d08`

---

## ⚠️ 残りの作業（必須）

### 2. データベースマイグレーションの実行

**⚠️ 重要**: このステップを実行しないと、会計済みの注文が表示され続けます！

#### 実行手順

1. **Supabaseダッシュボードにアクセス**
   - https://supabase.com/dashboard
   - **本番環境のプロジェクトを選択**

2. **SQL Editorを開く**
   - 左サイドバー → 「SQL Editor」
   - 「New query」をクリック

3. **以下のSQLをコピー&ペーストして実行**

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

4. **「Run」ボタンをクリック**

5. **実行結果を確認**
   - 下部の「Messages」タブに「statusカラムにcheckout_completedステータスを追加しました」と表示されれば成功 ✅

#### 確認クエリ（オプション）

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

## デプロイ後の確認

### Vercelデプロイの確認

1. **Vercelダッシュボードを確認**
   - https://vercel.com/dashboard
   - 最新のデプロイメントが完了していることを確認

2. **デプロイログを確認**
   - エラーがないことを確認

### 動作確認

マイグレーション実行後：

1. **アプリケーションにアクセス**
   - 本番環境のURLにアクセス
   - ページが正常に読み込まれることを確認

2. **会計機能をテスト**
   - 注文を作成 → 会計リクエストを送信 → 厨房側で会計完了
   - **会計済みの注文が会計タブに表示されないことを確認** ✅

3. **同じテーブルで複数回会計するテスト**
   - 複数の注文を作成 → 会計リクエストを複数回送信
   - **最新の会計リクエストのみが完了されることを確認** ✅

---

## トラブルシューティング

### 問題: デプロイ後も会計済みの注文が表示される

**原因**: データベースマイグレーションが実行されていない可能性が高い

**対処法**:
1. マイグレーションが実行されたか確認
2. 確認クエリで`checkout_completed`が含まれているか確認
3. ブラウザのキャッシュをクリア
4. アプリケーションを再読み込み

### 問題: マイグレーション実行時にエラーが発生

**対処法**:
- エラーメッセージを確認
- 本番環境のプロジェクトを選択しているか確認
- `orders`テーブルが存在するか確認

---

## 次のステップ

1. ✅ アプリケーションコードのデプロイ（完了）
2. ⏳ **データベースマイグレーションの実行（残り）**
3. ⏳ 動作確認

詳細は `PRODUCTION_FINAL_DEPLOY.md` を参照してください。

