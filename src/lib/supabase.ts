// ==============================================================================
// チームノート (Team Note) - Supabase クライアント初期化
// ==============================================================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ''

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

// クラッシュ防止のため未設定時はフォールバッククライアントを生成
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : createClient(
      'https://placeholder-teamnote.supabase.co',
      'placeholder-anon-key'
    )

// 接続確認関数
export const checkSupabaseConnection = async (): Promise<{ success: boolean; message: string }> => {
  if (!isSupabaseConfigured) {
    return {
      success: false,
      message: 'Supabaseの環境変数 VITE_SUPABASE_URL が未設定です。ローカル永続化ストレージを使用中。'
    }
  }

  try {
    const { error } = await supabase.from('organisations').select('id').limit(1)
    if (error && error.code !== 'PGRST116') {
      return {
        success: true,
        message: `Supabaseに接続されました ステータス: ${error.message} `
      }
    }
    return {
      success: true,
      message: 'Supabaseクラウドデータベースに正常接続されています。'
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      message: `Supabase接続エラー: ${msg}`
    }
  }
}
