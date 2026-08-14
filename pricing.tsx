import { createFileRoute } from "@tanstack/react-router";
import { Check, Sparkles, QrCode } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/pricing")({
  component: PricingPage,
});

type Plan = {
  name: string;
  monthly?: number;
  annual?: number;
  monthlyLink?: string;
  annualLink?: string;
  description: string;
  popular?: boolean;
  features: string[];
  free?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Free",
    description: "Para comenzar a descubrir Lumen Note AI.",
    free: true,
    features: [
      "Transcripción de reuniones",
      "Resúmenes inteligentes",
      "Tareas y decisiones",
      "Hasta 20 minutos por reunión",
    ],
  },
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

function getQrUrl(paymentLink: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    paymentLink,
  )}`;
}

function PricingPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground md:px-6 md:py-16">
      <div className="mx-auto max-w-7xl">
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

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
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
        <h2 className="font-display text-2xl tracking-tight">
          {plan.name}
        </h2>

        <p className="mt-2 min-h-10 text-sm text-muted-foreground">
          {plan.description}
        </p>
      </div>

      <div className="mt-6">
        {plan.free ? (
          <>
            <span className="font-display text-4xl tracking-tight">
              Gratis
            </span>
            <p className="mt-1 text-xs text-muted-foreground">
              Sin costo
            </p>
          </>
        ) : (
          <>
            <div className="flex items-end gap-1">
              <span className="font-display text-4xl tracking-tight">
                ${plan.monthly?.toFixed(2)}
              </span>
              <span className="mb-1 text-sm text-muted-foreground">
                USD /mes
              </span>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              ${plan.annual?.toFixed(2)} USD /año
            </p>
          </>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {plan.features.map((feature) => (
          <div key={feature} className="flex items-start gap-2.5">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <span className="text-sm text-foreground/90">
              {feature}
            </span>
          </div>
        ))}
      </div>

      {plan.free ? (
        <div className="mt-auto pt-8">
          <div className="flex h-11 w-full items-center justify-center rounded-md border border-border bg-background text-sm font-medium">
            Plan gratuito
          </div>
        </div>
      ) : (
        <div className="mt-auto space-y-5 pt-8">
          {/* PAGO MENSUAL */}
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-3 text-center">
              <p className="text-sm font-semibold">
                Mensual — ${plan.monthly?.toFixed(2)} USD
              </p>
            </div>

            <img
              src={getQrUrl(plan.monthlyLink!)}
              alt={`QR de pago ${plan.name} mensual`}
              width={220}
              height={220}
              className="mx-auto rounded-lg"
            />

            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <QrCode className="h-3.5 w-3.5" />
              Escanea para pagar
            </div>

            <a
              href={plan.monthlyLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-4 flex h-11 w-full items-center justify-center rounded-md text-sm font-medium transition ${
                plan.popular
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "border border-border bg-background hover:bg-secondary"
              }`}
            >
              Pagar {plan.name} mensual
            </a>
          </div>

          {/* PAGO ANUAL */}
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-3 text-center">
              <p className="text-sm font-semibold">
                Anual — ${plan.annual?.toFixed(2)} USD
              </p>
            </div>

            <img
              src={getQrUrl(plan.annualLink!)}
              alt={`QR de pago ${plan.name} anual`}
              width={220}
              height={220}
              className="mx-auto rounded-lg"
            />

            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <QrCode className="h-3.5 w-3.5" />
              Escanea para pagar
            </div>

            <a
              href={plan.annualLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex h-11 w-full items-center justify-center rounded-md bg-secondary text-sm font-medium transition hover:bg-secondary/70"
            >
              Pagar {plan.name} anual
            </a>
          </div>
        </div>
      )}
    </article>
  );
}
