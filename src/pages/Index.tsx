import { useState } from "react";
import jsPDF from "jspdf";

const LOCATIONS = {
  shegaon: {
    label: "Shegaon",
    address: "Shegaon Dist.Buldana (MH) 444203",
  },
  wadkhal: {
    label: "Wadkhal",
    address: "Wadkhal Taluka Pen Dist.Raigad (MH) 402107",
  },
} as const;

type LocationKey = keyof typeof LOCATIONS;

interface FormData {
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

const emptyForm = (): FormData => ({
  location: "shegaon",
  no: "",
  date: "",
  timeIn: "",
  timeOut: "",
  ms: "",
  vehicleNo: "",
  grossWeight: ["", "", "", "", ""],
  tareWeight: ["", "", "", "", ""],
  netWeight: ["", "", "", "", ""],
  receivedRs: "",
  rs: "",
});

const inputClass =
  "border-b border-primary/40 bg-transparent text-foreground text-sm px-1 py-0.5 focus:outline-none focus:border-primary w-full";
const cellInputClass =
  "w-full h-full bg-transparent text-center text-sm focus:outline-none px-0.5";

const ReceiptForm = ({
  data,
  onChange,
  index,
  onRemove,
  canRemove,
}: {
  data: FormData;
  onChange: (d: FormData) => void;
  index: number;
  onRemove: () => void;
  canRemove: boolean;
}) => {
  const updateWeight = (
    type: "grossWeight" | "tareWeight",
    idx: number,
    val: string
  ) => {
    const arr = [...data[type]];
    arr[idx] = val;
    const updated = { ...data, [type]: arr };
    // Auto-calculate net weight
    const gross = type === "grossWeight" ? arr : data.grossWeight;
    const tare = type === "tareWeight" ? arr : data.tareWeight;
    updated.netWeight = gross.map((g, i) => {
      const gNum = parseFloat(g);
      const tNum = parseFloat(tare[i]);
      return !isNaN(gNum) && !isNaN(tNum) ? String(gNum - tNum) : "";
    });
    onChange(updated);
  };

  return (
    <div className="border-2 border-primary rounded px-5 py-4 bg-card relative">
      {canRemove && (
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          ✕ Remove
        </button>
      )}
      <p className="absolute top-2 left-3 text-[10px] text-muted-foreground">
        Receipt #{index + 1}
      </p>

      {/* Location selector */}
      <div className="mt-2 mb-1 flex justify-center">
        <select
          className="text-xs bg-secondary text-secondary-foreground rounded px-2 py-1 border border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary"
          value={data.location || "shegaon"}
          onChange={(e) => onChange({ ...data, location: e.target.value as LocationKey })}
        >
          {Object.entries(LOCATIONS).map(([key, loc]) => (
            <option key={key} value={key}>{loc.label}</option>
          ))}
        </select>
      </div>

      {/* Header */}
      <div className="text-center mb-2">
        <p className="text-xs text-primary/70">|| Shree ||</p>
        <h2 className="text-lg font-bold text-primary tracking-wide leading-tight">
          S.S. DHARMKATA
        </h2>
        <p className="text-xs text-primary/80 border-b border-primary/50 inline-block pb-0.5">
          {LOCATIONS[data.location].address} Mob : 9970041700
        </p>
        <p className="text-[10px] text-primary/60 mt-0.5">24/7 AVAILABLE</p>
      </div>

      <div className="flex justify-between items-center mb-1.5 gap-4">
        <div className="flex items-center gap-1 flex-1">
          <span className="text-sm font-semibold text-primary whitespace-nowrap">No.</span>
          <input className={inputClass + " max-w-[80px]"} value={data.no} onChange={(e) => onChange({ ...data, no: e.target.value })} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold text-primary">Date:</span>
          <input type="date" className={inputClass + " max-w-[130px]"} value={data.date} onChange={(e) => onChange({ ...data, date: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
        <div className="flex items-center gap-1">
          <span className="text-sm text-primary whitespace-nowrap">Time In</span>
          <input type="time" className={inputClass} value={data.timeIn} onChange={(e) => onChange({ ...data, timeIn: e.target.value })} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm text-primary whitespace-nowrap">Time Out</span>
          <input type="time" className={inputClass} value={data.timeOut} onChange={(e) => onChange({ ...data, timeOut: e.target.value })} />
        </div>
        <div className="flex items-center gap-1 col-span-2">
          <span className="text-sm text-primary whitespace-nowrap">M/s.</span>
          <input className={inputClass} value={data.ms} onChange={(e) => onChange({ ...data, ms: e.target.value })} />
        </div>
        <div className="flex items-center gap-1 col-span-2">
          <span className="text-sm text-primary whitespace-nowrap">Vehicle No.</span>
          <input className={inputClass} value={data.vehicleNo} onChange={(e) => onChange({ ...data, vehicleNo: e.target.value })} />
        </div>
      </div>

      <p className="text-center text-sm font-bold text-primary mb-1">KILOGRAMS</p>
      <table className="w-full border-collapse border border-primary mb-2">
        <tbody>
          {(["grossWeight", "tareWeight"] as const).map((type) => (
            <tr key={type}>
              <td className="border border-primary px-2 py-0.5 text-xs font-semibold text-primary w-28">
                {type === "grossWeight" ? "Gross Weight" : "Tare Weight"}
              </td>
              {data[type].map((val, i) => (
                <td key={i} className="border border-primary p-0">
                  <input className={cellInputClass} value={val} onChange={(e) => updateWeight(type, i, e.target.value)} />
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className="border border-primary px-2 py-0.5 text-xs font-semibold text-primary w-28">Net Weight</td>
            {data.netWeight.map((val, i) => (
              <td key={i} className="border border-primary p-0 bg-secondary/30">
                <span className="block text-center text-sm px-0.5 font-semibold">{val}</span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <p className="text-[10px] text-primary/70 text-center mb-2 leading-tight">
        Please Check Weight No Responsibility Accepted Once<br />Carrier Leave the Weight Bridge
      </p>

      <div className="flex justify-between items-end gap-4">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-1">
            <span className="text-sm text-primary">Received Rs.</span>
            <input className={inputClass + " max-w-[100px]"} value={data.receivedRs} onChange={(e) => onChange({ ...data, receivedRs: e.target.value })} />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-primary">Rs.</span>
            <input className={inputClass + " max-w-[100px]"} value={data.rs} onChange={(e) => onChange({ ...data, rs: e.target.value })} />
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-primary mb-4">For,</p>
          <p className="text-sm text-primary border-t border-primary/40 pt-0.5 px-4">Signature</p>
        </div>
      </div>
    </div>
  );
};

// PDF generation: 2 receipts per A4 page
function generatePDF(forms: FormData[]) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageW = 210;
  const margin = 10;
  const contentW = pageW - margin * 2;
  const slipH = 130; // height per slip
  const color: [number, number, number] = [180, 30, 70]; // dark rose

  forms.forEach((form, idx) => {
    const isSecondOnPage = idx % 2 === 1;
    const yStart = isSecondOnPage ? margin + slipH + 8 : margin;

    if (idx > 0 && !isSecondOnPage) doc.addPage();

    const x = margin;
    const y = yStart;

    // Border
    doc.setDrawColor(...color);
    doc.setLineWidth(0.5);
    doc.rect(x, y, contentW, slipH);

    // Header
    const locAddr = LOCATIONS[form.location].address;
    doc.setTextColor(...color);
    doc.setFontSize(8);
    doc.text("|| Shree ||", pageW / 2, y + 6, { align: "center" });
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("S.S. DHARMKATA", pageW / 2, y + 12, { align: "center" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`${locAddr} Mob : 9970041700`, pageW / 2, y + 17, { align: "center" });
    doc.line(x + 30, y + 18, x + contentW - 30, y + 18);
    doc.setFontSize(7);
    doc.text("24/7 AVAILABLE", pageW / 2, y + 22, { align: "center" });

    // No & Date
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("No.", x + 4, y + 25);
    doc.setFont("helvetica", "normal");
    doc.text(form.no, x + 14, y + 25);
    doc.text("Date:", x + contentW - 50, y + 25);
    doc.text(form.date, x + contentW - 35, y + 25);

    // Time In/Out
    doc.setFontSize(9);
    doc.text("Time In:", x + 4, y + 32);
    doc.text(form.timeIn, x + 24, y + 32);
    doc.text("Time Out:", x + contentW / 2, y + 32);
    doc.text(form.timeOut, x + contentW / 2 + 22, y + 32);

    // M/s
    doc.text("M/s.", x + 4, y + 39);
    doc.line(x + 14, y + 40, x + contentW - 4, y + 40);
    doc.text(form.ms, x + 16, y + 39);

    // Vehicle
    doc.text("Vehicle No.", x + 4, y + 46);
    doc.line(x + 26, y + 47, x + contentW - 4, y + 47);
    doc.text(form.vehicleNo, x + 28, y + 46);

    // KILOGRAMS heading
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("KILOGRAMS", pageW / 2, y + 54, { align: "center" });

    // Table
    const tableY = y + 57;
    const labelW = 28;
    const cellW = (contentW - labelW - 8) / 5;
    const rowH = 8;
    const tableX = x + 4;

    const rows = [
      { label: "Gross Weight", data: form.grossWeight },
      { label: "Tare Weight", data: form.tareWeight },
      { label: "Net Weight", data: form.netWeight },
    ];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    rows.forEach((row, ri) => {
      const ry = tableY + ri * rowH;
      doc.rect(tableX, ry, labelW, rowH);
      doc.setFont("helvetica", "bold");
      doc.text(row.label, tableX + 2, ry + 5.5);
      doc.setFont("helvetica", "normal");
      row.data.forEach((val, ci) => {
        const cx = tableX + labelW + ci * cellW;
        doc.rect(cx, ry, cellW, rowH);
        doc.text(val, cx + cellW / 2, ry + 5.5, { align: "center" });
      });
    });

    // Disclaimer
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    const disclaimerY = tableY + rowH * 3 + 5;
    doc.text("Please Check Weight No Responsibility Accepted Once", pageW / 2, disclaimerY, { align: "center" });
    doc.text("Carrier Leave the Weight Bridge", pageW / 2, disclaimerY + 4, { align: "center" });

    // Received & Signature
    doc.setFontSize(9);
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

const Index = () => {
  const [forms, setForms] = useState<FormData[]>([emptyForm()]);

  const updateForm = (index: number, data: FormData) => {
    const updated = [...forms];
    updated[index] = data;
    setForms(updated);
  };

  const addForm = () => setForms([...forms, emptyForm()]);
  const removeForm = (index: number) => setForms(forms.filter((_, i) => i !== index));

  return (
    <div className="min-h-screen bg-background">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
        <h1 className="text-lg font-bold text-primary">S.S. Dharmkata</h1>
        <div className="flex gap-2">
          <button
            onClick={addForm}
            className="px-4 py-1.5 text-sm rounded bg-secondary text-secondary-foreground hover:opacity-80 active:scale-[0.97] transition-transform"
          >
            + Add Receipt
          </button>
          <button
            onClick={() => generatePDF(forms)}
            className="px-4 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.97] transition-transform"
          >
            Download PDF
          </button>
        </div>
      </div>

      {/* Forms */}
      <div className="max-w-2xl mx-auto py-6 px-4 space-y-4">
        {forms.map((form, i) => (
          <ReceiptForm
            key={i}
            data={form}
            onChange={(d) => updateForm(i, d)}
            index={i}
            onRemove={() => removeForm(i)}
            canRemove={forms.length > 1}
          />
        ))}
      </div>
    </div>
  );
};

export default Index;
