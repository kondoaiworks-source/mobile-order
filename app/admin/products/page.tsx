'use client'

import { useEffect, useState } from 'react'
import type { Product } from '@/src/types'
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} from '@/src/lib/db-actions/products'

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
})

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getProducts()
      setProducts(data)
    } catch (err) {
      console.error('商品読み込みエラー:', err)
      setError(err instanceof Error ? err.message : '商品の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product)
      setFormData({
        name: product.name,
        price: product.price.toString(),
        description: product.description || '',
      })
    } else {
      setEditingProduct(null)
      setFormData({
        name: '',
        price: '',
        description: '',
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingProduct(null)
    setFormData({
      name: '',
      price: '',
      description: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const price = parseFloat(formData.price)
      if (isNaN(price) || price <= 0) {
        throw new Error('価格は正の数値を入力してください')
      }

      if (editingProduct) {
        // 更新
        await updateProduct(editingProduct.id, {
          name: formData.name,
          price,
          description: formData.description || '',
        })
      } else {
        // 新規作成
        await addProduct({
          name: formData.name,
          price,
          description: formData.description || '',
        })
      }

      handleCloseModal()
      await loadProducts()
    } catch (err) {
      console.error('商品保存エラー:', err)
      setError(err instanceof Error ? err.message : '商品の保存に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この商品を削除してもよろしいですか？')) {
      return
    }

    try {
      setError(null)
      await deleteProduct(id)
      await loadProducts()
    } catch (err) {
      console.error('商品削除エラー:', err)
      setError(err instanceof Error ? err.message : '商品の削除に失敗しました')
    }
  }

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-6xl px-6 py-12">
        <p className="text-gray-500">読み込み中...</p>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-12">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">商品管理</h1>
          <p className="mt-2 text-gray-600">商品の追加・編集・削除ができます。</p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="rounded-md bg-emerald-600 px-4 py-2 text-white transition hover:bg-emerald-500"
        >
          新規商品を追加
        </button>
      </header>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {products.length === 0 ? (
        <p className="text-gray-500">商品が存在しません。</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  商品名
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  説明
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  価格
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900">
                    {product.name}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">
                    {product.description || '-'}
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                    {currencyFormatter.format(product.price)}
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenModal(product)}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-white transition hover:bg-blue-500"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(product.id)}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-white transition hover:bg-red-500"
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-bold">
              {editingProduct ? '商品を編集' : '新規商品を追加'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="name">
                  商品名 <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="price">
                  価格 <span className="text-red-500">*</span>
                </label>
                <input
                  id="price"
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="description">
                  説明
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? '保存中...' : editingProduct ? '更新' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

