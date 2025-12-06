# マイグレーションスクリプト

## 使用方法

### checkout_completedステータス追加マイグレーション

```bash
npm run migration:show
```

または

```bash
node scripts/apply-checkout-completed-migration.js
```

このコマンドを実行すると、SupabaseダッシュボードのSQL Editorで実行するSQLが表示されます。

### 手動実行手順

1. 上記コマンドを実行してSQLを表示
2. SQLをコピー
3. Supabaseダッシュボード → SQL Editor → New query
4. SQLをペーストして実行
5. アプリケーションを再起動

詳細は [MIGRATION_GUIDE.md](../MIGRATION_GUIDE.md) を参照してください。

