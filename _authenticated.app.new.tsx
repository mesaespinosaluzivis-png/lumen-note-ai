import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileAudio,
  Loader2,
  Mic,
  Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/new")({
  component: NewMeetingPage,
});

function NewMeetingPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function selectFile(selectedFile: File | null) {
    setError("");
    setMessage("");

    if (!selectedFile) {
      return;
    }

    if (!selectedFile.type.startsWith("audio/")) {
      setFile(null);
      setError("Selecciona un archivo de audio válido.");
      return;
    }

    setFile(selectedFile);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);

    selectFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function createMeeting() {
    setError("");
    setMessage("");

    if (!file) {
      setError("Selecciona un archivo de audio.");
      return;
    }

    setUploading(true);

    let meetingId: string | null = null;
    let filePath: string | null = null;

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error(
          "Tu sesión ha expirado. Inicia sesión nuevamente.",
        );
      }

      // Conservamos el nombre original solamente para referencia.
      // Storage utilizará un nombre interno seguro.
      const originalName = file.name || "audio";

      const extension = originalName.includes(".")
        ? originalName
            .substring(originalName.lastIndexOf("."))
            .toLowerCase()
            .replace(/[^a-z0-9.]/g, "")
        : "";

      meetingId = crypto.randomUUID();

      // Nombre interno seguro para Supabase Storage.
      // Ejemplo:
      // user-id/meeting-uuid.m4a
      filePath = `${user.id}/${meetingId}${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("audio-files")
        .upload(filePath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(
          `No se pudo subir el audio: ${uploadError.message}`,
        );
      }

      const { data: meeting, error: meetingError } = await supabase
        .from("meetings")
        .insert({
          id: meetingId,
          user_id: user.id,
          title: title.trim() || "Nueva reunión",
          status: "processing",
        })
        .select("id")
        .single();

      if (meetingError || !meeting) {
        await supabase.storage
          .from("audio-files")
          .remove([filePath]);

        throw new Error(
          meetingError?.message ||
            "No se pudo crear la reunión.",
        );
      }

      setMessage("Audio subido. Procesando reunión…");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        await supabase
          .from("meetings")
          .update({
            status: "failed",
          })
          .eq("id", meeting.id);

        throw new Error(
          "No se encontró el token de autenticación.",
        );
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey =
        import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        await supabase
          .from("meetings")
          .update({
            status: "failed",
          })
          .eq("id", meeting.id);

        throw new Error(
          "Faltan las variables de configuración de Supabase.",
        );
      }

      const functionUrl =
        `${supabaseUrl}/functions/v1/process-audio`;

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabaseAnonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meeting_id: meeting.id,
          filePath,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        await supabase
          .from("meetings")
          .update({
            status: "failed",
          })
          .eq("id", meeting.id);

        throw new Error(
          result?.error ||
            result?.message ||
            `No se pudo procesar el audio. Código HTTP: ${response.status}`,
        );
      }

      if (!result || result.success !== true) {
        await supabase
          .from("meetings")
          .update({
            status: "failed",
          })
          .eq("id", meeting.id);

        throw new Error(
          result?.error ||
            "El procesamiento del audio no confirmó éxito.",
        );
      }

      if (result.meeting_id !== meeting.id) {
        await supabase
          .from("meetings")
          .update({
            status: "failed",
          })
          .eq("id", meeting.id);

        throw new Error(
          "La respuesta del procesamiento no corresponde a esta reunión.",
        );
      }

      await navigate({
        to: "/app/m/$id",
        params: {
          id: meeting.id,
        },
      });
    } catch (err) {
      console.error("Create meeting error:", err);

      if (meetingId) {
        await supabase
          .from("meetings")
          .update({
            status: "failed",
          })
          .eq("id", meetingId);
      }

      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al crear la reunión.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6 md:py-10">
      <Link
        to="/app"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a reuniones
      </Link>

      <header className="mb-8">
        <p className="font-mono-tech text-[10px] uppercase tracking-widest text-muted-foreground">
          Nueva reunión
        </p>

        <h1 className="mt-2 font-display text-4xl tracking-tight">
          Sube tu audio
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Lumen procesará la grabación y generará tu información
          inteligente.
        </p>
      </header>

      <section className="space-y-6">
        <div>
          <label
            htmlFor="meeting-title"
            className="mb-2 block text-sm font-medium"
          >
            Título de la reunión
          </label>

          <input
            id="meeting-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ej. Reunión con cliente"
            disabled={uploading}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();

            if (!uploading) {
              setDragging(true);
            }
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`rounded-2xl border-2 border-dashed p-8 text-center transition ${
            dragging
              ? "border-primary bg-primary/5"
              : "border-border bg-card"
          }`}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            {file ? (
              <CheckCircle2 className="h-6 w-6 text-primary" />
            ) : (
              <FileAudio className="h-6 w-6 text-primary" />
            )}
          </div>

          {file ? (
            <>
              <h2 className="mt-5 break-all text-sm font-semibold">
                {file.name}
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>

              {!uploading && (
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setError("");
                    setMessage("");

                    if (inputRef.current) {
                      inputRef.current.value = "";
                    }
                  }}
                  className="mt-4 text-xs font-medium text-primary hover:underline"
                >
                  Cambiar archivo
                </button>
              )}
            </>
          ) : (
            <>
              <h2 className="mt-5 text-sm font-semibold">
                Arrastra tu audio aquí
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                o selecciona un archivo desde tu dispositivo
              </p>

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                Seleccionar audio
              </button>
            </>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            disabled={uploading}
            onChange={(event) => {
              selectFile(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Grabación</span>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Puedes utilizar una grabación de audio realizada
              previamente.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <FileAudio className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                Formatos de audio
              </span>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Selecciona un archivo de audio compatible con tu
              dispositivo.
            </p>
          </div>
        </div>

        {message && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            {message}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => void createMeeting()}
          disabled={!file || uploading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Procesando…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Subir y procesar audio
            </>
          )}
        </button>
      </section>
    </main>
  );
}
