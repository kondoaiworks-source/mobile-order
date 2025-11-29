# デプロイ手順ガイド

このドキュメントでは、Next.js/Supabase プロジェクトを GitHub にプッシュし、Vercel にデプロイする手順を説明します。

## 前提条件

- GitHub アカウント
- Vercel アカウント（GitHub アカウントでサインアップ可能）
- Supabase プロジェクトが作成済み

---

## 1. GitHub へのプッシュ

### 1.1 Git リポジトリの初期化（まだの場合）

```bash
# プロジェクトルートで実行
git init
```

### 1.2 .gitignore の確認

`.gitignore` ファイルに以下が含まれていることを確認してください（既に含まれています）：

```
.env*.local
.env
```

これにより、環境変数ファイルが GitHub にプッシュされることを防ぎます。

### 1.3 ファイルをステージング

```bash
# すべてのファイルを追加
git add .

# または、特定のファイルのみ追加する場合
git add app/ lib/ src/ package.json tsconfig.json tailwind.config.js postcss.config.js next.config.js
```

### 1.4 初回コミット

```bash
git commit -m "Initial commit: Next.js Supabase app"
```

### 1.5 GitHub リポジトリの作成

1. GitHub にログイン
2. 右上の「+」→「New repository」をクリック
3. リポジトリ名を入力（例: `nextjs-supabase-app`）
4. 「Public」または「Private」を選択
5. 「Initialize this repository with a README」は**チェックしない**
6. 「Create repository」をクリック

### 1.6 リモートリポジトリの追加とプッシュ

```bash
# リモートリポジトリを追加（YOUR_USERNAME と YOUR_REPO_NAME を置き換え）
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# メインブランチをプッシュ
git branch -M main
git push -u origin main
```

---

## 2. Vercel へのデプロイ

### 2.1 Vercel プロジェクトの作成

1. [Vercel](https://vercel.com) にアクセス
2. 「Sign Up」または「Log In」をクリック
3. 「Continue with GitHub」を選択して GitHub アカウントでログイン

### 2.2 プロジェクトのインポート

1. Vercel ダッシュボードで「Add New...」→「Project」をクリック
2. GitHub リポジトリを選択
3. 「Import」をクリック

### 2.3 プロジェクト設定

- **Framework Preset**: Next.js（自動検出されるはず）
- **Root Directory**: `./`（デフォルト）
- **Build Command**: `npm run build`（デフォルト）
- **Output Directory**: `.next`（デフォルト）
- **Install Command**: `npm install`（デフォルト）

### 2.4 環境変数の設定

**重要**: 以下の環境変数を Vercel に設定する必要があります。

#### 環境変数の追加手順

1. プロジェクト設定画面で「Environment Variables」セクションを開く
2. 以下の環境変数を追加：

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase プロジェクトの URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | Supabase の anon public キー（`eyJ` で始まる） |
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | サーバー側用（ミドルウェアで使用） |
| `SUPABASE_ANON_KEY` | `eyJhbGci...` | サーバー側用（ミドルウェアで使用） |

**注意**: 
- `NEXT_PUBLIC_*` はブラウザ側で使用されるため、公開されます
- `sb_secret_` で始まるシークレットキーは**使用しないでください**（ブラウザで使用できません）

#### 環境変数の取得方法

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. プロジェクトを選択
3. 「Settings」→「API」を開く
4. 「Project URL」と「anon public」キーをコピー

#### 環境ごとの設定

Vercel では、環境ごとに異なる環境変数を設定できます：

- **Production**: 本番環境
- **Preview**: プルリクエストやブランチ用
- **Development**: 開発環境（通常は使用しない）

すべての環境に同じ値を設定することを推奨します。

### 2.5 デプロイの実行

1. 「Deploy」ボタンをクリック
2. ビルドが完了するまで待機（通常 1-3 分）
3. デプロイが完了すると、URL が表示されます（例: `https://your-app.vercel.app`）

---

## 3. デプロイ後の確認

### 3.1 動作確認

1. デプロイされた URL にアクセス
2. 以下を確認：
   - 商品一覧が表示されるか
   - 注文機能が動作するか
   - 管理画面（`/admin/products`）が動作するか

### 3.2 エラーの確認

- Vercel ダッシュボードの「Functions」タブでログを確認
- ブラウザのコンソール（F12）でエラーを確認

### 3.3 Supabase RLS ポリシーの確認

本番環境でも動作するように、Supabase の RLS ポリシーが正しく設定されているか確認してください：

```sql
-- products テーブル
CREATE POLICY "Allow anonymous read access to products"
  ON public.products FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert access to products"
  ON public.products FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to products"
  ON public.products FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete access to products"
  ON public.products FOR DELETE USING (true);

-- orders テーブル
CREATE POLICY "Allow anonymous read access to orders"
  ON public.orders FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert access to orders"
  ON public.orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to orders"
  ON public.orders FOR UPDATE USING (true);
```

---

## 4. 今後の更新手順

### 4.1 コードの変更を GitHub にプッシュ

```bash
git add .
git commit -m "変更内容の説明"
git push origin main
```

### 4.2 Vercel での自動デプロイ

- Vercel は GitHub リポジトリと連携しているため、`main` ブランチにプッシュすると自動的にデプロイされます
- プルリクエストを作成すると、プレビュー環境が自動的に作成されます

---

## 5. トラブルシューティング

### 5.1 ビルドエラー

- Vercel ダッシュボードの「Deployments」タブでエラーログを確認
- ローカルで `npm run build` を実行してエラーを確認

### 5.2 環境変数のエラー

- 環境変数が正しく設定されているか確認
- `NEXT_PUBLIC_*` プレフィックスが正しく付いているか確認
- シークレットキーではなく、anon キーを使用しているか確認

### 5.3 Supabase 接続エラー

- Supabase ダッシュボードでプロジェクトがアクティブか確認
- RLS ポリシーが正しく設定されているか確認
- 環境変数の値が正しいか確認

---

## 6. セキュリティに関する注意事項

1. **環境変数の管理**
   - `.env.local` ファイルは GitHub にプッシュしない（`.gitignore` に含まれています）
   - 本番環境の環境変数は Vercel で管理

2. **Supabase キーの管理**
   - `anon` キーは公開されても問題ありません（RLS で保護）
   - `service_role` キーや `sb_secret_` キーは**絶対に**ブラウザ側で使用しないでください

3. **RLS ポリシー**
   - 本番環境では、必要最小限の権限のみを許可する RLS ポリシーを設定してください

---

## 7. 参考リンク

- [Vercel ドキュメント](https://vercel.com/docs)
- [Next.js デプロイメントガイド](https://nextjs.org/docs/deployment)
- [Supabase ドキュメント](https://supabase.com/docs)
- [Supabase RLS ガイド](https://supabase.com/docs/guides/auth/row-level-security)

