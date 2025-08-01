const { createClient } = require('@supabase/supabase-js');

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('✅ Supabase client initialized');

module.exports = supabase; 