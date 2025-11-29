# Next.js + Supabase App

Next.js App Router構成でSupabaseを使用するプロジェクトです。

## セットアップ

1. 依存関係のインストール
```bash
npm install
```

2. 環境変数の設定
`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. 開発サーバーの起動
```bash
npm run dev
```

## プロジェクト構造

```
├── app/                    # App Routerのページとレイアウト
│   ├── layout.tsx         # ルートレイアウト
│   ├── page.tsx           # ホームページ
│   └── globals.css        # グローバルスタイル
├── lib/
│   └── supabase/          # Supabaseクライアント
│       ├── client.ts      # クライアントサイド用
│       ├── server.ts       # サーバーサイド用
│       └── middleware.ts  # ミドルウェア用
├── types/                  # TypeScript型定義
│   ├── product.ts         # 商品の型定義
│   ├── order.ts           # 注文の型定義
│   └── index.ts           # 型定義のエクスポート
├── middleware.ts           # Next.jsミドルウェア
└── package.json
```

## 型定義

### Product（商品）
- `id`: 商品ID
- `name`: 商品名
- `description`: 商品説明
- `price`: 価格
- `image_url`: 画像URL
- `stock`: 在庫数
- `category`: カテゴリ
- `created_at`: 作成日時
- `updated_at`: 更新日時

### Order（注文）
- `id`: 注文ID
- `user_id`: ユーザーID
- `status`: 注文ステータス（pending, confirmed, processing, shipped, delivered, cancelled）
- `total_amount`: 合計金額
- `shipping_address`: 配送先住所
- `shipping_name`: 配送先氏名
- `shipping_phone`: 配送先電話番号
- `created_at`: 作成日時
- `updated_at`: 更新日時
- `items`: 注文項目（リレーション）

## Supabaseクライアントの使用方法

### クライアントサイド
```typescript
import { supabase } from '@/lib/supabase/client'

const { data, error } = await supabase
  .from('products')
  .select('*')
```

### サーバーサイド
```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data, error } = await supabase
  .from('products')
  .select('*')
```

## 技術スタック

- Next.js 14 (App Router)
- React 18
- TypeScript
- Supabase
- Tailwind CSS

