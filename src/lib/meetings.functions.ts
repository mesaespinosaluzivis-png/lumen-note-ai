import { createServerFn } from '@tanstack/start';
import { createServerClient } from '@/integrations/supabase/client.server';

export const getDashboardMeetings = createServerFn({ method: 'GET' })
  .handler(async () => {
    const supabase = createServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('No autorizado');
    }

    const userId = user.id;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan, minutes_used, minutes_limit')
      .eq('id', userId)
      .single();

    if (profileError) {
      throw new Error(`Error obteniendo perfil: ${profileError.message}`);
    }

    const { data: meetings, error: meetingsError } = await supabase
      .from('meetings')
      .select(
        'id, title, created_at, duration_seconds, status, audio_file_path'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (meetingsError) {
      throw new Error(
        `Error obteniendo reuniones: ${meetingsError.message}`
      );
    }

    const meetingIds = (meetings ?? []).map((meeting) => meeting.id);

    let summaries: Array<{
      meeting_id: string;
      summary: string;
    }> = [];

    if (meetingIds.length > 0) {
      const { data, error: summariesError } = await supabase
        .from('ai_summaries')
        .select('meeting_id, summary')
        .in('meeting_id', meetingIds);

      if (summariesError) {
        throw new Error(
          `Error obteniendo resúmenes: ${summariesError.message}`
        );
      }

      summaries = data ?? [];
    }

    const summaryMap = new Map(
      summaries.map((summary) => [summary.meeting_id, summary.summary])
    );

    return {
      meetings: (meetings ?? []).map((meeting) => ({
        id: meeting.id,
        title: meeting.title,
        created_at: meeting.created_at,
        duration_seconds: meeting.duration_seconds,
        status: meeting.status as
          | 'pending'
          | 'processing'
          | 'completed'
          | 'failed',
        summary_preview: summaryMap.get(meeting.id)?.slice(0, 160),
      })),
      totalMinutesUsed: profile.minutes_used ?? 0,
      minutesLimit: profile.minutes_limit ?? 20,
      plan: profile.plan ?? 'free',
    };
  });

export const getMeetingDetails = createServerFn({ method: 'GET' })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = createServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('No autorizado');
    }

    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select(
        'id, title, created_at, duration_seconds, status, language, audio_file_path'
      )
      .eq('id', data.id)
      .eq('user_id', user.id)
      .single();

    if (meetingError || !meeting) {
      throw new Error(
        meetingError?.message || 'Reunión no encontrada'
      );
    }

    const [
      transcriptionResult,
      summaryResult,
      tasksResult,
      decisionsResult,
    ] = await Promise.all([
      supabase
        .from('transcriptions')
        .select('id, content')
        .eq('meeting_id', data.id)
        .maybeSingle(),

      supabase
        .from('ai_summaries')
        .select('id, summary, key_points, action_items')
        .eq('meeting_id', data.id)
        .maybeSingle(),

      supabase
        .from('tasks')
        .select(
          'id, description, completed, due_date, assignee'
        )
        .eq('meeting_id', data.id)
        .eq('user_id', user.id),

      supabase
        .from('decisions')
        .select('id, description')
        .eq('meeting_id', data.id),
    ]);

    if (transcriptionResult.error) {
      throw new Error(
        `Error obteniendo transcripción: ${transcriptionResult.error.message}`
      );
    }

    if (summaryResult.error) {
      throw new Error(
        `Error obteniendo resumen: ${summaryResult.error.message}`
      );
    }

    if (tasksResult.error) {
      throw new Error(
        `Error obteniendo tareas: ${tasksResult.error.message}`
      );
    }

    if (decisionsResult.error) {
      throw new Error(
        `Error obteniendo decisiones: ${decisionsResult.error.message}`
      );
    }

    return {
      meeting: {
        id: meeting.id,
        title: meeting.title,
        created_at: meeting.created_at,
        duration_seconds: meeting.duration_seconds,
        status: meeting.status,
        language: meeting.language,
        audio_file_path: meeting.audio_file_path,
      },
      transcription: transcriptionResult.data ?? null,
      summary: summaryResult.data
        ? {
            id: summaryResult.data.id,
            summary: summaryResult.data.summary,
            key_points: Array.isArray(summaryResult.data.key_points)
              ? summaryResult.data.key_points
              : [],
            action_items: Array.isArray(summaryResult.data.action_items)
              ? summaryResult.data.action_items
              : [],
          }
        : null,
      tasks: tasksResult.data ?? [],
      decisions: decisionsResult.data ?? [],
    };
  });

export const uploadAudioAndProcess = createServerFn({ method: 'POST' })
  .validator((data: FormData) => data)
  .handler(async ({ data }) => {
    const supabase = createServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('No autorizado');
    }

    const file = data.get('audio');

    if (!(file instanceof File)) {
      throw new Error('No se recibió ningún archivo de audio');
    }

    const title =
      (data.get('title') as string | null)?.trim() ||
      'Nueva Reunión';

    const language =
      (data.get('language') as string | null)?.trim() || 'es';

    const originalName = file.name || '';
    const extensionMatch = originalName.match(/\.([a-zA-Z0-9]+)$/);

    const extension = extensionMatch
      ? extensionMatch[1].toLowerCase()
      : 'm4a';

    const meetingId = crypto.randomUUID();

    const filePath = `${user.id}/${meetingId}.${extension}`;

    const contentType =
      file.type ||
      (extension === 'm4a'
        ? 'audio/mp4'
        : 'application/octet-stream');

    const { data: meeting, error: insertError } = await supabase
      .from('meetings')
      .insert({
        id: meetingId,
        user_id: user.id,
        title,
        language,
        status: 'processing',
        audio_file_path: filePath,
      })
      .select('id')
      .single();

    if (insertError || !meeting) {
      throw new Error(
        `Error creando reunión: ${insertError?.message || 'desconocido'}`
      );
    }

    const { error: uploadError } = await supabase.storage
      .from('audio-files')
      .upload(filePath, file, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId)
        .eq('user_id', user.id);

      throw new Error(
        `Error subiendo audio a Storage: ${uploadError.message}`
      );
    }

    const { error: processError } = await supabase.functions.invoke(
      'process-audio',
      {
        body: {
          meeting_id: meetingId,
          filePath,
        },
      }
    );

    if (processError) {
      await supabase
        .from('meetings')
        .update({
          status: 'failed',
        })
        .eq('id', meetingId)
        .eq('user_id', user.id);

      throw new Error(
        `Error iniciando procesamiento de audio: ${processError.message}`
      );
    }

    return {
      meetingId: meeting.id,
    };
  });

export const toggleTaskAction = createServerFn({ method: 'POST' })
  .validator(
    (d: { taskId: string; completed: boolean }) => d
  )
  .handler(async ({ data }) => {
    const supabase = createServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('No autorizado');
    }

    const { error } = await supabase
      .from('tasks')
      .update({
        completed: data.completed,
      })
      .eq('id', data.taskId)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(
        `Error actualizando tarea: ${error.message}`
      );
    }

    return {
      success: true,
    };
  });

export const deleteMeetingAction = createServerFn({ method: 'POST' })
  .validator((d: { meetingId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = createServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('No autorizado');
    }

    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', data.meetingId)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(
        `Error eliminando reunión: ${error.message}`
      );
    }

    return {
      success: true,
    };
  });
