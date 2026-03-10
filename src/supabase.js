import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://adqmaaiihkhggycalzcv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkcW1hYWlpaGtoZ2d5Y2FsemN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwOTgzNjAsImV4cCI6MjA4ODY3NDM2MH0.O_bTaEI38C6Jh-4BsoFx7PM8WfT3Ps_41yPSXNALg7g'
)
