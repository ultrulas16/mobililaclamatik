import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { email, password, full_name, phone, company_id, company_name } = await req.json();

    if (!email || !password || !full_name || !company_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // First, check if company exists
    let { data: companyData, error: companyError } = await supabaseClient
      .from('companies')
      .select('id')
      .eq('owner_id', company_id)
      .maybeSingle();

    // If company doesn't exist, check if the user profile exists and create company
    if (companyError || !companyData) {
      // Check if the user profile exists and has company role
      const { data: profileData, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id, full_name, role, company_name')
        .eq('id', company_id)
        .eq('role', 'company')
        .maybeSingle();

      if (profileError || !profileData) {
        return new Response(
          JSON.stringify({ error: 'Company owner profile not found' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Create the missing company entry
      const { data: newCompanyData, error: createCompanyError } = await supabaseClient
        .from('companies')
        .insert({
          owner_id: company_id,
          name: profileData.company_name || company_name || profileData.full_name + ' Company',
        })
        .select('id')
        .single();

      if (createCompanyError) {
        return new Response(
          JSON.stringify({ error: 'Failed to create company: ' + createCompanyError.message }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      companyData = newCompanyData;
    }

    const companyTableId = companyData.id;

    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name,
        phone: phone || null,
        role: 'operator',
        company_id: companyTableId,
        company_name: company_name || 'Company',
      });

    if (profileError) {
      await supabaseClient.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: profileError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { error: operatorError } = await supabaseClient
      .from('operators')
      .insert({
        profile_id: authData.user.id,
        company_id: companyTableId,
        full_name,
        email,
        phone: phone || null,
      });

    if (operatorError) {
      await supabaseClient.auth.admin.deleteUser(authData.user.id);
      await supabaseClient.from('profiles').delete().eq('id', authData.user.id);
      return new Response(
        JSON.stringify({ error: operatorError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, user_id: authData.user.id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});