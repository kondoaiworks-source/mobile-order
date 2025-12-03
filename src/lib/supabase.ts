import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Order, Product } from '@/src/types'

let browserClient: SupabaseClient | null = null

export function getSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabaseの環境変数が設定されていません。.env.local に NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください。')
  }

  // シークレットキーが使われていないかチェック
  if (supabaseAnonKey.startsWith('sb_secret_')) {
    throw new Error(
      'シークレットキー（sb_secret_）はブラウザで使用できません。\n' +
      'Supabase ダッシュボードの「Settings」→「API」から「anon public」キー（eyJ で始まる）を取得して、\n' +
      '.env.local の NEXT_PUBLIC_SUPABASE_ANON_KEY に設定してください。'
    )
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey)
  }

  return browserClient
}

export async function fetchPendingOrders(): Promise<Order[]> {
  const client = getSupabaseBrowserClient()

  const { data, error } = await client
    .from('orders')
    .select('id, table_number, status, items, total, created_at, start_time, end_time, duration_seconds')
    .in('status', ['pending', 'preparing'])
    .order('created_at', { ascending: true })

  if (error) {
    console.error('注文の取得に失敗しました', error)
    return []
  }

  return (data ?? []) as Order[]
}

export async function fetchProducts(): Promise<Product[]> {
  try {
    const client = getSupabaseBrowserClient()

    const { data, error } = await client
      .from('products')
      .select('id, name, price, description, image_url, category, is_featured')
      .order('name', { ascending: true })

    if (error) {
      console.error('商品の取得に失敗しました', error)
      throw new Error(`商品の取得に失敗しました: ${error.message}`)
    }

    return (data ?? []) as Product[]
  } catch (err) {
    console.error('fetchProducts エラー:', err)
    throw err
  }
}

type OrderInsertPayload = Omit<Order, 'id'>

export async function placeOrder(order: OrderInsertPayload): Promise<Order | null> {
  try {
    const client = getSupabaseBrowserClient()

    const { data, error } = await client
      .from('orders')
      .insert(order)
      .select()
      .single()

    if (error) {
      console.error('注文の作成に失敗しました', error)
      throw new Error(`注文の作成に失敗しました: ${error.message}`)
    }

    return data as Order
  } catch (err) {
    console.error('placeOrder エラー:', err)
    throw err
  }
}

export async function updateOrderStatus(id: string, status: Order['status']): Promise<Order | null> {
  const client = getSupabaseBrowserClient()

  const { data, error } = await client
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('注文ステータスの更新に失敗しました', error)
    throw error
  }

  return data as Order
}

// 商品管理用の関数
export async function createProduct(product: Omit<Product, 'id'>): Promise<Product> {
  try {
    const client = getSupabaseBrowserClient()

    const { data, error } = await client
      .from('products')
      .insert(product)
      .select()
      .single()

    if (error) {
      console.error('商品の作成に失敗しました', error)
      throw new Error(`商品の作成に失敗しました: ${error.message}`)
    }

    return data as Product
  } catch (err) {
    console.error('createProduct エラー:', err)
    throw err
  }
}

export async function updateProduct(id: string, product: Partial<Omit<Product, 'id'>>): Promise<Product> {
  try {
    const client = getSupabaseBrowserClient()

    const { data, error } = await client
      .from('products')
      .update(product)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('商品の更新に失敗しました', error)
      throw new Error(`商品の更新に失敗しました: ${error.message}`)
    }

    return data as Product
  } catch (err) {
    console.error('updateProduct エラー:', err)
    throw err
  }
}

export async function deleteProduct(id: string): Promise<void> {
  try {
    const client = getSupabaseBrowserClient()

    const { error } = await client
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('商品の削除に失敗しました', error)
      throw new Error(`商品の削除に失敗しました: ${error.message}`)
    }
  } catch (err) {
    console.error('deleteProduct エラー:', err)
    throw err
  }
}
