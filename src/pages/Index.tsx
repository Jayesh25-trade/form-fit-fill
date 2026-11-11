import { useState } from "react";
import jsPDF from "jspdf";
import ScanSlipDialog, { type ScanChoice } from "@/components/ScanSlipDialog";
import { calculateNetWeight, toDigits, type ParsedSlip } from "@/lib/slipParser";
import { Button } from "@/components/ui/button";
import { Download, Plus, Scale, Truck } from "lucide-react";

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

const inputClass =
  "min-w-0 w-full border border-input bg-background px-2.5 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const weightInputClass =
  "w-full border border-input bg-background px-3 py-3 text-xl font-bold font-mono text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// Gajanan format colors (from the reference bill)
const G_NAVY = "#1b3a6b";
const G_RED = "#c0392b";
const G_BEIGE = "#f7ecd9";
const G_TABLE_HEAD = "#dbe7f3";

const gajananBoxClass =
  "w-full bg-[#f7ecd9] border border-[#d8c9a8] rounded-sm px-2 py-1 text-base font-bold text-[#1b3a6b] focus:outline-none focus:ring-1 focus:ring-[#1b3a6b]";
const gajananDigitClass =
  "w-full border border-input bg-background px-3 py-3 text-xl font-bold font-mono text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface ReceiptFormProps {
  data: FormData;
  onChange: (d: FormData) => void;
  index: number;
  onRemove: () => void;
  canRemove: boolean;
}

interface WeightFieldsProps {
  data: FormData;
  onChange: (data: FormData) => void;
  gajanan?: boolean;
}

const WeightFields = ({ data, onChange, gajanan = false }: WeightFieldsProps) => {
  const changeWeight = (type: "grossWeight" | "tareWeight", value: string) => {
    const next = { ...data, [type]: toDigits(value.replace(/\D/g, "").slice(0, NUM_DIGITS), NUM_DIGITS) };
    next.netWeight = calculateNetWeight(next.grossWeight, next.tareWeight);
    onChange(next);
  };
  const fields = [
    { key: "grossWeight" as const, label: "Gross Weight" },
    { key: "tareWeight" as const, label: "Tare Weight" },
  ];
  const inputStyle = gajanan ? gajananDigitClass : weightInputClass;
  const value = (digits: string[]) => digits.join("").replace(/^0+/, "");

  return (
    <div className="space-y-3 border-y border-border py-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold uppercase tracking-wide" style={gajanan ? { color: G_NAVY } : undefined}>Weight Details</h3>
        <span className="text-xs font-semibold text-muted-foreground">All weights in kg</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {fields.map(({ key, label }) => (
          <label key={key} className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
            <input aria-label={label} className={inputStyle} type="text" inputMode="numeric" maxLength={NUM_DIGITS} value={value(data[key])} onChange={(e) => changeWeight(key, e.target.value)} />
          </label>
        ))}
        <div className="space-y-1.5">
          <span className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">Net Weight</span>
          <div aria-label="Net Weight" className={`flex h-[50px] items-center border border-border px-3 font-mono text-xl font-extrabold ${gajanan ? "" : "border-primary/40 bg-primary/5 text-primary"}`} style={gajanan ? { backgroundColor: G_TABLE_HEAD, color: G_NAVY } : undefined}>
            {value(data.netWeight) || "—"}
          </div>
        </div>
      </div>
    </div>
  );
};

const ReceiptForm = ({ data, onChange, index, onRemove, canRemove }: ReceiptFormProps) => {
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

        <WeightFields data={data} onChange={onChange} />

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
            <span className="text-xs font-semibold text-muted-foreground">All weights in kg</span>
          </div>
          <WeightFields data={data} onChange={onChange} gajanan />
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

// Computerized weighbridge receipt PDF: 2 clean, table-free receipts per A4 page.
function generateReceiptPDF(forms: FormData[], format: BillFormat) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageW = 210;
  const margin = 10;
  const contentW = pageW - margin * 2;
  const slipH = 130;
  const isGajanan = format === "gajanan";
  const navy: [number, number, number] = isGajanan ? [27, 58, 107] : [180, 30, 70];
  const red: [number, number, number] = isGajanan ? [192, 57, 43] : navy;
  const dark: [number, number, number] = [34, 34, 34];

  forms.forEach((form, idx) => {
    const isSecondOnPage = idx % 2 === 1;
    const yStart = isSecondOnPage ? margin + slipH + 8 : margin;

    if (idx > 0 && !isSecondOnPage) doc.addPage();

    const x = margin;
    const y = yStart;

    // Distinctive receipt frame and clear computerized header.
    doc.setDrawColor(...navy);
    doc.setLineWidth(0.65);
    doc.rect(x, y, contentW, slipH);
    doc.setFillColor(...navy);
    doc.rect(x, y, contentW, 25, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("times", "bold");
    doc.setFontSize(9);
    doc.text("|| Shree ||", pageW / 2, y + 6, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isGajanan ? 18 : 16);
    doc.text(isGajanan ? "GAJANAN WEIGHBRIDGE" : "S.S. DHARMKATA", pageW / 2, y + 14, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const address = isGajanan ? `${GAJANAN_ADDRESS} | Mob: ${GAJANAN_MOB}` : `${LOCATIONS[form.location || "shegaon"].address} | Mob: 9970041700`;
    doc.text(address, pageW / 2, y + 20, { align: "center
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
