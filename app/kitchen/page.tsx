'use client'

import { useEffect, useState } from 'react'
import type { Order } from '@/src/types'
import {
  fetchPendingOrders,
  getSupabaseBrowserClient,
  updateOrderStatus,
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

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

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

            if (payload.eventType === 'INSERT' && newOrder?.status === 'pending') {
              next = [newOrder, ...next.filter((order) => order.id !== newOrder.id)]
            }

            if (payload.eventType === 'UPDATE' && newOrder) {
              next = next.filter((order) => order.id !== newOrder.id)
              // 'pending' または 'preparing' の注文のみを表示
              if (newOrder.status === 'pending' || newOrder.status === 'preparing') {
                next = [newOrder, ...next]
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

  const handleUpdateStatus = async (orderId: string, newStatus: 'pending' | 'preparing' | 'completed') => {
    setUpdatingId(orderId)
    try {
      const client = getSupabaseBrowserClient()
      const now = new Date().toISOString()
      
      // 更新データを準備
      let updateData: {
        status: 'pending' | 'preparing' | 'completed'
        start_time?: string
        end_time?: string
        duration_seconds?: number
      } = { status: newStatus }

      if (newStatus === 'preparing') {
        // 調理開始: start_time を設定
        updateData.start_time = now
      } else if (newStatus === 'completed') {
        // 完了: end_time を設定し、duration_seconds を計算
        const order = orders.find((o) => o.id === orderId)
        if (order?.start_time) {
          const startTime = new Date(order.start_time).getTime()
          const endTime = new Date(now).getTime()
          const durationSeconds = Math.floor((endTime - startTime) / 1000)
          updateData.end_time = now
          updateData.duration_seconds = durationSeconds
        } else {
          // start_time がない場合でも end_time は設定
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

      // ローカル状態を更新（リアルタイム更新で自動的に反映されるが、念のため）
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

  const formatCreatedAt = (value?: string) => {
    if (!value) return '時刻不明'
    return timeFormatter.format(new Date(value))
  }

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-4xl px-6 py-12">
        <p className="text-gray-500">読み込み中...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="mx-auto w-full max-w-4xl px-6 py-12">
        <p className="text-red-500">{error}</p>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-12">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">未処理の注文</h1>
        <p className="text-gray-600">新しい注文がリアルタイムで表示されます。</p>
      </header>

      {orders.length === 0 ? (
        <p className="text-gray-500">現在、保留中の注文はありません。</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  テーブル番号
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  注文情報
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  商品数
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  合計
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  アクション
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {orders
                .filter((order) => order.status === 'pending' || order.status === 'preparing')
                .map((order) => {
                  const isPending = order.status === 'pending'
                  const isPreparing = order.status === 'preparing'
                  const isUpdating = updatingId === order.id
                  
                  // ステータスに応じた背景色
                  let bgColor = 'bg-white'
                  if (isPending) {
                    bgColor = 'bg-red-50'
                  } else if (isPreparing) {
                    bgColor = 'bg-blue-100'
                  }
                  
                  return (
                    <tr
                      key={order.id}
                      className={bgColor}
                    >
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
                        {isPreparing && order.start_time && (
                          <div className="mt-2">
                            <span className="text-xs text-gray-500">経過時間: </span>
                            <ElapsedTime startTime={order.start_time} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {Array.isArray(order.items) ? order.items.length : 0}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                      ¥{order.total.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(order.id, 'preparing')}
                          disabled={isUpdating || order.status === 'preparing' || order.status === 'completed'}
                          className="rounded-md bg-orange-600 px-4 py-2 text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isUpdating ? '更新中...' : '調理開始'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(order.id, 'completed')}
                          disabled={isUpdating || order.status === 'completed'}
                          className="rounded-md bg-green-600 px-4 py-2 text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isUpdating ? '更新中...' : '完了'}
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
  )
}
