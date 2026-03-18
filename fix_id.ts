import { createClient } from '@supabase/supabase-js';

async function fixId() {
    console.log("URL:", process.env.VITE_SUPABASE_URL);
}
fixId();
