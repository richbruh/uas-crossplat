import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://nlhwdqeyxphcacnhvqao.supabase.co",
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5saHdkcWV5eHBoY2Fjbmh2cWFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5MzYxNDIsImV4cCI6MjA2MTUxMjE0Mn0.VuWMXjEFudfG4otvKaG-dVT5mpMJUkzw72V09Og2LAc",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })