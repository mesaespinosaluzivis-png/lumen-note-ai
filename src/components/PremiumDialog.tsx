import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  FileDown,
  CheckCircle2,
  ExternalLink,
  Copy,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { createTropiPayCheckout } from "@/lib/payments.functions";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (value: boolean) => void;
}

export function PremiumDialog({ open, onOpenChange }: Props) {
  const checkout = useServerFn(createTropiPayCheckout);

  const [data, setData] = useState<{
    payment_reference: string;
    url: string;
    qr?: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || data || loading) return;

    setLoading(true);

    checkout({ data: { planType: "pro" } })
      .then((result) => {
        setData(result);
      })
      .catch((error) => {
        toast.error(error?.message || "Error generando el pago");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, data, loading, checkout]);

  const copyReference = async () => {
    if (!data?.payment_reference) return;

    await navigator.clipboard.writeText(data.payment_reference);
    toast.success("Referencia copiada");
  };

  const handlePay = () => {
    if (!data?.url) return;

    window.open(data.url, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="bg-primary p-6 text-primary-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="text-[10px] uppercase tracking-widest opacity-70">
              Lumen Pro
            </span>
          </div>

          <DialogHeader className="mt-2 space-y-1 text-left">
            <DialogTitle className="text-2xl tracking-tight text-primary-foreground">
              Desbloquea Lumen Pro
            </DialogTitle>

            <DialogDescription className="text-primary-foreground/70">
              Accede al análisis completo, exportación PDF y herramientas
              avanzadas de Lumen Note AI.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 p-6">
          {data?.qr && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-secondary/40 p-5">
              <img
                src={data.qr}
                alt="QR TropiPay"
                className="h-44 w-44 rounded-md bg-white p-2"
              />

              <p className="text-center text-xs text-muted-foreground">
                Escanea con tu móvil para pagar con TropiPay.
              </p>
            </div>
          )}

          {data?.payment_reference && (
            <div className="rounded-xl border border-border bg-secondary/30 p-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Tu referencia de pago
              </p>

              <div className="mt-1.5 flex items-center justify-between gap-2">
                <code className="text-sm font-medium">
                  {data.payment_reference}
                </code>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyReference}
                  className="h-7 gap-1.5"
                >
                  <Copy className="h-3 w-3" />
                  Copiar
                </Button>
              </div>

              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Conserva esta referencia para confirmar tu pago.
              </p>
            </div>
          )}

          <Button
            onClick={handlePay}
            size="lg"
            className="w-full gap-2"
            disabled={!data || loading}
          >
            <FileDown className="h-4 w-4" />
            {loading ? "Generando pago…" : "Pagar con TropiPay"}
            <ExternalLink className="h-3.5 w-3.5 opacity-60" />
          </Button>

          <ul className="space-y-2.5 text-sm">
            {[
              "Análisis completo de reuniones",
              "PDF profesional con marca Lumen",
              "Resumen ejecutivo y puntos clave",
              "Tareas accionables",
              "Transcripción completa",
            ].map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2.5"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                <span className="text-foreground/90">{feature}</span>
              </li>
            ))}
          </ul>

          <p className="text-center text-[11px] text-muted-foreground">
            Después del pago, un administrador verificará la referencia y
            activará tu acceso Pro.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
