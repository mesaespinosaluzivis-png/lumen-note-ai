import { createFileRoute } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/pricing")({
  component: PricingPage,
});

type Plan = {
  name: string;
  monthly: number;
  annual: number;
  monthlyLink: string;
  annualLink: string;
  description: string;
  popular?: boolean;
  features: string[];
};

const PLANS: Plan[] = [
  {
    name: "Inicio",
    monthly: 29,
    annual: 290,
    monthlyLink: "https://tppay.me/msm6raqh",
    annualLink: "https://tppay.me/msmky7oj",
    description: "Para comenzar a transformar tus reuniones.",
    features: [
      "Transcripción de reuniones",
      "Resúmenes inteligentes",
      "Tareas y decisiones",
      "Exportación profesional",
      "Hasta 20 minutos por reunión",
    ],
  },
  {
    name: "Pro",
    monthly: 69,
    annual: 690,
    monthlyLink: "https://tppay.me/msmljh34",
    annualLink: "https://tppay.me/msmlwjvn",
    description: "Para profesionales que necesitan más potencia.",
    popular: true,
    features: [
      "Todo lo incluido en Inicio",
      "Hasta 1 hora por reunión",
      "PDF ejecutivo con marca Lumen",
      "Insights de IA",
      "Transcripción completa por hablante",
    ],
  },
  {
    name: "Premium",
    monthly: 99,
    annual: 990,
    monthlyLink: "https://tppay.me/msmm7tve",
    annualLink: "https://tppay.me/msmmi8bw",
    description: "Para usuarios que necesitan máxima capacidad.",
    features: [
      "Todo lo incluido en Pro",
      "Hasta 3 horas por reunión",
      "Análisis avanzado con IA",
      "Documentos profesionales",
      "Prioridad de procesamiento",
    ],
  },
];

function PricingPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground md:px-6 md:py-16">
      <div className="mx-auto max-w-6xl">
        <header className="mx-auto mb-10 max-w-2xl text-center">
          <div className="mb-3 flex items-center justify-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="font-mono-tech text-[10px] uppercase tracking-widest">
              Lumen Note AI
            </span>
          </div>

          <h1 className="font-display text-4xl tracking-tight md:text-5xl">
            Elige el plan que necesitas
          </h1>

          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            Convierte tus reuniones en información clara, organizada y
            accionable.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <PlanCard key={plan.name} plan={plan} />
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Todos los precios están expresados en USD. Los planes anuales se
          facturan una vez al año.
        </p>
      </div>
    </main>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <article
      className={`relative flex flex-col rounded-2xl border bg-card p-6 ${
        plan.popular
          ? "border-primary shadow-lg shadow-primary/10"
          : "border-border"
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground">
          Más popular
        </div>
      )}

      <div>
        <h2 className="font-display text-2xl tracking-tight">{plan.name}</h2>

        <p className="mt-2 min-h-10 text-sm text-muted-foreground">
          {plan.description}
        </p>
      </div>

      <div className="mt-6">
        <div className="flex items-end gap-1">
          <span className="font-display text-4xl tracking-tight">
            ${plan.monthly}
          </span>

          <span className="mb-1 text-sm text-muted-foreground">/mes</span>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {plan.features.map((feature) => (
          <div key={feature} className="flex items-start gap-2.5">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <span className="text-sm text-foreground/90">{feature}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-8">
        <a
          href={plan.monthlyLink}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex h-11 w-full items-center justify-center rounded-md text-sm font-medium transition ${
            plan.popular
              ? "bg-primary text-primary-foreground hover:opacity-90"
              : "border border-border bg-background hover:bg-secondary"
          }`}
        >
          Elegir {plan.name} mensual
        </a>

        <a
          href={plan.annualLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex h-11 w-full items-center justify-center rounded-md bg-secondary text-sm font-medium transition hover:bg-secondary/70"
        >
          Elegir {plan.name} anual
        </a>

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Mensual: ${plan.monthly} USD · Anual: ${plan.annual} USD
        </p>
      </div>
    </article>
  );
}

