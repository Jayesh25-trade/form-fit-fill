import { useState, useRef } from "react";

interface FormData {
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

const ReceiptSlip = ({
  data,
  onChange,
  copyLabel,
}: {
  data: FormData;
  onChange: (d: FormData) => void;
  copyLabel: string;
}) => {
  const updateWeight = (
    type: "grossWeight" | "tareWeight" | "netWeight",
    idx: number,
    val: string
  ) => {
    const arr = [...data[type]];
    arr[idx] = val;
    onChange({ ...data, [type]: arr });
  };

  const inputClass =
    "border-b border-primary/40 bg-transparent text-foreground text-sm px-1 py-0.5 focus:outline-none focus:border-primary w-full print:border-b print:border-primary/30";
  const cellInputClass =
    "w-full h-full bg-transparent text-center text-sm focus:outline-none px-0.5";

  return (
    <div className="print-page border-2 border-primary rounded px-5 py-4 bg-card relative" style={{ height: "calc(50vh - 80px)", minHeight: "340px", maxHeight: "480px" }}>
      {/* Copy label */}
      <div className="absolute top-1 right-2 text-[10px] text-muted-foreground italic no-print">
        {copyLabel}
      </div>

      {/* Header */}
      <div className="text-center mb-2">
        <p className="text-xs text-primary/70">|| Shree ||</p>
        <h2 className="text-lg font-bold text-primary tracking-wide leading-tight">
          S.S. DHARMKATA
        </h2>
        <p className="text-xs text-primary/80 border-b border-primary/50 inline-block pb-0.5">
          Shegaon Dist.Buldana (M.S.) 444203 Mob : 9970041700
        </p>
      </div>

      {/* No & Date row */}
      <div className="flex justify-between items-center mb-1.5 gap-4">
        <div className="flex items-center gap-1 flex-1">
          <span className="text-sm font-semibold text-primary whitespace-nowrap">No.</span>
          <input
            className={inputClass + " max-w-[80px]"}
            value={data.no}
            onChange={(e) => onChange({ ...data, no: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold text-primary">Date:</span>
          <input
            type="date"
            className={inputClass + " max-w-[130px]"}
            value={data.date}
            onChange={(e) => onChange({ ...data, date: e.target.value })}
          />
        </div>
      </div>

      {/* Time In/Out, M/s, Vehicle */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
        <div className="flex items-center gap-1">
          <span className="text-sm text-primary whitespace-nowrap">Time In</span>
          <input
            type="time"
            className={inputClass}
            value={data.timeIn}
            onChange={(e) => onChange({ ...data, timeIn: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm text-primary whitespace-nowrap">Time Out</span>
          <input
            type="time"
            className={inputClass}
            value={data.timeOut}
            onChange={(e) => onChange({ ...data, timeOut: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-1 col-span-2">
          <span className="text-sm text-primary whitespace-nowrap">M/s.</span>
          <input
            className={inputClass}
            value={data.ms}
            onChange={(e) => onChange({ ...data, ms: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-1 col-span-2">
          <span className="text-sm text-primary whitespace-nowrap">Vehicle No.</span>
          <input
            className={inputClass}
            value={data.vehicleNo}
            onChange={(e) => onChange({ ...data, vehicleNo: e.target.value })}
          />
        </div>
      </div>

      {/* Kilograms Table */}
      <p className="text-center text-sm font-bold text-primary mb-1">KILOGRAMS</p>
      <table className="w-full border-collapse border border-primary mb-2">
        <tbody>
          {(["grossWeight", "tareWeight", "netWeight"] as const).map((type) => (
            <tr key={type}>
              <td className="border border-primary px-2 py-0.5 text-xs font-semibold text-primary w-28">
                {type === "grossWeight"
                  ? "Gross Weight"
                  : type === "tareWeight"
                  ? "Tare Weight"
                  : "Net Weight"}
              </td>
              {data[type].map((val, i) => (
                <td key={i} className="border border-primary p-0">
                  <input
                    className={cellInputClass}
                    value={val}
                    onChange={(e) => updateWeight(type, i, e.target.value)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Disclaimer */}
      <p className="text-[10px] text-primary/70 text-center mb-2 leading-tight">
        Please Check Weight No Responsibility Accepted Once
        <br />
        Carrier Leave the Weight Bridge
      </p>

      {/* Received & Signature */}
      <div className="flex justify-between items-end gap-4">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-1">
            <span className="text-sm text-primary">Received Rs.</span>
            <input
              className={inputClass + " max-w-[100px]"}
              value={data.receivedRs}
              onChange={(e) => onChange({ ...data, receivedRs: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-primary">Rs.</span>
            <input
              className={inputClass + " max-w-[100px]"}
              value={data.rs}
              onChange={(e) => onChange({ ...data, rs: e.target.value })}
            />
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-primary mb-4">For,</p>
          <p className="text-sm text-primary border-t border-primary/40 pt-0.5 px-4">
            Signature
          </p>
        </div>
      </div>
    </div>
  );
};

const Index = () => {
  const [formData, setFormData] = useState<FormData>(emptyForm());
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => window.print();
  const handleClear = () => setFormData(emptyForm());

  return (
    <div className="min-h-screen bg-background">
      {/* Toolbar */}
      <div className="no-print sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
        <h1 className="text-lg font-bold text-primary">S.S. Dharmkata - Digital Receipt</h1>
        <div className="flex gap-2">
          <button
            onClick={handleClear}
            className="px-4 py-1.5 text-sm rounded bg-secondary text-secondary-foreground hover:opacity-80 active:scale-[0.97] transition-transform"
          >
            Clear
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.97] transition-transform"
          >
            Print
          </button>
        </div>
      </div>

      {/* A4 Preview - 2 copies */}
      <div className="flex justify-center py-6 px-4 no-print">
        <div
          ref={printRef}
          className="bg-card shadow-lg border border-border flex flex-col gap-3 p-6"
          style={{ width: "210mm", maxWidth: "100%" }}
        >
          <ReceiptSlip data={formData} onChange={setFormData} copyLabel="Copy 1" />
          <div className="border-t border-dashed border-primary/30" />
          <ReceiptSlip data={formData} onChange={setFormData} copyLabel="Copy 2" />
        </div>
      </div>

      {/* Print layout (hidden on screen, shown on print) */}
      <div className="hidden print:flex print:flex-col print:gap-3 print:p-4">
        <ReceiptSlip data={formData} onChange={setFormData} copyLabel="Copy 1" />
        <div className="border-t border-dashed border-primary/30" />
        <ReceiptSlip data={formData} onChange={setFormData} copyLabel="Copy 2" />
      </div>
    </div>
  );
};

export default Index;
