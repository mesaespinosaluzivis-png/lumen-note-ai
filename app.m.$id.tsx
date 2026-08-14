import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileAudio,
  ListTodo,
  Loader2,
  AlertCircle,
  FileText,
  Download,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/m/$id")({
  component: MeetingDetailPage,
});

type Meeting = {
  id: string;
  title: string | null;
  status: string | null;
  created_at: string | null;
};

type Transcription = {
  id: string;
  full_text: string;
  language: string;
  created_at: string | null;
};

type Summary = {
  id: string;
  summary_text: string;
  key_points: unknown;
  created_at: string | null;
};

type Task = {
  id: string;
  description: string;
  status: string;
  created_at: string | null;
};

type Decision = {
  id: string;
  description: string;
  created_at: string | null;
};

function MeetingDetailPage() {
  const { id } = Route.useParams();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [transcription, setTranscription] =
    useState<Transcription | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadMeeting() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error("No hay una sesión activa.");
        }

        const { data: meetingData, error: meetingError } = await supabase
          .from("meetings")
          .select("id,title,status,created_at")
          .eq("id", id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (meetingError) {
          throw meetingError;
        }

        if (!meetingData) {
          throw new Error("No se encontró esta reunión.");
        }

        const [
          transcriptionResult,
          summaryResult,
          tasksResult,
          decisionsResult,
        ] = await Promise.all([
          supabase
            .from("transcriptions")
            .select("id,full_text,language,created_at")
            .eq("meeting_id", id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),

          supabase
            .from("ai_summaries")
            .select("id,summary_text,key_points,created_at")
            .eq("meeting_id", id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),

          supabase
            .from("tasks")
            .select("id,description,status,created_at")
            .eq("meeting_id", id)
            .order("created_at", { ascending: true }),

          supabase
            .from("decisions")
            .select("id,description,created_at")
            .eq("meeting_id", id)
            .order("created_at", { ascending: true }),
        ]);

        if (transcriptionResult.error) {
          console.warn(
            "Transcription:",
            transcriptionResult.error.message,
          );
        }

        if (summaryResult.error) {
          console.warn("Summary:", summaryResult.error.message);
        }

        if (tasksResult.error) {
          console.warn("Tasks:", tasksResult.error.message);
        }

        if (decisionsResult.error) {
          console.warn("Decisions:", decisionsResult.error.message);
        }

        if (active) {
          setMeeting(meetingData);
          setTranscription(transcriptionResult.data ?? null);
          setSummary(summaryResult.data ?? null);
          setTasks(tasksResult.data ?? []);
          setDecisions(decisionsResult.data ?? []);
        }
      } catch (err) {
        console.error(err);

        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar la reunión.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadMeeting();

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando reunión…
        </div>
      </main>
    );
  }

  if (error || !meeting) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 text-center">
        <AlertCircle className="h-7 w-7 text-destructive" />

        <h1 className="mt-4 font-display text-2xl">
          No se pudo cargar la reunión
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          {error || "La reunión no existe o no tienes acceso a ella."}
        </p>

        <Link
          to="/app"
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a reuniones
        </Link>
      </main>
    );
  }

  const status = meeting.status ?? "unknown";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-10">
      <Link
        to="/app"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a reuniones
      </Link>

      <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <FileAudio className="h-5 w-5 text-primary" />
            </div>

            <div className="min-w-0">
              <h1 className="truncate font-display text-3xl tracking-tight md:text-4xl">
                {meeting.title || "Reunión sin título"}
              </h1>

              <p className="mt-1 text-xs text-muted-foreground">
                {meeting.created_at
                  ? new Date(meeting.created_at).toLocaleString("es", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "Sin fecha"}
              </p>
            </div>
          </div>
        </div>

        <StatusBadge status={status} />
      </header>

      {status === "processing" && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <Loader2 className="h-5 w-5 animate-spin text-amber-600" />

          <div>
            <p className="text-sm font-medium">Procesando audio</p>

            <p className="text-xs text-muted-foreground">
              Lumen está preparando la transcripción y el análisis de tu
              reunión.
            </p>
          </div>
        </div>
      )}

      {status === "failed" && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <AlertCircle className="h-5 w-5 text-destructive" />

          <div>
            <p className="text-sm font-medium">
              El procesamiento tuvo un error
            </p>

            <p className="text-xs text-muted-foreground">
              Puedes revisar el audio y volver a intentarlo.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Resumen ejecutivo"
          icon={<FileText className="h-4 w-4" />}
        >
          {summary?.summary_text ? (
            <div className="space-y-4">
              <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">
                {summary.summary_text}
              </p>

              {Array.isArray(summary.key_points) &&
                summary.key_points.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Puntos clave
                    </h3>

                    <ul className="space-y-2">
                      {summary.key_points.map((point, index) => (
                        <li
                          key={index}
                          className="rounded-lg border border-border bg-background p-3 text-sm"
                        >
                          {typeof point === "string"
                            ? point
                            : JSON.stringify(point)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          ) : (
            <EmptySection
              text={
                status === "processing"
                  ? "El resumen aparecerá cuando termine el procesamiento."
                  : "Todavía no hay un resumen disponible."
              }
            />
          )}
        </SectionCard>

        <SectionCard
          title="Tareas accionables"
          icon={<ListTodo className="h-4 w-4" />}
        >
          {tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-medium">
                      Tarea
                    </h3>

                    {task.status && (
                      <span className="rounded-full bg-secondary px-2 py-1 text-[10px] text-muted-foreground">
                        {task.status}
                      </span>
                    )}
                  </div>

                  {task.description && (
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {task.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptySection
              text={
                status === "processing"
                  ? "Las tareas aparecerán cuando termine el procesamiento."
                  : "No hay tareas registradas."
              }
            />
          )}
        </SectionCard>

        <SectionCard
          title="Decisiones"
          icon={<CheckCircle2 className="h-4 w-4" />}
        >
          {decisions.length > 0 ? (
            <div className="space-y-3">
              {decisions.map((decision) => (
                <div
                  key={decision.id}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <h3 className="text-sm font-medium">
                    Decisión
                  </h3>

                  {decision.description && (
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {decision.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptySection text="No hay decisiones registradas." />
          )}
        </SectionCard>

        <SectionCard
          title="Transcripción"
          icon={<FileAudio className="h-4 w-4" />}
        >
          {transcription?.full_text ? (
            <div className="max-h-[500px] overflow-y-auto rounded-xl bg-secondary/30 p-4">
              <div className="mb-3 text-xs text-muted-foreground">
                Idioma: {transcription.language || "No especificado"}
              </div>

              <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">
                {transcription.full_text}
              </p>
            </div>
          ) : (
            <EmptySection
              text={
                status === "processing"
                  ? "La transcripción aparecerá cuando termine el procesamiento."
                  : "No hay una transcripción disponible."
              }
            />
          )}
        </SectionCard>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={
            !transcription?.full_text && !summary?.summary_text
          }
          onClick={() => window.print()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Exportar
        </button>
      </div>
    </main>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>

        <h2 className="text-sm font-semibold">{title}</h2>
      </div>

      {children}
    </section>
  );
}

function EmptySection({ text }: { text: string }) {
  return (
    <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-border p-5 text-center">
      <p className="text-xs leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Completada
      </span>
    );
  }

  if (status === "processing") {
    return (
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-600">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Procesando
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive">
        <AlertCircle className="h-3.5 w-3.5" />
        Error
      </span>
    );
  }

  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground">
      <Clock3 className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}
