import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DetectionSchema = z.object({
  openings: z.array(
    z.object({
      type: z.enum(["window", "door", "other"]),
      widthEstimateCm: z.number(),
      heightEstimateCm: z.number(),
      count: z.number().int().min(1),
      confidence: z.number().min(0).max(1),
      reasoningShort: z.string(),
    })
  ),
  facadeVisible: z.boolean(),
  imageQuality: z.enum(["poor", "fair", "good"]),
  notes: z.array(z.string()),
});

function fileToDataUrl(file: File, mimeType: string, buffer: Buffer) {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function toPositiveNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY ontbreekt in .env.local." },
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
        { error: "Breedte en hoogte van de zijde zijn verplicht." },
        { status: 400 }
      );
    }

    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = image.type || "image/jpeg";
    const dataUrl = fileToDataUrl(image, mimeType, buffer);

    const prompt = [
      `Analyseer deze gevelafbeelding voor ${sideName}.`,
      `De echte breedte van deze zijde is ${sideWidthCm} cm.`,
      `De echte hoogte van deze zijde is ${sideHeightCm} cm.`,
      `Gebruik deze afmetingen als schaalreferentie voor een best-effort schatting.`,
      `Detecteer zichtbare openingen zoals ramen, deuren of overige openingen.`,
      `Combineer identieke openingen waar logisch, en geef count > 1 als ze duidelijk hetzelfde formaat hebben.`,
      `Als de foto scheef, onvolledig of onduidelijk is, geef dat aan in notes en confidence.`,
      `Geef alleen openingen terug die echt zichtbaar of sterk aannemelijk zijn.`,
      `Als er geen openingen zichtbaar zijn, geef openings: [].`,
      `De output moet JSON zijn conform het schema.`,
    ].join(" ");

    const response = await openai.responses.parse({
      model: "gpt-4o-2024-08-06",
      input: [
        {
          role: "system",
          content:
            "Je bent een nauwkeurige bouwkundige vision-extractor. Je schat openingen op een gevel op basis van een foto en opgegeven werkelijke gevelmaat. Je overschat niet. Je mag onzekerheid benoemen.",
        },
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            {
              type: "input_image",
              image_url: dataUrl,
            },
          ],
        },
      ],
      text: {
        format: zodTextFormat(DetectionSchema, "facade_opening_detection"),
      },
    });

    const parsed = response.output_parsed;

    if (!parsed) {
      return NextResponse.json(
        { error: "AI gaf geen bruikbare output terug." },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("estimate-openings error", error);
    return NextResponse.json(
      { error: "AI-inschatting mislukt." },
      { status: 500 }
    );
  }
}