import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://xfousvlrhinlvrpryscy.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhmb3VzdmxyaGlubHZycHJ5c2N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTg0NDYsImV4cCI6MjA3ODE5NDQ0Nn0.ah4qi9NtkUAyxrcOMPQi9T6pmgEW6ZMHcjhA9tNI8s0');

supabase.rpc('get_triggers').then(console.log);
