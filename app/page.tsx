'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Product } from '@/src/types'
import { fetchProducts, placeOrder } from '@/src/lib/supabase'

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
        {categories.map((category) => {
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

interface CartSummaryProps {
  items: CartItem[]
  total: number
  onPlaceOrder: () => Promise<void>
  disabled: boolean
  isPlacing: boolean
  message: string | null
  tableNumber: number
  onTableNumberChange: (value: number) => void
  onUpdateQuantity: (productId: string, quantity: number) => void
  onRemoveItem: (productId: string) => void
}

function CartSummary({ items, total, onPlaceOrder, disabled, isPlacing, message, tableNumber, onTableNumberChange, onUpdateQuantity, onRemoveItem }: CartSummaryProps) {
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items])
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <aside className="fixed bottom-0 left-0 right-0 z-50 w-full rounded-t-xl border-t border-gray-200 bg-white shadow-lg transition-all duration-300 sm:bottom-4 sm:left-auto sm:right-4 sm:w-80 sm:rounded-xl sm:border sm:border-t">
      {/* 折りたたみボタン（スマホのみ） */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 sm:hidden"
        aria-label={isExpanded ? 'カートを折りたたむ' : 'カートを展開する'}
      >
        <h2 className="text-lg font-semibold">カート</h2>
        <div className="flex items-center gap-2">
          {itemCount > 0 && (
            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
              {itemCount}
            </span>
          )}
          <svg
            className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* デスクトップ用のタイトル */}
      <div className="hidden p-4 pb-2 sm:block">
        <h2 className="text-lg font-semibold">カート</h2>
      </div>

      {/* カート内容 */}
      <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[600px]' : 'max-h-0'} sm:max-h-none`}>
        <div className="px-4 pb-4 sm:px-4 sm:pb-4">
          <div className="mt-2">
            <label className="text-xs font-medium text-gray-700" htmlFor="cart-table-number">
              テーブル番号
            </label>
            <input
              id="cart-table-number"
              type="number"
              min={1}
              value={tableNumber}
              onChange={(event) => onTableNumberChange(Number(event.target.value) || 1)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-center text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">合計 {itemCount} 点</p>

          <div className="mt-3 max-h-48 space-y-2 overflow-y-auto sm:max-h-40">
            {items.length === 0 ? (
              <p className="text-sm text-gray-400">カートに商品がありません。</p>
            ) : (
              items.map((item) => (
                <div key={item.product.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.product.name}</p>
                    <p className="text-xs text-gray-500">{currencyFormatter.format(item.product.price)} × {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* 数量変更ボタン */}
                    <div className="flex items-center gap-1 rounded-md border border-gray-300 bg-white">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                        className="px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={item.quantity <= 1}
                        aria-label="数量を減らす"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <span className="min-w-[2rem] text-center text-sm font-medium text-gray-900">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                        className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                        aria-label="数量を増やす"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                    {/* 削除ボタン */}
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.product.id)}
                      className="rounded-md p-1.5 text-red-600 hover:bg-red-50 transition-colors"
                      aria-label="削除"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div className="ml-2 text-right">
                    <p className="font-semibold text-gray-900">{currencyFormatter.format(item.product.price * item.quantity)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 border-t border-gray-200 pt-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">合計金額</p>
              <p className="text-2xl font-bold text-gray-900">{currencyFormatter.format(total)}</p>
            </div>
          </div>

          {message && (
            <div className={`mt-3 rounded-md p-2 text-sm ${
              message.includes('完了') || message.includes('成功')
                ? 'bg-emerald-50 text-emerald-700'
                : message.includes('失敗') || message.includes('エラー')
                ? 'bg-red-50 text-red-700'
                : 'bg-blue-50 text-blue-700'
            }`}>
              {message}
            </div>
          )}

          <button
            type="button"
            onClick={onPlaceOrder}
            disabled={disabled}
            className="mt-4 w-full rounded-md bg-emerald-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 active:scale-95"
          >
            {isPlacing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                注文処理中...
              </span>
            ) : (
              '注文を確定する'
            )}
          </button>
        </div>
      </div>
    </aside>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [tableNumber, setTableNumber] = useState(1)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [orderMessage, setOrderMessage] = useState<string | null>(null)
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

  const handleAddToCart = (product: Product) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id)

      if (existingIndex !== -1) {
        const next = [...prev]
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + 1,
        }
        return next
      }

      return [...prev, { product, quantity: 1 }]
    })
    setOrderMessage('カートに追加しました')
    setTimeout(() => setOrderMessage(null), 2000)
  }

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(productId)
      return
    }

    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQuantity } : item
      )
    )
  }

  const handleRemoveItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId))
  }

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cartItems]
  )

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      setOrderMessage('カートが空です。商品を追加してください。')
      return
    }

    if (!tableNumber || tableNumber <= 0 || isNaN(tableNumber)) {
      setOrderMessage('テーブル番号を入力してください。')
      return
    }

    setIsPlacingOrder(true)
    setOrderMessage(null)

    try {
      await placeOrder({
        table_number: tableNumber,
        status: 'pending',
        items: cartItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
        })),
        total: cartTotal,
      })

      setCartItems([])
      setOrderMessage('注文が完了しました')
      setTimeout(() => setOrderMessage(null), 3000)
    } catch (err) {
      console.error('注文送信エラー:', err)
      const errorMessage = err instanceof Error ? err.message : '注文の送信に失敗しました。時間をおいて再度お試しください。'
      setOrderMessage(errorMessage)
    } finally {
      setIsPlacingOrder(false)
    }
  }

  const handleCategoryClick = (category: string) => {
    router.push(`/category/${encodeURIComponent(category)}`)
  }

  const handleImageClick = (product: Product) => {
    setSelectedImageProduct(product)
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-6 pb-40 sm:gap-10 sm:px-6 sm:py-12 sm:pb-12">
      <header className="text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">メニュー</h1>
        <div className="mt-4 flex items-center justify-center gap-3">
          <label className="text-sm font-medium text-gray-700" htmlFor="table-number">
            テーブル番号
          </label>
          <input
            id="table-number"
            type="number"
            min={1}
            value={tableNumber}
            onChange={(event) => setTableNumber(Number(event.target.value) || 1)}
            className="w-24 rounded-md border border-gray-300 px-3 py-1 text-center text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </div>
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

      <CartSummary
        items={cartItems}
        total={cartTotal}
        onPlaceOrder={handlePlaceOrder}
        disabled={cartItems.length === 0 || isPlacingOrder || !tableNumber || tableNumber <= 0 || isNaN(tableNumber)}
        isPlacing={isPlacingOrder}
        message={orderMessage}
        tableNumber={tableNumber}
        onTableNumberChange={setTableNumber}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
      />

      {/* 画像拡大モーダル */}
      <ImageModal
        product={selectedImageProduct}
        isOpen={selectedImageProduct !== null}
        onClose={() => setSelectedImageProduct(null)}
      />
    </main>
  )
}
