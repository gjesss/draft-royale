export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; username: string; display_name: string | null; created_at: string }
        Insert: { id: string; username: string; display_name?: string | null }
        Update: { username?: string; display_name?: string | null }
      }
      leagues: {
        Row: { id: string; name: string; sport: string; commissioner_id: string; created_at: string }
        Insert: { name: string; sport?: string; commissioner_id: string }
        Update: { name?: string; sport?: string }
      }
      league_members: {
        Row: { id: string; league_id: string; user_id: string; role: string; joined_at: string }
        Insert: { league_id: string; user_id: string; role?: string }
        Update: { role?: string }
      }
      league_invites: {
        Row: { id: string; league_id: string; email: string | null; token: string; invited_by: string | null; status: string; created_at: string; expires_at: string }
        Insert: { league_id: string; email?: string | null; invited_by?: string | null }
        Update: { status?: string }
      }
      seasons: {
        Row: { id: string; league_id: string; name: string; year: number | null; sport: string | null; status: string; created_at: string }
        Insert: { league_id: string; name: string; year?: number | null; sport?: string | null }
        Update: { name?: string; status?: string }
      }
      games: {
        Row: { id: string; league_id: string; season_id: string | null; commissioner_id: string; status: string; game_state: Json | null; created_at: string; completed_at: string | null }
        Insert: { league_id: string; season_id?: string | null; commissioner_id: string; status?: string; game_state?: Json | null }
        Update: { status?: string; game_state?: Json | null; completed_at?: string | null }
      }
      draft_results: {
        Row: { id: string; game_id: string; league_id: string; season_id: string | null; user_id: string | null; player_name: string; pick_position: number; locked: boolean; created_at: string }
        Insert: { game_id: string; league_id: string; season_id?: string | null; user_id?: string | null; player_name: string; pick_position: number; locked?: boolean }
        Update: never
      }
    }
    Functions: {
      get_invite_by_token: {
        Args: { p_token: string }
        Returns: { id: string; league_id: string; league_name: string; status: string; expires_at: string }[]
      }
    }
  }
}

// Convenience row types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type League = Database['public']['Tables']['leagues']['Row']
export type LeagueMember = Database['public']['Tables']['league_members']['Row']
export type LeagueInvite = Database['public']['Tables']['league_invites']['Row']
export type Season = Database['public']['Tables']['seasons']['Row']
export type Game = Database['public']['Tables']['games']['Row']
export type DraftResult = Database['public']['Tables']['draft_results']['Row']

// Joined types
export interface LeagueWithMembers extends League {
  members: (LeagueMember & { profile: Profile })[]
  seasons: Season[]
}

export interface GameWithSeason extends Game {
  season: Season | null
}
