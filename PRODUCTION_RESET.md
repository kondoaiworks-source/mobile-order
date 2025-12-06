# 本番環境でのデータリセット手順

⚠️ **重要**: 本番環境でデータを削除する前に、必ずバックアップを取得してください。

## 実行前のチェックリスト

- [ ] 本番環境のデータをバックアップした
- [ ] 削除対象のデータを確認した
- [ ] 本番環境のSupabaseプロジェクトを選択した
- [ ] 削除後に問題が発生した場合の復旧手順を理解した

---

## クイックリセット（推奨）

### ステップ1: SQLを取得

```bash
npm run reset:orders
```

### ステップ2: Supabase本番環境で実行

1. **Supabaseダッシュボードにログイン**
   - https://supabase.com/dashboard
   - ⚠️ **本番環境のプロジェクトを選択**

2. **SQL Editorを開く**
   - 左サイドバー → 「SQL Editor」
   - 「New query」をクリック

3. **SQLを実行**
   - ステップ1で表示されたSQLをコピー&ペースト
   - 「Run」ボタンをクリック（または `Cmd+Enter` / `Ctrl+Enter`）

4. **結果を確認**
   - 削除された行数が表示されます
   - エラーがないことを確認

---

## オプション別のリセット方法

### パターン1: 完了済みと会計関連の注文のみ削除（推奨）

```bash
npm run reset:orders
```

**実行されるSQL**:
```sql
-- 完了済みと会計関連の注文を削除
DELETE FROM public.orders 
WHERE status IN ('completed', 'checkout_requested', 'checkout_completed');

-- 削除後の確認
SELECT 
  status,
  COUNT(*) as count
FROM public.orders
GROUP BY status
ORDER BY status;
```

**メリット**: 
- 進行中の注文（pending, preparing）は保持される
- 過去の完了済み注文のみ削除される

---

### パターン2: 全ての注文を削除（完全リセット）

```bash
npm run reset:orders:all
```

**実行されるSQL**:
```sql
-- 全ての注文を削除
DELETE FROM public.orders;

-- 削除後の確認
SELECT COUNT(*) as remaining_orders FROM public.orders;
```

**⚠️ 注意**: 
- **全ての注文データが削除されます**
- 進行中の注文も含めて全て削除されます
- この操作は取り消せません

---

### パターン3: 完了済み（completed）の注文のみ削除

```bash
npm run reset:orders:completed
```

**実行されるSQL**:
```sql
-- 完了済み（completed）の注文を削除
DELETE FROM public.orders WHERE status = 'completed';
```

---

### パターン4: 会計関連の注文のみ削除

```bash
npm run reset:orders:checkout
```

**実行されるSQL**:
```sql
-- 会計関連（checkout_requested, checkout_completed）の注文を削除
DELETE FROM public.orders 
WHERE status IN ('checkout_requested', 'checkout_completed');
```

---

### パターン5: 過去N日前より前の注文を削除

```bash
node scripts/reset-orders-data.js --old-days=30
```

**実行されるSQL**（30日前より前の例）:
```sql
-- 30日前より前の注文を削除
DELETE FROM public.orders 
WHERE created_at < NOW() - INTERVAL '30 days';
```

**カスタマイズ例**:
- 7日前より前: `--old-days=7`
- 60日前より前: `--old-days=60`

---

## 実行後の確認

### 1. データベースでの確認

```sql
-- 残っている注文をステータス別に確認
SELECT 
  status,
  COUNT(*) as count
FROM public.orders
GROUP BY status
ORDER BY status;
```

### 2. アプリケーションでの確認

1. **会計画面（/checkout）**
   - ブラウザでアプリケーションにアクセス
   - 会計タブを開く
   - 過去の注文履歴が表示されていないことを確認
   - 「注文履歴がありません」と表示されることを確認

2. **厨房画面（/kitchen）**
   - 厨房画面を開く
   - 過去の注文が表示されていないことを確認
   - 新規注文が正常に表示されることを確認

3. **新規注文のテスト**
   - 商品をカートに追加
   - 注文を完了
   - 注文が正常に作成・表示されることを確認

