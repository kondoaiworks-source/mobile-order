'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Product } from '@/src/types'
import { fetchProducts } from '@/src/lib/supabase'

type CartItem = {
  product: Product
  quantity: number
}

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
})

// オススメスライドショーコンポーネント
function FeaturedSlider({ products, onImageClick }: { products: Product[], onImageClick: (product: Product) => void }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  const featuredProducts = products.filter(p => p.is_featured).slice(0, 10)

  if (featuredProducts.length === 0) return null

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe && currentIndex < featuredProducts.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? featuredProducts.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === featuredProducts.length - 1 ? 0 : prev + 1))
  }

  return (
    <div className="relative w-full">
      <div className="mb-2 px-4">
        <h2 className="text-2xl font-bold text-gray-900">オススメ</h2>
      </div>
      <div
        className="relative overflow-hidden rounded-xl"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {featuredProducts.map((product) => (
            <div key={product.id} className="min-w-full flex-shrink-0">
              <button
                type="button"
                onClick={() => onImageClick(product)}
                className="relative block w-full"
              >
                <div className="aspect-[16/9] w-full overflow-hidden bg-gray-200">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-200 text-gray-500">
                      <span className="text-lg">{product.name}</span>
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                  <h3 className="text-lg font-semibold text-white">{product.name}</h3>
                  <p className="text-sm text-white/90">{currencyFormatter.format(product.price)}</p>
                </div>
              </button>
            </div>
          ))}
        </div>

        {/* ナビゲーションボタン */}
        {featuredProducts.length > 1 && (
          <>
            <button
              type="button"
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-lg hover:bg-white"
              aria-label="前へ"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-lg hover:bg-white"
              aria-label="次へ"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* インジケーター */}
        {featuredProducts.length > 1 && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {featuredProducts.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/50'
                }`}
                aria-label={`スライド ${index + 1}へ`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// カテゴリ一覧コンポーネント
function CategoryList({ products, onCategoryClick }: { products: Product[], onCategoryClick: (category: string) => void }) {
  const categories = useMemo(() => {
    const categorySet = new Set<string>()
    products.forEach((p) => {
      if (p.category) categorySet.add(p.category)
    })
    return Array.from(categorySet).sort()
  }, [products])

  const [scrollPosition, setScrollPosition] = useState(0)
  const [touchStart, setTouchStart] = useState(0)

  if (categories.length === 0) return null

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const container = e.currentTarget
    const touch = e.targetTouches[0]
    const scrollLeft = container.scrollLeft - (touch.clientX - touchStart)
    container.scrollLeft = scrollLeft
    setTouchStart(touch.clientX)
    setScrollPosition(scrollLeft)
  }

  // カテゴリごとの商品を取得してサムネイル用の画像を選ぶ
  const getCategoryImage = (category: string) => {
    const categoryProduct = products.find((p) => p.category === category && p.image_url)
    return categoryProduct?.image_url || null
  }

  return (
    <div className="w-full">
      <div className="mb-4 px-4">
        <h2 className="text-2xl font-bold text-gray-900">カテゴリ</h2>
      </div>
      <div
        className="flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-hide"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {categories.map((category: string) => {
          const categoryImage = getCategoryImage(category)
          return (
            <button
              key={category}
              type="button"
              onClick={() => onCategoryClick(category)}
              className="flex min-w-[200px] flex-shrink-0 flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md active:scale-95"
            >
              <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
                {categoryImage ? (
                  <img
                    src={categoryImage}
                    alt={category}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-200">
                    <span className="text-lg font-semibold text-gray-700">{category}</span>
                  </div>
                )}
              </div>
              <span className="text-lg font-semibold text-gray-900">{category}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// 画像拡大モーダル
function ImageModal({ product, isOpen, onClose }: { product: Product | null, isOpen: boolean, onClose: () => void }) {
  if (!isOpen || !product) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
        aria-label="閉じる"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div className="relative max-h-full max-w-full" onClick={(e) => e.stopPropagation()}>
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
          />
        ) : (
          <div className="flex h-[60vh] w-[90vw] max-w-md items-center justify-center rounded-lg bg-gray-800 text-white">
            <span className="text-2xl">{product.name}</span>
          </div>
        )}
        <div className="mt-4 text-center text-white">
          <h3 className="text-xl font-semibold">{product.name}</h3>
          <p className="mt-2 text-lg">{currencyFormatter.format(product.price)}</p>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImageProduct, setSelectedImageProduct] = useState<Product | null>(null)

  useEffect(() => {
    let active = true

    const loadProducts = async () => {
      try {
        const data = await fetchProducts()
        if (!active) return
        setProducts(data)
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
  }, [])


  const handleCategoryClick = (category: string) => {
    router.push(`/category/${encodeURIComponent(category)}`)
  }

  const handleImageClick = (product: Product) => {
    setSelectedImageProduct(product)
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-6 pb-6 sm:gap-10 sm:px-6 sm:py-12 sm:pb-12">
      <header className="text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">メニュー</h1>
      </header>

      {loading ? (
        <p className="text-center text-gray-500">読み込み中...</p>
      ) : error ? (
        <p className="text-center text-red-500">{error}</p>
      ) : (
        <>
          {/* オススメスライドショー */}
          <FeaturedSlider products={products} onImageClick={handleImageClick} />

          {/* カテゴリ一覧 */}
          <CategoryList products={products} onCategoryClick={handleCategoryClick} />
        </>
      )}


      {/* 画像拡大モーダル */}
      <ImageModal
        product={selectedImageProduct}
        isOpen={selectedImageProduct !== null}
        onClose={() => setSelectedImageProduct(null)}
      />
    </main>
  )
}
