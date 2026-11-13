import { useState } from "react";
import jsPDF from "jspdf";
import ScanSlipDialog, { type ScanChoice } from "@/components/ScanSlipDialog";
import { calculateNetWeight, toDigits, type ParsedSlip } from "@/lib/slipParser";
import { Button } from "@/components/ui/button";
import { Download, Plus, Scale, Truck } from "lucide-react";

const LOCATIONS = {
  shegaon: { label: "Shegaon", address: "Shegaon Dist.Buldana (MH) 444203" },
  wadkhal: { label: "Wadkhal", address: "Wadkhal Taluka Pen Dist.Raigad (MH) 402107" },
  kasoda: { label: "Kasoda", address: "Kasoda, Taluka Erandol, Dist. Jalgaon (MH)" },
} as const;

type LocationKey = keyof typeof LOCATIONS;
type BillFormat = "ss" | "gajanan";
const NUM_DIGITS = 5;
const GAJANAN_ADDRESS = "Shegaon Dist. Buldana (MH) 444203";
const GAJANAN_MOB = "07265252511";
const G_NAVY = "#1b3a6b";
const G_RED = "#c0392b";
const G_TABLE_HEAD = "#dbe7f3";

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

const fieldClass = "w-full min-w-0 border border-input bg-background px-3 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const weightClass = "w-full min-w-0 border border-input bg-background px-3 py-3 text-xl font-bold font-mono text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface ReceiptFormProps {
  data: FormData;
  onChange: (data: FormData) => void;
  index: number;
  onRemove: () => void;
  canRemove: boolean;
}

interface WeightFieldsProps {
  data: FormData;
  onChange: (data: FormData) => void;
  gajanan: boolean;
}

const getWeightValue = (digits: string[]) => digits.join("").replace(/^0+/, "");

function WeightFields({ data, onChange, gajanan }: WeightFieldsProps) {
  const updateWeight = (type: "grossWeight" | "tareWeight", raw: string) => {
    const digits = toDigits(raw.replace(/\D/g, "").slice(0, NUM_DIGITS), NUM_DIGITS);
    const next = { ...data, [type]: digits };
    next.netWeight = calculateNetWeight(next.grossWeight, next.tareWeight);
    onChange(next);
  };
  const weightFields = [
    { key: "grossWeight" as const, label: "Gross Weight" },
    { key: "tareWeight" as const, label: "Tare Weight" },
  ];

  return (
    <section className="space-y-3 border-y border-border py-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold uppercase tracking-wide" style={gajanan ? { color: G_NAVY } : undefined}>Weight details</h3>
        <span className="text-xs font-medium text-muted-foreground">All weights in kg</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {weightFields.map(({ key, label }) => (
          <label key={key} className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
            <input
              aria-label={label}
              className={weightClass}
              type="text"
              inputMode="numeric"
              maxLength={NUM_DIGITS}
              value={getWeightValue(data[key])}
              onChange={(event) => updateWeight(key, event.target.value)}
            />
          </label>
        ))}
        <div className="space-y-1.5">
          <span className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">Net Weight</span>
          <output aria-label="Net Weight" className="flex h-[50px] items-center border border-primary/30 bg-primary/5 px-3 font-mono text-xl font-extrabold text-primary" style={gajanan ? { color: G_NAVY, backgroundColor: G_TABLE_HEAD } : undefined}>
            {getWeightValue(data.netWeight) || "—"}
          </output>
        </div>
      </div>
    </section>
  );
}

function ReceiptFields({ data, onChange }: { data: FormData; onChange: (data: FormData) => void }) {
  const fields = [
    { label: "Receipt No.", name: "no" as const, type: "text" },
    { label: "Date", name: "date" as const, type: "date" },
    { label: "Time In", name: "timeIn" as const, type: "time" },
    { label: "Time Out", name: "timeOut" as const, type: "time" },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map(({ label, name, type }) => (
        <label key={name} className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
          <input aria-label={label} type={type} className={fieldClass} value={data[name]} onChange={(event) => onChange({ ...data, [name]: event.target.value })} />
        </label>
      ))}
      <label className="block space-y-1.5 sm:col-span-2">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">M/s. / Party Name</span>
        <input aria-label="M/s. / Party Name" className={fieldClass} value={data.ms} onChange={(event) => onChange({ ...data, ms: event.target.value })} />
      </label>
      <label className="block space-y-1.5 sm:col-span-2">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Vehicle No.</span>
        <input aria-label="Vehicle No." className={`${fieldClass} uppercase`} value={data.vehicleNo} onChange={(event) => onChange({ ...data, vehicleNo: event.target.value.toUpperCase() })} />
      </label>
    </div>
  );
}

