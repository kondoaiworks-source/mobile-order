'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Product } from '@/src/types'
import { fetchProducts, placeOrder } from '@/src/lib/supabase'

type CartItem = {
  product: Product
  quantity: number
}

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
})

interface CartSummaryProps {
  items: CartItem[]
  total: number
  onPlaceOrder: () => Promise<void>
  disabled: boolean
  isPlacing: boolean
  message: string | null
  tableNumber: number
  onTableNumberChange: (value: number) => void
}

function CartSummary({ items, total, onPlaceOrder, disabled, isPlacing, message, tableNumber, onTableNumberChange }: CartSummaryProps) {
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items])

  return (
    <aside className="fixed bottom-0 left-0 right-0 z-50 w-full rounded-t-xl border-t border-gray-200 bg-white p-4 shadow-lg sm:bottom-4 sm:left-auto sm:right-4 sm:w-80 sm:rounded-xl sm:border sm:border-t">
      <h2 className="text-lg font-semibold">カート</h2>
      <div className="mt-2">
        <label className="text-xs font-medium text-gray-700" htmlFor="cart-table-number">
          テーブル番号
        </label>
        <input
          id="cart-table-number"
          type="number"
          min={1}
          value={tableNumber}
          onChange={(event) => onTableNumberChange(Number(event.target.value) || 1)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-center text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>
      <p className="mt-2 text-sm text-gray-500">合計 {itemCount} 点</p>

      <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-sm text-gray-400">カートに商品がありません。</p>
        ) : (
          items.map((item) => (
            <div key={item.product.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">
                {item.product.name}
                <span className="ml-2 text-xs text-gray-500">× {item.quantity}</span>
              </span>
              <span className="font-medium text-gray-900">
                {currencyFormatter.format(item.product.price * item.quantity)}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 border-t border-gray-200 pt-3 text-right">
        <p className="text-sm text-gray-500">合計金額</p>
        <p className="text-2xl font-bold text-gray-900">{currencyFormatter.format(total)}</p>
      </div>

      {message && <p className="mt-3 text-sm text-emerald-600">{message}</p>}

      <button
        type="button"
        onClick={onPlaceOrder}
        disabled={disabled}
        className="mt-4 w-full rounded-md bg-emerald-600 px-4 py-2 text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPlacing ? '注文処理中...' : '注文を確定する'}
      </button>
    </aside>
  )
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [tableNumber, setTableNumber] = useState(1)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [orderMessage, setOrderMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const loadProducts = async () => {
      try {
        const data = await fetchProducts()
        if (!active) return
        setProducts(data)
      } catch (err) {
        console.error('商品読み込みエラー:', err)
        if (active) {
          const errorMessage = err instanceof Error ? err.message : '商品一覧の取得に失敗しました'
          setError(errorMessage)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadProducts()

    return () => {
      active = false
    }
  }, [])

  const handleAddToCart = (product: Product) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id)

      if (existingIndex !== -1) {
        const next = [...prev]
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + 1,
        }
        return next
      }

      return [...prev, { product, quantity: 1 }]
    })
  }

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cartItems]
  )

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      setOrderMessage('カートが空です。商品を追加してください。')
      return
    }

    // テーブル番号の検証
    if (!tableNumber || tableNumber <= 0 || isNaN(tableNumber)) {
      setOrderMessage('テーブル番号を入力してください。')
      return
    }

    setIsPlacingOrder(true)
    setOrderMessage(null)

    try {
      await placeOrder({
        table_number: tableNumber,
        status: 'pending',
        items: cartItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
        })),
        total: cartTotal,
      })

      setCartItems([])
      setOrderMessage('注文が完了しました')
    } catch (err) {
      console.error('注文送信エラー:', err)
      const errorMessage = err instanceof Error ? err.message : '注文の送信に失敗しました。時間をおいて再度お試しください。'
      setOrderMessage(errorMessage)
    } finally {
      setIsPlacingOrder(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-6 pb-40 sm:gap-10 sm:px-6 sm:py-12 sm:pb-12">
      <header className="text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">メニュー一覧</h1>
        <p className="mt-2 text-sm text-gray-600 sm:text-base">お好きな商品をカートに追加してください。</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <label className="text-sm font-medium text-gray-700" htmlFor="table-number">
            テーブル番号
          </label>
          <input
            id="table-number"
            type="number"
            min={1}
            value={tableNumber}
            onChange={(event) => setTableNumber(Number(event.target.value) || 1)}
            className="w-24 rounded-md border border-gray-300 px-3 py-1 text-center text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </div>
      </header>

      {loading ? (
        <p className="text-center text-gray-500">読み込み中...</p>
      ) : error ? (
        <p className="text-center text-red-500">{error}</p>
      ) : products.length === 0 ? (
        <p className="text-center text-gray-500">商品が存在しません。</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6">
          {products.map((product) => (
            <li
              key={product.id}
              className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
            >
              <div>
                <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">{product.name}</h2>
                <p className="mt-2 text-sm text-gray-600">{product.description}</p>
                <p className="mt-4 text-lg font-bold text-gray-900 sm:text-xl">
                  {currencyFormatter.format(product.price)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleAddToCart(product)}
                className="mt-4 w-full rounded-md bg-emerald-600 px-4 py-2 text-sm text-white transition hover:bg-emerald-500 sm:mt-6"
              >
                カートに追加
              </button>
            </li>
          ))}
        </ul>
      )}

      <CartSummary
        items={cartItems}
        total={cartTotal}
        onPlaceOrder={handlePlaceOrder}
        disabled={cartItems.length === 0 || isPlacingOrder || !tableNumber || tableNumber <= 0 || isNaN(tableNumber)}
        isPlacing={isPlacingOrder}
        message={orderMessage}
        tableNumber={tableNumber}
        onTableNumberChange={setTableNumber}
      />
    </main>
  )
}
