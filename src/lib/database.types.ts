// ==============================================================================
// チームノート (Team Note) - Database Schema Types
// Supabase / PostgreSQL Database Types
// ==============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organisations: {
        Row: {
          id: string
          name: string
          slug: string
          plan: string
          description: string | null
          logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          plan?: string
          description?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          plan?: string
          description?: string | null
          logo_url?: string | null
          updated_at?: string
        }
      }
      residents: {
        Row: {
          id: string
          organisation_id: string | null
          name: string
          avatar_url: string | null
          building: 'rosemary' | 'basil' | 'turmeric' | 'paprika'
          floor: number
          unit: string
          role: string
          role_type: 'fl' | 'hl' | 'member'
          email: string | null
          memo: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organisation_id?: string | null
          name: string
          avatar_url?: string | null
          building: 'rosemary' | 'basil' | 'turmeric' | 'paprika'
          floor: number
          unit: string
          role: string
          role_type?: 'fl' | 'hl' | 'member'
          email?: string | null
          memo?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          avatar_url?: string | null
          building?: 'rosemary' | 'basil' | 'turmeric' | 'paprika'
          floor?: number
          unit?: string
          role?: string
          role_type?: 'fl' | 'hl' | 'member'
          email?: string | null
          memo?: string | null
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          organisation_id: string | null
          title: string
          category: string
          status: string
          progress: number
          owner_name: string
          next_action: string
          proposals_count: number
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organisation_id?: string | null
          title: string
          category: string
          status?: string
          progress?: number
          owner_name: string
          next_action: string
          proposals_count?: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          category?: string
          status?: string
          progress?: number
          owner_name?: string
          next_action?: string
          proposals_count?: number
          description?: string | null
          updated_at?: string
        }
      }
      work_reports: {
        Row: {
          id: string
          organisation_id: string | null
          report_type: 'patrol' | 'cleaning' | 'facility' | 'noise'
          title: string
          location: string
          content: string
          status: string
          reporter_name: string
          submitted_at: string
        }
        Insert: {
          id?: string
          organisation_id?: string | null
          report_type: 'patrol' | 'cleaning' | 'facility' | 'noise'
          title: string
          location: string
          content: string
          status?: string
          reporter_name: string
          submitted_at?: string
        }
        Update: {
          id?: string
          title?: string
          location?: string
          content?: string
          status?: string
        }
      }
      team_assets: {
        Row: {
          id: string
          organisation_id: string | null
          visibility: 'PUBLIC' | 'ADMIN_ONLY'
          category: string
          title: string
          description: string | null
          fiscal_year: number | null
          file_size: string | null
          file_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organisation_id?: string | null
          visibility?: 'PUBLIC' | 'ADMIN_ONLY'
          category: string
          title: string
          description?: string | null
          fiscal_year?: number | null
          file_size?: string | null
          file_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