function ReceiptForm({ data, onChange, index, onRemove, canRemove }: ReceiptFormProps) {
  const location = LOCATIONS[data.location || "shegaon"];
  return (
    <section className="relative overflow-hidden border border-border bg-card shadow-sm">
      {canRemove && <Button onClick={onRemove} variant="outline" size="sm" className="absolute right-3 top-3 z-10 no-print">Remove receipt</Button>}
      <div className="bg-primary px-5 py-4 text-primary-foreground">
        <div className="flex flex-wrap items-start justify-between gap-3 pr-32 sm:pr-40">
          <div>
            <h2 className="mt-1 text-2xl font-extrabold leading-tight">S.S. DHARMKATA</h2>
            <p className="mt-1 text-sm font-medium">{location.address} · Mob: 9970041700</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold">24/7 AVAILABLE</p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/50 px-5 py-3">
        <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground" htmlFor={`ss-location-${index}`}>Weighbridge location</label>
        <select id={`ss-location-${index}`} className="border border-input bg-background px-3 py-2 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={data.location || "shegaon"} onChange={(event) => onChange({ ...data, location: event.target.value as LocationKey })}>
          {Object.entries(LOCATIONS).map(([key, option]) => <option key={key} value={key}>{option.label}</option>)}
        </select>
      </div>
      <div className="space-y-5 p-5 sm:p-6">
        <ReceiptFields data={data} onChange={onChange} />
        <WeightFields data={data} onChange={onChange} gajanan={false} />
        <ReceiptFooter data={data} onChange={onChange} businessName="S.S. Dharmkata" />
      </div>
    </section>
  );
}

function GajananReceiptForm({ data, onChange, index, onRemove, canRemove }: ReceiptFormProps) {
  return (
    <section className="relative overflow-hidden border border-border bg-card shadow-sm">
      {canRemove && <Button onClick={onRemove} variant="outline" size="sm" className="absolute right-3 top-3 z-10 no-print">Remove receipt</Button>}
      <div className="px-5 py-5 sm:px-6">
        <header className="mb-5 border-b border-border pb-4 pr-32 text-center sm:pr-40">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: G_RED }}>|| Shree ||</p>
          <h2 className="mt-1 text-2xl font-extrabold leading-tight sm:text-3xl" style={{ color: G_NAVY, fontFamily: "Georgia, 'Times New Roman', serif" }}>GAJANAN WEIGHBRIDGE</h2>
          <p className="mt-1 text-sm font-semibold text-foreground">{GAJANAN_ADDRESS} · Mob: {GAJANAN_MOB}</p>
          <span className="mt-2 inline-block px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-primary-foreground" style={{ backgroundColor: G_RED }}>24/7 Available</span>
        </header>
        <div className="space-y-5">
          <ReceiptFields data={data} onChange={onChange} />
          <WeightFields data={data} onChange={onChange} gajanan />
          <ReceiptFooter data={data} onChange={onChange} businessName="Gajanan Weighbridge" />
        </div>
      </div>
    </section>
  );
}

function ReceiptFooter({ data, onChange, businessName }: { data: FormData; onChange: (data: FormData) => void; businessName: string }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Received Rs.</span>
          <input aria-label="Received Rs." className={fieldClass} value={data.receivedRs} onChange={(event) => onChange({ ...data, receivedRs: event.target.value })} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Rs.</span>
          <input aria-label="Rs." className={fieldClass} value={data.rs} onChange={(event) => onChange({ ...data, rs: event.target.value })} />
        </label>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-t border-border pt-4">
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">Please check weight. No responsibility accepted once carrier leaves the weighbridge.</p>
        <div className="min-w-40 text-center">
          <p className="mb-6 text-sm font-semibold text-foreground">For {businessName}</p>
          <p className="border-t border-dotted border-foreground/60 pt-1 text-xs font-semibold text-muted-foreground">Authorized Signature</p>
        </div>
      </div>
    </>
  );
}

