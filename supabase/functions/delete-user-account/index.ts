import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid or expired token');
    }

    const userId = user.id;
    console.log(`[DELETE] Starting deletion for user: ${userId}`);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) {
      throw new Error('Profile not found');
    }

    if (profile.role === 'company' && profile.company_id) {
      console.log(`[DELETE] Deleting company and all related data: ${profile.company_id}`);

      await supabase.from('visit_photos').delete().eq('company_id', profile.company_id);
      console.log('[DELETE] Deleted visit_photos');
      
      await supabase.from('visits').delete().eq('company_id', profile.company_id);
      console.log('[DELETE] Deleted visits');
      
      await supabase.from('service_requests').delete().eq('company_id', profile.company_id);
      console.log('[DELETE] Deleted service_requests');
      
      await supabase.from('warehouse_items').delete().eq('company_id', profile.company_id);
      console.log('[DELETE] Deleted warehouse_items');
      
      await supabase.from('warehouses').delete().eq('company_id', profile.company_id);
      console.log('[DELETE] Deleted warehouses');
      
      await supabase.from('service_definitions').delete().eq('company_id', profile.company_id);
      console.log('[DELETE] Deleted service_definitions');
      
      await supabase.from('paid_products').delete().eq('company_id', profile.company_id);
      console.log('[DELETE] Deleted paid_products');
      
      await supabase.from('pricing_plans').delete().eq('company_id', profile.company_id);
      console.log('[DELETE] Deleted pricing_plans');
      
      await supabase.from('visit_types').delete().eq('company_id', profile.company_id);
      console.log('[DELETE] Deleted visit_types');
      
      await supabase.from('target_pests').delete().eq('company_id', profile.company_id);
      console.log('[DELETE] Deleted target_pests');

      const { data: customers } = await supabase
        .from('customers')
        .select('id, profile_id')
        .eq('created_by_company_id', profile.company_id);

      if (customers && customers.length > 0) {
        console.log(`[DELETE] Found ${customers.length} customers to delete`);
        const customerIds = customers.map(c => c.id);
        const customerProfileIds = customers.map(c => c.profile_id).filter(Boolean);

        await supabase.from('customer_branches').delete().in('customer_id', customerIds);
        console.log('[DELETE] Deleted customer_branches');

        for (const customerId of customerIds) {
          await supabase.from('customers').delete().eq('id', customerId);
        }
        console.log('[DELETE] Deleted customers');

        for (const custProfileId of customerProfileIds) {
          await supabase.from('user_consents').delete().eq('user_id', custProfileId);
          await supabase.from('profiles').delete().eq('id', custProfileId);
          const { error: delCustAuthError } = await supabase.auth.admin.deleteUser(custProfileId);
          if (delCustAuthError) {
            console.error(`[DELETE] Error deleting customer auth user ${custProfileId}:`, delCustAuthError);
          }
        }
        console.log('[DELETE] Deleted customer auth users');
      }

      const { data: operators } = await supabase
        .from('operators')
        .select('profile_id')
        .eq('company_id', profile.company_id);

      if (operators && operators.length > 0) {
        console.log(`[DELETE] Found ${operators.length} operators to delete`);
        const operatorIds = operators.map(op => op.profile_id);

        for (const operatorId of operatorIds) {
          await supabase.from('user_consents').delete().eq('user_id', operatorId);
          await supabase.from('profiles').delete().eq('id', operatorId);
          const { error: deleteOpAuthError } = await supabase.auth.admin.deleteUser(operatorId);
          if (deleteOpAuthError) {
            console.error(`[DELETE] Error deleting operator auth user ${operatorId}:`, deleteOpAuthError);
          }
        }
        console.log('[DELETE] Deleted operator auth users');
      }

      await supabase.from('operators').delete().eq('company_id', profile.company_id);
      console.log('[DELETE] Deleted operators');
      
      await supabase.from('companies').delete().eq('id', profile.company_id);
      console.log('[DELETE] Deleted company');
    } else if (profile.role === 'customer') {
      console.log(`[DELETE] Deleting customer data for user: ${userId}`);

      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', userId)
        .maybeSingle();

      if (customer) {
        await supabase.from('service_requests').delete().eq('customer_id', customer.id);
        await supabase.from('customer_branches').delete().eq('customer_id', customer.id);
        await supabase.from('customers').delete().eq('id', customer.id);
        console.log('[DELETE] Deleted customer data');
      }
    } else if (profile.role === 'operator') {
      console.log(`[DELETE] Deleting operator data for user: ${userId}`);

      await supabase.from('service_requests').delete().eq('operator_id', userId);
      await supabase.from('visits').delete().eq('operator_id', userId);
      await supabase.from('operators').delete().eq('profile_id', userId);
      console.log('[DELETE] Deleted operator data');
    }

    await supabase.from('user_consents').delete().eq('user_id', userId);
    console.log('[DELETE] Deleted user consents');
    
    await supabase.from('profiles').delete().eq('id', userId);
    console.log('[DELETE] Deleted profile');

    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.error('[DELETE] Error deleting auth user:', deleteAuthError);
      throw new Error(`Failed to delete authentication user: ${deleteAuthError.message}`);
    }
    console.log('[DELETE] Deleted auth user');

    console.log(`[DELETE] Account deletion completed for user: ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account and all associated data deleted successfully',
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('[DELETE] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to delete account',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
