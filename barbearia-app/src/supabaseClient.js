import { createClient } from '@supabase/supabase-js'

// Adicionamos 'export' nestas duas linhas
export const supabaseUrl = 'https://hhqiojiedacblexhwwhy.supabase.co'
export const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhocWlvamllZGFjYmxleGh3d2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MjExNzEsImV4cCI6MjA4MDI5NzE3MX0.DQ2IBD80OKf__O1ZxPgURAqtkaz-SbYzNGyw7--LscA'

export const supabase = createClient(supabaseUrl, supabaseKey)