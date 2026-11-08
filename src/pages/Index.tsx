import { useState, useRef, useCallback } from "react";
import jsPDF from "jspdf";
import ScanSlipDialog, { type ScanChoice } from "@/components/ScanSlipDialog";
import { toDigits, type ParsedSlip } from "@/lib/slipParser";
import { Button } from "@/components/ui/button";

const LOCATIONS = {
  shegaon: {
    label: "Shegaon",
    address: "Shegaon Dist.Buldana (MH) 444203",
  },
  wadkhal: {
    label: "Wadkhal",
    address: "Wadkhal Taluka Pen Dist.Raigad (MH) 402107",
  },
  kasoda: {
    label: "Kasoda",
    address: "Kasoda, Taluka Erandol, Dist. Jalgaon (MH)",
  },
} as const;

type LocationKey = keyof typeof LOCATIONS;
type BillFormat = "ss" | "gajanan";

const GAJANAN_ADDRESS = "Shegaon Dist. Buldana (MH) 444203";
const GAJANAN_MOB = "07265252511";

interface FormData {
  format: BillFormat;
  location: LocationKey;
  no: string;
  date: string;
  timeIn: string;
  timeOut: string;
  ms: string;
  vehicleNo: string;
  grossWeight: string[];
  tareWeight: string[];
  netWeight: string[];
  receivedRs: string;
  rs: string;
}

const NUM_DIGITS = 5;

const emptyForm = (format: BillFormat = "ss"): FormData => ({
  format,
  location: "shegaon",
  no: "",
  date: "",
  timeIn: "",
  timeOut: "",
  ms: "",
  vehicleNo: "",
  grossWeight: Array(NUM_DIGITS).fill(""),
  tareWeight: Array(NUM_DIGITS).fill(""),
  netWeight: Array(NUM_DIGITS).fill(""),
  receivedRs: "",
  rs: "",
});

function calcNetWeight(gross: string[], tare: string[]): string[] {
  const grossNum = parseInt(gross.join("") || "0", 10);
  const tareNum = parseInt(tare.join("") || "0", 10);
  const net = grossNum - tareNum;
  if (gross.every((d) => d === "") && tare.every((d) => d === "")) {
    return Array(NUM_DIGITS).fill("");
  }
  const netStr = Math.abs(net).toString().padStart(NUM_DIGITS, "0");
  const digits = netStr.slice(-NUM_DIGITS).split("");
  return digits;
}

const inputClass =
  "min-w-0 w-full border border-input bg-background px-2.5 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const digitInputClass =
  "w-full h-10 bg-transparent text-center text-base font-bold font-mono focus:outline-none focus:bg-primary/10 border-none";

// Gajanan format colors (from the reference bill)
const G_NAVY = "#1b3a6b";
const G_RED = "#c0392b";
const G_BEIGE = "#f7ecd9";
const G_TABLE_HEAD = "#dbe7f3";
const G_TABLE_LABEL = "#e8eff7";

const gajananBoxClass =
  "w-full bg-[#f7ecd9] border border-[#d8c9a8] rounded-sm px-2 py-1 text-base font-bold text-[#1b3a6b] focus:outline-none focus:ring-1 focus:ring-[#1b3a6b]";
const gajananDigitClass =
  "w-full h-9 bg-transparent text-center text-lg font-bold font-mono text-[#1b3a6b] focus:outline-none focus:bg-[#dbe7f3] border-none";

interface ReceiptFormProps {
  data: FormData;
  onChange: (d: FormData) => void;
  index: number;
  onRemove: () => void;
  canRemove: boolean;
}

