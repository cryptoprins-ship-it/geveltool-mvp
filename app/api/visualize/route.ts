import { NextResponse } from "next/server";
import { z } from "zod";

const OpeningSchema = z.object({
  id: z.string(),
  type: z.enum(["window", "door", "other"]),
  width: z.string(),
  height: z.string(),
  count: z.string(),
});

const SideSchema = z.object({
  id: z.string(),
  name: z.string(),
  width: z.string(),
  height: z.string(),
  openingMode: z.enum(["none", "ai", "manual", "skip"]),
  aiDetectedCount: z.number().nullable().optional(),
  openings: z.array(OpeningSchema),
});

const PayloadSchema = z.array(SideSchema);

function toNumber(value: string) {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const rawSides = formData.get("sides");

    if (typeof rawSides !== "string") {
      return NextResponse.json(
        { error: "Sides payload ontbreekt." },
        { status: 400 }
      );
    }

    const parsedJson = JSON.parse(rawSides);
    const sides = PayloadSchema.parse(parsedJson);

    const result = sides.map((side) => {
      const sideWidthCm = toNumber(side.width);
      const sideHeightCm = toNumber(side.height);

      const grossAreaM2 = (sideWidthCm / 100) * (sideHeightCm / 100);

      let openingAreaM2 = 0;
      let openingCount = 0;

      if (side.openingMode === "manual" || side.openingMode === "ai") {
        for (const opening of side.openings) {
          const widthCm = toNumber(opening.width);
          const heightCm = toNumber(opening.height);
          const count = Math.max(0, Math.floor(toNumber(opening.count)));

          const areaM2 = (widthCm / 100) * (heightCm / 100) * count;
          openingAreaM2 += areaM2;
          openingCount += count;
        }
      }

      if (side.openingMode === "none") {
        openingAreaM2 = 0;
        openingCount = 0;
      }

      if (side.openingMode === "skip") {
        return {
          id: side.id,
          name: side.name,
          skipped: true,
          grossAreaM2: 0,
          openingAreaM2: 0,
          netAreaM2: 0,
          openingCount: 0,
        };
      }

      const netAreaM2 = Math.max(0, grossAreaM2 - openingAreaM2);

      return {
        id: side.id,
        name: side.name,
        skipped: false,
        grossAreaM2: round2(grossAreaM2),
        openingAreaM2: round2(openingAreaM2),
        netAreaM2: round2(netAreaM2),
        openingCount,
        openingMode: side.openingMode,
      };
    });

    const includedSides = result.filter((side) => !side.skipped);

    const totals = {
      grossAreaM2: round2(
        includedSides.reduce((sum, side) => sum + side.grossAreaM2, 0)
      ),
      openingAreaM2: round2(
        includedSides.reduce((sum, side) => sum + side.openingAreaM2, 0)
      ),
      netAreaM2: round2(
        includedSides.reduce((sum, side) => sum + side.netAreaM2, 0)
      ),
      openingCount: includedSides.reduce((sum, side) => sum + side.openingCount, 0),
      sideCountIncluded: includedSides.length,
      sideCountSkipped: result.filter((side) => side.skipped).length,
    };

    return NextResponse.json({
      success: true,
      sides: result,
      totals,
    });
  } catch (error) {
    console.error("visualize error", error);
    return NextResponse.json(
      { error: "Visualisatieverwerking mislukt." },
      { status: 500 }
    );
  }
}