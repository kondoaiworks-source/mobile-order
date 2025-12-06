#!/usr/bin/env node
/**
 * 本番環境マイグレーション実行スクリプト（PostgreSQL直接接続版）
 * 
 * PostgreSQLクライアントを使用してマイグレーションを実行します
 * 
 * 使用方法:
 *   SUPABASE_DB_URL="postgresql://..." node scripts/execute-production-migration.js
 * 
 * または環境変数で:
 *   export SUPABASE_DB_URL="postgresql://postgres:[password]@[host]:5432/postgres"
 *   node scripts/execute-production-migration.js
 * 
 * 必要な環境変数:
 *   - SUPABASE_DB_URL: PostgreSQL接続文字列
 *     形式: postgresql://postgres:[password]@[host]:5432/postgres
 *     Supabaseダッシュボードの Settings > Database > Connection string から取得
 */

const fs = require('fs')
const path = require('path')

// pgパッケージがインストールされているか確認
let pg
try {
  pg = require('pg')
} catch (error) {
  console.error('❌ エラー: pgパッケージが見つかりません')
  console.error('   以下のコマンドでインストールしてください:')
  console.error('   npm install pg')
  console.error('\n   または、手動実行方法を使用してください（後述）\n')
  process.exit(1)
}

const { Client } = pg

const dbUrl = process.env.SUPABASE_DB_URL

if (!dbUrl) {
  console.error('❌ エラー: SUPABASE_DB_URL 環境変数が設定されていません')
  console.error('   Supabaseダッシュボードの Settings > Database > Connection string から取得してください')
  console.error('   形式: postgresql://postgres:[password]@[host]:5432/postgres')
  console.error('   ⚠️  このURLは秘密情報です。絶対にコミットしないでください！')
  console.error('\n📋 または、以下のSQLをSupabaseダッシュボードのSQL Editorで手動実行してください:\n')
  
  // マイグレーションSQLを表示
  const migrationFile = path.join(__dirname, '..', 'add-checkout-completed-status-clean.sql')
  try {
    const sql = fs.readFileSync(migrationFile, 'utf-8')
    console.log('─'.repeat(60))
    console.log(sql)
    console.log('─'.repeat(60))
  } catch (error) {
    // ファイルが見つからない場合はスキップ
  }
  
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
  console.log('⏳ データベースに接続中...\n')

  const client = new Client({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false // SupabaseのSSL証明書用
    }
  })

  try {
    await client.connect()
    console.log('✅ データベースに接続しました')
    console.log('⏳ マイグレーションを実行中...\n')

    // SQLを実行
    const result = await client.query(sql)
    
    console.log('✅ マイグレーションが正常に実行されました')
    
    // メッセージを表示（RAISE NOTICEで出力されたもの）
    if (result && result.length > 0) {
      result.forEach((row) => {
        if (row) {
          console.log('📊', row)
        }
      })
    }

    // 確認クエリを実行
    console.log('\n🔍 制約を確認中...')
    const checkResult = await client.query(`
      SELECT 
          conname AS constraint_name,
          pg_get_constraintdef(oid) AS constraint_definition
      FROM pg_constraint
      WHERE conrelid = 'public.orders'::regclass
        AND contype = 'c';
    `)

    if (checkResult.rows && checkResult.rows.length > 0) {
      console.log('📋 現在の制約:')
      checkResult.rows.forEach((row) => {
        console.log(`   - ${row.constraint_name}: ${row.constraint_definition}`)
        if (row.constraint_definition && row.constraint_definition.includes('checkout_completed')) {
          console.log('   ✅ checkout_completedステータスが正常に追加されました！')
        }
      })
    }

    await client.end()
    console.log('\n✅ 完了しました！')
  } catch (error) {
    console.error('❌ エラー:', error.message)
    if (error.code) {
      console.error(`   エラーコード: ${error.code}`)
    }
    
    await client.end()
    
    console.error('\n📋 手動実行方法: 以下のSQLをSupabaseダッシュボードのSQL Editorで実行してください:\n')
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

