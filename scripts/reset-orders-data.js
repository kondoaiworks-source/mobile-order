#!/usr/bin/env node
/**
 * 過去の注文データを削除するSQLを表示するスクリプト
 * 
 * 使用方法:
 *   node scripts/reset-orders-data.js [options]
 * 
 * オプション:
 *   --all         全ての注文を削除
 *   --completed   完了済み（completed）の注文を削除
 *   --checkout    会計関連（checkout_requested, checkout_completed）の注文を削除
 *   --old-days=N  N日前より前の注文を削除（例: --old-days=30）
 */

const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)

console.log('='.repeat(60))
console.log('過去の注文データ削除 SQL スクリプト')
console.log('='.repeat(60))
console.log('')

let sql = ''

if (args.includes('--all')) {
  // 全ての注文を削除
  sql = `-- 全ての注文を削除
DELETE FROM public.orders;

-- 削除後の確認
SELECT COUNT(*) as remaining_orders FROM public.orders;`
  
  console.log('⚠️  警告: 全ての注文データを削除します！\n')
  
} else if (args.includes('--completed')) {
  // 完了済みの注文を削除
  sql = `-- 完了済み（completed）の注文を削除
DELETE FROM public.orders WHERE status = 'completed';

-- 削除後の確認
SELECT 
  status,
  COUNT(*) as count
FROM public.orders
GROUP BY status
ORDER BY status;`
  
  console.log('完了済み（completed）の注文を削除します。\n')
  
} else if (args.includes('--checkout')) {
  // 会計関連の注文を削除
  sql = `-- 会計関連（checkout_requested, checkout_completed）の注文を削除
DELETE FROM public.orders 
WHERE status IN ('checkout_requested', 'checkout_completed');

-- 削除後の確認
SELECT 
  status,
  COUNT(*) as count
FROM public.orders
GROUP BY status
ORDER BY status;`
  
  console.log('会計関連の注文を削除します。\n')
  
} else {
  // デフォルト: 完了済みと会計関連の注文を削除
  const oldDaysArg = args.find(arg => arg.startsWith('--old-days='))
  if (oldDaysArg) {
    const days = oldDaysArg.split('=')[1] || '30'
    sql = `-- ${days}日前より前の注文を削除
DELETE FROM public.orders 
WHERE created_at < NOW() - INTERVAL '${days} days';

-- 削除後の確認
SELECT 
  status,
  COUNT(*) as count
FROM public.orders
GROUP BY status
ORDER BY status;`
    
    console.log(`${days}日前より前の注文を削除します。\n`)
  } else {
    // デフォルト: 完了済みと会計関連
    sql = `-- 完了済みと会計関連の注文を削除
DELETE FROM public.orders 
WHERE status IN ('completed', 'checkout_requested', 'checkout_completed');

-- 削除後の確認
SELECT 
  status,
  COUNT(*) as count
FROM public.orders
GROUP BY status
ORDER BY status;`
    
    console.log('完了済みと会計関連の注文を削除します（デフォルト）。\n')
    console.log('オプション:')
    console.log('  --all         全ての注文を削除')
    console.log('  --completed   完了済み（completed）の注文のみ削除')
    console.log('  --checkout    会計関連の注文のみ削除')
    console.log('  --old-days=N  N日前より前の注文を削除')
    console.log('')
  }
}

console.log('以下のSQLをSupabaseダッシュボードのSQL Editorで実行してください:\n')
console.log('-'.repeat(60))
console.log(sql)
console.log('-'.repeat(60))
console.log('')
console.log('実行手順:')
console.log('1. Supabaseダッシュボードにログイン')
console.log('2. プロジェクトを選択')
console.log('3. 左サイドバーから「SQL Editor」をクリック')
console.log('4. 「New query」をクリック')
console.log('5. 上記のSQLをコピー&ペースト')
console.log('6. 「Run」ボタンをクリック（または Cmd+Enter / Ctrl+Enter）')
console.log('')
console.log('⚠️  重要: 実行前に必ずバックアップを取得してください！')

