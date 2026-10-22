//rc/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://netgmadtongdspojqaue.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ldGdtYWR0b25nZHNwb2pxYXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxMTg3NDIsImV4cCI6MjA2MzY5NDc0Mn0.h6lHxp0xUjiB2mE6OT-ePqNanmSFKs7zhvvHRtwKXKI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
