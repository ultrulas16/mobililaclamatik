import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get recent users from auth.users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      throw authError;
    }

    // Get all profiles
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, company_id')
      .order('created_at', { ascending: false })
      .limit(10);

    if (profileError) {
      throw profileError;
    }

    // Match users with profiles
    const usersWithStatus = authUsers.users.slice(0, 10).map(user => {
      const profile = profiles?.find(p => p.id === user.id);
      return {
        id: user.id,
        email: user.email,
        provider: user.app_metadata?.provider || 'email',
        created_at: user.created_at,
        has_profile: !!profile,
        profile: profile || null,
      };
    });

    // Check if trigger exists
    const { data: triggerCheck } = await supabaseAdmin.rpc('check_trigger_exists', {});

    return new Response(
      JSON.stringify({
        success: true,
        total_users: authUsers.users.length,
        users: usersWithStatus,
        oauth_users: usersWithStatus.filter(u => u.provider !== 'email'),
        users_without_profile: usersWithStatus.filter(u => !u.has_profile),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error checking OAuth status:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
