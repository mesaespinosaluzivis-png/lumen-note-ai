import { createServerFn } from '@tanstack/start';
import { createServerClient } from '@/integrations/supabase/client.server';

type MeetingStatus = 'pending' | 'processing' | 'completed' | 'failed';

function getFileExtension(fileName: string): string {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || 'm4a';
}

function getContentType(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') {
    return file.type;
  }

  const extension = getFileExtension(file.name);

  const mimeTypes: Record<string, string> = {
    m4a: 'audio/mp4',
    mp4: 'audio/mp4',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    webm: 'audio/webm',
    ogg: 'audio/ogg',
    opus: 'audio/ogg',
  };

  return mimeTypes[extension] || 'audio/mp4';
}

export const getDashboardMeetings = createServerFn({ method: 'GET' })
  .handler(async () => {
    const supabase = createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('No autorizado');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan, minutes_used, minutes_limit')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw new Error(`Error obteniendo perfil: ${profileError.message}`);
    }

    const { data: meetings, error: meetingsError } = await supabase
      .from('meetings')
      .select(
        'id, title, created_at, duration_seconds, status, ai_summaries(summary)'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (meetingsError) {
      throw new Error(`Error obteniendo reuniones: ${meetingsError.message}`);
    }

    const formattedMeetings = (meetings || []).map((meeting: any) => {
      const summaries = meeting.ai_summaries;
      const summary = Array.isArray(summaries)
        ? summaries[0]
        : summaries;

      return {
        id: meeting.id,
        title: meeting.title,
        created_at: meeting.created_at,
        duration_seconds: meeting.duration_seconds,
        status: meeting.status as MeetingStatus,
        summary_preview: summary?.summary
          ? String(summary.summary).slice(0, 180)
          : undefined,
      };
    });

    return {
      meetings: formattedMeetings,
      totalMinutesUsed: Number(profile.minutes_used ?? 0),
      minutesLimit: Number(profile.minutes_limit ?? 20),
      plan: String(profile.plan ?? 'free'),
    };
  });

export const getMeetingDetails = createServerFn({ method: 'GET' })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
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
        .select('id, description, completed, due_date, assignee')
        .eq('meeting_id', data.id)
        .eq('user_id', user.id)
        .order('id', { ascending: true }),

      supabase
        .from('decisions')
        .select('id, description')
        .eq('meeting_id', data.id)
        .order('id', { ascending: true }),
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

      transcription: transcriptionResult.data
        ? {
            id: transcriptionResult.data.id,
            content: transcriptionResult.data.content,
          }
        : null,

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

      tasks: tasksResult.data || [],

      decisions: decisionsResult.data || [],
    };
  });

export const uploadAudioAndProcess = createServerFn({ method: 'POST' })
  .validator((data: FormData) => data)
  .handler(async ({ data }) => {
    const supabase = createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('No autorizado');
    }

    const file = data.get('audio');

    if (!(file instanceof File)) {
      throw new Error('No se recibió ningún archivo de audio');
    }

    if (file.size <= 0) {
      throw new Error('El archivo de audio está vacío');
    }

    const titleValue = data.get('title');
    const languageValue = data.get('language');

    const title =
      typeof titleValue === 'string' && titleValue.trim()
        ? titleValue.trim()
        : 'Nueva Reunión';

    const language =
      typeof languageValue === 'string' && languageValue.trim()
        ? languageValue.trim()
        : 'es';

    const meetingId = crypto.randomUUID();

    /*
     * IMPORTANTE:
     * Nunca utilizamos directamente el nombre original del archivo.
     *
     * Ejemplo:
     * Voz 011.m4a
     *
     * se convierte internamente en:
     *
     * userId/meetingId.m4a
     *
     * Esto evita problemas con espacios, corchetes, tildes
     * y caracteres especiales.
     */
    const extension = getFileExtension(file.name);

    const filePath = `${user.id}/${meetingId}.${extension}`;

    const contentType = getContentType(file);

    /*
     * 1. Crear la reunión.
     */
    const { error: insertError } = await supabase
      .from('meetings')
      .insert({
        id: meetingId,
        user_id: user.id,
        title,
        language,
        status: 'processing',
        audio_file_path: filePath,
      });

    if (insertError) {
      throw new Error(
        `Error creando la reunión: ${insertError.message}`
      );
    }

    /*
     * 2. Subir el archivo BINARIO real a Storage.
     */
    const { error: uploadError } = await supabase.storage
      .from('audio-files')
      .upload(filePath, file, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      await supabase
        .from('meetings')
        .update({
          status: 'failed',
        })
        .eq('id', meetingId)
        .eq('user_id', user.id);

      throw new Error(
        `Error subiendo el audio a Storage: ${uploadError.message}`
      );
    }

    /*
     * 3. Invocar la Edge Function EXISTENTE.
     *
     * NO se crea otra Edge Function.
     * NO se cambia process-audio.
     */
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
      /*
       * Si process-audio falla, eliminamos el archivo
       * para evitar basura en Storage y marcamos la reunión
       * como fallida.
       */
      await supabase.storage
        .from('audio-files')
        .remove([filePath]);

      await supabase
        .from('meetings')
        .update({
          status: 'failed',
        })
        .eq('id', meetingId)
        .eq('user_id', user.id);

      throw new Error(
        `Error iniciando el procesamiento del audio: ${processError.message}`
      );
    }

    return {
      meetingId,
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
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
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
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('No autorizado');
    }

    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('id, audio_file_path')
      .eq('id', data.meetingId)
      .eq('user_id', user.id)
      .single();

    if (meetingError || !meeting) {
      throw new Error(
        meetingError?.message || 'Reunión no encontrada'
      );
    }

    const { error: deleteError } = await supabase
      .from('meetings')
      .delete()
      .eq('id', data.meetingId)
      .eq('user_id', user.id);

    if (deleteError) {
      throw new Error(
        `Error eliminando reunión: ${deleteError.message}`
      );
    }

    /*
     * La base de datos elimina las tablas relacionadas
     * mediante ON DELETE CASCADE.
     *
     * El archivo de Storage se elimina por separado.
     */
    if (meeting.audio_file_path) {
      await supabase.storage
        .from('audio-files')
        .remove([meeting.audio_file_path]);
    }

    return {
      success: true,
    };
  });
