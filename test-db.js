import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
// Or use service role if we have it
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (adminKey) {
  const adminClient = createClient(process.env.VITE_SUPABASE_URL, adminKey);
  adminClient.rpc('get_triggers').then(console.log);
}
