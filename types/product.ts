/**
 * 商品の型定義
 */
export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  stock: number
  category: string | null
  created_at: string
  updated_at: string
}

/**
 * 商品作成時の型定義（IDとタイムスタンプを除く）
 */
export interface ProductInsert {
  name: string
  description?: string | null
  price: number
  image_url?: string | null
  stock: number
  category?: string | null
}

/**
 * 商品更新時の型定義（すべてのフィールドをオプショナルに）
 */
export interface ProductUpdate {
  name?: string
  description?: string | null
  price?: number
  image_url?: string | null
  stock?: number
  category?: string | null
}

