
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkDB() {
    const { data, error } = await supabase.from('restaurants').select('id, name, active, category');
    if (error) {
        console.error("Error fetching restaurants:", error);
    } else {
        console.log("Restaurants in DB:", JSON.stringify(data, null, 2));
    }
}

checkDB();
