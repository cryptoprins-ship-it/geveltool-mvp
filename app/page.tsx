"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type OpeningMode = "none" | "ai" | "manual" | "skip";
type OpeningType = "window" | "door" | "other";

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
};

type AiDetection = {
  type: OpeningType;
  widthEstimateCm: number;
  heightEstimateCm: number;
  count: number;
};

const MAX_SIDES = 10;

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
  };
}

export default function VisualisatiePage() {
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
      const hasBaseDimensions = side.width.trim() !== "" && side.height.trim() !== "";
      if (!hasBaseDimensions) return false;

      if (side.openingMode === "skip" || side.openingMode === "none") return true;

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

  const setSideField = (sideId: string, field: keyof Side, value: any) => {
    updateSide(sideId, (side) => ({ ...side, [field]: value }));
  };

  const handleNewImage = (sideId: string, file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      updateSide(sideId, (side) => ({ ...side, error: "Gebruik een afbeeldingbestand." }));
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
          aiDetectedCount: side.aiDetectedCount,
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

  const updateOpening = (sideId: string, openingId: string, field: keyof Opening, value: string) => {
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

    if (!side.width.trim() || !side.height.trim()) {
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
      formData.append("sideWidthCm", side.width);
      formData.append("sideHeightCm", side.height);
      formData.append("sideName", side.name);

      const response = await fetch("/api/estimate-openings", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("AI-inschatting mislukt.");
      }

      const data = await response.json();
      const detections = Array.isArray(data.openings) ? data.openings : [];

      applyAiResults(side.id, detections);

      updateSide(side.id, (current) => ({
        ...current,
        openingMode: "ai",
        error: detections.length === 0 ? "AI vond geen openingen. Je kunt handmatig invullen of deze zijde op geen openingen zetten." : "",
      }));
    } catch (error) {
      console.error(error);
      updateSide(side.id, (current) => ({
        ...current,
        error: "AI kon de openingen niet inschatten. Vul ze handmatig in of sla deze zijde over.",
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

  const handleContinue = async () => {
    setGlobalError("");

    if (!canContinue) {
      setGlobalError("Controleer alle zijdes. Mogelijk ontbreken afmetingen, foto’s of openingen.");
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();

      const payload = sides.map((side) => ({
        id: side.id,
        name: side.name,
        width: side.width,
        height: side.height,
        openingMode: side.openingMode,
        aiDetectedCount: side.aiDetectedCount,
        openings: side.openings,
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
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <section className="rounded-2xl border bg-white p-4 md:p-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-black">GevelPlanner</h1>
        <p className="mt-2 text-base font-medium text-gray-700">Bereken je gevel in 2 minuten</p>
        <p className="mt-3 text-sm text-gray-600">
          Voeg per zijde de afmetingen toe en bepaal daarna of deze zijde geen ramen/deuren heeft, door AI moet worden ingeschat, handmatig wordt ingevuld of moet worden overgeslagen.
        </p>
      </section>

      {sides.map((side, sideIndex) => (
        <section key={side.id} className="rounded-2xl border p-4 md:p-6 space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">{side.name}</h2>
              <p className="text-sm text-gray-600">Geef de afmetingen en kies hoe je met openingen op deze zijde wilt omgaan.</p>
            </div>

            {sides.length > 1 ? (
              <button
                type="button"
                className="rounded-xl border px-4 py-2 text-sm"
                onClick={() => removeSide(side.id)}
              >
                Verwijder zijde
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Breedte zijde (cm)</label>
              <input
                className="w-full rounded-xl border p-3"
                inputMode="numeric"
                value={side.width}
                onChange={(e) => setSideField(side.id, "width", e.target.value)}
                placeholder="Bijv. 540"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Hoogte zijde (cm)</label>
              <input
                className="w-full rounded-xl border p-3"
                inputMode="numeric"
                value={side.height}
                onChange={(e) => setSideField(side.id, "height", e.target.value)}
                placeholder="Bijv. 280"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="mb-2 text-sm font-medium">Afbeelding voor deze zijde</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  className="rounded-xl border px-4 py-3"
                  onClick={() => cameraInputRefs.current[side.id]?.click()}
                >
                  Maak foto
                </button>

                <button
                  type="button"
                  className="rounded-xl border px-4 py-3"
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
              Werkt foto maken niet? Controleer dan de camera-toestemming in de app- of browserinstellingen op Apple of Android.
            </p>

            {side.previewUrl ? (
              <div className="rounded-2xl border p-3">
                <p className="mb-2 text-sm font-medium">Preview {side.name}</p>
                <img
                  src={side.previewUrl}
                  alt={`Preview van ${side.name}`}
                  className="max-h-[360px] w-full rounded-xl object-contain"
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-gray-500">
                Nog geen afbeelding gekozen voor {side.name.toLowerCase()}.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Ramen en deuren op deze zijde</p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                { value: "none", label: "Geen ramen/deuren" },
                { value: "ai", label: "AI ramen/deuren laten inschatten" },
                { value: "manual", label: "Handmatig invullen" },
                { value: "skip", label: "Overslaan" },
              ].map((option) => {
                const checked = side.openingMode === option.value;
                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 ${checked ? "border-black" : ""}`}
                  >
                    <input
                      type="radio"
                      name={`opening-mode-${side.id}`}
                      checked={checked}
                      onChange={() => handleOpeningModeChange(side.id, option.value as OpeningMode)}
                    />
                    <span className="text-sm font-medium">{option.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {side.openingMode === "none" ? (
            <div className="rounded-2xl border bg-gray-50 p-4 text-sm text-gray-700">
              Deze zijde heeft geen ramen, deuren of andere openingen.
            </div>
          ) : null}

          {side.openingMode === "ai" ? (
            <div className="space-y-4 rounded-2xl border p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-semibold">AI-inschatting ramen en deuren</h3>
                  <p className="text-sm text-gray-600">
                    AI gebruikt de foto en de ingevulde breedte en hoogte van deze zijde als schaal voor een eerste schatting van ramen en deuren.
                  </p>
                </div>

                <button
                  type="button"
                  className="rounded-xl border px-4 py-2 disabled:opacity-50"
                  onClick={() => estimateOpeningsWithAi(side)}
                  disabled={aiLoadingSideId === side.id}
                >
                  {aiLoadingSideId === side.id ? "AI analyseert..." : "Analyseer foto"}
                </button>
              </div>

              {side.aiDetectedCount !== null ? (
                <div className="rounded-xl border bg-gray-50 p-3 text-sm">
                  AI heeft {side.aiDetectedCount} raam/deur-openingen gevonden.
                </div>
              ) : null}

              {side.openings.length > 0 ? (
                <div className="space-y-3">
                  {side.openings.map((opening, openingIndex) => (
                    <div key={opening.id} className="rounded-2xl border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Voorgestelde opening {openingIndex + 1}</h4>
                        <button
                          type="button"
                          className="text-sm underline"
                          onClick={() => removeOpening(side.id, opening.id)}
                        >
                          Verwijderen
                        </button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-4">
                        <div>
                          <label className="mb-1 block text-sm">Type</label>
                          <select
                            className="w-full rounded-xl border p-2"
                            value={opening.type}
                            onChange={(e) => updateOpening(side.id, opening.id, "type", e.target.value)}
                          >
                            <option value="window">Raam</option>
                            <option value="door">Deur</option>
                            <option value="other">Overig</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-sm">Breedte (cm)</label>
                          <input
                            className="w-full rounded-xl border p-2"
                            inputMode="numeric"
                            value={opening.width}
                            onChange={(e) => updateOpening(side.id, opening.id, "width", e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm">Hoogte (cm)</label>
                          <input
                            className="w-full rounded-xl border p-2"
                            inputMode="numeric"
                            value={opening.height}
                            onChange={(e) => updateOpening(side.id, opening.id, "height", e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm">Aantal</label>
                          <input
                            className="w-full rounded-xl border p-2"
                            inputMode="numeric"
                            value={opening.count}
                            onChange={(e) => updateOpening(side.id, opening.id, "count", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="rounded-xl border px-4 py-2"
                    onClick={() => addOpening(side.id)}
                  >
                    Opening toevoegen
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed p-4 text-sm text-gray-500">
                  Nog geen AI-resultaten voor deze zijde.
                </div>
              )}
            </div>
          ) : null}

          {side.openingMode === "manual" ? (
            <div className="space-y-4 rounded-2xl border p-4">
              <div>
                <h3 className="font-semibold">Handmatige invoer openingen</h3>
                <p className="text-sm text-gray-600">
                  Voeg alleen de ramen, deuren of andere openingen toe die op deze zijde aanwezig zijn.
                </p>
              </div>

              {side.openings.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-4 text-sm text-gray-500">
                  Nog geen ramen of deuren toegevoegd.
                </div>
              ) : null}

              {side.openings.map((opening, openingIndex) => (
                <div key={opening.id} className="rounded-2xl border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Opening {openingIndex + 1}</h4>
                    <button
                      type="button"
                      className="text-sm underline"
                      onClick={() => removeOpening(side.id, opening.id)}
                    >
                      Verwijderen
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-sm">Type</label>
                      <select
                        className="w-full rounded-xl border p-2"
                        value={opening.type}
                        onChange={(e) => updateOpening(side.id, opening.id, "type", e.target.value)}
                      >
                        <option value="window">Raam</option>
                        <option value="door">Deur</option>
                        <option value="other">Overig</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm">Breedte (cm)</label>
                      <input
                        className="w-full rounded-xl border p-2"
                        inputMode="numeric"
                        value={opening.width}
                        onChange={(e) => updateOpening(side.id, opening.id, "width", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm">Hoogte (cm)</label>
                      <input
                        className="w-full rounded-xl border p-2"
                        inputMode="numeric"
                        value={opening.height}
                        onChange={(e) => updateOpening(side.id, opening.id, "height", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm">Aantal</label>
                      <input
                        className="w-full rounded-xl border p-2"
                        inputMode="numeric"
                        value={opening.count}
                        onChange={(e) => updateOpening(side.id, opening.id, "count", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="rounded-xl border px-4 py-2"
                onClick={() => addOpening(side.id)}
              >
                Raam / deur toevoegen
              </button>
            </div>
          ) : null}

          {side.error ? (
            <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {side.error}
            </div>
          ) : null}
        </section>
      ))}

      <section className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          className="rounded-xl border px-4 py-3 disabled:opacity-50"
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

      <section className="rounded-2xl border p-4 text-sm text-gray-600">
        AI geeft een eerste inschatting op basis van foto plus opgegeven zijdebreedte en zijdehoogte. Controleer en corrigeer de voorgestelde ramen en deuren altijd voordat je verdergaat.
      </section>
    </main>
  );
}
