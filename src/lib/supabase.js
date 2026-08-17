import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://elqtftsjyisdjbrlgdbc.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscXRmdHNqeWlzZGpicmxnZGJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMDgzMzEsImV4cCI6MjEwMTg4NDMzMX0.v9EiKqASKf-Yl6K7M3gkksQmhPT0UHADZNjhmVWQk-k';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
