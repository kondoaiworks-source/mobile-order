#!/usr/bin/env node
/**
 * マイグレーション実行スクリプト
 * 
 * 使用方法:
 *   npx tsx scripts/run-migration.ts <migration-file.sql>
 * 
 * 例:
 *   npx tsx scripts/run-migration.ts add-checkout-completed-status.sql
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error('❌ エラー: NEXT_PUBLIC_SUPABASE_URL または SUPABASE_URL 環境変数が設定されていません')
  process.exit(1)
}

if (!supabaseServiceKey) {
  console.error('❌ エラー: SUPABASE_SERVICE_ROLE_KEY 環境変数が設定されていません')
  console.error('   Supabaseダッシュボードの Settings > API > service_role key から取得してください')
  process.exit(1)
}

const migrationFile = process.argv[2]

if (!migrationFile) {
  console.error('❌ エラー: マイグレーションファイルを指定してください')
  console.error('   使用方法: npx tsx scripts/run-migration.ts <migration-file.sql>')
  process.exit(1)
}

const migrationPath = join(process.cwd(), migrationFile)

let sql: string
try {
  sql = readFileSync(migrationPath, 'utf-8')
} catch (error) {
  console.error(`❌ エラー: ファイル "${migrationFile}" が見つかりません`)
  process.exit(1)
}

async function runMigration() {
  console.log(`📄 マイグレーションファイル: ${migrationFile}`)
  console.log(`🔗 Supabase URL: ${supabaseUrl}`)
  console.log('⏳ 実行中...\n')

  try {
    // Service Role Keyを使用して管理者権限で実行
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // SQLを実行
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // RPC関数が存在しない場合は、直接クエリを実行
      // 注意: Supabase JS Clientは直接SQLを実行できないため、
      // ここではエラーメッセージを表示して、手動実行を案内します
      console.error('❌ エラー:', error.message)
      console.error('\n📋 以下のSQLをSupabaseダッシュボードのSQL Editorで実行してください:\n')
      console.log('─'.repeat(60))
      console.log(sql)
      console.log('─'.repeat(60))
      process.exit(1)
    }

    console.log('✅ マイグレーションが正常に実行されました')
    if (data) {
      console.log('📊 結果:', data)
    }
  } catch (error) {
    console.error('❌ エラー:', error instanceof Error ? error.message : error)
    console.error('\n📋 代替方法: 以下のSQLをSupabaseダッシュボードのSQL Editorで実行してください:\n')
    console.log('─'.repeat(60))
    console.log(sql)
    console.log('─'.repeat(60))
    process.exit(1)
  }
}

runMigration()

