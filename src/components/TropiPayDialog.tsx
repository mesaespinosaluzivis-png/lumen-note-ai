import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { TROPIPAY_URL } from "@/lib/premium";

interface Props {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  paymentReference?: string;
  qrUrl?: string;
}

export function TropiPayDialog({
  open,
  onOpenChange,
  paymentReference,
  qrUrl,
}: Props) {
  const copyReference = async () => {
    if (!paymentReference) return;

    await navigator.clipboard.writeText(paymentReference);
    toast.success("Referencia copiada");
  };

  const handlePay = () => {
    window.open(TROPIPAY_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pago con TropiPay</DialogTitle>

          <DialogDescription>
            Completa tu pago para activar Lumen Pro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {qrUrl && (
            <div className="flex justify-center rounded-xl border bg-secondary/30 p-5">
              <img
                src={qrUrl}
                alt="Código QR de TropiPay"
                className="h-48 w-48 rounded-lg bg-white p-2"
              />
            </div>
          )}

          {paymentReference && (
            <div className="rounded-xl border bg-secondary/30 p-4">
              <p className="text-xs text-muted-foreground">
                Referencia de pago
              </p>

              <div className="mt-2 flex items-center justify-between gap-2">
                <code className="text-sm font-medium">
                  {paymentReference}
                </code>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={copyReference}
                >
                  <Copy className="mr-1 h-3 w-3" />
                  Copiar
                </Button>
              </div>
            </div>
          )}

          <Button
            type="button"
            onClick={handlePay}
            className="w-full gap-2"
            size="lg"
          >
            Pagar con TropiPay
            <ExternalLink className="h-4 w-4" />
          </Button>

          <div className="space-y-2 rounded-xl border p-4 text-sm">
            <div className="flex gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
              <span>Pago procesado mediante TropiPay.</span>
            </div>

            <div className="flex gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
              <span>
                Conserva tu referencia de pago para la verificación.
              </span>
            </div>

            <div className="flex gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
              <span>
                El acceso Pro se activa después de verificar el pago.
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
