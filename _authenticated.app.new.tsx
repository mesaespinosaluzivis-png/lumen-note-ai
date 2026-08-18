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

    /*
     * Algunos móviles/navegadores pueden entregar file.type vacío.
     * En ese caso utilizamos también la extensión.
     */
    const isAudioMime =
      !!selectedFile.type && selectedFile.type.startsWith("audio/");

    const lowerName = (selectedFile.name || "").toLowerCase();

    const knownAudioExtensions = [
      ".mp3",
      ".wav",
      ".m4a",
      ".aac",
      ".ogg",
      ".oga",
      ".opus",
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
        "Selecciona un archivo de audio válido. Formatos compatibles: MP3, WAV, M4A, AAC, OGG, OGA, OPUS, FLAC, WEBM o MP4.",
      );
      return;
    }

    /*
     * No imponemos aquí un límite artificial pequeño.
     *
     * El límite real de procesamiento se controla posteriormente
     * según el plan y la capacidad del backend.
     */
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
       * 1. OBTENER LA SESIÓN ACTUAL
       * ============================================================
       */

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session error:", sessionError);

        throw new Error(
          "No se pudo comprobar tu sesión. Intenta iniciar sesión nuevamente.",
        );
      }

      if (!session?.user?.id) {
        throw new Error(
          "No existe una sesión activa. Inicia sesión nuevamente.",
        );
      }

      if (!session.access_token) {
        throw new Error(
          "No existe un token de sesión válido. Inicia sesión nuevamente.",
        );
      }

      const user = session.user;

      console.log("=== LUMEN SESSION ===");
      console.log("userId:", user.id);
      console.log(
        "sessionTokenPresent:",
        !!session.access_token,
      );
      console.log("=== END LUMEN SESSION ===");

      /*
       * ============================================================
       * 2. CREAR UN ÚNICO MEETING ID
       * ============================================================
       */

      meetingId = crypto.randomUUID();

      /*
       * ============================================================
       * 3. OBTENER EXTENSIÓN ORIGINAL
       * ============================================================
       *
       * Solo conservamos una extensión segura.
       * El nombre original del archivo NO se utiliza como
       * nombre del objeto de Storage.
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
       * 4. CREAR FILE PATH SEGURO
       * ============================================================
       *
       * IMPORTANTE:
       *
       * La ruta de Storage queda siempre basada en:
       *
       * user.id + meetingId + extensión segura
       *
       * Ejemplo:
       *
       * audio-files/
       *   <userId>/
       *     <meetingId>.m4a
       *
       * Nunca utilizamos:
       *
       * Voz_012[4].m4a
       * Voz 009.m4a
       * nombres con espacios
       * corchetes
       * caracteres especiales
       */

      const safeExtension =
        extension && /^\.[a-z0-9]{1,10}$/.test(extension)
          ? extension
          : ".m4a";

      filePath = `${user.id}/${meetingId}${safeExtension}`;

      /*
       * ============================================================
       * 5. CREAR UN FILE CON NOMBRE SEGURO
       * ============================================================
       *
       * Esto es importante porque no solo cambiamos el path
       * de Storage.
       *
       * También evitamos que el nombre original con:
       *
       * [ ]
       * espacios
       * caracteres especiales
       *
       * llegue como filename del multipart.
       *
       * El contenido binario del audio se conserva.
       */

      const uploadFile = new File(
        [file],
        `${meetingId}${safeExtension}`,
        {
          type: file.type || "application/octet-stream",
          lastModified: file.lastModified,
        },
      );

      console.log("=== LUMEN CREATE MEETING ===");
      console.log("userId:", user.id);
      console.log("meetingId:", meetingId);
      console.log("originalFileName:", file.name);
      console.log("safeFileName:", uploadFile.name);
      console.log("filePath:", filePath);
      console.log("originalFileType:", file.type);
      console.log("uploadFileType:", uploadFile.type);
      console.log("fileSize:", file.size);
      console.log("uploadFileSize:", uploadFile.size);
      console.log("safeExtension:", safeExtension);
      console.log("=== END LUMEN CREATE MEETING ===");

      /*
       * ============================================================
       * 6. SUBIR AUDIO A STORAGE
       * ============================================================
       *
       * El File enviado a Storage tiene un nombre seguro.
       *
       * La ruta también es segura.
       *
       * El mismo filePath será utilizado posteriormente por
       * process-audio.
       */

      const { data: uploadData, error: uploadError } =
        await supabase.storage
          .from("audio-files")
          .upload(filePath, uploadFile, {
            contentType:
              uploadFile.type || "application/octet-stream",
            upsert: false,
          });

      const storageStatusCode = (
        uploadError as {
          statusCode?: string | number;
        } | null
      )?.statusCode;

      console.log("=== LUMEN STORAGE UPLOAD ===");
      console.log("filePath:", filePath);
      console.log("originalFileName:", file.name);
      console.log("safeFileName:", uploadFile.name);
      console.log("fileType:", uploadFile.type);
      console.log("fileSize:", uploadFile.size);
      console.log("uploadData:", uploadData);
      console.log("uploadError:", uploadError);
      console.log(
        "uploadError.message:",
        uploadError?.message,
      );
      console.log(
        "uploadError.statusCode:",
        storageStatusCode,
      );
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
       * 7. CREAR MEETING
       * ============================================================
       */

      const { data: meeting, error: meetingError } =
        await supabase
          .from("meetings")
          .insert({
            id: meetingId,
            user_id: user.id,
            title: title.trim() || "Nueva reunión",
            status: "processing",
          })
          .select("id")
          .single();

      console.log("=== LUMEN MEETING INSERT ===");
      console.log("meeting:", meeting);
      console.log("meetingError:", meetingError);
      console.log("meetingId:", meetingId);
      console.log("=== END LUMEN MEETING INSERT ===");

      if (meetingError || !meeting) {
        /*
         * Storage funcionó pero meetings falló.
         * Eliminamos el archivo huérfano.
         */

        try {
          await supabase.storage
            .from("audio-files")
            .remove([filePath]);
        } catch (cleanupError) {
          console.warn(
            "No se pudo limpiar el audio después del fallo de meetings:",
            cleanupError,
          );
        }

        throw new Error(
          meetingError?.message ||
            "No se pudo crear la reunión.",
        );
      }

      /*
       * ============================================================
       * 8. VERIFICAR IDENTIFICADORES
       * ============================================================
       */

      if (meeting.id !== meetingId) {
        await supabase
          .from("meetings")
          .update({
            status: "failed",
          })
          .eq("id", meetingId);

        try {
          await supabase.storage
            .from("audio-files")
            .remove([filePath]);
        } catch (cleanupError) {
          console.warn(
            "Error durante cleanup:",
            cleanupError,
          );
        }

        throw new Error(
          "El identificador de la reunión no coincide con el creado inicialmente.",
        );
      }

      setMessage("Audio subido. Procesando reunión…");

      /*
       * ============================================================
       * 9. VERIFICAR QUE EL AUDIO EXISTE EN STORAGE
       * ============================================================
       */

      const { data: storageObject, error: storageListError } =
        await supabase.storage
          .from("audio-files")
          .list(user.id, {
            search: `${meetingId}${safeExtension}`,
            limit: 10,
          });

      console.log("=== LUMEN STORAGE VERIFY ===");
      console.log("userId:", user.id);
      console.log(
        "expectedFile:",
        `${meetingId}${safeExtension}`,
      );
      console.log("storageObject:", storageObject);
      console.log(
        "storageListError:",
        storageListError,
      );
      console.log("=== END STORAGE VERIFY ===");

      if (storageListError) {
        await supabase
          .from("meetings")
          .update({
            status: "failed",
          })
          .eq("id", meetingId);

        throw new Error(
          `El audio se subió, pero no se pudo verificar en Storage: ${storageListError.message}`,
        );
      }

      const storageFileExists =
        storageObject?.some(
          (item) =>
            item.name === `${meetingId}${safeExtension}`,
        ) ?? false;

      if (!storageFileExists) {
        await supabase
          .from("meetings")
          .update({
            status: "failed",
          })
          .eq("id", meetingId);

        throw new Error(
          "El audio aparentemente se subió, pero no se encontró en Storage con la ruta esperada.",
        );
      }

      /*
       * ============================================================
       * 10. LLAMAR A PROCESS-AUDIO
       * ============================================================
       *
       * IMPORTANTE:
       *
       * filePath NO se modifica.
       *
       * process-audio recibe exactamente la misma ruta que
       * utilizamos para subir el archivo.
       */

      console.log("=== LUMEN PROCESS-AUDIO INVOKE ===");
      console.log("function:", "process-audio");
      console.log("meeting_id:", meeting.id);
      console.log("filePath:", filePath);
      console.log("sessionTokenPresent:", !!session.access_token);
      console.log("=== END PROCESS-AUDIO INVOKE ===");

      const {
        data: processData,
        error: processError,
      } = await supabase.functions.invoke(
        "process-audio",
        {
          body: {
            meeting_id: meeting.id,
            filePath,
          },
        },
      );

      console.log("=== LUMEN PROCESS-AUDIO RESPONSE ===");
      console.log("processData:", processData);
      console.log("processError:", processError);
      console.log("meetingId:", meeting.id);
      console.log("filePath:", filePath);
      console.log("=== END PROCESS-AUDIO RESPONSE ===");

      /*
       * ============================================================
       * 11. MANEJAR ERROR DE PROCESS-AUDIO
       * ============================================================
       */

      if (processError) {
        console.error(
          "process-audio invoke error:",
          processError,
        );

        await supabase
          .from("meetings")
          .update({
            status: "failed",
          })
          .eq("id", meeting.id);

        let detailedError =
          processError.message ||
          "No se pudo ejecutar process-audio.";

        try {
          const context = (
            processError as {
              context?: Response;
            }
          ).context;

          if (context) {
            const responseText = await context.text();

            console.error(
              "process-audio raw response:",
              responseText,
            );

            if (responseText) {
              try {
                const parsedError =
                  JSON.parse(responseText);

                detailedError =
                  parsedError?.error ||
                  parsedError?.message ||
                  responseText;
              } catch {
                detailedError = responseText;
              }
            }
          }
        } catch (responseReadError) {
          console.warn(
            "No se pudo leer el contexto de error de process-audio:",
            responseReadError,
          );
        }

        throw new Error(
          `Error de process-audio: ${detailedError}`,
        );
      }

      /*
       * ============================================================
       * 12. VALIDAR RESPUESTA
       * ============================================================
       */

      if (
        !processData ||
        typeof processData !== "object"
      ) {
        await supabase
          .from("meetings")
          .update({
            status: "failed",
          })
          .eq("id", meeting.id);

        throw new Error(
          "process-audio respondió sin datos válidos.",
        );
      }

      const processResult =
        processData as {
          success?: boolean;
          error?: string;
          message?: string;
          meeting_id?: string;
        };

      if (processResult.success !== true) {
        await supabase
          .from("meetings")
          .update({
            status: "failed",
          })
          .eq("id", meeting.id);

        throw new Error(
          processResult.error ||
            processResult.message ||
            "El procesamiento del audio no confirmó éxito.",
        );
      }

      /*
       * ============================================================
       * 13. VALIDAR MEETING ID DE LA RESPUESTA
       * ============================================================
       */

      if (
        processResult.meeting_id &&
        processResult.meeting_id !== meeting.id
      ) {
        await supabase
          .from("meetings")
          .update({
            status: "failed",
          })
          .eq("id", meeting.id);

        throw new Error(
          "process-audio respondió con un meeting_id diferente al de esta reunión.",
        );
      }

      /*
       * ============================================================
       * 14. ÉXITO
       * ============================================================
       */

      console.log("=== LUMEN PROCESSING SUCCESS ===");
      console.log("meetingId:", meeting.id);
      console.log("filePath:", filePath);
      console.log("processData:", processData);
      console.log("=== END LUMEN PROCESSING SUCCESS ===");

      setMessage("Reunión procesada correctamente.");

      await navigate({
        to: "/app/m/$id",
        params: {
          id: meeting.id,
        },
      });
    } catch (err) {
      console.error("=== LUMEN CREATE MEETING ERROR ===");
      console.error(err);
      console.error("meetingId:", meetingId);
      console.error("filePath:", filePath);
      console.error("=== END LUMEN CREATE MEETING ERROR ===");

      /*
       * Si ya existe meetingId, dejamos la reunión en failed.
       */

      if (meetingId) {
        try {
          await supabase
            .from("meetings")
            .update({
              status: "failed",
            })
            .eq("id", meetingId);
        } catch (statusError) {
          console.error(
            "No se pudo actualizar meeting a failed:",
            statusError,
          );
        }
      }

      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al crear la reunión.",
      );

      setMessage("");
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
            onChange={(event) =>
              setTitle(event.target.value)
            }
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
                onClick={() =>
                  inputRef.current?.click()
                }
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
            accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.oga,.opus,.flac,.webm,.mp4"
            className="hidden"
            disabled={uploading}
            onChange={(event) => {
              selectFile(
                event.target.files?.[0] ?? null,
              );

              event.target.value = "";
            }}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                Grabación
              </span>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Puedes utilizar una grabación de audio
              realizada previamente.
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
              Selecciona un archivo de audio compatible
              con tu dispositivo.
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
