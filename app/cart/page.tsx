'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useCart } from '@/src/contexts/CartContext'
import { placeOrder } from '@/src/lib/supabase'

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
})

export default function CartPage() {
  const router = useRouter()
  const { items, updateQuantity, removeFromCart, getTotal, clearCart } = useCart()
  const [tableNumber, setTableNumber] = useState(1)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = getTotal()

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      setError('カートが空です。商品を追加してください。')
      return
    }

    if (!tableNumber || tableNumber <= 0 || isNaN(tableNumber)) {
      setError('テーブル番号を入力してください。')
      return
    }

    setIsPlacingOrder(true)
    setError(null)

    try {
      await placeOrder({
        table_number: tableNumber,
        status: 'pending',
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
        })),
        total,
      })

      clearCart()
      router.push('/order-complete')
    } catch (err) {
      console.error('注文送信エラー:', err)
      const errorMessage = err instanceof Error ? err.message : '注文の送信に失敗しました。時間をおいて再度お試しください。'
      setError(errorMessage)
    } finally {
      setIsPlacingOrder(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <svg
          className="h-24 w-24 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <p className="text-lg text-gray-500">カートに商品がありません</p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="rounded-lg bg-emerald-600 px-6 py-3 text-white hover:bg-emerald-500"
        >
          メニューを見る
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">カート</h1>

      {/* テーブル番号入力 */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="table-number">
          テーブル番号
        </label>
        <input
          id="table-number"
          type="number"
          min={1}
          value={tableNumber}
          onChange={(event) => setTableNumber(Number(event.target.value) || 1)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-center text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      {/* カートアイテム一覧 */}
      <div className="mb-6 space-y-3">
        {items.map((item) => (
          <div
            key={item.product.id}
            className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{item.product.name}</h3>
              <p className="text-sm text-gray-500">{currencyFormatter.format(item.product.price)}</p>
            </div>

            {/* 数量変更 */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={item.quantity <= 1}
                aria-label="数量を減らす"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="min-w-[2rem] text-center font-semibold text-gray-900">
                {item.quantity}
              </span>
              <button
                type="button"
                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                aria-label="数量を増やす"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* 小計 */}
            <div className="text-right">
              <p className="font-semibold text-gray-900">
                {currencyFormatter.format(item.product.price * item.quantity)}
              </p>
            </div>

            {/* 削除ボタン */}
            <button
              type="button"
              onClick={() => removeFromCart(item.product.id)}
              className="rounded-md p-2 text-red-600 hover:bg-red-50"
              aria-label="削除"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* 合計 */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-gray-700">合計</span>
          <span className="text-2xl font-bold text-emerald-600">
            {currencyFormatter.format(total)}
          </span>
        </div>
      </div>

      {/* エラーメッセージ */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 注文ボタン */}
      <button
        type="button"
        onClick={handlePlaceOrder}
        disabled={isPlacingOrder}
        className="w-full rounded-lg bg-emerald-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPlacingOrder ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            注文処理中...
          </span>
        ) : (
          '注文する'
        )}
      </button>
    </div>
  )
}

