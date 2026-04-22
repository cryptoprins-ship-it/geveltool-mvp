"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type OpeningMode = "none" | "ai" | "manual" | "estimate" | "skip";
type OpeningType = "window" | "door" | "other";
type FrameSizeType = "small" | "medium" | "large";

type Opening = {
  id: string;
  type: OpeningType;
  width: string;
  height: string;
  count: string;
};

type Side = {
  id: string;
  name: string;
  width: string;
  height: string;
  photo: File | null;
  previewUrl: string;
  openingMode: OpeningMode;
  aiDetectedCount: number | null;
  openings: Opening[];
  error: string;
  frameCount: string;
  frameSizeType: FrameSizeType;
  linkToSideId?: string;
};

type AiDetection = {
  type: OpeningType;
  widthEstimateCm: number;
  heightEstimateCm: number;
  count: number;
};

const MAX_SIDES = 10;

const frameSizeAverages: Record<FrameSizeType, number> = {
  small: 1.0,
  medium: 1.6,
  large: 2.5,
};

function createOpening(): Opening {
  return {
    id: crypto.randomUUID(),
    type: "window",
    width: "",
    height: "",
    count: "1",
  };
}

function createSide(index: number): Side {
  return {
    id: crypto.randomUUID(),
    name: `Zijde ${index + 1}`,
    width: "",
    height: "",
    photo: null,
    previewUrl: "",
    openingMode: "skip",
    aiDetectedCount: null,
    openings: [],
    error: "",
    frameCount: "",
    frameSizeType: "medium",
    linkToSideId: undefined,
  };
}

