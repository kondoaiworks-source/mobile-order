'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { useCart } from '@/src/contexts/CartContext'
import { fetchOrderHistory, getSupabaseBrowserClient, fetchProducts } from '@/src/lib/supabase'
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
  const [showCheckoutMessage, setShowCheckoutMessage] = useState(false)
  const [products, setProducts] = useState<Product[]>([])

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

          // itemsが更新された場合（メニュー項目のステータス変更）: 注文履歴を再読み込み
          if (JSON.stringify(updatedOrder.items) !== JSON.stringify(oldOrder.items)) {
            loadOrderHistory()
            return
          }

          // 会計リクエスト送信時（completed → checkout_requested）: 注文履歴を更新
          if (updatedOrder.status === 'checkout_requested' && oldOrder.status === 'completed') {
            loadOrderHistory() // checkout_requestedになった注文は除外される
            return
          }

          // 会計完了時（checkout_requested → checkout_completed）: 画面をリセット
          if (updatedOrder.status === 'checkout_completed' && oldOrder.status === 'checkout_requested') {
            clearCart()
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


  const handleCheckoutConfirm = () => {
    setShowCheckoutMessage(true)
    setTimeout(() => {
      setShowCheckoutMessage(false)
      setShowCheckoutButton(false)
      router.push('/') // 3秒後にメニュー画面に戻る
    }, 3000)
  }

  // 商品IDから商品情報を取得
  const getProductById = (productId: string): Product | undefined => {
    return products.find(p => p.id === productId)
  }

  // 注文番号を短縮表示
  const formatOrderId = (orderId: string): string => {
    return `#${orderId.substring(0, 8).toUpperCase()}`
  }

  // ステータスを日本語で表示
  // 計画によると：
  // - 注文ずみ: 顧客が注文を確定した直後（pending）
  // - 配膳待ち: 厨房側で「完了」ボタンが押されたとき（served）
  // - 配膳完了: 厨房側で「配膳完了」ボタンが押されたとき（配膳後はpendingに戻るが、顧客側では表示しない）
  const getStatusLabel = (status?: string): string => {
    switch (status) {
      case 'pending':
        return '注文ずみ'
      case 'preparing':
        return '注文ずみ' // 厨房側の「開始」状態は顧客側では「注文ずみ」として表示
      case 'served':
        return '配膳待ち' // 厨房側の「完了」ボタンでこの状態になる
      default:
        return '注文ずみ'
    }
  }

  // 注文履歴をメニュー項目ごとに展開
  type OrderHistoryItem = {
    orderId: string
    orderNumber: string
    menuName: string
    quantity: number
    amount: number
    status: string
    orderCreatedAt?: string
  }

  const orderHistoryItems: OrderHistoryItem[] = []
  orderHistory.forEach((order) => {
    if (Array.isArray(order.items)) {
      order.items.forEach((item) => {
        const product = getProductById(item.productId)
        orderHistoryItems.push({
          orderId: order.id,
          orderNumber: formatOrderId(order.id),
          menuName: product?.name || `商品ID: ${item.productId}`,
          quantity: item.quantity,
          amount: item.price * item.quantity,
          status: item.status || 'pending',
          orderCreatedAt: order.created_at,
        })
      })
    }
  })

  // 新しい順でソート（created_at降順）
  orderHistoryItems.sort((a, b) => {
    if (!a.orderCreatedAt || !b.orderCreatedAt) return 0
    return new Date(b.orderCreatedAt).getTime() - new Date(a.orderCreatedAt).getTime()
  })

  // 注文履歴の合計金額を計算
  const historyTotal = orderHistoryItems.reduce((sum, item) => sum + item.amount, 0)

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
        ) : orderHistoryItems.length === 0 ? (
          <p className="text-center text-gray-500">注文履歴がありません</p>
        ) : (
          <>
            {/* メニュー項目ごとに1行表示 */}
            <div className="space-y-2">
              {orderHistoryItems.map((item, index) => (
                <div
                  key={`${item.orderId}-${index}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="flex-1">
                    {/* メニュー名を明確に表示 */}
                    <div className="mb-1">
                      <span className="text-base font-semibold text-gray-900">{item.menuName}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>注文番号: {item.orderNumber}</span>
                      <span>数量: {item.quantity}</span>
                      <span>金額: {currencyFormatter.format(item.amount)}</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <span className="inline-block rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                      {getStatusLabel(item.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 最下部：合計金額と会計するボタン */}
            <div className="mt-6 space-y-3">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-700">合計金額</span>
                  <span className="text-2xl font-bold text-emerald-600">
                    {currencyFormatter.format(historyTotal)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCheckoutConfirm}
                disabled={orderHistoryItems.length === 0}
                className="w-full rounded-lg bg-emerald-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                会計する
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
