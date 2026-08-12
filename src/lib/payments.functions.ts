import { createServerFn } from '@tanstack/start';
import { createServerClient } from '@/integrations/supabase/client.server';

async function getAuthenticatedClient() {
  const supabase = createServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('No autorizado');
  }

  return { supabase, user };
}

export const getSubscriptionDetails = createServerFn({
  method: 'GET',
}).handler(async () => {
  const { supabase, user } = await getAuthenticatedClient();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('plan, minutes_used, minutes_limit')
    .eq('id', user.id)
    .single();

  if (profileError) {
    throw new Error(
      `Error al obtener la suscripción: ${profileError.message}`
    );
  }

  const { data: subscriptionPlan, error: planError } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('name', profile.plan)
    .maybeSingle();

  if (planError) {
    throw new Error(
      `Error al obtener el plan: ${planError.message}`
    );
  }

  return {
    plan: profile.plan,
    status: 'active',
    minutesUsed: profile.minutes_used ?? 0,
    minutesLimit: profile.minutes_limit ?? 0,
    renewalDate: null,
    subscriptionPlan,
  };
});