function toNumber(value: string): number {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function getLinkedDimensions(side: Side, sides: Side[]) {
  if (!side.linkToSideId) return null;
  const linked = sides.find((s) => s.id === side.linkToSideId);
  if (!linked) return null;

  return {
    width: linked.width,
    height: linked.height,
    name: linked.name,
  };
}

export default function Page() {
  const [sides, setSides] = useState<Side[]>([
    createSide(0),
    createSide(1),
    createSide(2),
    createSide(3),
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [aiLoadingSideId, setAiLoadingSideId] = useState<string | null>(null);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const cameraInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    return () => {
      sides.forEach((side) => {
        if (side.previewUrl) URL.revokeObjectURL(side.previewUrl);
      });
    };
  }, [sides]);

  const canContinue = useMemo(() => {
    if (sides.length === 0) return false;

    return sides.every((side) => {
      const linked = getLinkedDimensions(side, sides);
      const widthValue = linked ? linked.width : side.width;
      const heightValue = linked ? linked.height : side.height;
      const hasBaseDimensions = widthValue.trim() !== "" && heightValue.trim() !== "";
      if (!hasBaseDimensions) return false;

      if (side.openingMode === "skip" || side.openingMode === "none") return true;

      if (side.openingMode === "estimate") {
        return toNumber(side.frameCount) > 0;
      }

      if (!side.photo) return false;

      if (side.openingMode === "ai") {
        return side.openings.length > 0;
      }

      if (side.openingMode === "manual") {
        return (
          side.openings.length > 0 &&
          side.openings.every(
            (opening) =>
              opening.width.trim() !== "" &&
              opening.height.trim() !== "" &&
              opening.count.trim() !== ""
          )
        );
      }

      return true;
    });
  }, [sides]);

  const updateSide = (sideId: string, updater: (side: Side) => Side) => {
    setSides((prev) => prev.map((side) => (side.id === sideId ? updater(side) : side)));
  };

  const setSideField = <K extends keyof Side>(sideId: string, field: K, value: Side[K]) => {
    updateSide(sideId, (side) => ({ ...side, [field]: value }));
  };

  const handleNewImage = (sideId: string, file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      updateSide(sideId, (side) => ({
        ...side,
        error: "Gebruik een afbeeldingbestand.",
      }));
      return;
    }

    updateSide(sideId, (side) => {
      if (side.previewUrl) URL.revokeObjectURL(side.previewUrl);
      const previewUrl = URL.createObjectURL(file);
      return {
        ...side,
        photo: file,
        previewUrl,
        error: "",
      };
    });
  };

  const handleFileChange = (sideId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    handleNewImage(sideId, file);
    e.target.value = "";
  };

  const handleOpeningModeChange = (sideId: string, mode: OpeningMode) => {
    updateSide(sideId, (side) => {
      if (mode === "none") {
        return {
          ...side,
          openingMode: "none",
          openings: [],
          aiDetectedCount: 0,
          error: "",
        };
      }

      if (mode === "skip") {
        return {
          ...side,
          openingMode: "skip",
          openings: [],
          aiDetectedCount: null,
          error: "",
        };
      }

      if (mode === "manual") {
        return {
          ...side,
          openingMode: "manual",
          openings: side.openings.length > 0 ? side.openings : [createOpening()],
          error: "",
        };
      }

      if (mode === "estimate") {
        return {
          ...side,
          openingMode: "estimate",
          openings: [],
          aiDetectedCount: null,
          error: "",
        };
      }

      return {
        ...side,
        openingMode: "ai",
        error: "",
      };
    });
  };

  const addOpening = (sideId: string) => {
    updateSide(sideId, (side) => ({
      ...side,
      openings: [...side.openings, createOpening()],
    }));
  };

  const removeOpening = (sideId: string, openingId: string) => {
    updateSide(sideId, (side) => ({
      ...side,
      openings: side.openings.filter((opening) => opening.id !== openingId),
    }));
  };

  const updateOpening = <K extends keyof Opening>(
    sideId: string,
    openingId: string,
    field: K,
    value: Opening[K]
  ) => {
    updateSide(sideId, (side) => ({
      ...side,
      openings: side.openings.map((opening) =>
        opening.id === openingId ? { ...opening, [field]: value } : opening
      ),
    }));
  };

  const applyAiResults = (sideId: string, detections: AiDetection[]) => {
    updateSide(sideId, (side) => ({
      ...side,
      aiDetectedCount: detections.reduce((sum, item) => sum + item.count, 0),
      openings: detections.map((detection) => ({
        id: crypto.randomUUID(),
        type: detection.type,
        width: String(detection.widthEstimateCm),
        height: String(detection.heightEstimateCm),
        count: String(detection.count),
      })),
      error: "",
    }));
  };

  const estimateOpeningsWithAi = async (side: Side) => {
    if (!side.photo) {
      updateSide(side.id, (current) => ({
        ...current,
        error: "Voeg eerst een foto of bestand toe voor deze zijde.",
      }));
      return;
    }

    const linked = getLinkedDimensions(side, sides);
    const widthValue = linked ? linked.width : side.width;
    const heightValue = linked ? linked.height : side.height;

    if (!widthValue.trim() || !heightValue.trim()) {
      updateSide(side.id, (current) => ({
        ...current,
        error: "Vul eerst breedte en hoogte van deze zijde in.",
      }));
      return;
    }

    try {
      setAiLoadingSideId(side.id);
      updateSide(side.id, (current) => ({ ...current, error: "" }));

      const formData = new FormData();
      formData.append("image", side.photo);
      formData.append("sideWidthCm", widthValue);
      formData.append("sideHeightCm", heightValue);
      formData.append("sideName", side.name);

      const response = await fetch("/api/estimate-openings", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "AI-inschatting mislukt.");
      }

      const data = await response.json();
      const detections = Array.isArray(data.openings) ? data.openings : [];

      applyAiResults(side.id, detections);

      updateSide(side.id, (current) => ({
        ...current,
        openingMode: "ai",
        error:
          detections.length === 0
            ? "AI vond geen ramen/deuren. Je kunt handmatig invullen of gemiddeld inschatten."
            : "",
      }));
    } catch (error) {
      console.error(error);
      updateSide(side.id, (current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : "AI kon de ramen/deuren niet inschatten.",
      }));
    } finally {
      setAiLoadingSideId(null);
    }
  };

  const addSide = () => {
    setSides((prev) => {
      if (prev.length >= MAX_SIDES) return prev;
      return [...prev, createSide(prev.length)];
    });
  };

  const removeSide = (sideId: string) => {
    setSides((prev) => {
      const sideToDelete = prev.find((side) => side.id === sideId);
      if (sideToDelete?.previewUrl) URL.revokeObjectURL(sideToDelete.previewUrl);

      const filtered = prev.filter((side) => side.id !== sideId);
      return filtered.map((side, index) => ({ ...side, name: `Zijde ${index + 1}` }));
    });
  };

  const applyCommonPairs = () => {
    setSides((prev) => {
      const next = [...prev];
      if (next.length >= 2) {
        next[1] = { ...next[1], linkToSideId: next[0].id };
      }
      if (next.length >= 4) {
        next[3] = { ...next[3], linkToSideId: next[2].id };
      }
      return next;
    });
  };

  const clearAllLinks = () => {
    setSides((prev) => prev.map((side) => ({ ...side, linkToSideId: undefined })));
  };

  const getWidthValue = (side: Side) => {
    const linked = getLinkedDimensions(side, sides);
    return linked ? linked.width : side.width;
  };

  const getHeightValue = (side: Side) => {
    const linked = getLinkedDimensions(side, sides);
    return linked ? linked.height : side.height;
  };

  const getEstimatedDeductionM2 = (side: Side) => {
    const count = toNumber(side.frameCount);
    return round2(count * frameSizeAverages[side.frameSizeType]);
  };

  const getGrossAreaM2 = (side: Side) => {
    return round2((toNumber(getWidthValue(side)) / 100) * (toNumber(getHeightValue(side)) / 100));
  };

  const getOpeningAreaM2 = (side: Side) => {
    if (side.openingMode === "none" || side.openingMode === "skip") return 0;

    if (side.openingMode === "estimate") {
      return getEstimatedDeductionM2(side);
    }

    if (side.openingMode === "manual" || side.openingMode === "ai") {
      return round2(
        side.openings.reduce((sum, opening) => {
          const widthCm = toNumber(opening.width);
          const heightCm = toNumber(opening.height);
          const count = toNumber(opening.count);
          return sum + (widthCm / 100) * (heightCm / 100) * count;
        }, 0)
      );
    }

    return 0;
  };

  const getNetAreaM2 = (side: Side) => {
    return round2(Math.max(0, getGrossAreaM2(side) - getOpeningAreaM2(side)));
  };

  const totals = useMemo(() => {
    const includedSides = sides.filter((side) => side.openingMode !== "skip");
    return {
      gross: round2(includedSides.reduce((sum, side) => sum + getGrossAreaM2(side), 0)),
      opening: round2(includedSides.reduce((sum, side) => sum + getOpeningAreaM2(side), 0)),
      net: round2(includedSides.reduce((sum, side) => sum + getNetAreaM2(side), 0)),
    };
  }, [sides]);

  const handleContinue = async () => {
    setGlobalError("");

    if (!canContinue) {
      setGlobalError(
        "Controleer alle zijdes. Mogelijk ontbreken afmetingen, foto’s of ramen/deuren."
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();

      const payload = sides.map((side) => ({
        id: side.id,
        name: side.name,
        width: getWidthValue(side),
        height: getHeightValue(side),
        openingMode: side.openingMode,
        aiDetectedCount: side.aiDetectedCount,
        frameCount: side.frameCount,
        frameSizeType: side.frameSizeType,
        openings: side.openings,
        linkToSideId: side.linkToSideId,
      }));

      formData.append("sides", JSON.stringify(payload));

      sides.forEach((side) => {
        if (side.photo) {
          formData.append(`photo_${side.id}`, side.photo);
        }
      });

      const response = await fetch("/api/visualize", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Visualisatie mislukt.");
      }

      const data = await response.json();
      console.log("Visualisatie succesvol", data);
    } catch (error) {
      console.error(error);
      setGlobalError("Er ging iets mis bij de visualisatie. Probeer het opnieuw.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 text-black">
      <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-sm md:p-6">
          <h1 className="text-3xl font-bold tracking-tight text-black">GevelPlanner</h1>
          <p className="mt-2 text-base font-medium text-gray-700">
            Bereken je gevel in 2 minuten
          </p>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Vul per zijde zo min mogelijk in. Neem afmetingen over van een andere
            zijde als die gelijk zijn en kies daarna hoe ramen en deuren moeten
            worden verwerkt.
          </p>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-black">Slim invullen</h2>
              <p className="text-sm text-gray-600">
                Veel panden hebben gelijke zijdes. Gebruik de snelle koppeling voor voor/achter en links/rechts.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 font-medium text-black transition hover:bg-gray-50"
                onClick={applyCommonPairs}
              >
                Koppel veelvoorkomende gelijke zijdes
              </button>
              <button
                type="button"
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 font-medium text-black transition hover:bg-gray-50"
                onClick={clearAllLinks}
              >
                Koppelingen wissen
              </button>
            </div>
          </div>
        </section>

        {sides.map((side) => {
          const linked = getLinkedDimensions(side, sides);
          const widthValue = getWidthValue(side);
          const heightValue = getHeightValue(side);

          return (
            <section
              key={side.id}
              className="space-y-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-6"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-black">{side.name}</h2>
                  <p className="text-sm text-gray-600">
                    Geef de afmetingen en kies hoe je met ramen en deuren op deze zijde
                    wilt omgaan.
                  </p>
                </div>

                {sides.length > 1 ? (
                  <button
                    type="button"
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-gray-50"
                    onClick={() => removeSide(side.id)}
                  >
                    Verwijder zijde
                  </button>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-800">
                  Neem afmetingen over van zijde
                </label>
                <select
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-black outline-none transition focus:border-black"
                  value={side.linkToSideId || ""}
                  onChange={(e) =>
                    setSideField(side.id, "linkToSideId", e.target.value || undefined)
                  }
                >
                  <option value="">Handmatig invullen</option>
                  {sides
                    .filter((s) => s.id !== side.id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>

                {linked ? (
                  <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                    Afmetingen worden overgenomen van {linked.name}.
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-800">
                    Breedte zijde (cm)
                  </label>
                  <input
                    className={`w-full rounded-xl border border-gray-300 p-3 text-black outline-none transition focus:border-black ${
                      linked ? "bg-gray-100" : "bg-white"
                    }`}
                    inputMode="numeric"
                    value={widthValue}
                    onChange={(e) => setSideField(side.id, "width", e.target.value)}
                    placeholder="Bijv. 540"
                    disabled={!!linked}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-800">
                    Hoogte zijde (cm)
                  </label>
                  <input
                    className={`w-full rounded-xl border border-gray-300 p-3 text-black outline-none transition focus:border-black ${
                      linked ? "bg-gray-100" : "bg-white"
                    }`}
                    inputMode="numeric"
                    value={heightValue}
                    onChange={(e) => setSideField(side.id, "height", e.target.value)}
                    placeholder="Bijv. 280"
                    disabled={!!linked}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-800">
                    Afbeelding voor deze zijde
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      className="rounded-xl border border-gray-300 bg-white px-4 py-3 font-medium text-black transition hover:bg-gray-50"
                      onClick={() => cameraInputRefs.current[side.id]?.click()}
                    >
                      Maak foto
                    </button>

                    <button
                      type="button"
                      className="rounded-xl border border-gray-300 bg-white px-4 py-3 font-medium text-black transition hover:bg-gray-50"
                      onClick={() => fileInputRefs.current[side.id]?.click()}
                    >
                      Kies bestand
                    </button>
                  </div>
                </div>

                <input
                  ref={(el) => {
                    cameraInputRefs.current[side.id] = el;
                  }}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleFileChange(side.id, e)}
                />

                <input
                  ref={(el) => {
                    fileInputRefs.current[side.id] = el;
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(side.id, e)}
                />

                <p className="text-xs text-gray-500">
                  Werkt foto maken niet? Controleer dan de camera-toestemming in de
                  app- of browserinstellingen op Apple of Android.
                </p>

                {side.previewUrl ? (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                    <p className="mb-2 text-sm font-medium text-gray-800">
                      Preview {side.name}
                    </p>
                    <img
                      src={side.previewUrl}
                      alt={`Preview van ${side.name}`}
                      className="max-h-[360px] w-full rounded-xl object-contain"
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
                    Nog geen afbeelding gekozen voor {side.name.toLowerCase()}.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-800">
                  Ramen en deuren op deze zijde
                </p>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {[
                    { value: "none", label: "Geen ramen/deuren" },
                    { value: "ai", label: "AI laten inschatten" },
                    { value: "manual", label: "Handmatig invullen" },
                    { value: "estimate", label: "Gemiddeld inschatten" },
                    { value: "skip", label: "Overslaan" },
                  ].map((option) => {
                    const checked = side.openingMode === option.value;
                    return (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${
                          checked
                            ? "border-black bg-gray-50"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`opening-mode-${side.id}`}
                          checked={checked}
                          onChange={() =>
                            handleOpeningModeChange(side.id, option.value as OpeningMode)
                          }
                        />
                        <span className="text-sm font-medium text-black">
                          {option.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {side.openingMode === "none" ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                  Deze zijde heeft geen ramen, deuren of andere openingen.
                </div>
              ) : null}

              {side.openingMode === "estimate" ? (
                <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div>
                    <h3 className="font-semibold text-black">Gemiddelde inschatting</h3>
                    <p className="text-sm text-gray-600">
                      Vul het aantal kozijnen in. Wij rekenen daarna automatisch met
                      een gemiddelde oppervlakte per kozijn. Je kunt dit later altijd
                      handmatig aanpassen.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-800">
                        Aantal kozijnen (ramen + deuren)
                      </label>
                      <input
                        className="w-full rounded-xl border border-gray-300 bg-white p-3 text-black outline-none transition focus:border-black"
                        inputMode="numeric"
                        value={side.frameCount}
                        onChange={(e) => setSideField(side.id, "frameCount", e.target.value)}
                        placeholder="Bijv. 8"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-800">
                        Gemiddelde grootte kozijnen
                      </label>
                      <select
                        className="w-full rounded-xl border border-gray-300 bg-white p-3 text-black outline-none transition focus:border-black"
                        value={side.frameSizeType}
                        onChange={(e) =>
                          setSideField(side.id, "frameSizeType", e.target.value as FrameSizeType)
                        }
                      >
                        <option value="small">Klein – gemiddeld 1,0 m² per kozijn</option>
                        <option value="medium">Gemiddeld – gemiddeld 1,6 m² per kozijn</option>
                        <option value="large">Groot – gemiddeld 2,5 m² per kozijn</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">
                    Wij rekenen automatisch met een gemiddelde oppervlakte per kozijn.
                    Pas dit later handmatig aan indien nodig.
                  </p>

                  {toNumber(side.frameCount) > 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700">
                      Geschatte aftrek: <strong>{getEstimatedDeductionM2(side).toFixed(2)} m²</strong>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {side.openingMode === "ai" ? (
                <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-semibold text-black">
                        AI-inschatting ramen en deuren
                      </h3>
                      <p className="text-sm text-gray-600">
                        AI gebruikt de foto en de ingevulde breedte en hoogte van deze
                        zijde als schaal voor een eerste schatting van ramen en deuren.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="rounded-xl border border-gray-300 bg-white px-4 py-2 font-medium text-black transition hover:bg-gray-100 disabled:opacity-50"
                      onClick={() => estimateOpeningsWithAi(side)}
                      disabled={aiLoadingSideId === side.id}
                    >
                      {aiLoadingSideId === side.id ? "AI analyseert..." : "Analyseer foto"}
                    </button>
                  </div>

                  {side.aiDetectedCount !== null ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700">
                      AI heeft {side.aiDetectedCount} raam/deur-openingen gevonden.
                    </div>
                  ) : null}

                  {side.openings.length > 0 ? (
                    <div className="space-y-3">
                      {side.openings.map((opening, openingIndex) => (
                        <div
                          key={opening.id}
                          className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-black">
                              Voorgestelde opening {openingIndex + 1}
                            </h4>
                            <button
                              type="button"
                              className="text-sm text-gray-700 underline"
                              onClick={() => removeOpening(side.id, opening.id)}
                            >
                              Verwijderen
                            </button>
                          </div>

                          <div className="grid gap-3 md:grid-cols-4">
                            <div>
                              <label className="mb-1 block text-sm text-gray-700">Type</label>
                              <select
                                className="w-full rounded-xl border border-gray-300 bg-white p-2 text-black outline-none transition focus:border-black"
                                value={opening.type}
                                onChange={(e) =>
                                  updateOpening(
                                    side.id,
                                    opening.id,
                                    "type",
                                    e.target.value as OpeningType
                                  )
                                }
                              >
                                <option value="window">Raam</option>
                                <option value="door">Deur</option>
                                <option value="other">Overig</option>
                              </select>
                            </div>

                            <div>
                              <label className="mb-1 block text-sm text-gray-700">
                                Breedte (cm)
                              </label>
                              <input
                                className="w-full rounded-xl border border-gray-300 bg-white p-2 text-black outline-none transition focus:border-black"
                                inputMode="numeric"
                                value={opening.width}
                                onChange={(e) =>
                                  updateOpening(side.id, opening.id, "width", e.target.value)
                                }
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-sm text-gray-700">
                                Hoogte (cm)
                              </label>
                              <input
                                className="w-full rounded-xl border border-gray-300 bg-white p-2 text-black outline-none transition focus:border-black"
                                inputMode="numeric"
                                value={opening.height}
                                onChange={(e) =>
                                  updateOpening(side.id, opening.id, "height", e.target.value)
                                }
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-sm text-gray-700">
                                Aantal
                              </label>
                              <input
                                className="w-full rounded-xl border border-gray-300 bg-white p-2 text-black outline-none transition focus:border-black"
                                inputMode="numeric"
                                value={opening.count}
                                onChange={(e) =>
                                  updateOpening(side.id, opening.id, "count", e.target.value)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        className="rounded-xl border border-gray-300 bg-white px-4 py-2 font-medium text-black transition hover:bg-gray-50"
                        onClick={() => addOpening(side.id)}
                      >
                        Opening toevoegen
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500">
                      Nog geen AI-resultaten voor deze zijde.
                    </div>
                  )}
                </div>
              ) : null}

              {side.openingMode === "manual" ? (
                <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div>
                    <h3 className="font-semibold text-black">Handmatige invoer</h3>
                    <p className="text-sm text-gray-600">
                      Voeg alleen de ramen, deuren of andere openingen toe die op deze
                      zijde aanwezig zijn.
                    </p>
                  </div>

                  {side.openings.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500">
                      Nog geen ramen of deuren toegevoegd.
                    </div>
                  ) : null}

                  {side.openings.map((opening, openingIndex) => (
                    <div
                      key={opening.id}
                      className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-black">
                          Opening {openingIndex + 1}
                        </h4>
                        <button
                          type="button"
                          className="text-sm text-gray-700 underline"
                          onClick={() => removeOpening(side.id, opening.id)}
                        >
                          Verwijderen
                        </button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-4">
                        <div>
                          <label className="mb-1 block text-sm text-gray-700">Type</label>
                          <select
                            className="w-full rounded-xl border border-gray-300 bg-white p-2 text-black outline-none transition focus:border-black"
                            value={opening.type}
                            onChange={(e) =>
                              updateOpening(
                                side.id,
                                opening.id,
                                "type",
                                e.target.value as OpeningType
                              )
                            }
                          >
                            <option value="window">Raam</option>
                            <option value="door">Deur</option>
                            <option value="other">Overig</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-sm text-gray-700">
                            Breedte (cm)
                          </label>
                          <input
                            className="w-full rounded-xl border border-gray-300 bg-white p-2 text-black outline-none transition focus:border-black"
                            inputMode="numeric"
                            value={opening.width}
                            onChange={(e) =>
                              updateOpening(side.id, opening.id, "width", e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm text-gray-700">
                            Hoogte (cm)
                          </label>
                          <input
                            className="w-full rounded-xl border border-gray-300 bg-white p-2 text-black outline-none transition focus:border-black"
                            inputMode="numeric"
                            value={opening.height}
                            onChange={(e) =>
                              updateOpening(side.id, opening.id, "height", e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm text-gray-700">
                            Aantal
                          </label>
                          <input
                            className="w-full rounded-xl border border-gray-300 bg-white p-2 text-black outline-none transition focus:border-black"
                            inputMode="numeric"
                            value={opening.count}
                            onChange={(e) =>
                              updateOpening(side.id, opening.id, "count", e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 font-medium text-black transition hover:bg-gray-50"
                    onClick={() => addOpening(side.id)}
                  >
                    Raam / deur toevoegen
                  </button>
                </div>
              ) : null}

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-2 text-sm font-semibold text-gray-800">
                  Berekening zijde
                </div>
                <div className="grid gap-2 text-sm text-gray-700 md:grid-cols-3">
                  <div className="rounded-xl bg-white p-3">
                    <div className="text-gray-500">Bruto oppervlak</div>
                    <div className="mt-1 font-semibold">
                      {getGrossAreaM2(side).toFixed(2)} m²
                    </div>
                  </div>
                  <div className="rounded-xl bg-white p-3">
                    <div className="text-gray-500">Aftrek ramen/deuren</div>
                    <div className="mt-1 font-semibold">
                      {getOpeningAreaM2(side).toFixed(2)} m²
                    </div>
                  </div>
                  <div className="rounded-xl bg-white p-3">
                    <div className="text-gray-500">Netto oppervlak</div>
                    <div className="mt-1 font-semibold">
                      {getNetAreaM2(side).toFixed(2)} m²
                    </div>
                  </div>
                </div>
              </div>

              {side.error ? (
                <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                  {side.error}
                </div>
              ) : null}
            </section>
          );
        })}

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-lg font-semibold text-black">Totaaloverzicht</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="text-sm text-gray-500">Totaal bruto</div>
              <div className="mt-1 text-lg font-semibold">{totals.gross.toFixed(2)} m²</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="text-sm text-gray-500">Totaal aftrek</div>
              <div className="mt-1 text-lg font-semibold">{totals.opening.toFixed(2)} m²</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="text-sm text-gray-500">Totaal netto</div>
              <div className="mt-1 text-lg font-semibold">{totals.net.toFixed(2)} m²</div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="rounded-xl border border-gray-300 bg-white px-4 py-3 font-medium text-black transition hover:bg-gray-50 disabled:opacity-50"
            onClick={addSide}
            disabled={sides.length >= MAX_SIDES}
          >
            Zijde toevoegen
          </button>

          <button
            type="button"
            className="rounded-xl bg-black px-5 py-3 text-white disabled:opacity-50"
            onClick={handleContinue}
            disabled={!canContinue || isSubmitting}
          >
            {isSubmitting ? "Bezig..." : "Verder"}
          </button>
        </section>

        {globalError ? (
          <section className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {globalError}
          </section>
        ) : null}

        <section className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-sm">
          AI geeft een eerste inschatting op basis van foto plus opgegeven
          zijdebreedte en zijdehoogte. De optie “Gemiddeld inschatten” rekent met
          een vaste gemiddelde oppervlakte per kozijn: klein 1,0 m², gemiddeld 1,6
          m² en groot 2,5 m².
        </section>
      </div>
    </main>
  );
}
