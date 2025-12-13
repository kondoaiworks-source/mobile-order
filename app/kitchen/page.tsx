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
  tableNumber: number
  menuName: string
  quantity: number
  price: number
  subtotal: number
  status: Order['status']
  createdAt?: string
  startTime?: string
  orderTotal: number
}

export default function KitchenPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'table' | 'menu'>('table')

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

  // 注文をメニュー単位で展開
  const expandedOrderItems = useMemo<ExpandedOrderItem[]>(() => {
    const pendingOrders = orders.filter((order) => order.status === 'pending' || order.status === 'preparing')
    const items: ExpandedOrderItem[] = []

    pendingOrders.forEach((order) => {
      if (Array.isArray(order.items)) {
        order.items.forEach((item) => {
          items.push({
            orderId: order.id,
            tableNumber: order.table_number,
            menuName: getProductName(item.productId),
            quantity: item.quantity,
            price: item.price,
            subtotal: item.price * item.quantity,
            status: order.status,
            createdAt: order.created_at,
            startTime: order.start_time,
            orderTotal: order.total,
          })
        })
      }
    })

    return items
  }, [orders, products])

  // テーブル番号ごとにグループ化
  const ordersByTable = useMemo(() => {
    const grouped: Record<number, ExpandedOrderItem[]> = {}
    expandedOrderItems.forEach((item) => {
      if (!grouped[item.tableNumber]) {
        grouped[item.tableNumber] = []
      }
      grouped[item.tableNumber].push(item)
    })
    return grouped
  }, [expandedOrderItems])

  // メニューごとにグループ化
  const ordersByMenu = useMemo(() => {
    const grouped: Record<string, ExpandedOrderItem[]> = {}
    expandedOrderItems.forEach((item) => {
      if (!grouped[item.menuName]) {
        grouped[item.menuName] = []
      }
      grouped[item.menuName].push(item)
    })
    return grouped
  }, [expandedOrderItems])

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

  const handleStartCooking = async (orderId: string) => {
    await handleUpdateStatus(orderId, 'preparing')
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

        {/* 表示モード切り替え（テーブル表示 / メニュー表示） */}
        {activeTab === 'table' ? (
          /* テーブル番号ごとの表示 */
          pendingOrders.length === 0 ? (
            <p className="text-gray-500">現在、保留中の注文はありません。</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(ordersByTable)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([tableNumber, items]) => {
                  // このテーブルの注文を取得（注文IDごとにグループ化）
                  const orderGroups: Record<string, ExpandedOrderItem[]> = {}
                  items.forEach((item) => {
                    if (!orderGroups[item.orderId]) {
                      orderGroups[item.orderId] = []
                    }
                    orderGroups[item.orderId].push(item)
                  })

                  // 各注文グループを表示
                  return (
                    <div key={tableNumber} className="space-y-4">
                      {Object.entries(orderGroups).map(([orderId, orderItems]) => {
                        const order = orders.find((o) => o.id === orderId)
                        const isPending = order?.status === 'pending'
                        const isPreparing = order?.status === 'preparing'
                        const orderTotal = order?.total || orderItems.reduce((sum, item) => sum + item.subtotal, 0)

                        return (
                          <div
                            key={orderId}
                            className={`overflow-x-auto rounded-lg border-2 shadow-sm ${
                              isPending
                                ? 'border-red-300 bg-red-50'
                                : isPreparing
                                  ? 'border-blue-300 bg-blue-50'
                                  : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="bg-gray-100 px-4 py-3">
                              <h3 className="text-xl font-bold text-gray-900">テーブル {tableNumber}</h3>
                              <p className="text-sm text-gray-600">
                                受付時刻: {order?.created_at ? formatCreatedAt(order.created_at) : '不明'}
                              </p>
                            </div>
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                                    メニュー名
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                                    数量
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                                    単価
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                                    小計
                                  </th>
                                  {isPreparing && order?.start_time && (
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                                      経過時間
                                    </th>
                                  )}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 bg-white">
                                {orderItems.map((item, index) => (
                                  <tr key={`${item.orderId}-${index}`}>
                                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{item.menuName}</td>
                                    <td className="px-4 py-4 text-sm text-gray-700">{item.quantity}</td>
                                    <td className="px-4 py-4 text-sm text-gray-700">¥{item.price.toLocaleString()}</td>
                                    <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                                      ¥{item.subtotal.toLocaleString()}
                                    </td>
                                    {isPreparing && order?.start_time && (
                                      <td className="px-4 py-4">
                                        <ElapsedTime startTime={order.start_time} />
                                      </td>
                                    )}
                                  </tr>
                                ))}
                                <tr className="bg-gray-50">
                                  <td colSpan={isPreparing && order?.start_time ? 4 : 3} className="px-4 py-4 text-right text-sm font-semibold text-gray-900">
                                    合計
                                  </td>
                                  <td className="px-4 py-4 text-lg font-bold text-emerald-600">
                                    ¥{orderTotal.toLocaleString()}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                            <div className="bg-gray-100 px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(orderId, 'preparing')}
                                  disabled={updatingId === orderId || order?.status === 'preparing' || order?.status === 'completed'}
                                  className="rounded-md bg-orange-600 px-4 py-2 text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {updatingId === orderId ? '更新中...' : '調理開始'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(orderId, 'completed')}
                                  disabled={updatingId === orderId || order?.status === 'completed'}
                                  className="rounded-md bg-green-600 px-4 py-2 text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {updatingId === orderId ? '更新中...' : '完了'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
            </div>
          )
        ) : (
          /* メニューごとの表示 */
          Object.keys(ordersByMenu).length === 0 ? (
            <p className="text-gray-500">現在、保留中の注文はありません。</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(ordersByMenu)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([menuName, items]) => {
                  // このメニューの合計数量を計算
                  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
                  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0)
                  // このメニューの注文IDのリスト（重複を除去）
                  const orderIds = [...new Set(items.map((item) => item.orderId))]
                  // ステータスを確認（1つの注文に複数のメニューがある場合、その注文のステータスを確認）
                  const orderStatuses = orderIds.map((orderId) => {
                    const order = orders.find((o) => o.id === orderId)
                    return order?.status
                  })
                  const hasPending = orderStatuses.includes('pending')
                  const hasPreparing = orderStatuses.includes('preparing')

                  return (
                    <div
                      key={menuName}
                      className={`overflow-x-auto rounded-lg border-2 shadow-sm ${
                        hasPending
                          ? 'border-red-300 bg-red-50'
                          : hasPreparing
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="bg-gray-100 px-4 py-3">
                        <h3 className="text-xl font-bold text-gray-900">{menuName}</h3>
                        <p className="text-sm text-gray-600">
                          合計数量: {totalQuantity}個 | 合計金額: ¥{totalAmount.toLocaleString()}
                        </p>
                      </div>
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                              テーブル番号
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                              数量
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                              単価
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                              小計
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                              受付時刻
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                              ステータス
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {items.map((item, index) => {
                            const order = orders.find((o) => o.id === item.orderId)
                            const isPending = order?.status === 'pending'
                            const isPreparing = order?.status === 'preparing'
                            return (
                              <tr key={`${item.orderId}-${index}`}>
                                <td className="px-4 py-4 text-lg font-bold text-gray-900">{item.tableNumber}</td>
                                <td className="px-4 py-4 text-sm text-gray-700">{item.quantity}</td>
                                <td className="px-4 py-4 text-sm text-gray-700">¥{item.price.toLocaleString()}</td>
                                <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                                  ¥{item.subtotal.toLocaleString()}
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-600">
                                  {item.createdAt ? formatCreatedAt(item.createdAt) : '不明'}
                                </td>
                                <td className="px-4 py-4">
                                  {isPending ? (
                                    <span className="inline-block rounded-full bg-red-200 px-3 py-1 text-xs font-semibold text-red-800">
                                      保留中
                                    </span>
                                  ) : isPreparing ? (
                                    <span className="inline-block rounded-full bg-blue-200 px-3 py-1 text-xs font-semibold text-blue-800">
                                      調理中
                                    </span>
                                  ) : (
                                    <span className="inline-block rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-800">
                                      完了
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                })}
            </div>
          )
        )}
      </section>

      {/* フッターナビゲーション */}
      <KitchenBottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
