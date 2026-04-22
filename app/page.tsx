"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type InputMode = "quick" | "advanced";
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
  linkToSideId?: string | undefined;
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

const openingModeLabels: Record<OpeningMode, string> = {
  none: "Geen ramen/deuren",
  ai: "AI laten inschatten",
  manual: "Handmatig invullen",
  estimate: "Gemiddeld inschatten",
  skip: "Overslaan",
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
    openingMode: "estimate",
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

function buildSides(count: number): Side[] {
  return Array.from({ length: count }, (_, index) => createSide(index));
}

export default function Page() {
  const [inputMode, setInputMode] = useState<InputMode>("quick");
  const [sideCount, setSideCount] = useState(4);
  const [frontBackEqual, setFrontBackEqual] = useState<boolean | null>(true);
  const [leftRightEqual, setLeftRightEqual] = useState<boolean | null>(true);
  const [sides, setSides] = useState<Side[]>(buildSides(4));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [aiLoadingSideId, setAiLoadingSideId] = useState<string | null>(null);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const cameraInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const previewUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    previewUrlsRef.current = sides
      .map((side) => side.previewUrl)
      .filter((url): url is string => Boolean(url));
  }, [sides]);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore cleanup errors
        }
      });
    };
  }, []);

  useEffect(() => {
    setSides((prev) => {
      const next: Side[] = prev.map((side) => ({
        ...side,
        linkToSideId: undefined,
      }));

      if (sideCount >= 2 && frontBackEqual && next[0] && next[1]) {
        next[1].linkToSideId = next[0].id;
      }

      if (sideCount >= 4 && leftRightEqual && next[2] && next[3]) {
        next[3].linkToSideId = next[2].id;
      }

      return next;
    });
  }, [frontBackEqual, leftRightEqual, sideCount]);

  const canContinue = useMemo(() => {
    if (sides.length === 0) return false;

    return sides.every((side) => {
      const linked = getLinkedDimensions(side, sides);
      const widthValue = linked ? linked.width : side.width;
      const heightValue = linked ? linked.height : side.height;
      const hasBaseDimensions =
        widthValue.trim() !== "" && heightValue.trim() !== "";
      if (!hasBaseDimensions) return false;

      if (side.openingMode === "skip" || side.openingMode === "none") return true;
      if (side.openingMode === "estimate") return toNumber(side.frameCount) > 0;
      if (!side.photo) return false;
      if (side.openingMode === "ai") {
        return side.openings.length > 0 || !!side.frameCount;
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

  const setSideField = <K extends keyof Side>(
    sideId: string,
    field: K,
    value: Side[K]
  ) => {
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
      return {
        ...side,
        photo: file,
        previewUrl: URL.createObjectURL(file),
        error: "",
      };
    });
  };

  const handleFileChange = (
    sideId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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
      return { ...side, openingMode: "ai", error: "" };
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
      frameCount: String(detections.reduce((sum, item) => sum + item.count, 0) || ""),
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

      if (detections.length > 0) {
        applyAiResults(side.id, detections);
        updateSide(side.id, (current) => ({
          ...current,
          openingMode: "ai",
          error: "",
        }));
      } else {
        updateSide(side.id, (current) => ({
          ...current,
          openingMode: "estimate",
          error:
            "AI vond geen duidelijke ramen/deuren. Gebruik de gemiddelde inschatting hieronder.",
        }));
      }
    } catch (error) {
      console.error(error);
      updateSide(side.id, (current) => ({
        ...current,
        openingMode: "estimate",
        error:
          "AI kon niets bruikbaars vinden. Gebruik de gemiddelde inschatting of vul handmatig in.",
      }));
    } finally {
      setAiLoadingSideId(null);
    }
  };

  const addSide = () => {
    setSides((prev) => {
      if (prev.length >= MAX_SIDES) return prev;
      setSideCount(prev.length + 1);
      return [...prev, createSide(prev.length)];
    });
  };

  const removeSide = (sideId: string) => {
    setSides((prev) => {
      const sideToDelete = prev.find((side) => side.id === sideId);
      if (sideToDelete?.previewUrl) URL.revokeObjectURL(sideToDelete.previewUrl);

      const filtered = prev.filter((side) => side.id !== sideId);
      setSideCount(filtered.length);

      return filtered.map((side, index) => ({
        ...side,
        name: `Zijde ${index + 1}`,
      }));
    });
  };

  const resetSidesByCount = (count: number) => {
    setSideCount(count);
    setSides(buildSides(count));
    setGlobalError("");

    if (count < 2) setFrontBackEqual(null);
    else setFrontBackEqual(true);

    if (count < 4) setLeftRightEqual(null);
    else setLeftRightEqual(true);
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
    if (side.openingMode === "estimate") return getEstimatedDeductionM2(side);
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
        if (side.photo) formData.append(`photo_${side.id}`, side.photo);
      });

      const response = await fetch("/api/visualize", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Visualisatie mislukt.");
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
      <div className="mx-auto max-w-5xl space-y-6 p-4 pb-28 md:p-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-sm md:p-6">
          <h1 className="text-3xl font-bold tracking-tight text-black">GevelPlanner</h1>
          <p className="mt-2 text-base font-medium text-gray-700">
            Bereken je gevel in 2 minuten
          </p>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Minder invoeren, sneller resultaat. Eerst bepaal je of gelijke zijdes
            automatisch gekoppeld mogen worden.
          </p>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-black">Werkwijze</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setInputMode("quick")}
              className={`rounded-2xl border p-4 text-left transition ${
                inputMode === "quick"
                  ? "border-black bg-gray-50"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <div className="font-semibold">Snel invullen</div>
              <div className="mt-1 text-sm text-gray-600">
                Aanbevolen. Gebruik aantal kozijnen en gemiddelde groottes.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setInputMode("advanced")}
              className={`rounded-2xl border p-4 text-left transition ${
                inputMode === "advanced"
                  ? "border-black bg-gray-50"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <div className="font-semibold">Geavanceerd</div>
              <div className="mt-1 text-sm text-gray-600">
                Gebruik AI of vul ramen en deuren handmatig per zijde in.
              </div>
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-800">
                Aantal zijdes
              </label>
              <select
                className="w-full rounded-xl border border-gray-300 bg-white p-3 text-black outline-none transition focus:border-black"
                value={sideCount}
                onChange={(e) => resetSidesByCount(Number(e.target.value))}
              >
                {Array.from({ length: MAX_SIDES }, (_, i) => i + 1).map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </div>

            {sideCount >= 2 ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-800">
                  Zijn voor- en achterkant gelijk?
                </label>
                <select
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-black outline-none transition focus:border-black"
                  value={frontBackEqual === null ? "unknown" : frontBackEqual ? "yes" : "no"}
                  onChange={(e) => setFrontBackEqual(e.target.value === "yes")}
                >
                  <option value="yes">Ja, koppel automatisch</option>
                  <option value="no">Nee, apart invullen</option>
                </select>
              </div>
            ) : null}

            {sideCount >= 4 ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-800">
                  Zijn linker- en rechterkant gelijk?
                </label>
                <select
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-black outline-none transition focus:border-black"
                  value={leftRightEqual === null ? "unknown" : leftRightEqual ? "yes" : "no"}
                  onChange={(e) => setLeftRightEqual(e.target.value === "yes")}
                >
                  <option value="yes">Ja, koppel automatisch</option>
                  <option value="no">Nee, apart invullen</option>
                </select>
              </div>
            ) : null}
          </div>

          <p className="mt-3 text-sm text-gray-600">
            Alleen de afmetingen worden gekoppeld. Ramen en deuren blijven altijd per zijde apart.
          </p>
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
                    Geef de afmetingen en kies hoe je met ramen en deuren op deze zijde wilt omgaan.
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
                    Afmetingen worden overgenomen van {linked.name}. Ramen en deuren blijven apart voor deze zijde.
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

              {inputMode === "advanced" ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-800">
                    Ramen en deuren op deze zijde
                  </p>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    {(["none", "ai", "manual", "estimate", "skip"] as OpeningMode[]).map(
                      (mode) => {
                        const checked = side.openingMode === mode;
                        return (
                          <label
                            key={mode}
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
                              onChange={() => handleOpeningModeChange(side.id, mode)}
                            />
                            <span className="text-sm font-medium text-black">
                              {openingModeLabels[mode]}
                            </span>
                          </label>
                        );
                      }
                    )}
                  </div>
                </div>
              ) : null}

              {(inputMode === "quick" || side.openingMode === "estimate") && (
                <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div>
                    <h3 className="font-semibold text-black">Gemiddelde inschatting</h3>
                    <p className="text-sm text-gray-600">
                      Vul het aantal kozijnen en de gemiddelde grootte in. Dit is de snelste manier.
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
                        <option value="small">
                          Klein – gemiddeld 1,0 m² per kozijn
                        </option>
                        <option value="medium">
                          Gemiddeld – gemiddeld 1,6 m² per kozijn
                        </option>
                        <option value="large">
                          Groot – gemiddeld 2,5 m² per kozijn
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700">
                    Geschatte aftrek:{" "}
                    <strong>{getEstimatedDeductionM2(side).toFixed(2)} m²</strong>
                  </div>
                </div>
              )}

              {inputMode === "advanced" && side.openingMode === "ai" ? (
                <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-semibold text-black">
                        AI-inschatting ramen en deuren
                      </h3>
                      <p className="text-sm text-gray-600">
                        AI gebruikt de foto en de ingevulde breedte en hoogte van deze zijde als schaal voor een eerste schatting.
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
                              <label className="mb-1 block text-sm text-gray-700">Aantal</label>
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

              {inputMode === "advanced" && side.openingMode === "manual" ? (
                <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div>
                    <h3 className="font-semibold text-black">Handmatige invoer</h3>
                    <p className="text-sm text-gray-600">
                      Voeg alleen de ramen, deuren of andere openingen toe die op deze zijde aanwezig zijn.
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
                          <label className="mb-1 block text-sm text-gray-700">Breedte (cm)</label>
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
                          <label className="mb-1 block text-sm text-gray-700">Hoogte (cm)</label>
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
                          <label className="mb-1 block text-sm text-gray-700">Aantal</label>
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

        {globalError ? (
          <section className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {globalError}
          </section>
        ) : null}

        <section className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-sm">
          Alleen de afmetingen kunnen automatisch worden gekoppeld als voor/achter of links/rechts gelijk zijn.
          Ramen en deuren worden altijd per zijde apart verwerkt.
          Als AI niets bruikbaars vindt, schakelt de app automatisch terug naar de gemiddelde inschatting per kozijn.
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row">
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
            className="rounded-xl bg-black px-5 py-3 font-semibold text-white disabled:opacity-50"
            onClick={handleContinue}
            disabled={!canContinue || isSubmitting}
          >
            {isSubmitting ? "Bezig..." : "Bereken resultaat"}
          </button>
        </div>
      </div>
    </main>
  );
}