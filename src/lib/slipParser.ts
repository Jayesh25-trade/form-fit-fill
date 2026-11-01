export interface ParsedSlip {
  no: string;
  date: string; // YYYY-MM-DD
  timeIn: string; // HH:MM
  timeOut: string; // HH:MM
  vehicleNo: string;
  gross: string;
  tare: string;
  rs: string;
}

const toIsoDate = (d: string, m: string, y: string) => {
  const yyyy = y.length === 2 ? `20${y}` : y;
  return `${yyyy}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
};

// OCR often mistakes letters for digits in numeric fields
const fixDigits = (s: string) =>
  s.replace(/[Oo]/g, "0").replace(/[Il|]/g, "1").replace(/[Ss]/g, "5").replace(/[B]/g, "8").replace(/[^0-9]/g, "");

function lineValue(lines: string[], re: RegExp): string {
  for (const l of lines) {
    const m = l.match(re);
    if (m) return m[1];
  }
  return "";
}

export function parseSlipText(raw: string): ParsedSlip {
  const text = raw.replace(/\r/g, "");
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const upper = lines.map((l) => l.toUpperCase());

  const weight = (label: RegExp) => {
    const v = lineValue(upper, new RegExp(label.source + "[^0-9A-Z]*(?:WEIGHT)?[^0-9]*?([0-9OISB]{3,6})\\s*K", "i"));
    if (v) return fixDigits(v);
    const v2 = lineValue(upper, new RegExp(label.source + "[^0-9]*([0-9OISB]{3,6})", "i"));
    return fixDigits(v2);
  };

  const gross = weight(/GROSS/);
  const tare = weight(/TARE/);

  const vehicleNo =
    (lineValue(upper, /VEH[A-Z.]*\s*NO[.:\s]*([A-Z]{2}\s?\d{1,2}\s?[A-Z]{0,3}\s?\d{3,4})/) ||
      (upper.join(" ").match(/\b([A-Z]{2}\s?\d{2}\s?[A-Z]{1,3}\s?\d{4})\b/) || [])[1] ||
      "").replace(/\s/g, "");

  const no = fixDigits(
    lineValue(upper, /(?:SR|RST|SL|SERIAL|RECEIPT|SLIP|TICKET)\.?\s*NO[.:\s]*([0-9OISB]{2,8})/)
  );

  // All date+time pairs in order of appearance
  const dtRe = /(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})[ ,T]*(\d{1,2}):(\d{2})/g;
  const gTimes: { date: string; time: string; line: string }[] = [];
  for (const l of upper) {
    let m: RegExpExecArray | null;
    dtRe.lastIndex = 0;
    while ((m = dtRe.exec(l))) {
      gTimes.push({ date: toIsoDate(m[1], m[2], m[3]), time: `${m[4].padStart(2, "0")}:${m[5]}`, line: l });
    }
  }
  let timeIn = "";
  let timeOut = "";
  let date = "";
  if (gTimes.length >= 2) {
    const tareT = gTimes.find((t) => t.line.includes("TARE"));
    const grossT = gTimes.find((t) => t.line.includes("GROSS"));
    const sorted = [...gTimes].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    timeIn = (tareT || sorted[0]).time;
    timeOut = (grossT || sorted[sorted.length - 1]).time;
    if (timeIn > timeOut && !tareT) [timeIn, timeOut] = [timeOut, timeIn];
    date = (grossT || sorted[sorted.length - 1]).date;
  } else if (gTimes.length === 1) {
    date = gTimes[0].date;
    timeOut = gTimes[0].time;
  }
  if (!date) {
    const d = text.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (d) date = toIsoDate(d[1], d[2], d[3]);
  }

  const rs = fixDigits(
    lineValue(upper, /CHARGES?\s*\(?TOTAL\)?[^0-9]*([0-9OI]{1,5})/) ||
      lineValue(upper, /CHARGES?[^0-9(]*([0-9OI]{1,5})/) ||
      lineValue(upper, /(?:RS|AMOUNT)[.:\s]*([0-9]{1,5})/)
  );

  return { no, date, timeIn, timeOut, vehicleNo, gross, tare, rs };
}

export function toDigits(n: string, count = 5): string[] {
  const s = n.replace(/\D/g, "").slice(-count).padStart(count, "");
  const arr = s.split("");
  while (arr.length < count) arr.unshift("");
  return arr;
}
