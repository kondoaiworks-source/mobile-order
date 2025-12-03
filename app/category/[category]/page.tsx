'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { Product } from '@/src/types'
import { fetchProducts } from '@/src/lib/supabase'
import { useCart } from '@/src/contexts/CartContext'

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
})

export default function CategoryPage() {
  const params = useParams()
  const router = useRouter()
  const category = decodeURIComponent(params.category as string)
  const { addToCart } = useCart()
  
  const [products, setProducts] = useState<Product[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [showAddToCartSuccess, setShowAddToCartSuccess] = useState(false)

  useEffect(() => {
    let active = true

    const loadProducts = async () => {
      try {
        const data = await fetchProducts()
        if (!active) return
        const categoryProducts = data.filter((p) => p.category === category)
        setProducts(categoryProducts)
        if (categoryProducts.length === 0) {
          setError('このカテゴリに商品がありません')
        }
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
  }, [category])

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isUpSwipe = distance > 50
    const isDownSwipe = distance < -50

    if (isUpSwipe && currentIndex < products.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
    if (isDownSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const goToNext = () => {
    if (currentIndex < products.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setQuantity(1) // 商品が変わったら数量をリセット
    }
  }

  const handleAddToCart = () => {
    if (currentProduct) {
      addToCart(currentProduct, quantity)
      setShowAddToCartSuccess(true)
      setTimeout(() => {
        setShowAddToCartSuccess(false)
      }, 2000)
    }
  }

  const currentProduct = products[currentIndex]

  // 商品が変わったら数量をリセット
  useEffect(() => {
    setQuantity(1)
  }, [currentIndex])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    )
  }

  if (error || products.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-red-500">{error || '商品が存在しません'}</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500"
        >
          戻る
        </button>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-white px-4 py-3 shadow-sm">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full p-2 hover:bg-gray-100"
          aria-label="戻る"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-gray-900">{category}</h1>
        <div className="w-10" /> {/* スペーサー */}
      </header>

      {/* メニューカード */}
      <div
        className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-8"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="w-full max-w-md">
          <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
            {/* 画像 */}
            <button
              type="button"
              onClick={() => setIsImageModalOpen(true)}
              className="relative block w-full"
            >
              <div className="aspect-square w-full overflow-hidden bg-gray-200">
                {currentProduct.image_url ? (
                  <img
                    src={currentProduct.image_url}
                    alt={currentProduct.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-200">
                    <span className="text-2xl font-semibold text-gray-700">{currentProduct.name}</span>
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent p-4">
                <div className="flex items-center justify-between text-white">
                  <span className="text-sm">
                    {currentIndex + 1} / {products.length}
                  </span>
                  <span className="text-sm">タップで拡大</span>
                </div>
              </div>
            </button>

            {/* 商品情報 */}
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900">{currentProduct.name}</h2>
              {currentProduct.description && (
                <p className="mt-3 text-gray-600">{currentProduct.description}</p>
              )}
              <div className="mt-6 flex items-center justify-between">
                <span className="text-3xl font-bold text-emerald-600">
                  {currencyFormatter.format(currentProduct.price)}
                </span>
              </div>

              {/* 数量選択とカート追加 */}
              <div className="mt-6 space-y-4">
                {/* 数量選択 */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">数量</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={quantity <= 1}
                      aria-label="数量を減らす"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <span className="min-w-[3rem] text-center text-lg font-semibold text-gray-900">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      aria-label="数量を増やす"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* カート追加ボタン */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full rounded-lg bg-emerald-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-emerald-500 active:scale-95"
                >
                  カートに追加
                </button>

                {/* 成功メッセージ */}
                {showAddToCartSuccess && (
                  <div className="rounded-lg bg-emerald-50 p-3 text-center text-sm font-medium text-emerald-700">
                    ✓ カートに追加しました
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ナビゲーションボタン */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className="rounded-full bg-white p-3 shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              aria-label="前のメニュー"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <span className="text-sm text-gray-500">
              {currentIndex + 1} / {products.length}
            </span>
            <button
              type="button"
              onClick={goToNext}
              disabled={currentIndex === products.length - 1}
              className="rounded-full bg-white p-3 shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              aria-label="次のメニュー"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* インジケーター */}
          <div className="mt-4 flex justify-center gap-2">
            {products.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex ? 'w-8 bg-emerald-600' : 'w-2 bg-gray-300'
                }`}
                aria-label={`メニュー ${index + 1}へ`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 画像拡大モーダル */}
      {isImageModalOpen && currentProduct && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setIsImageModalOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsImageModalOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
            aria-label="閉じる"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative max-h-full max-w-full" onClick={(e) => e.stopPropagation()}>
            {currentProduct.image_url ? (
              <img
                src={currentProduct.image_url}
                alt={currentProduct.name}
                className="max-h-[90vh] max-w-full rounded-lg object-contain"
              />
            ) : (
              <div className="flex h-[60vh] w-[90vw] max-w-md items-center justify-center rounded-lg bg-gray-800 text-white">
                <span className="text-2xl">{currentProduct.name}</span>
              </div>
            )}
            <div className="mt-4 text-center text-white">
              <h3 className="text-xl font-semibold">{currentProduct.name}</h3>
              <p className="mt-2 text-lg">{currencyFormatter.format(currentProduct.price)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

