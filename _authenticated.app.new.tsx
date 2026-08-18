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

    const isAudioMime =
      !!selectedFile.type && selectedFile.type.startsWith("audio/");

    const lowerName = (selectedFile.name || "").toLowerCase();

    const knownAudioExtensions = [
      ".mp3",
      ".wav",
      ".m4a",
      ".aac",
      ".ogg",
      ".flac",
      ".webm",
      ".mp4",
    ];

    const hasKnownAudioExtension = knownAudioExtensions.some((extension) =>
      lowerName.endsWith(extension),
    );

    if (!isAudioMime && !hasKnownAudioExtension) {
      setFile(null);
      setError(
        "Selecciona un archivo de audio válido. Formatos compatibles: MP3, WAV, M4A, AAC, OGG, FLAC o WEBM.",
      );
      return;
    }

    setFile(selectedFile);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);

    if (uploading) {
      return;
    }

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
      /*
       * ============================================================
       * 1. OBTENER UNA ÚNICA SESIÓN
       * ============================================================
       *
       * El mismo user.id y el mismo access_token se utilizan durante
       * todo el flujo:
       *
       * session.user.id
       *        ↓
       * filePath
       *
       * session.access_token
       *        ↓
       * Authorization
       *        ↓
       * process-audio
       */

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user || !session.access_token) {
        throw new Error(
          "Tu sesión ha expirado. Inicia sesión nuevamente.",
        );
      }

      const user = session.user;

      /*
       * ============================================================
       * 2. CREAR UN ÚNICO MEETING ID
       * ============================================================
       */

      meetingId = crypto.randomUUID();

      /*
       * ============================================================
       * 3. DETERMINAR LA EXTENSIÓN
       * ============================================================
       */

      const originalName = file.name || "audio";

      const extension = originalName.includes(".")
        ? originalName
            .slice(originalName.lastIndexOf("."))
            .toLowerCase()
            .replace(/[^a-z0-9.]/g, "")
        : "";

      /*
       * ============================================================
       * 4. CREAR UN ÚNICO FILE PATH
       * ============================================================
       *
       * Este MISMO filePath se utiliza en:
       *
       * Storage.upload()
       *        ↓
       * process-audio body
       *        ↓
       * process-audio Storage.download()
       */

      filePath = `${user.id}/${meetingId}${extension}`;

      console.log("=== LUMEN CREATE MEETING ===");
      console.log("userId:", user.id);
      console.log("meetingId:", meetingId);
      console.log("filePath:", filePath);
      console.log("fileName:", file.name);
      console.log("fileType:", file.type);
      console.log("fileSize:", file.size);
      console.log("sessionTokenPresent:", !!session.access_token);
      console.log("=== END LUMEN CREATE MEETING ===");

      /*
       * ============================================================
       * 5. SUBIR EL FILE ORIGINAL A STORAGE
       * ============================================================
       *
       * No recreamos el File.
       * Se sube directamente el archivo seleccionado por el usuario.
       */

      const { data: uploadData, error: uploadError } =
        await supabase.storage
          .from("audio-files")
          .upload(filePath, file, {
            contentType: file.type || "application/octet-stream",
            upsert: false,
          });

      const storageStatusCode = (
        uploadError as {
          statusCode?: string | number;
        } | null
      )?.statusCode;

      console.log("=== LUMEN STORAGE UPLOAD ===");
      console.log("filePath:", filePath);
      console.log("fileName:", file.name);
      console.log("fileType:", file.type);
      console.log("fileSize:", file.size);
      console.log("uploadData:", uploadData);
      console.log("uploadError:", uploadError);
      console.log("uploadError.message:", uploadError?.message);
      console.log("uploadError.statusCode:", storageStatusCode);
      console.log("uploadError.error:", uploadError?.error);
      console.log("=== END STORAGE UPLOAD ===");

      if (uploadError) {
        const storageDetails = [
          `Mensaje: ${uploadError.message || "sin mensaje"}`,
          `Código: ${storageStatusCode || "sin código"}`,
          `Error: ${uploadError.error || "sin detalle"}`,
          `Ruta: ${filePath}`,
        ].join(" | ");

        throw new Error(
          `No se pudo subir el audio. ${storageDetails}`,
        );
      }

      /*
       * ============================================================
       * 6. CREAR MEETING CON EL MISMO MEETING ID
       * ============================================================
       */

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
        /*
         * Si la creación de meetings falla, limpiamos el archivo
         * que acabamos de subir.
         */

        await supabase.storage
          .from("audio-files")
          .remove([filePath]);

        throw new Error(
          meetingError?.message ||
            "No se pudo crear la reunión.",
        );
      }

      /*
       * Comprobación adicional:
       * el ID generado, el ID almacenado y el ID que enviaremos
       * a process-audio deben ser exactamente el mismo.
       */

      if (meeting.id !== meetingId) {
        await supabase
          .from("meetings")
          .update({ status: "failed" })
          .eq("id", meetingId);

        await supabase.storage
          .from("audio-files")
          .remove([filePath]);

        throw new Error(
          "El identificador de la reunión no coincide con el creado inicialmente.",
        );
      }

      setMessage("Audio subido. Procesando reunión…");

      /*
       * ============================================================
       * 7. VALIDAR CONFIGURACIÓN DEL FRONTEND
       * ============================================================
       */

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey =
        import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        await supabase
          .from("meetings")
          .update({ status: "failed" })
          .eq("id", meetingId);

        throw new Error(
          "Faltan las variables de configuración de Supabase.",
        );
      }

      /*
       * ============================================================
       * 8. CONSTRUIR LA URL EXACTA DE PROCESS-AUDIO
       * ============================================================
       */

      const functionUrl =
        `${supabaseUrl}/functions/v1/process-audio`;

      /*
       * ============================================================
       * 9. LLAMAR A PROCESS-AUDIO
       * ============================================================
       *
       * Authorization:
       *     Bearer del MISMO session.access_token
       *
       * apikey:
       *     anon key del MISMO proyecto
       *
       * body:
       *     meeting_id = mismo meeting.id
       *     filePath   = mismo filePath utilizado en Storage
       */

      console.log("=== LUMEN PROCESS-AUDIO REQUEST ===");
      console.log("functionUrl:", functionUrl);
      console.log("meetingId:", meeting.id);
      console.log("filePath:", filePath);
      console.log(
        "authorizationTokenPresent:",
        !!session.access_token,
      );
      console.log("apikeyPresent:", !!supabaseAnonKey);
      console.log("=== END PROCESS-AUDIO REQUEST ===");

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

      /*
       * ============================================================
       * 10. LEER RESPUESTA DE PROCESS-AUDIO
       * ============================================================
       */

      const responseText = await response.text();

      let result: any = null;

      if (responseText) {
        try {
          result = JSON.parse(responseText);
        } catch {
          result = null;
        }
      }

      console.log("=== LUMEN PROCESS-AUDIO RESPONSE ===");
      console.log("httpStatus:", response.status);
      console.log("httpOk:", response.ok);
      console.log("responseText:", responseText);
      console.log("parsedResult:", result);
      console.log("=== END PROCESS-AUDIO RESPONSE ===");

      /*
       * ============================================================
       * 11. VALIDAR HTTP
       * ============================================================
       */

      if (!response.ok) {
        await supabase
          .from("meetings")
          .update({ status: "failed" })
          .eq("id", meeting.id);

        throw new Error(
          result?.error ||
            result?.message ||
            responseText ||
            `No se pudo procesar el audio. Código HTTP: ${response.status}`,
        );
      }

      /*
       * ============================================================
       * 12. VALIDAR SUCCESS
       * ============================================================
       */

      if (!result || result.success !== true) {
        await supabase
          .from("meetings")
          .update({ status: "failed" })
          .eq("id", meeting.id);

        throw new Error(
          result?.error ||
            result?.message ||
            "El procesamiento del audio no confirmó éxito.",
        );
      }

      /*
       * ============================================================
       * 13. VALIDAR QUE PROCESS-AUDIO RESPONDIÓ PARA ESTE MEETING
       * ============================================================
       */

      if (result.meeting_id !== meeting.id) {
        await supabase
          .from("meetings")
          .update({ status: "failed" })
          .eq("id", meeting.id);

        throw new Error(
          "La respuesta del procesamiento no corresponde a esta reunión.",
        );
      }

      /*
       * ============================================================
       * 14. PROCESAMIENTO COMPLETADO
       * ============================================================
       */

      console.log("=== LUMEN PROCESSING SUCCESS ===");
      console.log("meetingId:", meeting.id);
      console.log("filePath:", filePath);
      console.log("result:", result);
      console.log("=== END LUMEN PROCESSING SUCCESS ===");

      await navigate({
        to: "/app/m/$id",
        params: {
          id: meeting.id,
        },
      });
    } catch (err) {
      console.error("Create meeting error:", err);

      /*
       * Si ya existe un meetingId, intentamos dejar la reunión
       * correctamente marcada como failed.
       */

      if (meetingId) {
        await supabase
          .from("meetings")
          .update({ status: "failed" })
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
            accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.webm,.mp4"
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
