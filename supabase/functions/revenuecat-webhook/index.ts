import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RevenueCatEvent {
  event: {
    type: string;
    app_user_id: string;
    product_id: string;
    period_type: string;
    purchased_at_ms: number;
    expiration_at_ms: number;
    store: string;
    environment: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: RevenueCatEvent = await req.json();
    const { event } = payload;

    console.log('RevenueCat webhook received:', event.type);

    const userId = event.app_user_id;

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .single();

    const companyId = profile?.company_id || userId;

    let subscriptionData: any = {};

    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE':
        const duration = getPeriodDuration(event.product_id);
        const currentPeriodStart = new Date(event.purchased_at_ms);
        const currentPeriodEnd = new Date(event.expiration_at_ms);

        subscriptionData = {
          status: 'active',
          current_period_start: currentPeriodStart.toISOString(),
          current_period_end: currentPeriodEnd.toISOString(),
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        };

        await supabase
          .from('subscriptions')
          .update(subscriptionData)
          .eq('company_id', companyId);

        await supabase
          .from('payment_history')
          .insert({
            subscription_id: (await supabase
              .from('subscriptions')
              .select('id')
              .eq('company_id', companyId)
              .single()).data?.id,
            amount: 0,
            currency: 'USD',
            status: 'completed',
            payment_method: event.store === 'play_store' ? 'google_play' : 'apple_pay',
            transaction_id: event.purchased_at_ms.toString(),
          });

        console.log('Subscription activated for company:', companyId);
        break;

      case 'CANCELLATION':
        await supabase
          .from('subscriptions')
          .update({
            cancel_at_period_end: true,
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', companyId);

        console.log('Subscription cancellation scheduled for company:', companyId);
        break;

      case 'EXPIRATION':
        await supabase
          .from('subscriptions')
          .update({
            status: 'expired',
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', companyId);

        console.log('Subscription expired for company:', companyId);
        break;

      case 'BILLING_ISSUE':
        console.log('Billing issue detected for company:', companyId);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
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

function getPeriodDuration(productId: string): number {
  const id = productId.toLowerCase();
  if (id.includes('monthly') || id.includes('1_month')) {
    return 30;
  } else if (id.includes('6_month') || id.includes('6')) {
    return 180;
  } else if (id.includes('annual') || id.includes('yearly')) {
    return 365;
  }
  return 30;
}
