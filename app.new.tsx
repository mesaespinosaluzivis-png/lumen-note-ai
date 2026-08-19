import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  FileAudio,
  Mic,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/new")({
  component: NewMeetingPage,
});

function getFileExtension(fileName: string): string {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || "m4a";
}

function getContentType(file: File): string {
  if (file.type && file.type !== "application/octet-stream") {
    return file.type;
  }

  const extension = getFileExtension(file.name);

  const mimeTypes: Record<string, string> = {
    m4a: "audio/mp4",
    mp4: "audio/mp4",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    webm: "audio/webm",
    ogg: "audio/ogg",
    opus: "audio/ogg",
  };

  return mimeTypes[extension] || "audio/mp4";
}

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

    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("audio/")) {
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
      setError("Selecciona o graba un archivo de audio.");
      return;
    }

    setUploading(true);

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

      /*
       * IMPORTANTE:
       * El nombre original del archivo NO se utiliza en la ruta
       * de Storage.
       *
       * Ejemplo:
       * Voz 012[1].m4a
       *
       * se almacena internamente como:
       *
       * userId/meetingId.m4a
       *
       * Esto evita problemas con espacios, corchetes,
       * tildes y caracteres especiales.
       */
      const meetingId = crypto.randomUUID();
      const extension = getFileExtension(file.name);
      const filePath = `${user.id}/${meetingId}.${extension}`;

      const contentType = getContentType(file);

      /*
       * 1. Subir el archivo binario a Storage.
       */
      const { error: uploadError } = await supabase.storage
        .from("audio-files")
        .upload(filePath, file, {
          contentType,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      /*
       * 2. Crear la reunión utilizando el mismo meetingId
       * y exactamente el mismo filePath que usamos en Storage.
       */
      const { data: meeting, error: meetingError } = await supabase
        .from("meetings")
        .insert({
          id: meetingId,
          user_id: user.id,
          title: title.trim() || "Nueva reunión",
          status: "processing",
          audio_file_path: filePath,
        })
        .select("id")
        .single();

      if (meetingError || !meeting) {
        /*
         * Si la reunión no pudo crearse después de subir el audio,
         * intentamos limpiar el archivo para no dejar basura.
         */
        await supabase.storage
          .from("audio-files")
          .remove([filePath]);

        throw new Error(
          meetingError?.message || "No se pudo crear la reunión.",
        );
      }

      setMessage("Audio subido. Procesando reunión…");

      /*
       * 3. Obtener el JWT actual.
       */
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "No se encontró el token de autenticación.",
        );
      }

      /*
       * 4. Invocar la Edge Function EXISTENTE.
       *
       * No creamos otra función.
       */
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-audio`;

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meeting_id: meeting.id,
          filePath,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            "No se pudo procesar el audio.",
        );
      }

      /*
       * 5. Ir al detalle de la reunión.
       */
      await navigate({
        to: "/app/m/$id",
        params: { id: meeting.id },
      });
    } catch (err) {
      console.error(err);

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
          Lumen procesará la grabación y generará tu información inteligente.
        </p>
      </header>

      <section className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Título de la reunión
          </label>

          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ej. Reunión con cliente"
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
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
              <h2 className="mt-5 text-sm font-semibold">{file.name}</h2>

              <p className="mt-1 text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>

              <button
                type="button"
                onClick={() => setFile(null)}
                className="mt-4 text-xs font-medium text-primary hover:underline"
              >
                Cambiar archivo
              </button>
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
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-secondary"
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
            onChange={(event) =>
              selectFile(event.target.files?.[0] ?? null)
            }
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Grabación</span>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Puedes utilizar una grabación de audio realizada previamente.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <FileAudio className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Formatos de audio</span>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Selecciona un archivo de audio compatible con tu dispositivo.
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
