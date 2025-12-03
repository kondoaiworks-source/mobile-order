# 本番環境へのデプロイ手順

## 前提条件

- Supabaseプロジェクトが作成済み
- GitHubアカウント
- Vercelアカウント（推奨）またはその他のホスティングサービス

## 1. データベースの準備

### 1.1 必要なカラムの追加

SupabaseのSQL Editorで以下のSQLスクリプトを実行してください：

```sql
-- add-product-fields.sql の内容を実行
```

または、SupabaseダッシュボードのSQL Editorで `add-product-fields.sql` の内容をコピー＆ペーストして実行してください。

### 1.2 商品データの設定

管理画面（`/admin/products`）から、各商品に以下を設定してください：

- **image_url**: 商品画像のURL（例：`https://example.com/images/product1.jpg`）
- **category**: カテゴリ名（例：「メイン」「サイド」「ドリンク」「デザート」など）
- **is_featured**: オススメ表示する場合は `true` に設定

## 2. 環境変数の設定

### 2.1 ローカル環境（開発用）

`.env.local` ファイルに以下を設定：

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**重要**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` には **anon public** キー（`eyJ` で始まる）を使用してください。シークレットキー（`sb_secret_` で始まる）は使用しないでください。

### 2.2 本番環境（Vercel）

1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. **Settings** → **Environment Variables** に移動
4. 以下の環境変数を追加：

```
SUPABASE_URL = your_supabase_project_url
SUPABASE_ANON_KEY = your_supabase_anon_key
NEXT_PUBLIC_SUPABASE_URL = your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY = your_supabase_anon_key
```

**注意**: 
- 本番環境（Production）、プレビュー環境（Preview）、開発環境（Development）すべてに設定することを推奨
- または、Productionのみに設定することも可能

## 3. GitHubへのプッシュ

```bash
# 変更をコミット
git add .
git commit -m "本番環境対応: UI改善とカテゴリ機能追加"

# GitHubにプッシュ
git push origin main
```

## 4. Vercelへのデプロイ

### 4.1 初回デプロイ

1. [Vercel](https://vercel.com) にログイン
2. **Add New Project** をクリック
3. GitHubリポジトリを選択
4. プロジェクト設定：
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (デフォルト)
   - **Build Command**: `npm run build` (自動検出)
   - **Output Directory**: `.next` (自動検出)
5. **Environment Variables** を設定（上記2.2を参照）
6. **Deploy** をクリック

### 4.2 自動デプロイの設定

GitHubにプッシュすると自動的にデプロイされます：

- `main` ブランチへのプッシュ → 本番環境にデプロイ
- その他のブランチへのプッシュ → プレビュー環境にデプロイ

## 5. デプロイ後の確認

### 5.1 動作確認チェックリスト

- [ ] メインページが表示される
- [ ] オススメスライドショーが動作する（商品に `is_featured: true` が設定されている場合）
- [ ] カテゴリ一覧が表示される（商品に `category` が設定されている場合）
- [ ] カテゴリをクリックして詳細ページに遷移できる
- [ ] 上下スワイプでメニューを切り替えられる
- [ ] 画像をクリックして拡大表示できる
- [ ] カート機能が動作する
- [ ] 注文が正常に送信される
- [ ] キッチン画面（`/kitchen`）で注文が表示される

### 5.2 よくある問題と対処法

#### 問題: 環境変数エラー

**症状**: `Supabaseの環境変数が設定されていません` というエラー

**対処法**:
1. Vercelの環境変数設定を確認
2. 変数名が正しいか確認（`NEXT_PUBLIC_` プレフィックスが必要）
3. 値が正しく設定されているか確認
4. デプロイを再実行

#### 問題: 画像が表示されない

**症状**: 商品画像が表示されない

**対処法**:
1. `image_url` が正しく設定されているか確認
2. 画像URLが公開アクセス可能か確認
3. CORS設定を確認（外部画像を使用する場合）

#### 問題: カテゴリが表示されない

**症状**: カテゴリ一覧が空

**対処法**:
1. 商品に `category` が設定されているか確認
2. ブラウザのコンソールでエラーを確認
3. データベースのデータを確認

## 6. パフォーマンス最適化（オプション）

### 6.1 画像の最適化

- Next.jsの `next/image` コンポーネントを使用（将来的な改善）
- CDNを使用して画像を配信
- 画像のサイズを最適化

### 6.2 データベースの最適化

- インデックスが正しく作成されているか確認
- 不要なデータを削除
- クエリのパフォーマンスを監視

## 7. セキュリティチェック

- [ ] 環境変数がGitHubにコミットされていない（`.gitignore` で除外されている）
- [ ] SupabaseのRLS（Row Level Security）が有効
- [ ] 匿名ユーザーが適切な権限のみを持っている
- [ ] シークレットキーがブラウザに露出していない

## 8. モニタリング

### 8.1 Vercel Analytics

Vercelダッシュボードで以下を監視：
- デプロイの状態
- エラーログ
- パフォーマンスメトリクス

### 8.2 Supabase Monitoring

Supabaseダッシュボードで以下を監視：
- データベースの使用状況
- APIリクエスト数
- エラーログ

## 9. バックアップ

定期的に以下をバックアップ：
- データベースのデータ（Supabaseダッシュボードからエクスポート可能）
- 環境変数の設定（安全な場所に記録）

## 10. トラブルシューティング

問題が発生した場合：

1. **ログの確認**
   - Vercelのログを確認
   - ブラウザのコンソールを確認
   - Supabaseのログを確認

2. **ローカルでの再現**
   - ローカル環境で同じ問題が発生するか確認
   - `.env.local` の設定を確認

3. **コミュニティへの質問**
   - [Vercel Community](https://github.com/vercel/next.js/discussions)
   - [Supabase Discord](https://discord.supabase.com)

## サポート

問題が解決しない場合は、以下を確認してください：
- エラーメッセージの全文
- ブラウザのコンソールログ
- Vercelのデプロイログ
- Supabaseのログ
