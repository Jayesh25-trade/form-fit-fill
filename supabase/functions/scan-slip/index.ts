const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPT = `You read Indian weighbridge (dharmkata) slips. The photo may be rotated or a dot-matrix print.
Extract and return JSON only:
- no: slip/serial/RST number (digits as printed, keep leading zeros)
- vehicleNo: vehicle number, uppercase, no spaces (e.g. MH46AR4053)
- gross: gross weight in kg, digits only
- tare: tare weight in kg, digits only
- date: date in YYYY-MM-DD (use the gross weighing date)
- timeIn: time of TARE weighing HH:MM (24h)
- timeOut: time of GROSS weighing HH:MM (24h)
- rs: total charges in rupees, digits only
Use "" for anything not visible.`;

const schema = {
  type: "object",
  properties: Object.fromEntries(
    ["no", "vehicleNo", "gross", "tare", "date", "timeIn", "timeOut", "rs"].map((k) => [k, { type: "string" }])
  ),
  required: ["no", "vehicleNo", "gross", "tare", "date", "timeIn", "timeOut", "rs"],
  additionalProperties: false,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { image } = await req.json();
    if (typeof image !== "string" || !image.startsWith("data:image/")) {
      return Response.json({ error: "Please upload an image." }, { status: 400, headers: cors });
    }
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
        response_format: { type: "json_schema", json_schema: { name: "slip", strict: true, schema } },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("gateway", res.status, t);
      const msg =
        res.status === 429 ? "Too many scans, please wait a moment." :
        res.status === 402 ? "AI credits are used up. Please add credits." :
        "Could not read the slip.";
      return Response.json({ error: msg }, { status: res.status, headers: cors });
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    const slip = JSON.parse(content.replace(/^```json|```$/g, "").trim());
    return Response.json(slip, { headers: cors });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Could not read the slip." }, { status: 500, headers: cors });
  }
});