const ReceiptForm = ({ data, onChange, index, onRemove, canRemove }: ReceiptFormProps) => {
  const grossRefs = useRef<(HTMLInputElement | null)[]>([]);
  const tareRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleDigitChange = useCallback(
    (type: "grossWeight" | "tareWeight", idx: number, val: string) => {
      const digit = val.replace(/[^0-9]/g, "").slice(-1);
      const arr = [...data[type]];
      arr[idx] = digit;
      const updated = { ...data, [type]: arr };
      const gross = type === "grossWeight" ? arr : data.grossWeight;
      const tare = type === "tareWeight" ? arr : data.tareWeight;
      updated.netWeight = calcNetWeight(gross, tare);
      onChange(updated);

      // Auto-advance to next box
      if (digit !== "") {
        const refs = type === "grossWeight" ? grossRefs : tareRefs;
        if (idx < NUM_DIGITS - 1) {
          refs.current[idx + 1]?.focus();
        } else if (type === "grossWeight") {
          // Jump to first tare weight box
          tareRefs.current[0]?.focus();
        }
      }
    },
    [data, onChange]
  );

  const handleKeyDown = useCallback(
    (type: "grossWeight" | "tareWeight", idx: number, e: React.KeyboardEvent) => {
      const refs = type === "grossWeight" ? grossRefs : tareRefs;
      if (e.key === "Backspace" && data[type][idx] === "" && idx > 0) {
        refs.current[idx - 1]?.focus();
      } else if (e.key === "ArrowLeft" && idx > 0) {
        refs.current[idx - 1]?.focus();
      } else if (e.key === "ArrowRight" && idx < NUM_DIGITS - 1) {
        refs.current[idx + 1]?.focus();
      }
    },
    [data]
  );

  return (
    <section className="overflow-hidden border border-border bg-card shadow-sm relative">
      {canRemove && (
        <button
          onClick={onRemove}
          className="absolute top-3 right-3 z-10 border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors no-print"
        >
          Remove receipt
        </button>
      )}
      <div className="bg-primary px-5 py-4 text-primary-foreground">
        <div className="flex flex-wrap items-start justify-between gap-3 pr-28">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Weighment receipt</p>
            <h2 className="mt-1 text-2xl font-extrabold leading-tight">S.S. DHARMKATA</h2>
            <p className="mt-1 text-sm font-medium">{(LOCATIONS[data.location || "shegaon"]).address} · Mob: 9970041700</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-sm font-bold">24/7 AVAILABLE</p>
            <p className="mt-1 text-xs opacity-80">Receipt {String(index + 1).padStart(2, "0")}</p>
          </div>
        </div>
      </div>

      {/* Location selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/50 px-5 py-3">
        <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground" htmlFor={`ss-location-${index}`}>Weighbridge location</label>
        <select
          id={`ss-location-${index}`}
          className="border border-input bg-background px-3 py-2 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={data.location || "shegaon"}
          onChange={(e) => onChange({ ...data, location: e.target.value as LocationKey })}
        >
          {Object.entries(LOCATIONS).map(([key, loc]) => (
            <option key={key} value={key}>{loc.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Receipt No.</span>
            <input aria-label="Receipt No." className={inputClass} value={data.no} onChange={(e) => onChange({ ...data, no: e.target.value })} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Date</span>
            <input aria-label="Date" type="date" className={inputClass} value={data.date} onChange={(e) => onChange({ ...data, date: e.target.value })} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Time In</span>
            <input aria-label="Time In" type="time" className={inputClass} value={data.timeIn} onChange={(e) => onChange({ ...data, timeIn: e.target.value })} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Time Out</span>
            <input aria-label="Time Out" type="time" className={inputClass} value={data.timeOut} onChange={(e) => onChange({ ...data, timeOut: e.target.value })} />
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">M/s. / Party Name</span>
            <input aria-label="M/s. / Party Name" className={inputClass} value={data.ms} onChange={(e) => onChange({ ...data, ms: e.target.value })} />
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Vehicle No.</span>
            <input aria-label="Vehicle No." className={inputClass + " uppercase"} value={data.vehicleNo} onChange={(e) => onChange({ ...data, vehicleNo: e.target.value.toUpperCase() })} />
          </label>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-primary">Weight Details</h3>
            <span className="text-xs font-semibold text-muted-foreground">Kilograms (kg)</span>
          </div>
          <div className="overflow-x-auto border border-border">
      <table className="w-full min-w-[470px] border-collapse">
        <thead>
          <tr className="bg-muted/70 text-left text-xs font-bold uppercase text-muted-foreground">
            <th className="border-b border-r border-border px-3 py-2">Weight Type</th>
            {data.grossWeight.map((_, i) => <th key={i} className="border-b border-r border-border px-1 py-2 text-center">{i + 1}</th>)}
          </tr>
        </thead>
        <tbody>
          {(["grossWeight", "tareWeight"] as const).map((type) => (
            <tr key={type}>
              <td className="border border-primary px-2 py-0.5 text-xs font-semibold text-primary w-28">
                {type === "grossWeight" ? "Gross Weight" : "Tare Weight"}
              </td>
              {data[type].map((val, i) => (
              <td key={i} className="border-b border-r border-border p-0">
                  <input
                    ref={(el) => {
                      (type === "grossWeight" ? grossRefs : tareRefs).current[i] = el;
                    }}
                    className={digitInputClass}
                    value={val}
                    maxLength={1}
                    inputMode="numeric"
                    onChange={(e) => handleDigitChange(type, i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(type, i, e)}
                    onFocus={(e) => e.target.select()}
                  />
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className="border-r border-border bg-primary/5 px-3 py-2 text-xs font-bold text-primary">Net Weight</td>
            {data.netWeight.map((val, i) => (
              <td key={i} className="border-r border-border bg-primary/5 p-0">
                <span className="block text-center text-base px-0.5 font-bold font-mono h-10 leading-10 text-primary">{val}</span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Received Rs.</span>
            <input aria-label="Received Rs." className={inputClass} value={data.receivedRs} onChange={(e) => onChange({ ...data, receivedRs: e.target.value })} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Rs.</span>
            <input aria-label="Rs." className={inputClass} value={data.rs} onChange={(e) => onChange({ ...data, rs: e.target.value })} />
          </label>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-border pt-4">
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">Please check weight. No responsibility accepted once carrier leaves the weighbridge.</p>
          <div className="min-w-40 text-center">
            <p className="mb-6 text-sm font-semibold text-foreground">For S.S. Dharmkata</p>
            <p className="border-t border-dotted border-foreground/60 pt-1 text-xs font-semibold text-muted-foreground">Authorized Signature</p>
          </div>
        </div>
      </div>
    </section>
  );
};

// ===================== GAJANAN WEIGHBRIDGE FORMAT =====================

const GajananReceiptForm = ({ data, onChange, index, onRemove, canRemove }: ReceiptFormProps) => {
  const grossRefs = useRef<(HTMLInputElement | null)[]>([]);
  const tareRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleDigitChange = useCallback(
    (type: "grossWeight" | "tareWeight", idx: number, val: string) => {
      const digit = val.replace(/[^0-9]/g, "").slice(-1);
      const arr = [...data[type]];
      arr[idx] = digit;
      const updated = { ...data, [type]: arr };
      const gross = type === "grossWeight" ? arr : data.grossWeight;
      const tare = type === "tareWeight" ? arr : data.tareWeight;
      updated.netWeight = calcNetWeight(gross, tare);
      onChange(updated);

      if (digit !== "") {
        const refs = type === "grossWeight" ? grossRefs : tareRefs;
        if (idx < NUM_DIGITS - 1) {
          refs.current[idx + 1]?.focus();
        } else if (type === "grossWeight") {
          tareRefs.current[0]?.focus();
        }
      }
    },
    [data, onChange]
  );

  const handleKeyDown = useCallback(
    (type: "grossWeight" | "tareWeight", idx: number, e: React.KeyboardEvent) => {
      const refs = type === "grossWeight" ? grossRefs : tareRefs;
      if (e.key === "Backspace" && data[type][idx] === "" && idx > 0) {
        refs.current[idx - 1]?.focus();
      } else if (e.key === "ArrowLeft" && idx > 0) {
        refs.current[idx - 1]?.focus();
      } else if (e.key === "ArrowRight" && idx < NUM_DIGITS - 1) {
        refs.current[idx + 1]?.focus();
      }
    },
    [data]
  );

  return (
    <section className="relative overflow-hidden border border-border bg-card shadow-sm">
      {canRemove && (
        <Button
          onClick={onRemove}
          variant="outline"
          size="sm"
          className="absolute right-3 top-3 z-10 no-print"
        >
          Remove receipt
        </Button>
      )}
      <div className="px-5 pb-5 pt-4 sm:px-6">
        <div className="mb-5 border-b border-border pb-4 pr-36 text-center sm:pr-40">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: G_RED }}>|| Shree ||</p>
          <h2 className="mt-1 text-2xl font-extrabold leading-tight sm:text-3xl" style={{ color: G_NAVY, fontFamily: "Georgia, 'Times New Roman', serif" }}>GAJANAN WEIGHBRIDGE</h2>
          <p className="mt-1 text-sm font-semibold text-foreground">{GAJANAN_ADDRESS} · Mob: {GAJANAN_MOB}</p>
          <span className="mt-2 inline-block px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-primary-foreground" style={{ backgroundColor: G_RED }}>24/7 Available</span>
          <p className="mt-2 text-xs font-medium text-muted-foreground">Computerized Weighment Receipt · {String(index + 1).padStart(2, "0")}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Receipt No.</span>
            <input aria-label="Receipt No." className={gajananBoxClass} value={data.no} onChange={(e) => onChange({ ...data, no: e.target.value })} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Date</span>
            <input aria-label="Date" type="date" className={gajananBoxClass} value={data.date} onChange={(e) => onChange({ ...data, date: e.target.value })} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Time In</span>
            <input aria-label="Time In" type="time" className={gajananBoxClass} value={data.timeIn} onChange={(e) => onChange({ ...data, timeIn: e.target.value })} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Time Out</span>
            <input aria-label="Time Out" type="time" className={gajananBoxClass} value={data.timeOut} onChange={(e) => onChange({ ...data, timeOut: e.target.value })} />
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">M/s. / Party Name</span>
            <input aria-label="M/s. / Party Name" className={gajananBoxClass} value={data.ms} onChange={(e) => onChange({ ...data, ms: e.target.value })} />
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Vehicle No.</span>
            <input aria-label="Vehicle No." className={gajananBoxClass + " uppercase"} value={data.vehicleNo} onChange={(e) => onChange({ ...data, vehicleNo: e.target.value.toUpperCase() })} />
          </label>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
            <h3 className="text-sm font-extrabold uppercase tracking-wide" style={{ color: G_NAVY }}>Weight Details</h3>
            <span className="text-xs font-semibold text-muted-foreground">Kilograms (kg)</span>
          </div>
          <div className="overflow-x-auto border border-border">
            <table className="w-full min-w-[470px] border-collapse">
              <thead><tr className="text-left text-xs font-bold uppercase text-muted-foreground" style={{ backgroundColor: G_TABLE_HEAD }}>
                <th className="border-b border-r border-border px-3 py-2">Weight Type</th>
                {data.grossWeight.map((_, i) => <th key={i} className="border-b border-r border-border px-1 py-2 text-center">{i + 1}</th>)}
              </tr></thead>
              <tbody>
                {(["grossWeight", "tareWeight"] as const).map((type) => (
                  <tr key={type}>
                    <td className="border-b border-r border-border px-3 py-1 text-sm font-bold" style={{ backgroundColor: G_TABLE_LABEL, color: G_NAVY }}>{type === "grossWeight" ? "Gross Weight" : "Tare Weight"}</td>
                    {data[type].map((val, i) => (
                      <td key={i} className="border-b border-r border-border p-0">
                        <input ref={(el) => { (type === "grossWeight" ? grossRefs : tareRefs).current[i] = el; }} className={gajananDigitClass} value={val} maxLength={1} inputMode="numeric" aria-label={`${type === "grossWeight" ? "Gross" : "Tare"} weight digit ${i + 1}`} onChange={(e) => handleDigitChange(type, i, e.target.value)} onKeyDown={(e) => handleKeyDown(type, i, e)} onFocus={(e) => e.target.select()} />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="border-r border-border px-3 py-2 text-sm font-bold" style={{ backgroundColor: G_TABLE_LABEL, color: G_NAVY }}>Net Weight</td>
                  {data.netWeight.map((val, i) => <td key={i} className="border-r border-border p-0" style={{ backgroundColor: G_TABLE_HEAD }}><span className="block h-10 text-center font-mono text-base font-bold leading-10" style={{ color: G_NAVY }}>{val}</span></td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Received Rs.</span>
            <input aria-label="Received Rs." className={gajananBoxClass} value={data.receivedRs} onChange={(e) => onChange({ ...data, receivedRs: e.target.value })} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Rs.</span>
            <input aria-label="Rs." className={gajananBoxClass} value={data.rs} onChange={(e) => onChange({ ...data, rs: e.target.value })} />
          </label>
        </div>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-border pt-4">
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">Please check weight. No responsibility accepted once carrier leaves the weighbridge.</p>
          <div className="min-w-40 text-center">
            <p className="mb-6 text-sm font-semibold text-foreground">For Gajanan Weighbridge</p>
            <p className="border-t border-dotted border-foreground/60 pt-1 text-xs font-semibold text-muted-foreground">Authorized Signature</p>
          </div>
        </div>
      </div>
    </section>
  );
};

// ===================== PDF GENERATION =====================

// S.S. Dharmkata PDF: 2 receipts per A4 page
function generatePDF(forms: FormData[]) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageW = 210;
  const margin = 10;
  const contentW = pageW - margin * 2;
  const slipH = 130;
  const color: [number, number, number] = [180, 30, 70];

  forms.forEach((form, idx) => {
    const isSecondOnPage = idx % 2 === 1;
    const yStart = isSecondOnPage ? margin + slipH + 8 : margin;

    if (idx > 0 && !isSecondOnPage) doc.addPage();

    const x = margin;
    const y = yStart;

    doc.setDrawColor(...color);
    doc.setLineWidth(0.5);
    doc.rect(x, y, contentW, slipH);

    const loc = form.location || "shegaon";
    const locAddr = LOCATIONS[loc].address;
    doc.setTextColor(...color);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("|| Shree ||", pageW / 2, y + 6, { align: "center" });
    doc.setFontSize(16);
    doc.text("S.S. DHARMKATA", pageW / 2, y + 12, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`${locAddr} Mob : 9970041700`, pageW / 2, y + 17, { align: "center" });
    doc.line(x + 30, y + 18, x + contentW - 30, y + 18);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bolditalic");
    doc.text("24/7 AVAILABLE", pageW / 2, y + 22, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("No.", x + 4, y + 27);
    doc.text(form.no, x + 14, y + 27);
    doc.text("Date:", x + contentW - 50, y + 27);
    doc.text(form.date, x + contentW - 35, y + 27);

    doc.setFontSize(10);
    doc.text("Time In:", x + 4, y + 34);
    doc.text(form.timeIn, x + 24, y + 34);
    doc.text("Time Out:", x + contentW / 2, y + 34);
    doc.text(form.timeOut, x + contentW / 2 + 22, y + 34);

    doc.text("M/s.", x + 4, y + 41);
    doc.line(x + 14, y + 42, x + contentW - 4, y + 42);
    doc.text(form.ms, x + 16, y + 41);

    doc.text("Vehicle No.", x + 4, y + 48);
    doc.line(x + 26, y + 49, x + contentW - 4, y + 49);
    doc.text(form.vehicleNo, x + 28, y + 48);

    doc.setFontSize(11);
    doc.text("KILOGRAMS", pageW / 2, y + 56, { align: "center" });

    const tableY = y + 59;
    const labelW = 30;
    const cellW = (contentW - labelW - 8) / NUM_DIGITS;
    const rowH = 9;
    const tableX = x + 4;

    const rows = [
      { label: "Gross Weight", data: form.grossWeight },
      { label: "Tare Weight", data: form.tareWeight },
      { label: "Net Weight", data: form.netWeight },
    ];

    doc.setFontSize(10);

    rows.forEach((row, ri) => {
      const ry = tableY + ri * rowH;
      doc.rect(tableX, ry, labelW, rowH);
      doc.setFont("helvetica", "bold");
      doc.text(row.label, tableX + 2, ry + 6.5);
      row.data.forEach((val, ci) => {
        const cx = tableX + labelW + ci * cellW;
        doc.rect(cx, ry, cellW, rowH);
        doc.text(val, cx + cellW / 2, ry + 6.5, { align: "center" });
      });
    });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const disclaimerY = tableY + rowH * 3 + 5;
    doc.text("Please Check Weight No Responsibility Accepted Once", pageW / 2, disclaimerY, { align: "center" });
    doc.text("Carrier Leave the Weight Bridge", pageW / 2, disclaimerY + 4, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    const bottomY = disclaimerY + 10;
    doc.text("Received Rs.", x + 4, bottomY);
    doc.text(form.receivedRs, x + 30, bottomY);
    doc.text("For,", x + contentW - 20, bottomY);

    doc.text("Rs.", x + 4, bottomY + 7);
    doc.text(form.rs, x + 12, bottomY + 7);
    doc.line(x + contentW - 35, bottomY + 8, x + contentW - 4, bottomY + 8);
    doc.text("Signature", x + contentW - 28, bottomY + 12);
  });

  doc.save("SS_Dharmkata_Receipts.pdf");
}

// Gajanan Weighbridge PDF: 2 receipts per A4 page
function generateGajananPDF(forms: FormData[]) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageW = 210;
  const margin = 10;
  const contentW = pageW - margin * 2;
  const slipH = 134;
  const navy: [number, number, number] = [27, 58, 107];
  const red: [number, number, number] = [192, 57, 43];
  const beige: [number, number, number] = [247, 236, 217];
  const tableHead: [number, number, number] = [219, 231, 243];
  const tableLabel: [number, number, number] = [232, 239, 247];
  const dark: [number, number, number] = [34, 34, 34];

  forms.forEach((form, idx) => {
    const isSecondOnPage = idx % 2 === 1;
    const yStart = isSecondOnPage ? margin + slipH + 4 : margin;

    if (idx > 0 && !isSecondOnPage) doc.addPage();

    const x = margin;
    const y = yStart;

    // Outer double border
    doc.setDrawColor(...navy);
    doc.setLineWidth(0.9);
    doc.rect(x, y, contentW, slipH);
    doc.setLineWidth(0.3);
    doc.rect(x + 1.5, y + 1.5, contentW - 3, slipH - 3);

    // Header
    doc.setTextColor(...red);
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.text("|| Shree ||", pageW / 2, y + 6.5, { align: "center" });

    doc.setTextColor(...navy);
    doc.setFont("times", "bold");
    doc.setFontSize(26);
    doc.text("GAJANAN WEIGHBRIDGE", pageW / 2, y + 14.5, { align: "center" });

    doc.setTextColor(...dark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${GAJANAN_ADDRESS}  |  Mob : ${GAJANAN_MOB}`, pageW / 2, y + 20, { align: "center" });

    // 24/7 AVAILABLE pill with side lines
    const pillY = y + 23;
    doc.setDrawColor(...red);
    doc.setLineWidth(0.6);
    doc.line(x + 4, pillY + 2, pageW / 2 - 26, pillY + 2);
    doc.line(pageW / 2 + 26, pillY + 2, x + contentW - 4, pillY + 2);
    doc.setFillColor(...red);
    doc.roundedRect(pageW / 2 - 24, pillY - 1.5, 48, 7, 1.5, 1.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("24/7 AVAILABLE", pageW / 2, pillY + 3.5, { align: "center" });

    // Helper: beige input box with value
    const beigeBox = (bx: number, by: number, bw: number, bh: number, value: string, fontSize = 11) => {
      doc.setFillColor(...beige);
      doc.setDrawColor(216, 201, 168);
      doc.setLineWidth(0.3);
      doc.roundedRect(bx, by, bw, bh, 0.8, 0.8, "FD");
      doc.setTextColor(...navy);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(fontSize);
      doc.text(value, bx + 2, by + bh - 2.2);
    };

    // No. and Date
    const rowY = y + 29;
    doc.setTextColor(...dark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("No.", x + 4, rowY + 4.5);
    beigeBox(x + 14, rowY, 30, 7, form.no);
    doc.text("Date :", x + contentW - 62, rowY + 4.5);
    beigeBox(x + contentW - 44, rowY, 40, 7, form.date);

    // Time In / Time Out
    const timeY = rowY + 9;
    doc.setTextColor(...dark);
    doc.text("Time In :", x + 4, timeY + 4.5);
    beigeBox(x + 24, timeY, 40, 7, form.timeIn);
    doc.text("Time Out :", x + contentW / 2 + 4, timeY + 4.5);
    beigeBox(x + contentW / 2 + 28, timeY, 40, 7, form.timeOut);

    // M/s.
    const msY = timeY + 9;
    doc.text("M/s.", x + 4, msY + 4.5);
    beigeBox(x + 16, msY, contentW - 20, 7, form.ms);

    // Vehicle No.
    const vehY = msY + 9;
    doc.text("Vehicle No.", x + 4, vehY + 4.5);
    beigeBox(x + 30, vehY, contentW - 34, 7, form.vehicleNo);

    // Kilograms table
    const tableY = vehY + 10;
    const labelW = 34;
    const tableX = x + 4;
    const tableW = contentW - 8;
    const cellW = (tableW - labelW) / NUM_DIGITS;
    const headH = 8;
    const rowH = 8.5;

    // Header row
    doc.setFillColor(...tableHead);
    doc.setDrawColor(...navy);
    doc.setLineWidth(0.4);
    doc.rect(tableX, tableY, tableW, headH, "FD");
    doc.setTextColor(...dark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("KILOGRAMS", pageW / 2, tableY + 6, { align: "center" });

    const rows = [
      { label: "Gross Weight", data: form.grossWeight },
      { label: "Tare Weight", data: form.tareWeight },
      { label: "Net Weight", data: form.netWeight },
    ];

    rows.forEach((row, ri) => {
      const ry = tableY + headH + ri * rowH;
      // Label cell
      doc.setFillColor(...tableLabel);
      doc.setDrawColor(...navy);
      doc.rect(tableX, ry, labelW, rowH, "FD");
      doc.setTextColor(...dark);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(row.label, tableX + 2, ry + 6.5);
      // Digit cells
      row.data.forEach((val, ci) => {
        const cx = tableX + labelW + ci * cellW;
        doc.setFillColor(255, 255, 255);
        doc.rect(cx, ry, cellW, rowH, "FD");
        doc.setTextColor(...navy);
        doc.setFontSize(12);
        doc.text(val, cx + cellW / 2, ry + 6.5, { align: "center" });
      });
    });

    // Disclaimer
    const disclaimerY = tableY + headH + rowH * 3 + 5;
    doc.setTextColor(...red);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Please Check Weight No Responsibility Accepted Once", pageW / 2, disclaimerY, { align: "center" });
    doc.text("Carrier Leave the Weight Bridge", pageW / 2, disclaimerY + 4.5, { align: "center" });

    // Red divider line
    doc.setDrawColor(...red);
    doc.setLineWidth(0.6);
    doc.line(x + 4, disclaimerY + 8, x + contentW - 4, disclaimerY + 8);

    // Bottom row
    const bottomY = disclaimerY + 10;
    doc.setTextColor(...dark);
    doc.setFontSize(11);
    doc.text("Received Rs.", x + 4, bottomY + 4.5);
    beigeBox(x + 30, bottomY, 40, 7, form.receivedRs);
    doc.text("For,", x + contentW - 30, bottomY + 4.5);

    const rsY = bottomY + 9;
    doc.text("Rs.", x + 4, rsY + 4.5);
    beigeBox(x + 14, rsY, 56, 7, form.rs);

    // Signature dotted line
    doc.setDrawColor(...dark);
    doc.setLineWidth(0.4);
    doc.setLineDashPattern([0.8, 1.2], 0);
    doc.line(x + contentW - 42, rsY + 4, x + contentW - 4, rsY + 4);
    doc.setLineDashPattern([], 0);
    doc.setFontSize(10);
    doc.text("Signature", x + contentW - 23, rsY + 8.5, { align: "center" });
  });

  doc.save("Gajanan_Weighbridge_Receipts.pdf");
}

// ===================== MAIN PAGE =====================

const Index = () => {
  const [activeFormat, setActiveFormat] = useState<BillFormat>("ss");
  const [ssForms, setSsForms] = useState<FormData[]>([emptyForm("ss")]);
  const [gajananForms, setGajananForms] = useState<FormData[]>([emptyForm("gajanan")]);

  const forms = activeFormat === "ss" ? ssForms : gajananForms;
  const setForms = activeFormat === "ss" ? setSsForms : setGajananForms;

  const updateForm = (index: number, data: FormData) => {
    const updated = [...forms];
    updated[index] = data;
    setForms(updated);
  };

  const addForm = () => setForms([...forms, emptyForm(activeFormat)]);
  const removeForm = (index: number) => {
    if (forms.length <= 1) return;
    setForms(forms.filter((_, i) => i !== index));
  };

  const downloadPDF = () => {
    if (activeFormat === "ss") {
      generatePDF(ssForms);
    } else {
      generateGajananPDF(gajananForms);
    }
  };

  const handleScan = (slip: ParsedSlip, choice: ScanChoice) => {
    const gross = toDigits(slip.gross, NUM_DIGITS);
    const tare = toDigits(slip.tare, NUM_DIGITS);
    const filled: FormData = {
      ...emptyForm(choice.format),
      location: choice.location,
      no: slip.no,
      date: slip.date,
      timeIn: slip.timeIn,
      timeOut: slip.timeOut,
      vehicleNo: slip.vehicleNo,
      grossWeight: gross,
      tareWeight: tare,
      netWeight: calcNetWeight(gross, tare),
      receivedRs: slip.rs,
      rs: slip.rs,
    };
    const isBlank = (f: FormData) =>
      !f.no && !f.vehicleNo && !f.ms && f.grossWeight.every((d) => !d) && f.tareWeight.every((d) => !d);
    const setter = choice.format === "ss" ? setSsForms : setGajananForms;
    setter((prev) => {
      const idx = prev.findIndex(isBlank);
      if (idx === -1) return [...prev, filled];
      const copy = [...prev];
      copy[idx] = filled;
      return copy;
    });
    setActiveFormat(choice.format);
  };

  const isSs = activeFormat === "ss";

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center justify-between shadow-sm flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveFormat("ss")}
            className={`px-4 py-1.5 text-sm rounded transition-transform active:scale-[0.97] ${
              isSs
                ? "bg-primary text-primary-foreground font-bold shadow"
                : "bg-secondary text-secondary-foreground hover:opacity-80"
            }`}
          >
            S.S. Dharmkata
          </button>
          <button
            onClick={() => setActiveFormat("gajanan")}
            className={`px-4 py-1.5 text-sm rounded transition-transform active:scale-[0.97] ${
              !isSs ? "text-white font-bold shadow" : "bg-secondary text-secondary-foreground hover:opacity-80"
            }`}
            style={!isSs ? { backgroundColor: G_NAVY } : undefined}
          >
            Gajanan Weighbridge
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ScanSlipDialog onDone={handleScan} />
          <button
            onClick={addForm}
            className={`px-4 py-1.5 text-sm rounded text-white hover:opacity-90 active:scale-[0.97] transition-transform ${
              isSs ? "bg-primary" : ""
            }`}
            style={!isSs ? { backgroundColor: G_NAVY } : undefined}
          >
            + Add Receipt
          </button>
          <button
            onClick={downloadPDF}
            className="px-4 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.97] transition-transform"
          >
            Download PDF
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto py-6 px-4 space-y-4">
        {forms.map((form, i) =>
          isSs ? (
            <ReceiptForm
              key={i}
              data={form}
              onChange={(d) => updateForm(i, d)}
              index={i}
              onRemove={() => removeForm(i)}
              canRemove={forms.length > 1}
            />
          ) : (
            <GajananReceiptForm
              key={i}
              data={form}
              onChange={(d) => updateForm(i, d)}
              index={i}
              onRemove={() => removeForm(i)}
              canRemove={forms.length > 1}
            />
          )
        )}
      </div>
    </div>
  );
};

export default Index;
