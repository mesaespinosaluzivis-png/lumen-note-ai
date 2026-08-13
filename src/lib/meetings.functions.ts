import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMeetings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    const { data, error } = await supabase
      .from("meetings")
      .select(
        "id,title,status,duration_sec,language,source,created_at,summary,participants_count",
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(error.message);
    }

    return {
      meetings: data ?? [],
    };
  });

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    await supabase.rpc("ensure_month_reset", {
      _user_id: userId,
    });

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return {
      profile: data,
    };
  });

export const getAccountAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;

    const [subscriptionResult, rolesResult] = await Promise.all([
      supabase
        .from("subscriptions")
        .select(
          "plan_type,status,provider,current_period_start,current_period_end",
        )
        .eq("user_id", userId)
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId),
    ]);

    if (subscriptionResult.error) {
      throw new Error(subscriptionResult.error.message);
    }

    if (rolesResult.error) {
      throw new Error(rolesResult.error.message);
    }

    return {
      email: (claims as { email?: string } | undefined)?.email ?? null,
      userId,
      subscription: subscriptionResult.data ?? null,
      roles: (rolesResult.data ?? []).map(
        (item: { role: string }) => item.role,
      ),
    };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        display_name: z.string().min(1).max(120).optional(),
        language: z.enum(["en", "es", "fr", "it"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { error } = await supabase
      .from("profiles")
      .update(data)
      .eq("user_id", userId);

    if (error) {
      throw new Error(error.message);
    }

    return {
      ok: true,
    };
  });

export const createMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        title: z.string().min(1).max(200).default("Nueva reunión"),
        source: z.enum(["record", "upload"]),
        file_ext: z.string().min(1).max(10),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const meetingId = crypto.randomUUID();

    const safeExt =
      data.file_ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "webm";

    const path = `${userId}/${meetingId}.${safeExt}`;

    const { error: insertError } = await supabase.from("meetings").insert({
      id: meetingId,
      user_id: userId,
      title: data.title,
      source: data.source,
      audio_path: path,
      status: "uploading",
    });

    if (insertError) {
      throw new Error(insertError.message);
    }

    const { data: signed, error: signError } = await supabase.storage
      .from("meeting-audio")
      .createSignedUploadUrl(path);

    if (signError) {
      throw new Error(signError.message);
    }

    return {
      meetingId,
      path,
      uploadUrl: signed.signedUrl,
      token: signed.token,
    };
  });

export const getMeeting = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;

    const { data: meeting, error } = await supabase
      .from("meetings")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!meeting) {
      throw new Error("Reunión no encontrada");
    }

    const { data: tasks, error: tasksError } = await supabase
      .from("meeting_tasks")
      .select("*")
      .eq("meeting_id", data.id)
      .order("position");

    if (tasksError) {
      throw new Error(tasksError.message);
    }

    return {
      meeting,
      tasks: tasks ?? [],
    };
  });

export const deleteMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;

    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select("audio_path")
      .eq("id", data.id)
      .maybeSingle();

    if (meetingError) {
      throw new Error(meetingError.message);
    }

    if (meeting?.audio_path) {
      const { error: storageError } = await supabase.storage
        .from("meeting-audio")
        .remove([meeting.audio_path]);

      if (storageError) {
        throw new Error(storageError.message);
      }
    }

    const { error } = await supabase
      .from("meetings")
      .delete()
      .eq("id", data.id);

    if (error) {
      throw new Error(error.message);
    }

    return {
      ok: true,
    };
  });

export const toggleTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        done: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;

    const { error } = await supabase
      .from("meeting_tasks")
      .update({
        done: data.done,
      })
      .eq("id", data.id);

    if (error) {
      throw new Error(error.message);
    }

    return {
      ok: true,
    };
  });

