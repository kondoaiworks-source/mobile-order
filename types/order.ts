import { Product } from './product'

/**
 * 注文項目の型定義
 */
export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  price: number
  created_at: string
  updated_at: string
  product?: Product // リレーションで取得する場合
}

/**
 * 注文の型定義
 */
export interface Order {
  id: string
  user_id: string
  status: OrderStatus
  total_amount: number
  shipping_address: string | null
  shipping_name: string | null
  shipping_phone: string | null
  created_at: string
  updated_at: string
  items?: OrderItem[] // リレーションで取得する場合
}

/**
 * 注文ステータスの型定義
 */
export type OrderStatus = 
  | 'pending'      // 保留中
  | 'confirmed'    // 確認済み
  | 'processing'   // 処理中
  | 'shipped'      // 発送済み
  | 'delivered'    // 配送完了
  | 'cancelled'    // キャンセル

/**
 * 注文作成時の型定義
 */
export interface OrderInsert {
  user_id: string
  status?: OrderStatus
  total_amount: number
  shipping_address?: string | null
  shipping_name?: string | null
  shipping_phone?: string | null
  items: OrderItemInsert[]
}

/**
 * 注文項目作成時の型定義
 */
export interface OrderItemInsert {
  product_id: string
  quantity: number
  price: number
}

/**
 * 注文更新時の型定義
 */
export interface OrderUpdate {
  status?: OrderStatus
  shipping_address?: string | null
  shipping_name?: string | null
  shipping_phone?: string | null
}