### 3. ブラウザキャッシュのクリア

データが表示され続ける場合：

- ブラウザのキャッシュをクリア
- 強制リロード（`Cmd+Shift+R` / `Ctrl+Shift+R`）
- プライベート/シークレットモードで確認

---

## トラブルシューティング

### 問題: 削除後もデータが表示される

**原因**: ブラウザキャッシュまたはアプリケーションの状態

**対処法**:
1. ブラウザのキャッシュを完全にクリア
2. アプリケーションを強制リロード
3. プライベートモードで確認
4. アプリケーションを再起動（デプロイ）

### 問題: 削除が実行できない

**原因**: 権限不足やRLS（Row Level Security）の制約

**対処法**:
1. SupabaseダッシュボードのSQL Editorで実行していることを確認
2. Service Role権限が必要な場合があります
3. エラーメッセージを確認して対処

### 問題: 誤って重要なデータを削除してしまった

**対処法**:
1. **すぐにSupabaseサポートに連絡**
   - Supabaseダッシュボード → Support
   - 可能であればバックアップから復元

2. **Point-in-Time Recovery（有料プランの場合）**
   - SupabaseのPoint-in-Time Recovery機能を使用して復元

3. **事前バックアップから復元**
   - 取得したバックアップがあれば復元

---

## 安全な実行手順（推奨）

### 1. 事前準備

```bash
# SQLを確認（実行せずに表示のみ）
npm run reset:orders
```

### 2. バックアップの取得

Supabaseダッシュボードから：
1. Table Editor → orders
2. データを確認
3. 必要に応じてエクスポート（手動でCSVなどにコピー）

### 3. テスト環境で確認（推奨）

可能であれば、まずテスト環境で実行して確認：
1. テスト環境のSupabaseで実行
2. アプリケーションの動作を確認
3. 問題なければ本番環境で実行

### 4. 本番環境で実行

1. 本番環境のSupabaseプロジェクトを選択
2. SQL EditorでSQLを実行
3. 結果を確認

### 5. 動作確認

1. アプリケーションで確認
2. 問題があればすぐにSupabaseサポートに連絡

---

## ロールバック方法

データを誤って削除してしまった場合：

### 1. Supabaseのバックアップから復元（有料プラン）

1. Supabaseダッシュボード → Database → Backups
2. 復元したい時点のバックアップを選択
3. Point-in-Time Recoveryを実行

### 2. 手動バックアップから復元

事前にエクスポートしたデータがあれば：
1. Supabase Table Editor → orders
2. データを手動でインポート

---

## 今後の対策

### 1. 定期的なクリーンアップ

過去のデータを定期的に削除する：

```sql
-- 例: 毎日、30日前より前の完了済み注文を削除
DELETE FROM public.orders 
WHERE status IN ('completed', 'checkout_completed')
  AND created_at < NOW() - INTERVAL '30 days';
```

### 2. 自動化（Supabase Functions）

Supabase Edge FunctionsとCronジョブを使用して自動削除を設定

### 3. アーカイブテーブル

削除する代わりに、アーカイブテーブルに移動：

```sql
-- アーカイブテーブルに移動してから削除
INSERT INTO orders_archive 
SELECT * FROM orders 
WHERE status IN ('completed', 'checkout_completed')
  AND created_at < NOW() - INTERVAL '30 days';

DELETE FROM orders 
WHERE status IN ('completed', 'checkout_completed')
  AND created_at < NOW() - INTERVAL '30 days';
```

---

## 関連ファイル

- `reset-orders-data.sql` - 全ての注文を削除
- `reset-specific-status-orders.sql` - 特定ステータスのみ削除
- `scripts/reset-orders-data.js` - SQL表示スクリプト
- `DATA_RESET_GUIDE.md` - 詳細ガイド

---

## 実行記録

実行した場合は、以下を記録しておくと便利です：

- **実行日時**: ___________
- **実行したSQL**: ___________
- **削除された行数**: ___________
- **実行者**: ___________
- **備考**: ___________

