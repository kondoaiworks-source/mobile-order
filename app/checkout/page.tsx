'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useCart } from '@/src/contexts/CartContext'
import { fetchOrderHistory, requestCheckout, getSupabaseBrowserClient } from '@/src/lib/supabase'
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

export default function CheckoutPage() {
  const router = useRouter()
  const { clearCart } = useCart()
  const [tableNumber, setTableNumber] = useState(1)
  const [orderHistory, setOrderHistory] = useState<Order[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showCheckoutButton, setShowCheckoutButton] = useState(false)
  const [showCheckoutMessage, setShowCheckoutMessage] = useState(false)
  const [isRequestingCheckout, setIsRequestingCheckout] = useState(false)

  useEffect(() => {
    loadOrderHistory()
  }, [tableNumber])

  useEffect(() => {
    const client = getSupabaseBrowserClient()
    
    const channel = client
      .channel('checkout-updates')
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
          const oldOrder = payload.old as Order | null
          // 会計完了時（statusが'checkout_requested'から'completed'に変更された時）にリセット
          if (updatedOrder && updatedOrder.status === 'completed' && oldOrder?.status === 'checkout_requested') {
            clearCart()
            setShowCheckoutButton(false)
            setShowCheckoutMessage(false)
            loadOrderHistory() // 注文履歴を再読み込み
          }
        }
      )
      .subscribe()

    return () => {
      client.removeChannel(channel)
    }
  }, [tableNumber, clearCart])

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

  const handleCheckout = async () => {
    if (orderHistory.length === 0) {
      return
    }

    setIsRequestingCheckout(true)
    try {
      await requestCheckout(tableNumber, historyTotal)
      setShowCheckoutButton(true)
    } catch (err) {
      console.error('会計リクエストエラー:', err)
      alert('会計リクエストの送信に失敗しました。時間をおいて再度お試しください。')
    } finally {
      setIsRequestingCheckout(false)
    }
  }

  const handleCheckoutConfirm = () => {
    setShowCheckoutMessage(true)
    setTimeout(() => {
      setShowCheckoutMessage(false)
      setShowCheckoutButton(false)
    }, 10000)
  }

  // 会計メッセージ表示中
  if (showCheckoutMessage) {
    const historyTotal = orderHistory.reduce((sum, order) => sum + order.total, 0)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-600 mb-4">
            {currencyFormatter.format(historyTotal)}
          </p>
          <p className="text-2xl font-bold text-gray-900">レジまでお越しください</p>
        </div>
      </div>
    )
  }

  // 注文履歴の合計金額を計算
  const historyTotal = orderHistory.reduce((sum, order) => sum + order.total, 0)

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6 pb-24">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">会計</h1>

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

      {/* 注文履歴一覧 */}
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

            {/* 会計するボタン */}
            {!showCheckoutButton && (
              <button
                type="button"
                onClick={handleCheckout}
                disabled={isRequestingCheckout || orderHistory.length === 0}
                className="w-full rounded-lg bg-emerald-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRequestingCheckout ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    送信中...
                  </span>
                ) : (
                  '会計する'
                )}
              </button>
            )}

            {/* 会計ボタン表示時 */}
            {showCheckoutButton && (
              <div className="mt-6 space-y-3">
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-semibold text-gray-700">合計金額</span>
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
    </div>
  )
}
