# 本番デプロイ チェックリスト

## ✅ デプロイ前の確認事項

### 1. データベースの準備
- [ ] SupabaseのSQL Editorで `add-product-fields.sql` を実行済み
- [ ] `image_url`、`category`、`is_featured` カラムが追加されている
- [ ] インデックスが作成されている

### 2. 商品データの設定
- [ ] 商品に `image_url` が設定されている（オプション）
- [ ] 商品に `category` が設定されている
- [ ] オススメ商品に `is_featured: true` が設定されている

### 3. コードの確認
- [ ] ビルドが成功する（`npm run build`）
- [ ] 型エラーがない
- [ ] リンターエラーがない
- [ ] ローカル環境で動作確認済み

### 4. 環境変数の準備
- [ ] SupabaseのURLとキーを取得済み
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` が **anon public** キー（`eyJ` で始まる）であることを確認
- [ ] シークレットキー（`sb_secret_` で始まる）を使用していないことを確認

### 5. Gitの準備
- [ ] 変更をコミット済み
- [ ] `.env.local` が `.gitignore` に含まれている
- [ ] 機密情報がコミットされていない

## 🚀 デプロイ手順

### Step 1: GitHubにプッシュ
```bash
git add .
git commit -m "本番環境対応: カテゴリ機能とUI改善"
git push origin main
```

### Step 2: Vercelでプロジェクトを作成
1. [Vercel](https://vercel.com) にログイン
2. **Add New Project** をクリック
3. GitHubリポジトリを選択
4. プロジェクト設定を確認

### Step 3: 環境変数を設定
Vercelの **Settings** → **Environment Variables** で以下を設定：

```
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_ANON_KEY = eyJ... (anon public key)
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ... (anon public key)
```

**重要**: 
- Production、Preview、Development すべてに設定するか、Productionのみに設定
- `NEXT_PUBLIC_` プレフィックスが付いた変数はブラウザで使用可能

### Step 4: デプロイ実行
- **Deploy** ボタンをクリック
- デプロイが完了するまで待つ（通常1-2分）

### Step 5: 動作確認
- [ ] メインページが表示される
- [ ] オススメスライドショーが動作する
- [ ] カテゴリ一覧が表示される
- [ ] カテゴリをクリックして詳細ページに遷移できる
- [ ] 上下スワイプでメニューを切り替えられる
- [ ] 画像をクリックして拡大表示できる
- [ ] カート機能が動作する
- [ ] 注文が正常に送信される
- [ ] キッチン画面で注文が表示される

## 🔧 トラブルシューティング

### エラー: 環境変数が見つからない
**対処法**: Vercelの環境変数設定を確認し、再デプロイ

### エラー: 画像が表示されない
**対処法**: 
1. `image_url` が正しく設定されているか確認
2. 画像URLが公開アクセス可能か確認

### エラー: カテゴリが表示されない
**対処法**: 
1. 商品に `category` が設定されているか確認
2. データベースのデータを確認

## 📝 デプロイ後のメンテナンス

### 定期的な確認
- [ ] エラーログの確認（Vercelダッシュボード）
- [ ] パフォーマンスの監視
- [ ] データベースの使用状況確認（Supabaseダッシュボード）

### バックアップ
- [ ] データベースの定期バックアップ
- [ ] 環境変数の安全な保管

## 📚 参考資料

詳細な手順は `DEPLOYMENT.md` を参照してください。

