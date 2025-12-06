#!/usr/bin/env node
/**
 * checkout_completedステータス追加マイグレーション
 * 
 * このスクリプトはSupabaseのSQL Editorで実行するSQLを表示します。
 * 
 * 使用方法:
 *   1. このスクリプトを実行してSQLを確認
 *   node scripts/apply-checkout-completed-migration.js
 * 
 *   2. 出力されたSQLをSupabaseダッシュボードのSQL Editorで実行
 */

const fs = require('fs')
const path = require('path')

const migrationFile = path.join(__dirname, '..', 'add-checkout-completed-status.sql')

console.log('='.repeat(60))
console.log('checkout_completedステータス追加マイグレーション')
console.log('='.repeat(60))
console.log('')

try {
  const sql = fs.readFileSync(migrationFile, 'utf-8')
  
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
  console.log('✅ 実行後、アプリケーションを再起動してください')
  
} catch (error) {
  console.error('❌ エラー: マイグレーションファイルが見つかりません')
  console.error(error.message)
  process.exit(1)
}

