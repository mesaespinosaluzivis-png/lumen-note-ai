import { createFileRoute, Link } from "@tanstack/react-router";
import {
  FileAudio,
  Plus,
  Search,
  Clock3,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LumenLogo } from "@/components/LumenLogo";

type Meeting = {
  id: string;
  title: string | null;
  status: string | null;
  created_at: string | null;
};

export const Route = createFileRoute("/_authenticated/app/")({
  component: MeetingsDashboard,
});

function MeetingsDashboard() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadMeetings() {
      setLoading(true);
      setError(null);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error("No hay una sesión activa.");
        }

        const { data, error: meetingsError } = await supabase
          .from("meetings")
          .select("id,title,status,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (meetingsError) {
          throw meetingsError;
        }

        if (active) {
          setMeetings(data ?? []);
        }
      } catch (err) {
        console.error(err);

        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar las reuniones.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadMeetings();

    return () => {
      active = false;
    };
  }, []);

  const filteredMeetings = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return meetings;

    return meetings.filter((meeting) =>
      (meeting.title ?? "Nueva reunión").toLowerCase().includes(query),
    );
  }, [meetings, search]);

  const completed = meetings.filter(
    (meeting) => meeting.status === "completed",
  ).length;

  const processing = meetings.filter(
    (meeting) => meeting.status === "processing",
  ).length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-10">
      <div className="mb-8 flex justify-center overflow-hidden rounded-2xl">
        <div className="w-full max-w-md">
          <LumenLogo />
        </div>
      </div>

      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono-tech text-[10px] uppercase tracking-widest text-muted-foreground">
            Lumen Note AI
          </p>

          <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
            Tus reuniones
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Convierte tus conversaciones en información accionable.
          </p>
        </div>

        <Link
          to="/app/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nueva reunión
        </Link>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total"
          value={meetings.length}
          icon={<FileAudio className="h-4 w-4" />}
        />

        <StatCard
          label="Completadas"
          value={completed}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />

        <StatCard
          label="Procesando"
          value={processing}
          icon={<Loader2 className="h-4 w-4" />}
        />
      </section>

      <section className="mb-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar reuniones…"
            className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-4 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando reuniones…
          </div>
        </div>
      ) : error ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <AlertCircle className="mb-3 h-6 w-6 text-destructive" />

          <p className="text-sm font-medium">
            No se pudieron cargar las reuniones
          </p>

          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            {error}
          </p>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <EmptyMeetings hasSearch={Boolean(search.trim())} />
      ) : (
        <div className="space-y-3">
          {filteredMeetings.map((meeting) => (
            <MeetingRow key={meeting.id} meeting={meeting} />
          ))}
        </div>
      )}
    </main>
  );
}

function MeetingRow({ meeting }: { meeting: Meeting }) {
  const title = meeting.title || "Reunión sin título";

  const date = meeting.created_at
    ? new Date(meeting.created_at).toLocaleDateString("es", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Sin fecha";

  const status = meeting.status ?? "unknown";

  const statusInfo =
    status === "completed"
      ? {
          label: "Completada",
          className: "bg-emerald-500/10 text-emerald-600",
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        }
      : status === "processing"
        ? {
            label: "Procesando",
            className: "bg-amber-500/10 text-amber-600",
            icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
          }
        : status === "failed"
          ? {
              label: "Error",
              className: "bg-destructive/10 text-destructive",
              icon: <AlertCircle className="h-3.5 w-3.5" />,
            }
          : {
              label: status,
              className: "bg-secondary text-muted-foreground",
              icon: <Clock3 className="h-3.5 w-3.5" />,
            };

  return (
    <Link
      to="/app/m/$id"
      params={{ id: meeting.id }}
      className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/30 hover:bg-secondary/20 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <FileAudio className="h-5 w-5 text-primary" />
        </div>

        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold group-hover:text-primary">
            {title}
          </h2>

          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            {date}
          </div>
        </div>
      </div>

      <span
        className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusInfo.className}`}
      >
        {statusInfo.icon}
        {statusInfo.label}
      </span>
    </Link>
  );
}

function EmptyMeetings({ hasSearch }: { hasSearch: boolean }) {
  if (hasSearch) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center">
        <Search className="mb-4 h-7 w-7 text-muted-foreground" />

        <h2 className="text-sm font-semibold">
          No encontramos esa reunión
        </h2>

        <p className="mt-1 text-xs text-muted-foreground">
          Prueba con otro término de búsqueda.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <FileAudio className="h-6 w-6 text-primary" />
      </div>

      <h2 className="mt-5 font-display text-2xl">
        Tu primera reunión empieza aquí
      </h2>

      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Sube una grabación y Lumen transformará el audio en una
        transcripción, resumen, tareas y decisiones.
      </p>

      <Link
        to="/app/new"
        className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        <Plus className="h-4 w-4" />
        Crear reunión
      </Link>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

