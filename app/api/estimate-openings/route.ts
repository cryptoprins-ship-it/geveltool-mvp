import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function toPositiveNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function buildDataUrl(mimeType: string, base64: string) {
  return `data:${mimeType};base64,${base64}`;
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY ontbreekt." },
        { status: 500 }
      );
    }

    const formData = await req.formData();

    const image = formData.get("image");
    const sideWidthCm = toPositiveNumber(formData.get("sideWidthCm"));
    const sideHeightCm = toPositiveNumber(formData.get("sideHeightCm"));
    const sideName =
      typeof formData.get("sideName") === "string"
        ? String(formData.get("sideName"))
        : "Zijde";

    if (!(image instanceof File)) {
      return NextResponse.json(
        { error: "Geen afbeelding ontvangen." },
        { status: 400 }
      );
    }

    if (!sideWidthCm || !sideHeightCm) {
      return NextResponse.json(
        { error: "Breedte en hoogte zijn verplicht." },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await image.arrayBuffer());
    const mimeType = image.type || "image/jpeg";
    const dataUrl = buildDataUrl(mimeType, bytes.toString("base64"));

    const response = await client.responses.create({
      model: "gpt-4o-2024-08-06",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "Je bent een nauwkeurige bouwkundige vision-extractor. " +
                "Je detecteert ramen, deuren en andere openingen in gevels. " +
                "Gebruik opgegeven afmetingen als schaal. " +
                "Wees conservatief en geef onzekerheid aan.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                `Analyseer deze gevelafbeelding voor ${sideName}. ` +
                `De echte breedte is ${sideWidthCm} cm. ` +
                `De echte hoogte is ${sideHeightCm} cm. ` +
                `Gebruik dit als schaal. ` +
                `Detecteer openingen (ramen, deuren). ` +
                `Combineer gelijke openingen met count. ` +
                `Als niets zichtbaar is → geef lege array.`,
            },
            {
              type: "input_image",
              image_url: dataUrl,
              detail: "auto", // 🔥 FIX VOOR JOUW ERROR
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "facade_openings",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              openings: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    type: {
                      type: "string",
                      enum: ["window", "door", "other"],
                    },
                    widthEstimateCm: { type: "number" },
                    heightEstimateCm: { type: "number" },
                    count: { type: "integer" },
                    confidence: { type: "number" },
                    reasoningShort: { type: "string" },
                  },
                  required: [
                    "type",
                    "widthEstimateCm",
                    "heightEstimateCm",
                    "count",
                    "confidence",
                    "reasoningShort",
                  ],
                },
              },
              facadeVisible: { type: "boolean" },
              imageQuality: {
                type: "string",
                enum: ["poor", "fair", "good"],
              },
              notes: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["openings", "facadeVisible", "imageQuality", "notes"],
          },
        },
      },
    });

    const raw = response.output_text;

    if (!raw) {
      return NextResponse.json(
        { error: "Geen output van AI." },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(raw);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("AI error:", error);
    return NextResponse.json(
      { error: "AI analyse mislukt." },
      { status: 500 }
    );
  }
}