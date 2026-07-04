import { useState } from "react";
import { Copy, Download, ShieldAlert, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { downloadRecoveryCodes } from "@/lib/recoveryCodes";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  codes: string[];
  requireAck?: boolean;
}

export function RecoveryCodesDialog({ open, onClose, codes, requireAck = true }: Props) {
  const [ack, setAck] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
      toast({ title: "Copied", description: "Recovery codes copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && (!requireAck || ack) && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-zaago-green" />
            Save your recovery codes
          </DialogTitle>
          <DialogDescription>
            Each code can be used <b>once</b> to sign in if you lose access to your authenticator app. Store them somewhere safe — they won't be shown again.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 p-4 bg-muted/40 rounded-lg font-mono text-sm">
          {codes.map((c) => (
            <div key={c} className="py-1">{c}</div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={copyAll} className="flex-1">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="outline" onClick={() => downloadRecoveryCodes(codes)} className="flex-1">
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>

        {requireAck && (
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <Checkbox checked={ack} onCheckedChange={(v) => setAck(!!v)} />
            <span>I have saved my recovery codes in a safe place.</span>
          </label>
        )}

        <Button
          className="w-full bg-zaago-green hover:bg-zaago-green/90"
          disabled={requireAck && !ack}
          onClick={onClose}
        >
          Done
        </Button>
      </DialogContent>
    </Dialog>
  );
}
