'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Order, Product } from '@/src/types'
import {
  fetchPendingOrders,
  getSupabaseBrowserClient,
  updateOrderStatus,
  completeCheckout,
  fetchProducts,
  updateMenuItemStatus,
} from '@/src/lib/supabase'

const timeFormatter = new Intl.DateTimeFormat('ja-JP', {
  hour: '2-digit',
  minute: '2-digit',
})

// 経過時間を表示するコンポーネント
function ElapsedTime({ startTime }: { startTime?: string }) {
  const [elapsed, setElapsed] = useState<string>('00:00:00')

  useEffect(() => {
    if (!startTime) {
      setElapsed('00:00:00')
      return
    }

    const updateElapsed = () => {
      const start = new Date(startTime).getTime()
      const now = Date.now()
      const diff = Math.floor((now - start) / 1000) // 秒

      const hours = Math.floor(diff / 3600)
      const minutes = Math.floor((diff % 3600) / 60)
      const seconds = diff % 60

      setElapsed(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      )
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  return <span className="font-mono text-sm font-semibold text-blue-700">{elapsed}</span>
}

// フッターナビゲーションコンポーネント
function KitchenBottomNavigation({ activeTab, onTabChange }: { activeTab: 'table' | 'menu', onTabChange: (tab: 'table' | 'menu') => void }) {
  const router = useRouter()

  // フッターメニューの項目（左から順番に配置）
  const navItems = [
    { id: 'table', label: 'テーブル', icon: '🍽️', path: null },      // 1. テーブル
    { id: 'menu', label: 'メニュー', icon: '📜', path: null },         // 2. メニュー
    { id: 'call', label: '呼出', icon: '🔔', path: '/call' },         // 3. 呼出
    { id: 'settings', label: '設定', icon: '⚙️', path: '/settings' }, // 4. 設定
  ]

  const handleClick = (item: typeof navItems[0]) => {
    if (item.path) {
      router.push(item.path)
    } else if (item.id === 'table' || item.id === 'menu') {
      onTabChange(item.id)
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-300 bg-white shadow-lg">
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item) => {
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleClick(item)}
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 px-2 py-1 transition-colors ${
                isActive ? 'bg-green-50 text-green-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
              aria-label={item.label}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className={`text-xs font-medium ${isActive ? 'text-green-600' : 'text-gray-600'}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// メニュー単位で展開された注文項目の型
type ExpandedOrderItem = {
  orderId: string
  itemIndex: number
  tableNumber: number
  menuName: string
  quantity: number
  price: number
  amount: number
  status: 'pending' | 'preparing' | 'served'
  createdAt?: string
  orderCreatedAt?: string
}

export default function KitchenPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'table' | 'menu'>('table')
  const [servingItems, setServingItems] = useState<Set<string>>(new Set())

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
    let isMounted = true
    const client = getSupabaseBrowserClient()

    const loadOrders = async () => {
      try {
        const data = await fetchPendingOrders()
        if (!isMounted) return
        setOrders(data)
      } catch (err) {
        console.error(err)
        if (isMounted) {
          setError('注文の取得に失敗しました')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadOrders()

    const channel = client
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as Order | null
          const oldOrder = payload.old as Order | null

          setOrders((prev) => {
            let next = [...prev]

            if (payload.eventType === 'INSERT' && newOrder) {
              if (newOrder.status === 'pending' || newOrder.status === 'preparing' || newOrder.status === 'checkout_requested') {
                next = [newOrder, ...next.filter((order) => order.id !== newOrder.id)]
              }
            }

            if (payload.eventType === 'UPDATE' && newOrder) {
              const existingIndex = next.findIndex((order) => order.id === newOrder.id)
              
              if (newOrder.status === 'pending' || newOrder.status === 'preparing' || newOrder.status === 'checkout_requested') {
                if (existingIndex >= 0) {
                  next[existingIndex] = newOrder
                } else {
                  next = [newOrder, ...next]
                }
              } else {
                if (existingIndex >= 0) {
                  next.splice(existingIndex, 1)
                }
              }
              
              // itemsが更新された場合も更新
              if (existingIndex >= 0 && JSON.stringify(newOrder.items) !== JSON.stringify(next[existingIndex]?.items)) {
                next[existingIndex] = newOrder
              }
            }

            if (payload.eventType === 'DELETE' && oldOrder) {
              next = next.filter((order) => order.id !== oldOrder.id)
            }

            return next
          })
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      client.removeChannel(channel)
    }
  }, [])

  // 商品IDから商品名を取得
  const getProductName = (productId: string): string => {
    const product = products.find((p) => p.id === productId)
    return product?.name || `商品ID: ${productId}`
  }

  // 注文をメニュー単位で展開（古い順でソート）
  const expandedOrderItems = useMemo<ExpandedOrderItem[]>(() => {
    const pendingOrders = orders
      .filter((order) => order.status === 'pending' || order.status === 'preparing')
      .sort((a, b) => {
        // 古い順（created_at昇順）
        if (!a.created_at || !b.created_at) return 0
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })

    const items: ExpandedOrderItem[] = []

    pendingOrders.forEach((order) => {
      if (Array.isArray(order.items)) {
        order.items.forEach((item, index) => {
          items.push({
            orderId: order.id,
            itemIndex: index,
            tableNumber: order.table_number,
            menuName: getProductName(item.productId),
            quantity: item.quantity,
            price: item.price,
            amount: item.price * item.quantity,
            status: (item.status || 'pending') as 'pending' | 'preparing' | 'served',
            createdAt: order.created_at,
            orderCreatedAt: order.created_at,
          })
        })
      }
    })

    return items
  }, [orders, products])


  const handleUpdateStatus = async (orderId: string, newStatus: 'pending' | 'preparing' | 'completed') => {
    setUpdatingId(orderId)
    try {
      const client = getSupabaseBrowserClient()
      const now = new Date().toISOString()
      
      let updateData: {
        status: 'pending' | 'preparing' | 'completed'
        start_time?: string
        end_time?: string
        duration_seconds?: number
      } = { status: newStatus }

      if (newStatus === 'preparing') {
        updateData.start_time = now
      } else if (newStatus === 'completed') {
        const order = orders.find((o) => o.id === orderId)
        if (order?.start_time) {
          const startTime = new Date(order.start_time).getTime()
          const endTime = new Date(now).getTime()
          const durationSeconds = Math.floor((endTime - startTime) / 1000)
          updateData.end_time = now
          updateData.duration_seconds = durationSeconds
        } else {
          updateData.end_time = now
        }
      }

      const { data, error } = await client
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single()

      if (error) {
        console.error('ステータスの更新に失敗しました', error)
        throw new Error(`ステータスの更新に失敗しました: ${error.message}`)
      }

      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? { ...order, ...updateData } : order))
      )
    } catch (err) {
      console.error('ステータス更新エラー:', err)
      setError(err instanceof Error ? err.message : 'ステータスの更新に失敗しました')
    } finally {
      setUpdatingId((current) => (current === orderId ? null : current))
    }
  }

  // メニュー項目のステータスを更新
  const handleMenuItemStatusUpdate = async (
    orderId: string,
    itemIndex: number,
    newStatus: 'pending' | 'preparing' | 'served'
  ) => {
    const updateKey = `${orderId}-${itemIndex}`
    setUpdatingId(updateKey)
    try {
      const updatedOrder = await updateMenuItemStatus(orderId, itemIndex, newStatus)
      if (updatedOrder) {
        setOrders((prev) =>
          prev.map((order) => (order.id === orderId ? updatedOrder : order))
        )
      }
    } catch (err) {
      console.error('メニュー項目ステータス更新エラー:', err)
      setError(err instanceof Error ? err.message : 'メニュー項目ステータスの更新に失敗しました')
    } finally {
      setUpdatingId((current) => (current === updateKey ? null : current))
    }
  }

  // 注文番号を短縮表示
  const formatOrderId = (orderId: string): string => {
    return orderId.substring(0, 8).toUpperCase()
  }

  // 受付番号を計算（同一テーブル内での連番）
  const getReceptionNumber = (tableNumber: number, orderCreatedAt?: string): number => {
    if (!orderCreatedAt) return 0
    const tableOrders = orders.filter(
      (order) => order.table_number === tableNumber && order.created_at
    )
    const sortedOrders = [...tableOrders].sort((a, b) => {
      if (!a.created_at || !b.created_at) return 0
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
    const index = sortedOrders.findIndex((order) => order.created_at === orderCreatedAt)
    return index >= 0 ? index + 1 : 0
  }

  // ステータスに応じた背景色を取得
  const getStatusBackgroundColor = (
    status: 'pending' | 'preparing' | 'served',
    updateKey: string
  ): string => {
    // 配膳ボタンが押された場合、一時的に赤色を表示
    if (servingItems.has(updateKey)) {
      return 'bg-red-100' // 薄い赤色 (#FFCDD2)
    }
    
    switch (status) {
      case 'pending':
        return 'bg-gray-200' // 初期背景色：灰色 (#CCCCCC相当)
      case 'preparing':
        return 'bg-blue-100' // 薄い青色 (#BBDEFB)
      case 'served':
        return 'bg-yellow-100' // 薄い黄色 (#FFF9C4)
      default:
        return 'bg-gray-200'
    }
  }

  // 配膳ボタンの処理（配膳後に灰色に戻す）
  const handleServeItem = async (orderId: string, itemIndex: number) => {
    const updateKey = `${orderId}-${itemIndex}`
    setUpdatingId(updateKey)
    
    // 配膳ボタン押下後、一時的に赤色を表示
    setServingItems((prev) => new Set(prev).add(updateKey))
    
    try {
      // 少し待ってから灰色に戻す（配膳完了状態）
      await new Promise((resolve) => setTimeout(resolve, 500))
      
      // ステータスを'pending'に戻して灰色にする
      await handleMenuItemStatusUpdate(orderId, itemIndex, 'pending')
      
      // 赤色表示を解除
      setServingItems((prev) => {
        const next = new Set(prev)
        next.delete(updateKey)
        return next
      })
    } catch (err) {
      console.error('配膳処理エラー:', err)
      setError(err instanceof Error ? err.message : '配膳処理に失敗しました')
      setServingItems((prev) => {
        const next = new Set(prev)
        next.delete(updateKey)
        return next
      })
    } finally {
      setUpdatingId((current) => (current === updateKey ? null : current))
    }
  }

  const handleCompleteCheckout = async (tableNumber: number) => {
    setUpdatingId(`checkout-${tableNumber}`)
    try {
      await completeCheckout(tableNumber)
    } catch (err) {
      console.error('会計完了エラー:', err)
      const errorMessage = err instanceof Error ? err.message : '会計完了の更新に失敗しました'
      setError(errorMessage)
      alert(`会計完了に失敗しました: ${errorMessage}`)
    } finally {
      setUpdatingId((current) => (current === `checkout-${tableNumber}` ? null : current))
    }
  }

  const formatCreatedAt = (value?: string) => {
    if (!value) return '時刻不明'
    return timeFormatter.format(new Date(value))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E8F5E9] pb-20">
        <section className="mx-auto w-full max-w-4xl px-6 py-12">
          <p className="text-gray-500">読み込み中...</p>
        </section>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#E8F5E9] pb-20">
        <section className="mx-auto w-full max-w-4xl px-6 py-12">
          <p className="text-red-500">{error}</p>
        </section>
      </div>
    )
  }

  const pendingOrders = orders.filter((order) => order.status === 'pending' || order.status === 'preparing')
  const checkoutRequests = orders.filter((order) => order.status === 'checkout_requested')

  return (
    <div className="min-h-screen bg-[#E8F5E9] pb-20">
      <section className="mx-auto w-full max-w-5xl px-6 py-12">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">厨房側画面</h1>
          <p className="text-gray-600">新しい注文がリアルタイムで表示されます。</p>
        </header>

        {/* 会計依頼中のセクション */}
        {checkoutRequests.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-bold text-orange-600">会計依頼中</h2>
            <div className="overflow-x-auto rounded-lg border-2 border-orange-300 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-orange-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                      テーブル番号
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                      注文情報
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                      合計金額
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                      ステータス
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                      アクション
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {checkoutRequests.map((order) => {
                    const isUpdating = updatingId === `checkout-${order.table_number}`
                    return (
                      <tr key={order.id} className="bg-orange-50">
                        <td className="px-4 py-4">
                          <span className="text-xl font-bold text-gray-900">
                            {order.table_number || '未設定'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-500">注文ID: {order.id}</span>
                            <span className="mt-1 text-lg font-medium text-gray-700">
                              受付 {formatCreatedAt(order.created_at)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-lg font-bold text-emerald-600">
                          ¥{order.total.toLocaleString()}
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-block rounded-full bg-orange-200 px-3 py-1 text-xs font-semibold text-orange-800">
                            会計依頼中
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <button
                            type="button"
                            onClick={() => handleCompleteCheckout(order.table_number)}
                            disabled={isUpdating}
                            className="rounded-md bg-emerald-600 px-4 py-2 text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isUpdating ? '処理中...' : '会計完了'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 注文履歴一覧（メニュー項目ごとに表示） */}
        {expandedOrderItems.length === 0 ? (
          <p className="text-gray-500">現在、保留中の注文はありません。</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border-2 border-gray-300 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                    テーブル番号
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                    受付番号
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                    注文番号
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                    メニュー名
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                    数量
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                    金額
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                    ステータス管理
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {expandedOrderItems.map((item) => {
                  const updateKey = `${item.orderId}-${item.itemIndex}`
                  const isUpdating = updatingId === updateKey
                  const receptionNumber = getReceptionNumber(item.tableNumber, item.orderCreatedAt)
                  const orderNumber = formatOrderId(item.orderId)
                  const backgroundColor = getStatusBackgroundColor(item.status, updateKey)

                  return (
                    <tr key={updateKey} className={backgroundColor}>
                      <td className="px-4 py-4 text-sm font-bold text-gray-900">{item.tableNumber}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{receptionNumber}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{orderNumber}</td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">{item.menuName}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{item.quantity}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                        ¥{item.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleMenuItemStatusUpdate(item.orderId, item.itemIndex, 'preparing')}
                            disabled={isUpdating || item.status !== 'pending'}
                            className="rounded-md bg-blue-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isUpdating ? '更新中...' : '開始'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMenuItemStatusUpdate(item.orderId, item.itemIndex, 'served')}
                            disabled={isUpdating || item.status !== 'preparing'}
                            className="rounded-md bg-yellow-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isUpdating ? '更新中...' : '完了'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleServeItem(item.orderId, item.itemIndex)}
                            disabled={isUpdating || item.status !== 'served'}
                            className="rounded-md bg-red-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isUpdating ? '更新中...' : '配膳'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* フッターナビゲーション */}
      <KitchenBottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
