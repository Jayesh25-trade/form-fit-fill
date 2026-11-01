import { useRef, useState } from "react";
import type { ParsedSlip } from "@/lib/slipParser";
import { supabase } from "@/integrations/supabase/client";

export type ScanChoice = { format: "ss" | "gajanan"; location: "shegaon" | "wadkhal" | "kasoda" };

interface Props {
  onDone: (slip: ParsedSlip, choice: ScanChoice) => void;
}

async function shrinkImage(file: File): Promise<string> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = img.width * scale;
  c.height = img.height * scale;
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

async function readSlip(file: File): Promise<ParsedSlip> {
  const image = await shrinkImage(file);
  const { data, error } = await supabase.functions.invoke("scan-slip", { body: { image } });
  if (error) {
    let msg = "Could not read the slip.";
    try {
      msg = (await (error as { context?: Response }).context?.json())?.error || msg;
    } catch { /* keep default */ }
    throw new Error(msg);
  }
  const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return {
    no: clean(data.no),
    vehicleNo: clean(data.vehicleNo).replace(/\s/g, "").toUpperCase(),
    gross: clean(data.gross).replace(/\D/g, ""),
    tare: clean(data.tare).replace(/\D/g, ""),
    date: /^\d{4}-\d{2}-\d{2}$/.test(clean(data.date)) ? clean(data.date) : "",
    timeIn: /^\d{2}:\d{2}$/.test(clean(data.timeIn)) ? clean(data.timeIn) : "",
    timeOut: /^\d{2}:\d{2}$/.test(clean(data.timeOut)) ? clean(data.timeOut) : "",
    rs: clean(data.rs).replace(/\D/g, ""),
  };
}

const ScanSlipDialog = ({ onDone }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [format, setFormat] = useState<"ss" | "gajanan" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setFile(null);
    setPreview("");
    setFormat(null);
    setBusy(false);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const start = async (choice: ScanChoice) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const slip = await readSlip(file);
      if (!slip.gross && !slip.tare && !slip.vehicleNo) {
        setError("Could not read the slip. Try a clearer, straight photo.");
        setBusy(false);
        return;
      }
      onDone(slip, choice);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scanning failed. Please try again.");
      setBusy(false);
    }
  };

  const btn = "w-full py-3 rounded font-bold text-base active:scale-[0.97] transition-transform";

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setFile(f);
          setPreview(URL.createObjectURL(f));
        }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        className="px-4 py-1.5 text-sm rounded bg-accent text-accent-foreground font-bold hover:opacity-90 active:scale-[0.97] transition-transform border border-border"
      >
        📷 Scan Slip
      </button>

      {file && (
        <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-sm p-4 space-y-3">
            <img src={preview} alt="Slip" className="w-full max-h-40 object-contain rounded border border-border" />

            {busy ? (
              <div className="space-y-2 py-2">
                <p className="text-center font-bold animate-pulse">Reading slip…</p>
              </div>
            ) : format === null ? (
              <>
                <p className="font-bold text-center">Which bill format?</p>
                <button className={`${btn} bg-primary text-primary-foreground`} onClick={() => setFormat("ss")}>
                  S.S. Dharmkata
                </button>
                <button
                  className={`${btn} text-white`}
                  style={{ backgroundColor: "#1b3a6b" }}
                  onClick={() => start({ format: "gajanan", location: "shegaon" })}
                >
                  Gajanan Weighbridge
                </button>
              </>
            ) : (
              <>
                <p className="font-bold text-center">S.S. Dharmkata — which address?</p>
                {(["shegaon", "wadkhal", "kasoda"] as const).map((loc) => (
                  <button
                    key={loc}
                    className={`${btn} bg-primary text-primary-foreground capitalize`}
                    onClick={() => start({ format: "ss", location: loc })}
                  >
                    {loc}
                  </button>
                ))}
                <button className="w-full text-sm underline text-muted-foreground" onClick={() => setFormat(null)}>
                  ← Back
                </button>
              </>
            )}

            {error && <p className="text-destructive text-sm font-bold text-center">{error}</p>}
            {!busy && (
              <button className="w-full py-2 rounded bg-secondary text-secondary-foreground" onClick={reset}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ScanSlipDialog;
