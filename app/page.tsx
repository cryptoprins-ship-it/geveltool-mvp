// #Aanwezige functionaliteit
// - #Zijdenamen: Voorzijde, Achterzijde, Linkerzijde, Rechterzijde
// - #Afmetingen koppelen: voor/achter en links/rechts met toggle switch
// - #Vraag per zijde: heeft deze zijde kozijnen? met toggle switch
// - #Vraag per zijde: heeft deze zijde deuren? met toggle switch
// - #Custom maat bovenaan dropdown
// - #Standaard maten onder custom
// - #Exacte openinggroepen: 1 maat x aantal
// - #Calculator bruto oppervlak
// - #Calculator opening m2
// - #Calculator netto oppervlak
// - #Foto maken
// - #Bestand upload
// - #Drag and drop upload
// - #Preview afbeelding
// - #LocalStorage opslaan/laden
// - #Reset opgeslagen gegevens
// - #Validatie: breedte/hoogte moeten groter zijn dan 0
// - #Koppeling uitzetten: overgenomen afmetingen blijven staan en worden bewerkbaar
// - #Zijde toevoegen/verwijderen
// - #Totaaloverzicht

"use client";

// #Imports
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

// #Types
type OpeningType = "window" | "door" | "other";
type YesNo = "yes" | "no";

