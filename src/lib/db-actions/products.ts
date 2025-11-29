import { getSupabaseBrowserClient } from '@/src/lib/supabase'
import type { Product } from '@/src/types'

/**
 * 全ての商品を読み込む
 */
export async function getProducts(): Promise<Product[]> {
  try {
    const client = getSupabaseBrowserClient()

    const { data, error } = await client
      .from('products')
      .select('id, name, price, description')
      .order('name', { ascending: true })

    if (error) {
      console.error('商品の取得に失敗しました', error)
      throw new Error(`商品の取得に失敗しました: ${error.message}`)
    }

    return (data ?? []) as Product[]
  } catch (err) {
    console.error('getProducts エラー:', err)
    throw err
  }
}

/**
 * 新しい商品を追加する
 */
export async function addProduct(productData: Omit<Product, 'id'>): Promise<Product> {
  try {
    const client = getSupabaseBrowserClient()

    const { data, error } = await client
      .from('products')
      .insert(productData)
      .select()
      .single()

    if (error) {
      console.error('商品の追加に失敗しました', error)
      throw new Error(`商品の追加に失敗しました: ${error.message}`)
    }

    return data as Product
  } catch (err) {
    console.error('addProduct エラー:', err)
    throw err
  }
}

/**
 * 既存の商品を更新する
 */
export async function updateProduct(
  id: string,
  productData: Partial<Omit<Product, 'id'>>
): Promise<Product> {
  try {
    const client = getSupabaseBrowserClient()

    const { data, error } = await client
      .from('products')
      .update(productData)
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

/**
 * 指定された商品を削除する
 */
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

