import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setEmail(user.email ?? "");

      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      setName(data?.full_name ?? "");
    }

    void loadProfile();
  }, []);

  async function saveProfile() {
    setSaving(true);
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("No hay una sesión activa.");
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: name.trim(),
        })
        .eq("id", user.id);

      if (error) throw error;

      setMessage("Cambios guardados correctamente.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los cambios.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8">
        <p className="font-mono-tech text-[10px] uppercase tracking-widest text-muted-foreground">
          Lumen Note AI
        </p>

        <h1 className="mt-2 font-display text-4xl tracking-tight">
          Configuración
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Administra la información de tu cuenta.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>

          <div>
            <h2 className="font-semibold">Perfil</h2>
            <p className="text-xs text-muted-foreground">
              Información básica de tu cuenta.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Nombre
            </label>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Tu nombre"
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Correo electrónico
            </label>

            <input
              value={email}
              disabled
              className="h-11 w-full rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground"
            />
          </div>

          <button
            type="button"
            onClick={() => void saveProfile()}
            disabled={saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}

            {saving ? "Guardando…" : "Guardar cambios"}
          </button>

          {message && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}
        </div>
      </section>
    </main>
  );
}

