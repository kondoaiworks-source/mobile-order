export type Product = {
  id: string
  name: string
  price: number
  description: string
  image_url?: string | null
  category?: string | null
  is_featured?: boolean
}

export type OrderStatus = 'pending' | 'preparing' | 'completed' | 'checkout_requested'

export type OrderItem = {
  productId: string
  quantity: number
  price: number
}

export type Order = {
  id: string
  table_number: number
  status: OrderStatus
  items: OrderItem[]
  total: number
  created_at?: string
  start_time?: string
  end_time?: string
  duration_seconds?: number
}