function generateReceiptPDF(forms: FormData[], format: BillFormat) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageW = 210;
  const margin = 10;
  const contentW = pageW - margin * 2;
  const slipH = 130;
  const gajanan = format === "gajanan";
  const navy: [number, number, number] = gajanan ? [27, 58, 107] : [180, 30, 70];
  const red: [number, number, number] = gajanan ? [192, 57, 43] : navy;
  const dark: [number, number, number] = [34, 34, 34];
  const text = (value: string, x: number, y: number, size = 10, color = dark, bold = true) => {
    doc.setTextColor(...color);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.text(value || "—", x, y);
  };
  const valueLine = (label: string, value: string, x: number, y: number, width: number, valueSize = 11) => {
    text(label, x, y, 8, [95, 95, 95]);
    text(value || "—", x, y + 6, valueSize, dark);
    doc.setDrawColor(205, 210, 215);
    doc.setLineWidth(0.25);
    doc.line(x, y + 8, x + width, y + 8);
  };

  forms.forEach((form, idx) => {
    const second = idx % 2 === 1;
    if (idx > 0 && !second) doc.addPage();
    const x = margin;
    const y = second ? margin + slipH + 8 : margin;
    doc.setDrawColor(...navy);
    doc.setLineWidth(0.6);
    doc.rect(x, y, contentW, slipH);
    doc.setFillColor(...navy);
    doc.rect(x, y, contentW, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("times", "bold");
    doc.setFontSize(9);
    doc.text("|| Shree ||", pageW / 2, y + 5.5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(gajanan ? 18 : 16);
    doc.text(gajanan ? "GAJANAN WEIGHBRIDGE" : "S.S. DHARMKATA", pageW / 2, y + 13.5, { align: "center" });
    doc.setFontSize(8);
    const address = gajanan ? `${GAJANAN_ADDRESS} | Mob: ${GAJANAN_MOB}` : `${LOCATIONS[form.location || "shegaon"].address} | Mob: 9970041700`;
    doc.text(address, pageW / 2, y + 20, { align: "center" });
    doc.setTextColor(...red);
    doc.setFontSize(8);
    doc.text("24/7 AVAILABLE", pageW / 2, y + 30, { align: "center" });

    valueLine("RECEIPT NO.", form.no, x + 5, y + 43, 72, 11);
    valueLine("DATE", form.date, x + 84, y + 43, 48, 10);
    valueLine("VEHICLE NO.", form.vehicleNo, x + 139, y + 43, 46, 11);
    valueLine("TIME IN", form.timeIn, x + 5, y + 58, 55, 10);
    valueLine("TIME OUT", form.timeOut, x + 68, y + 58, 55, 10);
    valueLine("M/s. / PARTY NAME", form.ms, x + 131, y + 58, 54, 10);

    doc.setDrawColor(220, 224, 228);
    doc.setLineWidth(0.25);
    doc.line(x + 5, y + 76, x + contentW - 5, y + 76);
    const weightX = [x + 5, x + 71, x + 137];
    const weightLabels = ["GROSS WEIGHT", "TARE WEIGHT", "NET WEIGHT"];
    const weightValues = [getWeightValue(form.grossWeight), getWeightValue(form.tareWeight), getWeightValue(form.netWeight)];
    weightLabels.forEach((label, i) => {
      text(label, weightX[i], y + 84, 8, [95, 95, 95]);
      const v = weightValues[i] || "—";
      text(v, weightX[i], y + 96, 19, i === 2 ? navy : dark);
      if (weightValues[i]) {
        doc.setFontSize(19);
        const w = doc.getTextWidth(v);
        text("kg", weightX[i] + w + 1.5, y + 96, 10, [95, 95, 95]);
      }
    });
    doc.setDrawColor(...navy);
    doc.setLineWidth(0.45);
    doc.line(x + 5, y + 103, x + contentW - 5, y + 103);

    valueLine("RECEIVED RS.", form.receivedRs, x + 5, y + 108, 58, 10);
    valueLine("RS.", form.rs, x + 72, y + 108, 58, 10);
    doc.setTextColor(...dark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("For " + (gajanan ? "Gajanan Weighbridge" : "S.S. Dharmkata"), x + contentW - 5, y + 111, { align: "right" });
    doc.setDrawColor(120, 120, 120);
    doc.setLineDashPattern([0.8, 1.2], 0);
    doc.line(x + contentW - 43, y + 120, x + contentW - 5, y + 120);
    doc.setLineDashPattern([], 0);
    doc.setFontSize(7);
    doc.text("Authorized Signature", x + contentW - 24, y + 124, { align: "center" });
    doc.setTextColor(...red);
    doc.setFontSize(6.5);
    doc.text("Please check weight. No responsibility accepted once carrier leaves the weighbridge.", x + 5, y + 125);
  });
  doc.save(gajanan ? "Gajanan_Weighbridge_Receipts.pdf" : "SS_Dharmkata_Receipts.pdf");
}

const Index = () => {
  const [activeFormat, setActiveFormat] = useState<BillFormat>("ss");
  const [ssForms, setSsForms] = useState<FormData[]>([emptyForm("ss")]);
  const [gajananForms, setGajananForms] = useState<FormData[]>([emptyForm("gajanan")]);
  const forms = activeFormat === "ss" ? ssForms : gajananForms;
  const setForms = activeFormat === "ss" ? setSsForms : setGajananForms;
  const isSs = activeFormat === "ss";

  const updateForm = (index: number, data: FormData) => setForms((previous) => previous.map((form, i) => i === index ? data : form));
  const addForm = () => setForms((previous) => [...previous, emptyForm(activeFormat)]);
  const removeForm = (index: number) => setForms((previous) => previous.length > 1 ? previous.filter((_, i) => i !== index) : previous);
  const downloadPDF = () => generateReceiptPDF(forms, activeFormat);

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
      netWeight: calculateNetWeight(gross, tare),
      receivedRs: slip.rs,
      rs: slip.rs,
    };
    const setter = choice.format === "ss" ? setSsForms : setGajananForms;
    setter((previous) => {
      const blankIndex = previous.findIndex((form) => !form.no && !form.vehicleNo && !form.ms && form.grossWeight.every((digit) => !digit) && form.tareWeight.every((digit) => !digit));
      if (blankIndex < 0) return [...previous, filled];
      return previous.map((form, index) => index === blankIndex ? filled : form);
    });
    setActiveFormat(choice.format);
  };

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-20 border-b border-border bg-card shadow-sm no-print">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary text-primary-foreground"><Scale className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-foreground">Weighbridge Desk</p>
              <p className="text-xs text-muted-foreground">Computerized receipt entry</p>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="flex flex-1 border border-border bg-muted/60 p-1 sm:flex-none">
              <Button variant={isSs ? "default" : "ghost"} size="sm" onClick={() => setActiveFormat("ss")} className="flex-1 sm:flex-none">S.S. Dharmkata</Button>
              <Button variant={!isSs ? "default" : "ghost"} size="sm" onClick={() => setActiveFormat("gajanan")} className="flex-1 sm:flex-none" style={!isSs ? { backgroundColor: G_NAVY, color: "white" } : undefined}>Gajanan</Button>
            </div>
            <ScanSlipDialog onDone={handleScan} />
            <Button variant="outline" onClick={addForm}><Plus className="h-4 w-4" />Add Receipt</Button>
            <Button onClick={downloadPDF} style={!isSs ? { backgroundColor: G_NAVY } : undefined}><Download className="h-4 w-4" />Download PDF</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Current format</p>
            <h1 className="mt-1 text-xl font-extrabold text-foreground">{isSs ? "S.S. Dharmkata" : "Gajanan Weighbridge"}</h1>
          </div>
          <div className="hidden items-center gap-2 text-xs font-medium text-muted-foreground sm:flex"><Truck className="h-4 w-4" />{forms.length} {forms.length === 1 ? "receipt" : "receipts"}</div>
        </div>
        <div className="space-y-5">
          {forms.map((form, index) => isSs ? (
            <ReceiptForm key={index} data={form} onChange={(updated) => updateForm(index, updated)} index={index} onRemove={() => removeForm(index)} canRemove={forms.length > 1} />
          ) : (
            <GajananReceiptForm key={index} data={form} onChange={(updated) => updateForm(index, updated)} index={index} onRemove={() => removeForm(index)} canRemove={forms.length > 1} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Index;
