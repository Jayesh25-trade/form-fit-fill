import { describe, it, expect } from "vitest";
import { calculateNetWeight, parseSlipText, toDigits } from "@/lib/slipParser";

const divine = `DIVINE COAL CORPORATION
PLOT NO.87/4 MAUJE VAVE NEAR J.S.W.PARKING WADKHAL POST-PEN (RAIGAD) PIN-402107
SR. NO. : 009855    DATE : 01-11-2026    TIME : 21:33
VEH. NO.: MH46AR4053   VEH.TYPE:   MATERIAL:
PARTY :   CHARGES : 200/-
GROSS WEIGHT : 33960Kg  01-11-2026,21:33
TARE WEIGHT : 11790Kg  01-11-2026,20:12
NET WEIGHT : 22170Kg
PAYMENT : CASH  DRIVER : OUT`;

const patidar = `PATIDAR BIO ENERGY
RST NO : 13598
VEHICLE NO : MH19CY9175
GROSS: 28795 kg Date:31/10/2026 15:52
TARE : 9585 kg Date:31/10/2026 12:49
NET : 19210 kg
Charges(1): Rs. 100
Charges(2): Rs. 0
Charges(total): Rs. 100`;

describe("parseSlipText", () => {
  it("reads Divine Coal slip", () => {
    const p = parseSlipText(divine);
    expect(p.no).toBe("009855");
    expect(p.vehicleNo).toBe("MH46AR4053");
    expect(p.gross).toBe("33960");
    expect(p.tare).toBe("11790");
    expect(p.date).toBe("2026-11-01");
    expect(p.timeIn).toBe("20:12");
    expect(p.timeOut).toBe("21:33");
    expect(p.rs).toBe("200");
  });
  it("reads Patidar slip", () => {
    const p = parseSlipText(patidar);
    expect(p.no).toBe("13598");
    expect(p.vehicleNo).toBe("MH19CY9175");
    expect(p.gross).toBe("28795");
    expect(p.tare).toBe("9585");
    expect(p.timeIn).toBe("12:49");
    expect(p.timeOut).toBe("15:52");
    expect(p.rs).toBe("100");
  });
  it("pads digits to 5 boxes", () => {
    expect(toDigits("9585")).toEqual(["", "9", "5", "8", "5"]);
  });
  it("calculates net weight from full gross and tare values", () => {
    expect(calculateNetWeight(toDigits("33960"), toDigits("11790")).join("")).toBe("22170");
  });
});