// #Toggle switch component
function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-black bg-white px-4 py-3 text-left text-black"
      aria-pressed={checked}
    >
      <span className="text-sm font-medium text-black">{label}</span>
      <span className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border border-black transition ${checked ? "bg-black" : "bg-white"}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full transition ${checked ? "left-6 bg-white" : "left-1 bg-black"}`} />
      </span>
    </button>
  );
}

type OpeningPreset = {
  label: string;
  width: string;
  height: string;
};

type OpeningGroup = {
  id: string;
  type: OpeningType;
  label: string;
  presetKey: string;
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
  hasWindows: YesNo;
  hasDoors: YesNo;
  openings: OpeningGroup[];
  error: string;
  linkToSideId?: string;
};

type SavedSide = Omit<Side, "photo" | "previewUrl"> & {
  photo: null;
  previewUrl: "";
};

type SavedState = {
  sideCount: number;
  frontBackSameDimensions: boolean | null;
  leftRightSameDimensions: boolean | null;
  sides: SavedSide[];
};

// #Configuratie
const MAX_SIDES = 10;
const STORAGE_KEY = "gevelplanner-exact-openingen-v2";

// #Standaard maten kozijnen, custom staat bewust bovenaan in dropdown
const WINDOW_PRESETS: Record<string, OpeningPreset> = {
  custom: { label: "Custom (handmatig)", width: "", height: "" },
  "window-60x60": { label: "Kozijn 60 x 60 cm", width: "60", height: "60" },
  "window-100x100": { label: "Kozijn 100 x 100 cm", width: "100", height: "100" },
  "window-120x120": { label: "Kozijn 120 x 120 cm", width: "120", height: "120" },
  "window-150x120": { label: "Kozijn 150 x 120 cm", width: "150", height: "120" },
  "window-220x83": { label: "Kozijn 220 x 83 cm", width: "220", height: "83" },
  "window-240x120": { label: "Kozijn 240 x 120 cm", width: "240", height: "120" },
};

// #Standaard maten deuren, custom staat bewust bovenaan in dropdown
const DOOR_PRESETS: Record<string, OpeningPreset> = {
  custom: { label: "Custom (handmatig)", width: "", height: "" },
  "door-83x201.5": { label: "Deur 83 x 201,5 cm", width: "83", height: "201.5" },
  "door-88x211.5": { label: "Deur 88 x 211,5 cm", width: "88", height: "211.5" },
  "door-93x231.5": { label: "Deur 93 x 231,5 cm", width: "93", height: "231.5" },
  "door-98x231.5": { label: "Deur 98 x 231,5 cm", width: "98", height: "231.5" },
};

// #Zijdenamen
function getDefaultSideName(index: number): string {
  const fixedNames = ["Voorzijde", "Achterzijde", "Linkerzijde", "Rechterzijde"];
  return fixedNames[index] ?? `Zijde ${index + 1}`;
}

// #Openinggroep aanmaken
function createOpeningGroup(type: OpeningType, label?: string): OpeningGroup {
  return {
    id: crypto.randomUUID(),
    type,
    label: label ?? (type === "door" ? "Deur" : type === "window" ? "Kozijnen" : "Overige opening"),
    presetKey: "custom",
    width: "",
    height: "",
    count: "1",
  };
}

// #Zijde aanmaken
function createSide(index: number): Side {
  return {
    id: crypto.randomUUID(),
    name: getDefaultSideName(index),
    width: "",
    height: "",
    photo: null,
    previewUrl: "",
    hasWindows: "no",
    hasDoors: "no",
    openings: [],
    error: "",
    linkToSideId: undefined,
  };
}

// #Zijdes bouwen
function buildSides(count: number): Side[] {
  return Array.from({ length: count }, (_, index) => createSide(index));
}

// #Helper: string naar nummer
function toNumber(value: string): number {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

// #Helper: afronden
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// #LocalStorage opslaan zonder foto
function sanitizeSidesForSave(sides: Side[]): SavedSide[] {
  return sides.map((side) => ({
    ...side,
    photo: null,
    previewUrl: "",
  }));
}

// #LocalStorage validatie
function isValidSavedState(value: unknown): value is SavedState {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<SavedState>;
  return typeof data.sideCount === "number" && Array.isArray(data.sides);
}

// #Automatische afmetingen-koppeling bepalen
function getAutoLinkedSourceId(
  index: number,
  sides: Side[],
  frontBackSameDimensions: boolean | null,
  leftRightSameDimensions: boolean | null
): string | undefined {
  if (index === 1 && frontBackSameDimensions && sides[0]) return sides[0].id;
  if (index === 3 && leftRightSameDimensions && sides[2]) return sides[2].id;
  return undefined;
}

// #Bronzijde ophalen voor gekoppelde afmetingen
function getSourceSide(
  side: Side,
  index: number,
  sides: Side[],
  frontBackSameDimensions: boolean | null,
  leftRightSameDimensions: boolean | null
): { source?: Side; isAuto: boolean } {
  const autoId = getAutoLinkedSourceId(index, sides, frontBackSameDimensions, leftRightSameDimensions);

  if (autoId) {
    return { source: sides.find((s) => s.id === autoId), isAuto: true };
  }

  if (side.linkToSideId) {
    return { source: sides.find((s) => s.id === side.linkToSideId), isAuto: false };
  }

  return { source: undefined, isAuto: false };
}

export default function Page() {
  // #State hoofdgegevens
  const [sideCount, setSideCount] = useState(4);
  const [frontBackSameDimensions, setFrontBackSameDimensions] = useState<boolean | null>(true);
  const [leftRightSameDimensions, setLeftRightSameDimensions] = useState<boolean | null>(true);
  const [sides, setSides] = useState<Side[]>(buildSides(4));

  // #State meldingen
  const [globalError, setGlobalError] = useState("");
  const [globalInfo, setGlobalInfo] = useState("");
  const [hasLoadedSavedState, setHasLoadedSavedState] = useState(false);

  // #Refs foto/bestand upload
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const cameraInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const previewUrlsRef = useRef<string[]>([]);

  // #LocalStorage laden
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setHasLoadedSavedState(true);
        return;
      }

      const parsed = JSON.parse(raw) as unknown;
      if (!isValidSavedState(parsed)) {
        setHasLoadedSavedState(true);
        return;
      }

      setSideCount(parsed.sideCount);
      setFrontBackSameDimensions(parsed.frontBackSameDimensions ?? null);
      setLeftRightSameDimensions(parsed.leftRightSameDimensions ?? null);
      setSides(
        parsed.sides.map((side, index) => ({
          ...side,
          name: side.name || getDefaultSideName(index),
          photo: null,
          previewUrl: "",
        }))
      );
      setGlobalInfo("Opgeslagen gegevens zijn geladen. Foto’s moet je opnieuw kiezen.");
    } catch (error) {
      console.error(error);
    } finally {
      setHasLoadedSavedState(true);
    }
  }, []);

  // #Preview URL tracking
  useEffect(() => {
    previewUrlsRef.current = sides.map((side) => side.previewUrl).filter(Boolean);
  }, [sides]);

  // #Preview URL cleanup
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      });
    };
  }, []);

  // #LocalStorage opslaan
  useEffect(() => {
    if (!hasLoadedSavedState) return;

    const data: SavedState = {
      sideCount,
      frontBackSameDimensions,
      leftRightSameDimensions,
      sides: sanitizeSidesForSave(sides),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error(error);
    }
  }, [hasLoadedSavedState, sideCount, frontBackSameDimensions, leftRightSameDimensions, sides]);

  // #Update zijde helper
  const updateSide = (sideId: string, updater: (side: Side) => Side) => {
    setSides((prev) => prev.map((side) => (side.id === sideId ? updater(side) : side)));
  };

  // #Zijde veld wijzigen
  const setSideField = <K extends keyof Side>(sideId: string, field: K, value: Side[K]) => {
    updateSide(sideId, (side) => ({ ...side, [field]: value }));
  };

  // #Bestand upload en foto maken verwerking
  const handleNewImage = (sideId: string, file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      updateSide(sideId, (side) => ({ ...side, error: "Gebruik een afbeeldingbestand." }));
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

  // #Input bestand/foto change
  const handleFileChange = (sideId: string, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    handleNewImage(sideId, file);
    e.target.value = "";
  };

  // #Vraag: heeft deze zijde kozijnen?
  const setHasWindows = (sideId: string, value: YesNo) => {
    updateSide(sideId, (side) => {
      const withoutWindows = side.openings.filter((opening) => opening.type !== "window");
      return {
        ...side,
        hasWindows: value,
        openings: value === "yes" ? [createOpeningGroup("window", "Kozijnen"), ...withoutWindows] : withoutWindows,
      };
    });
  };

  // #Vraag: heeft deze zijde deuren?
  const setHasDoors = (sideId: string, value: YesNo) => {
    updateSide(sideId, (side) => {
      const withoutDoors = side.openings.filter((opening) => opening.type !== "door");
      return {
        ...side,
        hasDoors: value,
        openings: value === "yes" ? [...withoutDoors, createOpeningGroup("door", "Deuren")] : withoutDoors,
      };
    });
  };

  // #Openinggroep toevoegen, bijv extra afwijkende maat kozijnen
  const addOpeningGroup = (sideId: string, type: OpeningType) => {
    updateSide(sideId, (side) => ({
      ...side,
      openings: [...side.openings, createOpeningGroup(type, type === "door" ? "Deuren" : "Kozijnen")],
    }));
  };

  // #Openinggroep verwijderen
  const removeOpeningGroup = (sideId: string, openingId: string) => {
    updateSide(sideId, (side) => ({
      ...side,
      openings: side.openings.filter((opening) => opening.id !== openingId),
    }));
  };

  // #Openinggroep wijzigen
  const updateOpeningGroup = <K extends keyof OpeningGroup>(
    sideId: string,
    openingId: string,
    field: K,
    value: OpeningGroup[K]
  ) => {
    updateSide(sideId, (side) => ({
      ...side,
      openings: side.openings.map((opening) =>
        opening.id === openingId ? { ...opening, [field]: value } : opening
      ),
    }));
  };

  // #Custom bovenaan en standaardmaten dropdown toepassen
  const applyPreset = (sideId: string, opening: OpeningGroup, presetKey: string) => {
    const presets = opening.type === "door" ? DOOR_PRESETS : WINDOW_PRESETS;
    const preset = presets[presetKey];

    updateSide(sideId, (side) => ({
      ...side,
      openings: side.openings.map((item) => {
        if (item.id !== opening.id) return item;
        if (!preset || presetKey === "custom") {
          return { ...item, presetKey: "custom", width: "", height: "" };
        }
        return {
          ...item,
          presetKey,
          width: preset.width,
          height: preset.height,
        };
      }),
    }));
  };

  // #Zijde toevoegen
  const addSide = () => {
    setSides((prev) => {
      if (prev.length >= MAX_SIDES) return prev;
      setSideCount(prev.length + 1);
      return [...prev, createSide(prev.length)];
    });
  };

  // #Zijde verwijderen
  const removeSide = (sideId: string) => {
    setSides((prev) => {
      const sideToDelete = prev.find((side) => side.id === sideId);
      if (sideToDelete?.previewUrl) URL.revokeObjectURL(sideToDelete.previewUrl);

      const filtered = prev.filter((side) => side.id !== sideId);
      setSideCount(filtered.length);

      return filtered.map((side, index) => ({
        ...side,
        name: getDefaultSideName(index),
        linkToSideId: side.linkToSideId === sideId ? undefined : side.linkToSideId,
      }));
    });
  };

  // #Aantal zijdes wijzigen
  const resetSidesByCount = (count: number) => {
    setSideCount(count);
    setSides(buildSides(count));
    setGlobalError("");
    setGlobalInfo("");

    if (count < 2) setFrontBackSameDimensions(null);
    else setFrontBackSameDimensions(true);

    if (count < 4) setLeftRightSameDimensions(null);
    else setLeftRightSameDimensions(true);
  };

  // #Handmatige afmetingen koppelen
  const handleManualLinkChange = (sideId: string, sourceId: string) => {
    setSides((prev) =>
      prev.map((side) => {
        if (side.id !== sideId) return side;
        const source = prev.find((item) => item.id === sourceId);
        if (!sourceId || !source) return { ...side, linkToSideId: undefined };
        return { ...side, linkToSideId: sourceId, width: source.width, height: source.height };
      })
    );
  };

  // #Koppeling voor/achter wijzigen en waarden behouden bij uitzetten
  const handleFrontBackSameDimensionsChange = (checked: boolean) => {
    setSides((prev) => {
      if (!prev[0] || !prev[1]) return prev;
      return prev.map((side, index) => {
        if (index !== 1) return side;
        if (checked) return { ...side, linkToSideId: prev[0].id, width: prev[0].width, height: prev[0].height };
        return { ...side, linkToSideId: undefined, width: side.width || prev[0].width, height: side.height || prev[0].height };
      });
    });
    setFrontBackSameDimensions(checked);
  };

  // #Koppeling links/rechts wijzigen en waarden behouden bij uitzetten
  const handleLeftRightSameDimensionsChange = (checked: boolean) => {
    setSides((prev) => {
      if (!prev[2] || !prev[3]) return prev;
      return prev.map((side, index) => {
        if (index !== 3) return side;
        if (checked) return { ...side, linkToSideId: prev[2].id, width: prev[2].width, height: prev[2].height };
        return { ...side, linkToSideId: undefined, width: side.width || prev[2].width, height: side.height || prev[2].height };
      });
    });
    setLeftRightSameDimensions(checked);
  };

  // #Reset opgeslagen gegevens
  const resetSavedData = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      sides.forEach((side) => {
        if (side.previewUrl) URL.revokeObjectURL(side.previewUrl);
      });
    } catch (error) {
      console.error(error);
    }

    setSideCount(4);
    setFrontBackSameDimensions(true);
    setLeftRightSameDimensions(true);
    setSides(buildSides(4));
    setGlobalError("");
    setGlobalInfo("Opgeslagen gegevens zijn verwijderd.");
  };

  // #Gekoppelde breedte ophalen
  const getResolvedWidth = (side: Side, index: number): string => {
    const { source } = getSourceSide(side, index, sides, frontBackSameDimensions, leftRightSameDimensions);
    return source ? source.width : side.width;
  };

  // #Gekoppelde hoogte ophalen
  const getResolvedHeight = (side: Side, index: number): string => {
    const { source } = getSourceSide(side, index, sides, frontBackSameDimensions, leftRightSameDimensions);
    return source ? source.height : side.height;
  };

  // #Calculator bruto oppervlak
  const getGrossAreaM2 = (side: Side, index: number) => {
    return round2((toNumber(getResolvedWidth(side, index)) / 100) * (toNumber(getResolvedHeight(side, index)) / 100));
  };

  // #Calculator opening m2 exact
  const getOpeningAreaM2 = (side: Side) => {
    return round2(
      side.openings.reduce((sum, opening) => {
        const widthCm = toNumber(opening.width);
        const heightCm = toNumber(opening.height);
        const count = toNumber(opening.count);
        if (widthCm <= 0 || heightCm <= 0 || count <= 0) return sum;
        return sum + (widthCm / 100) * (heightCm / 100) * count;
      }, 0)
    );
  };

  // #Calculator netto oppervlak
  const getNetAreaM2 = (side: Side, index: number) => {
    return round2(Math.max(0, getGrossAreaM2(side, index) - getOpeningAreaM2(side)));
  };

  // #Validatie per zijde en opening
  const validationMessages = useMemo(() => {
    const messages: string[] = [];

    sides.forEach((side, index) => {
      const width = toNumber(getResolvedWidth(side, index));
      const height = toNumber(getResolvedHeight(side, index));

      if (width <= 0 || height <= 0) {
        messages.push(`${side.name}: vul een breedte en hoogte groter dan 0 in.`);
      }

      side.openings.forEach((opening) => {
        const openingWidth = toNumber(opening.width);
        const openingHeight = toNumber(opening.height);
        const openingCount = toNumber(opening.count);
        const hasAnyValue = opening.width.trim() !== "" || opening.height.trim() !== "" || opening.count.trim() !== "";

        if (hasAnyValue && (openingWidth <= 0 || openingHeight <= 0 || openingCount <= 0)) {
          messages.push(`${side.name}: controleer ${opening.label.toLowerCase()} - breedte, hoogte en aantal moeten groter zijn dan 0.`);
        }
      });
    });

    return messages;
  }, [sides, frontBackSameDimensions, leftRightSameDimensions]);

  // #Validatie voor berekenen
  const canContinue = useMemo(() => validationMessages.length === 0, [validationMessages]);

  // #Calculator totaaloverzicht
  const totals = useMemo(() => {
    return {
      gross: round2(
        sides.reduce((sum, side) => {
          const index = sides.findIndex((s) => s.id === side.id);
          return sum + getGrossAreaM2(side, index);
        }, 0)
      ),
      opening: round2(sides.reduce((sum, side) => sum + getOpeningAreaM2(side), 0)),
      net: round2(
        sides.reduce((sum, side) => {
          const index = sides.findIndex((s) => s.id === side.id);
          return sum + getNetAreaM2(side, index);
        }, 0)
      ),
    };
  }, [sides, frontBackSameDimensions, leftRightSameDimensions]);

  // #Bereken knop lokaal
  const handleCalculate = () => {
    setGlobalError("");
    setGlobalInfo("");

    if (!canContinue) {
      setGlobalError(validationMessages[0] ?? "Controleer de afmetingen en openingen.");
      return;
    }

    setGlobalInfo("Berekening bijgewerkt.");
  };

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-black">
      <div className="mx-auto max-w-6xl space-y-6 p-4 pb-28 md:p-6">
        {/* #Header */}
        <section className="rounded-2xl border border-black bg-white p-4 text-center shadow-sm md:p-6">
          <h1 className="text-3xl font-bold tracking-tight text-black">GevelPlanner</h1>
          <p className="mt-2 text-base font-medium text-black">Bereken je gevel snel en exact</p>
          <p className="mt-3 text-sm leading-6 text-black">
            Vul per zijde de afmetingen in. Kozijnen en deuren worden exact berekend met breedte × hoogte × aantal.
          </p>
        </section>

        {/* #Aantal zijdes en koppelingen */}
        <section className="rounded-2xl border border-black bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold text-black">Projectinstellingen</h2>
            <button
              type="button"
              onClick={resetSavedData}
              className="rounded-xl border border-black bg-white px-4 py-2 text-sm font-medium text-black"
            >
              Reset opgeslagen gegevens
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Aantal zijdes</label>
              <select
                className="w-full rounded-xl border border-black bg-white p-3 text-black outline-none"
                value={sideCount}
                onChange={(e) => resetSidesByCount(Number(e.target.value))}
              >
                {Array.from({ length: MAX_SIDES }, (_, i) => i + 1).map((count) => (
                  <option key={count} value={count}>{count}</option>
                ))}
              </select>
            </div>

            {sideCount >= 2 ? (
              <div>
                <ToggleSwitch
                  checked={!!frontBackSameDimensions}
                  onChange={handleFrontBackSameDimensionsChange}
                  label="Zelfde afmetingen voor voorzijde en achterzijde"
                />
              </div>
            ) : null}

            {sideCount >= 4 ? (
              <div>
                <ToggleSwitch
                  checked={!!leftRightSameDimensions}
                  onChange={handleLeftRightSameDimensionsChange}
                  label="Zelfde afmetingen voor linkerzijde en rechterzijde"
                />
              </div>
            ) : null}
          </div>
        </section>

        {/* #Zijde kaarten */}
        {sides.map((side, index) => {
          const { source, isAuto } = getSourceSide(side, index, sides, frontBackSameDimensions, leftRightSameDimensions);
          const isLinked = !!source;
          const resolvedWidth = getResolvedWidth(side, index);
          const resolvedHeight = getResolvedHeight(side, index);
          const manualLinkOptions = sides.filter((s, optionIndex) => s.id !== side.id && optionIndex < index);

          return (
            <section key={side.id} className="space-y-5 rounded-2xl border border-black bg-white p-4 shadow-sm md:p-6">
              {/* #Zijde titel */}
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-black">{side.name}</h2>
                  <p className="text-sm text-black">Vul de afmetingen, foto en openingen voor deze zijde in.</p>
                </div>

                {sides.length > 1 ? (
                  <button type="button" className="rounded-xl border border-black bg-white px-4 py-2 text-sm font-medium text-black" onClick={() => removeSide(side.id)}>
                    Verwijder zijde
                  </button>
                ) : null}
              </div>

              {/* #Automatisch of handmatig afmetingen koppelen */}
              {isAuto ? (
                <div className="rounded-xl border border-black bg-white p-3 text-sm text-black">
                  Afmetingen worden automatisch overgenomen van {source?.name}.
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-sm font-medium text-black">Neem afmetingen over van een eerdere zijde</label>
                  <select
                    className="w-full rounded-xl border border-black bg-white p-3 text-black outline-none"
                    value={side.linkToSideId || ""}
                    onChange={(e) => handleManualLinkChange(side.id, e.target.value)}
                  >
                    <option value="">Nee, handmatig invullen</option>
                    {manualLinkOptions.map((option) => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* #Afmetingen */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-black">Breedte zijde (cm)</label>
                  <input
                    className="w-full rounded-xl border border-black bg-white p-3 text-black outline-none disabled:bg-white"
                    inputMode="decimal"
                    value={resolvedWidth}
                    onChange={(e) => setSideField(side.id, "width", e.target.value)}
                    placeholder="Bijv. 540"
                    disabled={isLinked}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-black">Hoogte zijde (cm)</label>
                  <input
                    className="w-full rounded-xl border border-black bg-white p-3 text-black outline-none disabled:bg-white"
                    inputMode="decimal"
                    value={resolvedHeight}
                    onChange={(e) => setSideField(side.id, "height", e.target.value)}
                    placeholder="Bijv. 280"
                    disabled={isLinked}
                  />
                </div>
              </div>

              {/* #Foto maken / bestand upload / drag and drop */}
              <div
                className="rounded-2xl border-2 border-dashed border-black bg-white p-4 text-center text-black"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0] ?? null;
                  handleNewImage(side.id, file);
                }}
              >
                <p className="mb-3 text-sm font-semibold text-black">Sleep hier een foto naartoe of kies een bestand</p>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <button type="button" className="rounded-xl border border-black bg-white px-4 py-3 font-medium text-black" onClick={() => cameraInputRefs.current[side.id]?.click()}>
                    {side.previewUrl ? "Vervang foto" : "Maak foto"}
                  </button>

                  <button type="button" className="rounded-xl border border-black bg-white px-4 py-3 font-medium text-black" onClick={() => fileInputRefs.current[side.id]?.click()}>
                    {side.previewUrl ? "Kies ander bestand" : "Kies bestand"}
                  </button>
                </div>

                <input
                  ref={(el) => { cameraInputRefs.current[side.id] = el; }}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleFileChange(side.id, e)}
                />

                <input
                  ref={(el) => { fileInputRefs.current[side.id] = el; }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(side.id, e)}
                />

                {side.previewUrl ? (
                  <div className="mt-4 rounded-xl border border-black bg-white p-3">
                    <img src={side.previewUrl} alt={`Preview van ${side.name}`} className="max-h-[360px] w-full rounded-xl object-contain" />
                  </div>
                ) : null}
              </div>

              {/* #Vraag: kozijnen en deuren aanwezig */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <ToggleSwitch
                    checked={side.hasWindows === "yes"}
                    onChange={(checked) => setHasWindows(side.id, checked ? "yes" : "no")}
                    label="Deze zijde heeft kozijnen"
                  />
                </div>

                <div>
                  <ToggleSwitch
                    checked={side.hasDoors === "yes"}
                    onChange={(checked) => setHasDoors(side.id, checked ? "yes" : "no")}
                    label="Deze zijde heeft deuren"
                  />
                </div>
              </div>

              {/* #Openingen exact invoeren */}
              {side.openings.length > 0 ? (
                <div className="space-y-4 rounded-2xl border border-black bg-white p-4">
                  <div>
                    <h3 className="font-semibold text-black">Openingen exact invoeren</h3>
                    <p className="text-sm text-black">Bij gelijke kozijnen vul je de maat één keer in en zet je bij aantal bijvoorbeeld 4.</p>
                  </div>

                  {side.openings.map((opening) => {
                    const presets = opening.type === "door" ? DOOR_PRESETS : WINDOW_PRESETS;
                    const area = round2((toNumber(opening.width) / 100) * (toNumber(opening.height) / 100) * toNumber(opening.count));

                    return (
                      <div key={opening.id} className="space-y-3 rounded-2xl border border-black bg-white p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h4 className="font-semibold text-black">{opening.label}</h4>
                            <p className="text-sm text-black">Groep oppervlak: {area.toFixed(2)} m²</p>
                          </div>
                          <button type="button" className="rounded-xl border border-black bg-white px-3 py-2 text-sm text-black" onClick={() => removeOpeningGroup(side.id, opening.id)}>
                            Verwijder
                          </button>
                        </div>

                        {/* #Custom bovenaan + standaardmaten dropdown */}
                        <div>
                          <label className="mb-1 block text-sm font-medium text-black">Maat kiezen</label>
                          <select className="w-full rounded-xl border border-black bg-white p-3 text-black outline-none" value={opening.presetKey} onChange={(e) => applyPreset(side.id, opening, e.target.value)}>
                            <option value="custom">Custom (handmatig)</option>
                            <optgroup label="Standaard maten">
                              {Object.entries(presets).filter(([key]) => key !== "custom").map(([key, preset]) => (
                                <option key={key} value={key}>{preset.label}</option>
                              ))}
                            </optgroup>
                          </select>
                        </div>

                        {/* #Breedte hoogte aantal */}
                        <div className="grid gap-3 md:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-sm font-medium text-black">Breedte (cm)</label>
                            <input className="w-full rounded-xl border border-black bg-white p-3 text-black outline-none" inputMode="decimal" value={opening.width} onChange={(e) => updateOpeningGroup(side.id, opening.id, "width", e.target.value)} />
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium text-black">Hoogte (cm)</label>
                            <input className="w-full rounded-xl border border-black bg-white p-3 text-black outline-none" inputMode="decimal" value={opening.height} onChange={(e) => updateOpeningGroup(side.id, opening.id, "height", e.target.value)} />
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium text-black">Aantal</label>
                            <input className="w-full rounded-xl border border-black bg-white p-3 text-black outline-none" inputMode="decimal" value={opening.count} onChange={(e) => updateOpeningGroup(side.id, opening.id, "count", e.target.value)} />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* #Extra openinggroep toevoegen */}
                  <div className="flex flex-col gap-3 sm:flex-row">
                    {side.hasWindows === "yes" ? (
                      <button type="button" className="rounded-xl border border-black bg-white px-4 py-2 font-medium text-black" onClick={() => addOpeningGroup(side.id, "window")}>+ Extra kozijnmaat</button>
                    ) : null}
                    {side.hasDoors === "yes" ? (
                      <button type="button" className="rounded-xl border border-black bg-white px-4 py-2 font-medium text-black" onClick={() => addOpeningGroup(side.id, "door")}>+ Extra deurmaat</button>
                    ) : null}
                    <button type="button" className="rounded-xl border border-black bg-white px-4 py-2 font-medium text-black" onClick={() => addOpeningGroup(side.id, "other")}>+ Overige opening</button>
                  </div>
                </div>
              ) : null}

              {/* #Calculator per zijde */}
              <div className="rounded-2xl border border-black bg-white p-4">
                <h3 className="mb-3 font-semibold text-black">Berekening {side.name}</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-black bg-white p-3">
                    <div className="text-sm text-black">Bruto oppervlak</div>
                    <div className="mt-1 text-lg font-semibold text-black">{getGrossAreaM2(side, index).toFixed(2)} m²</div>
                  </div>
                  <div className="rounded-xl border border-black bg-white p-3">
                    <div className="text-sm text-black">Openingen totaal</div>
                    <div className="mt-1 text-lg font-semibold text-black">{getOpeningAreaM2(side).toFixed(2)} m²</div>
                  </div>
                  <div className="rounded-xl border border-black bg-white p-3">
                    <div className="text-sm text-black">Netto oppervlak</div>
                    <div className="mt-1 text-lg font-semibold text-black">{getNetAreaM2(side, index).toFixed(2)} m²</div>
                  </div>
                </div>
              </div>

              {/* #Zijde foutmelding */}
              {side.error ? <div className="rounded-xl border border-black bg-white p-3 text-sm text-black">{side.error}</div> : null}
            </section>
          );
        })}

        {/* #Totaaloverzicht */}
        <section className="rounded-2xl border border-black bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-lg font-semibold text-black">Totaaloverzicht</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-black bg-white p-3">
              <div className="text-sm text-black">Totaal bruto</div>
              <div className="mt-1 text-lg font-semibold text-black">{totals.gross.toFixed(2)} m²</div>
            </div>
            <div className="rounded-xl border border-black bg-white p-3">
              <div className="text-sm text-black">Totaal openingen</div>
              <div className="mt-1 text-lg font-semibold text-black">{totals.opening.toFixed(2)} m²</div>
            </div>
            <div className="rounded-xl border border-black bg-white p-3">
              <div className="text-sm text-black">Totaal netto</div>
              <div className="mt-1 text-lg font-semibold text-black">{totals.net.toFixed(2)} m²</div>
            </div>
          </div>
        </section>

        {/* #Globale info */}
        {globalInfo ? <section className="rounded-xl border border-black bg-white p-3 text-sm text-black">{globalInfo}</section> : null}

        {/* #Globale foutmelding */}
        {globalError ? <section className="rounded-xl border border-black bg-white p-3 text-sm text-black">{globalError}</section> : null}

        {/* #Validatie meldingen */}
        {validationMessages.length > 0 ? (
          <section className="rounded-xl border border-black bg-white p-3 text-sm text-black">
            <div className="font-semibold">Nog controleren</div>
            <ul className="mt-2 list-inside list-disc">
              {validationMessages.slice(0, 5).map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {/* #Bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-black bg-white p-4">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row">
          <button type="button" className="rounded-xl border border-black bg-white px-4 py-3 font-medium text-black disabled:opacity-50" onClick={addSide} disabled={sides.length >= MAX_SIDES}>
            Zijde toevoegen
          </button>
          <button type="button" className="rounded-xl bg-black px-5 py-3 font-semibold text-white" onClick={handleCalculate}>
            Bereken resultaat
          </button>
        </div>
      </div>
    </main>
  );
}
