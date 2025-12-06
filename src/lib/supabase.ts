import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Order, Product } from '@/src/types'

let browserClient: SupabaseClient | null = null

export function getSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabaseの環境変数が設定されていません。.env.local に NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください。')
  }

  // プレースホルダーが残っていないかチェック
  if (supabaseUrl.includes('your_supabase') || supabaseAnonKey.includes('your_supabase')) {
    throw new Error(
      '環境変数にプレースホルダーが残っています。\n' +
      '.env.local ファイルを開いて、以下の値を実際のSupabaseの値に置き換えてください：\n' +
      '1. NEXT_PUBLIC_SUPABASE_URL を Supabase ダッシュボードの「Settings」→「API」→「Project URL」の値に設定\n' +
      '2. NEXT_PUBLIC_SUPABASE_ANON_KEY を「anon public」キー（eyJ で始まる）に設定\n' +
      '設定後、開発サーバーを再起動してください。'
    )
  }

  // URL形式のチェック
  try {
    const url = new URL(supabaseUrl)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error('URL must use http or https protocol')
    }
  } catch (error) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL が正しいURL形式ではありません: "${supabaseUrl}"\n` +
      '正しい形式: https://your-project-id.supabase.co\n' +
      'Supabase ダッシュボードの「Settings」→「API」→「Project URL」から値をコピーしてください。'
    )
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
    .in('status', ['pending', 'preparing', 'checkout_requested'])
    // checkout_completedステータスを確実に除外
    .neq('status', 'checkout_completed')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('注文の取得に失敗しました', error)
    return []
  }

  return (data ?? []) as Order[]
}

export async function fetchOrderHistory(tableNumber?: number): Promise<Order[]> {
  const client = getSupabaseBrowserClient()

  let query = client
    .from('orders')
    .select('id, table_number, status, items, total, created_at, start_time, end_time, duration_seconds')
    // completedステータスのみを取得（会計済みのcheckout_completedとcheckout_requestedは除外）
    // 注意: データベースにcheckout_completedステータスが追加されていない場合、completeCheckoutが失敗する可能性がある
    .eq('status', 'completed')
    // checkout_completedステータスを確実に除外
    .neq('status', 'checkout_completed')
    // checkout_requestedステータスも除外
    .neq('status', 'checkout_requested')
    .order('created_at', { ascending: false })
    .limit(50)

  if (tableNumber) {
    query = query.eq('table_number', tableNumber)
  }

  const { data, error } = await query

  if (error) {
    console.error('注文履歴の取得に失敗しました', error)
    return []
  }

  // 念のため、クライアント側でもcheckout_completedやcheckout_requestedを除外
  // データベースマイグレーションが実行されていない場合でも、確実に除外するため
  const filteredData = (data ?? []).filter(
    (order) => {
      // completedステータスのみを許可し、会計関連のステータスは除外
      return (
        order.status === 'completed' && 
        order.status !== 'checkout_completed' && 
        order.status !== 'checkout_requested'
      )
    }
  )

  return filteredData as Order[]
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

export async function requestCheckout(tableNumber: number, total: number): Promise<void> {
  try {
    const client = getSupabaseBrowserClient()

    // 該当テーブルの完了済み注文を会計依頼中に更新
    // 最新の完了済み注文を取得して更新（checkout_completedは除外）
    const { data: completedOrders, error: fetchError } = await client
      .from('orders')
      .select('id')
      .eq('table_number', tableNumber)
      .eq('status', 'completed')
      // checkout_completedステータスを確実に除外
      .neq('status', 'checkout_completed')
      .order('created_at', { ascending: false })
      .limit(1)

    if (fetchError) {
      console.error('注文の取得に失敗しました', fetchError)
      throw new Error(`注文の取得に失敗しました: ${fetchError.message}`)
    }

    if (!completedOrders || completedOrders.length === 0) {
      throw new Error('会計対象の注文が見つかりません')
    }

    // 最新の完了済み注文を会計依頼中に更新
    const { error } = await client
      .from('orders')
      .update({ status: 'checkout_requested' })
      .eq('id', completedOrders[0].id)

    if (error) {
      console.error('会計リクエストの送信に失敗しました', error)
      throw new Error(`会計リクエストの送信に失敗しました: ${error.message}`)
    }
  } catch (err) {
    console.error('requestCheckout エラー:', err)
    throw err
  }
}

export async function completeCheckout(tableNumber: number): Promise<void> {
  try {
    const client = getSupabaseBrowserClient()

    // 最新の会計依頼中の注文を取得（created_atが最新のもの）
    const { data: checkoutRequestedOrders, error: fetchError } = await client
      .from('orders')
      .select('id')
      .eq('table_number', tableNumber)
      .eq('status', 'checkout_requested')
      .order('created_at', { ascending: false })
      .limit(1)

    if (fetchError) {
      console.error('会計依頼中の注文の取得に失敗しました', fetchError)
      throw new Error(`会計依頼中の注文の取得に失敗しました: ${fetchError.message}`)
    }

    if (!checkoutRequestedOrders || checkoutRequestedOrders.length === 0) {
      throw new Error('会計依頼中の注文が見つかりません')
    }

    // 最新の会計依頼中の注文のみを'checkout_completed'ステータスに更新
    const { error } = await client
      .from('orders')
      .update({ status: 'checkout_completed' })
      .eq('id', checkoutRequestedOrders[0].id)

    if (error) {
      console.error('会計完了の更新に失敗しました', error)
      throw new Error(`会計完了の更新に失敗しました: ${error.message}`)
    }
  } catch (err) {
    console.error('completeCheckout エラー:', err)
    throw err
  }
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
