import { createClient } from "@supabase/supabase-js";

export type TransactionKind = "income" | "expense";

export type TransactionRecord = {
  id: string;
  user_id: string;
  type: TransactionKind;
  title: string;
  category: string;
  amount: number;
  occurred_on: string;
  note: string | null;
  created_at: string;
};

type Database = {
  public: {
    Tables: {
      transactions: {
        Row: TransactionRecord;
        Insert: Omit<TransactionRecord, "id" | "created_at">;
        Update: Partial<Omit<TransactionRecord, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = hasSupabaseConfig
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;