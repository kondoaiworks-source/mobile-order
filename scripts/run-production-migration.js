#!/usr/bin/env node
/**
 * 本番環境マイグレーション実行スクリプト
 * 
 * Supabase Management APIを使用してマイグレーションを実行します
 * 
 * 使用方法:
 *   node scripts/run-production-migration.js
 * 
 * 必要な環境変数:
 *   - NEXT_PUBLIC_SUPABASE_URL (または SUPABASE_URL)
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error('❌ エラー: NEXT_PUBLIC_SUPABASE_URL または SUPABASE_URL 環境変数が設定されていません')
  process.exit(1)
}

if (!supabaseServiceKey) {
  console.error('❌ エラー: SUPABASE_SERVICE_ROLE_KEY 環境変数が設定されていません')
  console.error('   Supabaseダッシュボードの Settings > API > service_role key から取得してください')
  console.error('   ⚠️  このキーは秘密情報です。絶対にコミットしないでください！')
  process.exit(1)
}

// マイグレーションファイルのパス
const migrationFile = path.join(__dirname, '..', 'add-checkout-completed-status-clean.sql')

let sql
try {
  sql = fs.readFileSync(migrationFile, 'utf-8')
  console.log(`📄 マイグレーションファイル: ${path.basename(migrationFile)}`)
} catch (error) {
  console.error(`❌ エラー: マイグレーションファイルが見つかりません: ${migrationFile}`)
  process.exit(1)
}

async function runMigration() {
  console.log('='.repeat(60))
  console.log('本番環境マイグレーション実行')
  console.log('='.repeat(60))
  console.log(`🔗 Supabase URL: ${supabaseUrl}`)
  console.log('⏳ 実行中...\n')

  try {
    // Supabase Management APIを使用してSQLを実行
    // 注意: Supabase JS Clientは直接SQL実行をサポートしていないため、
    // REST APIを使用します
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ query: sql })
    })

    if (!response.ok) {
      // exec_sql RPC関数が存在しない場合は、直接SQLエンドポイントを試す
      // または手動実行を案内
      const errorText = await response.text()
      console.error('❌ エラー: 自動実行ができませんでした')
      console.error(`   ステータス: ${response.status}`)
      console.error(`   メッセージ: ${errorText}\n`)
      
      console.log('📋 以下のSQLをSupabaseダッシュボードのSQL Editorで実行してください:\n')
      console.log('─'.repeat(60))
      console.log(sql)
      console.log('─'.repeat(60))
      console.log('\n実行手順:')
      console.log('1. https://supabase.com/dashboard にログイン')
      console.log('2. 本番環境のプロジェクトを選択')
      console.log('3. 左サイドバー → 「SQL Editor」')
      console.log('4. 「New query」をクリック')
      console.log('5. 上記のSQLをコピー&ペースト')
      console.log('6. 「Run」ボタンをクリック（または Cmd+Enter / Ctrl+Enter）')
      process.exit(1)
    }

    const result = await response.json()
    console.log('✅ マイグレーションが正常に実行されました')
    if (result) {
      console.log('📊 結果:', JSON.stringify(result, null, 2))
    }
  } catch (error) {
    console.error('❌ エラー:', error.message)
    console.error('\n📋 以下のSQLをSupabaseダッシュボードのSQL Editorで手動実行してください:\n')
    console.log('─'.repeat(60))
    console.log(sql)
    console.log('─'.repeat(60))
    console.log('\n実行手順:')
    console.log('1. https://supabase.com/dashboard にログイン')
    console.log('2. 本番環境のプロジェクトを選択')
    console.log('3. 左サイドバー → 「SQL Editor」')
    console.log('4. 「New query」をクリック')
    console.log('5. 上記のSQLをコピー&ペースト')
    console.log('6. 「Run」ボタンをクリック（または Cmd+Enter / Ctrl+Enter）')
    process.exit(1)
  }
}

runMigration()

