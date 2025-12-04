'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OrderCompletePage() {
  const router = useRouter()
  const [timeRemaining, setTimeRemaining] = useState(180) // 3分 = 180秒

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="rounded-full bg-emerald-100 p-6">
        <svg
          className="h-16 w-16 text-emerald-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-gray-900">ご注文ありがとうございます</h1>
      <p className="text-center text-gray-600">
        注文が正常に送信されました。
        <br />
        {timeRemaining > 0 && (
          <>
            {minutes}分{seconds.toString().padStart(2, '0')}秒後にメニュー画面に戻ります。
          </>
        )}
      </p>
      <button
        type="button"
        onClick={() => router.push('/')}
        className="rounded-lg bg-emerald-600 px-6 py-3 text-white hover:bg-emerald-500"
      >
        すぐにメニューに戻る
      </button>
    </div>
  )
}

