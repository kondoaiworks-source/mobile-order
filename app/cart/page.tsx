'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useCart } from '@/src/contexts/CartContext'
import { placeOrder, fetchOrderHistory, getSupabaseBrowserClient } from '@/src/lib/supabase'
import type { Order } from '@/src/types'

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
})

const dateTimeFormatter = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

export default function CartPage() {
  const router = useRouter()
  const { items, updateQuantity, removeFromCart, getTotal, clearCart } = useCart()
  const [tableNumber, setTableNumber] = useState(1)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'cart' | 'checkout'>('cart')
  const [orderHistory, setOrderHistory] = useState<Order[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [showCheckoutButton, setShowCheckoutButton] = useState(false)
  const [showCheckoutMessage, setShowCheckoutMessage] = useState(false)

  const total = getTotal()

  useEffect(() => {
    if (activeTab === 'checkout') {
      loadOrderHistory()
    }
  }, [activeTab, tableNumber])

  useEffect(() => {
    const client = getSupabaseBrowserClient()
    
    const channel = client
      .channel('cart-checkout-updates')
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders',
          filter: `table_number=eq.${tableNumber}`
        },
        (payload) => {
          const updatedOrder = payload.new as Order | null
          // 会計完了時（statusが'completed'に変更され、以前が'checkout_requested'だった時）にリセット
          const oldOrder = payload.old as Order | null
          if (updatedOrder && updatedOrder.status === 'completed' && oldOrder?.status === 'checkout_requested') {
            clearCart()
            if (activeTab === 'checkout') {
              loadOrderHistory() // 注文履歴を再読み込み
            }
          }
        }
      )
      .subscribe()

    return () => {
      client.removeChannel(channel)
    }
  }, [tableNumber, activeTab])

  const loadOrderHistory = async () => {
    setLoadingHistory(true)
    try {
      const history = await fetchOrderHistory(tableNumber)
      setOrderHistory(history)
    } catch (err) {
      console.error('注文履歴の読み込みエラー:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

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
          status: 'pending' as const,
        })),
        total,
      })

      clearCart()
      setShowSuccessMessage(true)
      
      // 3秒後にメニュー画面に戻る
      setTimeout(() => {
        setShowSuccessMessage(false)
        router.push('/')
      }, 3000)
    } catch (err) {
      console.error('注文送信エラー:', err)
      const errorMessage = err instanceof Error ? err.message : '注文の送信に失敗しました。時間をおいて再度お試しください。'
      setError(errorMessage)
      setIsPlacingOrder(false)
    }
  }

  const handleCheckout = () => {
    setActiveTab('checkout')
    setShowCheckoutButton(true)
  }

  const handleCheckoutConfirm = () => {
    setShowCheckoutMessage(true)
    setTimeout(() => {
      setShowCheckoutMessage(false)
      setShowCheckoutButton(false)
    }, 10000)
  }

  // 注文完了メッセージ表示中
  if (showSuccessMessage) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <div className="text-center">
          <p className="text-lg text-gray-900">ご注文ありがとうございます</p>
        </div>
      </div>
    )
  }

  // 会計メッセージ表示中
  if (showCheckoutMessage) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">レジへお越しください</p>
        </div>
      </div>
    )
  }

  // カートが空の場合
  if (items.length === 0 && activeTab === 'cart') {
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

  // 注文履歴の合計金額を計算
  const historyTotal = orderHistory.reduce((sum, order) => sum + order.total, 0)

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6 pb-24">
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

      {/* タブ */}
      <div className="mb-6 flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('cart')}
          className={`flex-1 border-b-2 px-4 py-2 text-center font-medium transition-colors ${
            activeTab === 'cart'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          カート
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('checkout')}
          className={`flex-1 border-b-2 px-4 py-2 text-center font-medium transition-colors ${
            activeTab === 'checkout'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          注文履歴
        </button>
      </div>

      {/* カートタブ */}
      {activeTab === 'cart' && (
        <>
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

          {/* 3つのボタン */}
          <div className="space-y-3">
            {/* 注文するボタン */}
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


            {/* 他を追加するボタン */}
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full rounded-lg border-2 border-gray-300 bg-white px-6 py-4 text-lg font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              他を追加する
            </button>
          </div>
        </>
      )}

      {/* 注文履歴タブ */}
      {activeTab === 'checkout' && (
        <div className="space-y-4">
          {loadingHistory ? (
            <p className="text-center text-gray-500">読み込み中...</p>
          ) : orderHistory.length === 0 ? (
            <p className="text-center text-gray-500">注文履歴がありません</p>
          ) : (
            <>
              {orderHistory.map((order) => (
                <div
                  key={order.id}
                  className="rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">
                        {order.created_at && dateTimeFormatter.format(new Date(order.created_at))}
                      </p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        テーブル {order.table_number}
                      </p>
                      {Array.isArray(order.items) && (
                        <p className="mt-1 text-xs text-gray-500">
                          {order.items.length}点
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-600">
                        {currencyFormatter.format(order.total)}
                      </p>
                      <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        完了
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* 注文履歴の合計 */}
              <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-700">合計金額</span>
                  <span className="text-2xl font-bold text-emerald-600">
                    {currencyFormatter.format(historyTotal)}
                  </span>
                </div>
              </div>

              {/* 会計ボタン */}
              {showCheckoutButton && (
                <div className="mt-6 space-y-3">
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-lg font-semibold text-gray-700">会計金額</span>
                      <span className="text-2xl font-bold text-emerald-600">
                        {currencyFormatter.format(historyTotal)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCheckoutConfirm}
                      className="w-full rounded-lg bg-emerald-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-emerald-500"
                    >
                      会計します
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
