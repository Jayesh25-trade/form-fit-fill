import { useRef, useState } from "react";
import { parseSlipText, type ParsedSlip } from "@/lib/slipParser";

export type ScanChoice = { format: "ss" | "gajanan"; location: "shegaon" | "wadkhal" | "kasoda" };

interface Props {
  onDone: (slip: ParsedSlip, choice: ScanChoice) => void;
}

async function prepareImage(file: File, rotate: number): Promise<string> {
  // Rotate + grayscale + contrast boost + upscale helps OCR on dot-matrix prints
  const img = await createImageBitmap(file);
  const scale = Math.min(2, 2400 / Math.max(img.width, img.height));
  const w = img.width * scale;
  const h = img.height * scale;
  const side = rotate % 180 !== 0;
  const c = document.createElement("canvas");
  c.width = side ? h : w;
  c.height = side ? w : h;
  const ctx = c.getContext("2d")!;
  ctx.filter = "grayscale(1) contrast(1.6)";
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((rotate * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  return c.toDataURL("image/png");
}

async function runOcr(file: File, onProgress: (p: number) => void): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress(m.progress);
    },
  });
  let best = "";
  // Try 4 rotations (slips are often photographed sideways), keep the one with most hits
  for (const rotate of [0, 90, 270, 180]) {
    const { data } = await worker.recognize(await prepareImage(file, rotate));
    console.log("[ocr]", rotate, data.text);
    const score = (data.text.match(/GROSS|TARE|NET|VEH|NO/gi) || []).length;
    const bestScore = (best.match(/GROSS|TARE|NET|VEH|NO/gi) || []).length;
    if (score > bestScore) best = data.text;
    if (score >= 4) break;
  }
  await worker.terminate();
  return best;
}

const ScanSlipDialog = ({ onDone }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [format, setFormat] = useState<"ss" | "gajanan" | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const reset = () => {
    setFile(null);
    setPreview("");
    setFormat(null);
    setBusy(false);
    setProgress(0);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const start = async (choice: ScanChoice) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const text = await runOcr(file, setProgress);
      const slip = parseSlipText(text);
      if (!slip.gross && !slip.tare && !slip.vehicleNo) {
        setError("Could not read the slip. Try a clearer, straight photo.");
        setBusy(false);
        return;
      }
      onDone(slip, choice);
      reset();
    } catch {
      setError("Scanning failed. Please try again.");
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
                <p className="text-center font-bold">Reading slip… {Math.round(progress * 100)}%</p>
                <div className="h-2 bg-secondary rounded overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progress * 100}%` }} />
                </div>
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
