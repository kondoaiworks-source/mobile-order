'use client'

import { usePathname } from 'next/navigation'
import BottomNavigation from './BottomNavigation'

/**
 * 厨房側ページ（/kitchen）ではBottomNavigationを表示しない
 * それ以外のページでは表示する
 */
export default function ConditionalBottomNavigation() {
  const pathname = usePathname()
  
  // 厨房側ページでは表示しない（独自のフッターを使用）
  if (pathname === '/kitchen') {
    return null
  }

  return <BottomNavigation />
}

