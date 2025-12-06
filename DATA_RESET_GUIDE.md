# データリセットガイド

初回立ち上げ時に過去のデータが表示される問題を解決するためのガイドです。

## ⚠️ 重要: バックアップの取得

データを削除する前に、必ずSupabaseダッシュボードからデータをエクスポートしてください。

1. Supabaseダッシュボード → Table Editor → orders
2. データを確認
3. 必要に応じてエクスポート（手動でCSVなどにコピー）

---

## 方法1: 全ての注文データを削除（推奨：初期化時）

最もシンプルな方法です。**全ての注文データを削除**します。

### 手順

1. **Supabaseダッシュボードにアクセス**
   - https://supabase.com/dashboard にログイン
   - 対象のプロジェクトを選択

2. **SQL Editorを開く**
   - 左サイドバー → 「SQL Editor」
   - 「New query」をクリック

3. **以下のSQLを実行**

```sql
-- 全ての注文を削除
DELETE FROM public.orders;
```

4. **実行を確認**
   - 「Run」ボタンをクリック
   - 削除された行数が表示されます

### 注意事項

- ⚠️ **全ての注文データが削除されます**
- ⚠️ **この操作は取り消せません**
- 実行前に必ずバックアップを取得してください

---

## 方法2: 特定のステータスの注文のみを削除

過去のデータを保持しつつ、特定のステータスの注文だけを削除したい場合に使用します。

### 手順

1. **Supabaseダッシュボード → SQL Editor**を開く

2. **必要なSQLを選択して実行**

#### パターンA: 会計完了済みの注文のみを削除

```sql
DELETE FROM public.orders WHERE status = 'checkout_completed';
```

#### パターンB: 完了済み（completed）の注文を削除

```sql
DELETE FROM public.orders WHERE status = 'completed';
```

#### パターンC: 完了済みと会計関連の注文を全て削除

```sql
DELETE FROM public.orders 
WHERE status IN ('completed', 'checkout_requested', 'checkout_completed');
```

#### パターンD: 過去の特定の日付より前の注文を削除（例: 30日前より前）

```sql
DELETE FROM public.orders 
WHERE created_at < NOW() - INTERVAL '30 days';
```

### 削除後の確認

削除後に、残っている注文を確認するには：

```sql
-- ステータス別の注文数を確認
SELECT 
  status,
  COUNT(*) as count
FROM public.orders
GROUP BY status
ORDER BY status;
```

---

## 方法3: スクリプトファイルを使用

### 全てのデータを削除する場合

1. `reset-orders-data.sql` ファイルの内容をSupabaseのSQL Editorで実行

### 特定のステータスのみ削除する場合

1. `reset-specific-status-orders.sql` ファイルを開く
2. 必要なSQLのコメント（`--`）を外す
3. SupabaseのSQL Editorで実行

---

## リセット後の確認

データリセット後、以下を確認してください：

1. **会計画面（/checkout）**
   - 注文履歴が空になっていることを確認
   - 「注文履歴がありません」と表示されることを確認

2. **厨房画面（/kitchen）**
   - 過去の注文が表示されていないことを確認
   - 新規注文が正常に表示されることを確認

3. **アプリケーションの動作確認**
   - 新規注文を作成できることを確認
   - 注文フローが正常に動作することを確認

---

## トラブルシューティング

### 問題: 削除後もデータが表示される

**原因**: ブラウザのキャッシュやアプリケーションの状態が古いまま

**対処法**:
1. ブラウザのキャッシュをクリア
2. ページを強制リロード（`Cmd+Shift+R` / `Ctrl+Shift+R`）
3. アプリケーションを再起動

### 問題: 削除できなかった

**原因**: 権限不足やRLS（Row Level Security）の制約

**対処法**:
1. SupabaseダッシュボードのSQL Editorで実行していることを確認（Service Role権限が必要な場合があります）
2. RLSポリシーを確認
3. エラーメッセージを確認して対処

### 問題: 誤って重要なデータを削除してしまった

**対処法**:
1. Supabaseのバックアップから復元（有料プランの場合）
2. 事前に取得したバックアップから復元
3. Supabaseサポートに問い合わせ

---

## 今後の対策

過去のデータが表示されないようにするために：

1. **定期的なデータクリーンアップ**
   - 一定期間経過後のデータを自動削除するスケジュールを設定
   - SupabaseのFunctionsやCronジョブを活用

2. **開発環境と本番環境の分離**
   - 開発環境では定期的にデータをリセット
   - 本番環境では重要なデータを保持

3. **データ保持ポリシーの設定**
   - 会計完了済みの注文は一定期間後に自動削除
   - または、別のアーカイブテーブルに移動

---

## 関連ファイル

- `reset-orders-data.sql` - 全ての注文データを削除
- `reset-specific-status-orders.sql` - 特定のステータスのみ削除

