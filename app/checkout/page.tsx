'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { useCart } from '@/src/contexts/CartContext'
import { fetchOrderHistory, requestCheckout, getSupabaseBrowserClient, fetchProducts } from '@/src/lib/supabase'
import type { Order, Product } from '@/src/types'

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
  const [products, setProducts] = useState<Product[]>([])
  const [checkoutOrderHistory, setCheckoutOrderHistory] = useState<Order[]>([])

  const loadOrderHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const history = await fetchOrderHistory(tableNumber)
      // デバッグ用：取得された注文のステータスを確認
      console.log('📋 注文履歴を取得:', history.length, '件')
      history.forEach(order => {
        console.log(`  - id: ${order.id}, status: ${order.status}, table: ${order.table_number}`)
      })
      setOrderHistory(history)
    } catch (err) {
      console.error('注文履歴の読み込みエラー:', err)
    } finally {
      setLoadingHistory(false)
    }
  }, [tableNumber])

  useEffect(() => {
    loadOrderHistory()
  }, [loadOrderHistory])

  // 商品情報を取得
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const productList = await fetchProducts()
        setProducts(productList)
      } catch (err) {
        console.error('商品情報の読み込みエラー:', err)
      }
    }
    loadProducts()
  }, [])

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
          
          if (!updatedOrder || !oldOrder) return

          // 会計リクエスト送信時（completed → checkout_requested）: 注文履歴を更新
          if (updatedOrder.status === 'checkout_requested' && oldOrder.status === 'completed') {
            loadOrderHistory() // checkout_requestedになった注文は除外される
            return
          }

          // 会計完了時（checkout_requested → checkout_completed）: 画面をリセット
          if (updatedOrder.status === 'checkout_completed' && oldOrder.status === 'checkout_requested') {
            clearCart()
            setShowCheckoutButton(false)
            setShowCheckoutMessage(false)
            loadOrderHistory() // 注文履歴を再読み込み（checkout_completedは除外される）
          }
        }
      )
      .subscribe()

    return () => {
      client.removeChannel(channel)
    }
  }, [tableNumber, clearCart, loadOrderHistory])

  const handleCheckout = async () => {
    if (orderHistory.length === 0) {
      return
    }

    // 会計リクエスト送信前に、現在の注文履歴を保存
    setCheckoutOrderHistory([...orderHistory])

    setIsRequestingCheckout(true)
    try {
      await requestCheckout(tableNumber, historyTotal)
      // 会計リクエスト送信後、注文履歴を再読み込み（checkout_requestedになった注文は除外される）
      await loadOrderHistory()
      setShowCheckoutButton(true)
    } catch (err) {
      console.error('会計リクエストエラー:', err)
      alert('会計リクエストの送信に失敗しました。時間をおいて再度お試しください。')
      setCheckoutOrderHistory([])
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

  // 商品IDから商品情報を取得
  const getProductById = (productId: string): Product | undefined => {
    return products.find(p => p.id === productId)
  }

  // 会計メッセージ表示中（オーバーレイ）
  if (showCheckoutMessage) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50">
        <div className="rounded-lg bg-white px-8 py-6 shadow-lg text-center">
          <p className="text-xl font-semibold text-gray-900">
            ありがとうございました。
          </p>
          <p className="text-xl font-semibold text-gray-900 mt-2">
            レジまでお越しください。
          </p>
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

            {/* 会計ボタン表示時：注文履歴の詳細を表示 */}
            {showCheckoutButton && (
              <div className="mt-6 space-y-4">
                {/* 注文履歴の詳細（メニュー項目ごと） */}
                <div className="space-y-3">
                  {checkoutOrderHistory.map((order) => (
                    <div key={order.id} className="rounded-lg border border-gray-200 bg-white p-4">
                      <p className="text-xs text-gray-500 mb-3">
                        {order.created_at && dateTimeFormatter.format(new Date(order.created_at))}
                      </p>
                      {Array.isArray(order.items) && order.items.length > 0 && (
                        <div className="space-y-2">
                          {order.items.map((item, index) => {
                            const product = getProductById(item.productId)
                            return (
                              <div key={index} className="flex items-center justify-between text-sm">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">
                                    {product?.name || `商品ID: ${item.productId}`}
                                  </p>
                                  {product?.description && (
                                    <p className="text-xs text-gray-500 mt-0.5">{product.description}</p>
                                  )}
                                </div>
                                <div className="text-right ml-4">
                                  <p className="text-gray-600">
                                    {item.quantity}個 × {currencyFormatter.format(item.price)}
                                  </p>
                                  <p className="font-semibold text-gray-900">
                                    {currencyFormatter.format(item.price * item.quantity)}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">小計</span>
                        <span className="text-lg font-bold text-emerald-600">
                          {currencyFormatter.format(order.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 合計金額 */}
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-semibold text-gray-700">合計金額</span>
                    <span className="text-2xl font-bold text-emerald-600">
                      {currencyFormatter.format(checkoutOrderHistory.reduce((sum, order) => sum + order.total, 0))}
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
