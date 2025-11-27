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

    const { user_id, email, full_name, company_name, phone, role } = await req.json();

    console.log('OAuth user handler called with:', { user_id, email, full_name, role });

    if (!user_id || !email || !full_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing profile:', checkError);
    }

    if (existingProfile) {
      console.log('Profile already exists for OAuth user:', user_id);
      return new Response(
        JSON.stringify({ success: true, profile: existingProfile }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Creating new OAuth profile...');

    // Create new profile
    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        id: user_id,
        email,
        full_name,
        phone: phone || null,
        role: role || 'company',
        company_name: company_name || `${full_name} Pest Control`,
        currency: 'TRY',
        accepted_privacy_policy: true,
        accepted_terms_of_service: true,
        privacy_policy_accepted_at: new Date().toISOString(),
        terms_of_service_accepted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating OAuth profile:', profileError);
      return new Response(
        JSON.stringify({ error: profileError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('OAuth profile created successfully:', profileData);

    // If role is company, create company record
    if ((role || 'company') === 'company') {
      const companyName = company_name || `${full_name} Pest Control`;
      
      console.log('Creating company for OAuth user:', companyName);
      
      const { data: companyData, error: companyError } = await supabaseClient
        .from('companies')
        .insert({
          name: companyName,
          owner_id: user_id,
          email: email,
          phone: phone || null,
          currency: 'TRY',
        })
        .select()
        .single();

      if (companyError) {
        console.error('Company creation error:', companyError);
        // If company creation fails, still return success but log the error
        console.log('Continuing without company creation...');
      } else {
        console.log('Company created successfully:', companyData);
        
        // Update profile with company_id
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update({ 
            company_id: companyData.id,
            company_name: companyName 
          })
          .eq('id', user_id);

        if (updateError) {
          console.error('Error updating profile with company_id:', updateError);
        } else {
          console.log('Profile updated with company_id successfully');
        }
      }
    }

    // If role is customer, create customer record
    if (role === 'customer') {
      const customerCompanyName = company_name || `${full_name} Company`;
      
      const { error: customerError } = await supabaseClient
        .from('customers')
        .insert({
          profile_id: user_id,
          company_name: customerCompanyName,
        });

      if (customerError) {
        console.error('Customer creation error:', customerError);
      } else {
        console.log('Customer record created successfully');
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        profile: profileData,
        message: 'OAuth user profile created successfully' 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('OAuth handler error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});