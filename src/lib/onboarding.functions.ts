import { createServerFn } from '@tanstack/start';
import { createServerClient } from '@/integrations/supabase/client.server';

export const getProfile = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('No autorizado');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    throw new Error(`Error al obtener el perfil: ${error.message}`);
  }

  return profile;
});

export const updateProfile = createServerFn({ method: 'POST' })
  .validator((d: { fullName: string; language: string }) => d)
  .handler(async ({ data }) => {
    const supabase = createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('No autorizado');
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: data.fullName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (profileError) {
      throw new Error(
        `Error al actualizar el perfil: ${profileError.message}`,
      );
    }

    const currentMetadata =
      user.user_metadata && typeof user.user_metadata === 'object'
        ? user.user_metadata
        : {};

    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        ...currentMetadata,
        language: data.language,
      },
    });

    if (metadataError) {
      throw new Error(
        `Error al actualizar el idioma: ${metadataError.message}`,
      );
    }

    return { success: true };
  });

export const completeOnboarding = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      role: string;
      teamSize: string;
      useCase: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('No autorizado');
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        role: data.role,
        company_size: data.teamSize,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      throw new Error(
        `Error al completar el onboarding: ${error.message}`,
      );
    }

    return { success: true };
  });
