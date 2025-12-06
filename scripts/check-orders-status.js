#!/usr/bin/env node
/**
 * 注文のステータスを確認するスクリプト
 * 
 * 使用方法:
 *   SUPABASE_DB_URL="postgresql://..." node scripts/check-orders-status.js
 * 
 * または環境変数で:
 *   export SUPABASE_DB_URL="postgresql://postgres:[password]@[host]:5432/postgres"
 *   node scripts/check-orders-status.js
 */

const { Client } = require('pg')

const dbUrl = process.env.SUPABASE_DB_URL

if (!dbUrl) {
  console.error('❌ エラー: SUPABASE_DB_URL 環境変数が設定されていません')
  process.exit(1)
}

async function checkOrdersStatus() {
  const client = new Client({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    await client.connect()
    console.log('✅ データベースに接続しました\n')

    // 全注文のステータスを取得
    const result = await client.query(`
      SELECT 
        id,
        table_number,
        status,
        total,
        created_at
      FROM public.orders
      ORDER BY created_at DESC
      LIMIT 20;
    `)

    console.log(`📊 最新20件の注文:\n`)
    if (result.rows.length === 0) {
      console.log('  注文がありません')
    } else {
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. id: ${row.id.substring(0, 8)}...`)
        console.log(`   table: ${row.table_number}, status: ${row.status}`)
        console.log(`   total: ${row.total}, created: ${row.created_at}`)
        console.log('')
      })
    }

    // ステータスごとの集計
    const statusCount = await client.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM public.orders
      GROUP BY status
      ORDER BY count DESC;
    `)

    console.log('📈 ステータス別の注文数:')
    statusCount.rows.forEach(row => {
      console.log(`   ${row.status}: ${row.count}件`)
    })
    console.log('')

    // checkout_completedステータスが制約に含まれているか確認
    const constraintCheck = await client.query(`
      SELECT 
        conname AS constraint_name,
        pg_get_constraintdef(oid) AS constraint_definition
      FROM pg_constraint
      WHERE conrelid = 'public.orders'::regclass
        AND contype = 'c'
        AND conname LIKE '%status%';
    `)

    console.log('🔍 statusカラムの制約:')
    if (constraintCheck.rows.length === 0) {
      console.log('  制約が見つかりませんでした')
    } else {
      constraintCheck.rows.forEach(row => {
        console.log(`   ${row.constraint_name}: ${row.constraint_definition}`)
        if (row.constraint_definition.includes('checkout_completed')) {
          console.log('  ✅ checkout_completedが制約に含まれています')
        } else {
          console.log('  ⚠️  checkout_completedが制約に含まれていません')
        }
      })
    }

    await client.end()
  } catch (error) {
    console.error('❌ エラー:', error.message)
    await client.end()
    process.exit(1)
  }
}

checkOrdersStatus()

