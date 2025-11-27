// Debug script to check OAuth status
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugOAuth() {
  console.log('=== GOOGLE OAUTH DEBUG ===');
  console.log('Supabase URL:', supabaseUrl);
  
  try {
    // Check recent users
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching profiles:', error);
    } else {
      console.log('Recent profiles:', profiles);
    }

    // Check if we can access auth.users (this will fail with anon key, but let's try)
    console.log('Checking OAuth configuration...');
    
    // Test OAuth URL generation
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://multilingual-pest-co-akov.bolt.host/',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    
    if (oauthError) {
      console.error('OAuth configuration error:', oauthError);
    } else {
      console.log('OAuth URL generated successfully:', data?.url);
    }

  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugOAuth();