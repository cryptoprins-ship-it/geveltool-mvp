"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

type InputMode = "quick" | "advanced";
type StepMode = "surface" | "material" | "result";
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

type ProductType =
  | "panel"
  | "starter_profile"
  | "end_profile"
  | "corner_profile_external"
  | "corner_profile_internal"
  | "connection_profile_visible"
  | "connection_profile_base"
  | "substructure";

type SpanlSystemProduct = {
  id: string;
  active: boolean;
  sku: string;
  name: string;
  type: ProductType;
  color: string;
  finish?: string;
  lengthMm: number;
  workHeightMm?: number;
  thicknessMm?: number;
  areaM2?: number;
  priceExVat: number;
  notes?: string;
};

type ProductLibrary = {
  panels: SpanlSystemProduct[];
  accessories: SpanlSystemProduct[];
};

type MaterialSystem = "spanl_pb7038a";

type MaterialConfig = {
  system: MaterialSystem;
  discountPercent: string;
  wastePercent: string;
  outsideCorners: string;
  insideCorners: string;
  railSpacingCm: string;
};

type SavedSide = Omit<Side, "photo" | "previewUrl"> & {
  photo: null;
  previewUrl: "";
};

type SavedState = {
  currentStep: StepMode;
  inputMode: InputMode;
  sideCount: number;
  frontBackEqual: boolean | null;
  leftRightEqual: boolean | null;
  sides: SavedSide[];
  materialConfig: MaterialConfig;
  productLibrary: ProductLibrary;
};

const STORAGE_KEY = "gevelplanner-v3";
const MAX_SIDES = 10;

const frameSizeAverages: Record<FrameSizeType, number> = {
  small: 1.0,
  medium: 1.6,
  large: 2.5,
};

function getDefaultSideName(index: number): string {
  const fixedNames = ["Voorzijde", "Achterzijde", "Linkerzijde", "Rechterzijde"];
  return fixedNames[index] ?? `Zijde ${index + 1}`;
}

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
    name: getDefaultSideName(index),
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

function buildSides(count: number): Side[] {
  return Array.from({ length: count }, (_, index) => createSide(index));
}

function createDefaultLibrary(): ProductLibrary {
  return {
    panels: [
      {
        id: "pb7038a-panel",
        active: true,
        sku: "PB7038A",
        name: "PB7038A Mono flat matt grey",
        type: "panel",
        color: "RAL7038 matt grey",
        finish: "Smalle naad / glad",
        lengthMm: 4200,
        workHeightMm: 370,
        thicknessMm: 16,
        areaM2: 1.554,
        priceExVat: 45.73,
        notes:
          "16mm dun, extra isolatiewaarde 0,74 m2.K/W, onderhoudsvrij, brandklasse A2, vuilafstotende Akzo Nobel coating",
      },
    ],
    accessories: [
      {
        id: "qbj-starter-3m",
        active: true,
        sku: "QBJ",
        name: "QBJ startersprofiel aluminium",
        type: "starter_profile",
        color: "aluminium",
        lengthMm: 3000,
        priceExVat: 7.95,
      },
      {
        id: "sbt-j-7038-38m",
        active: true,
        sku: "SBT",
        name: "SBT J Channel eindprofiel RAL7038 matt grey",
        type: "end_profile",
        color: "RAL7038 matt grey",
        lengthMm: 3800,
        priceExVat: 14.95,
      },
      {
        id: "yj01-7021-3m",
        active: true,
        sku: "YJ01",
        name: "YJ01 hoekprofiel RAL7021",
        type: "corner_profile_external",
        color: "RAL7021",
        lengthMm: 3000,
        priceExVat: 12.95,
      },
      {
        id: "yinj03-7038-3m",
        active: true,
        sku: "YINJ03",
        name: "YINJ03 inside corner 7038",
        type: "corner_profile_internal",
        color: "RAL7038 matt grey",
        lengthMm: 3000,
        priceExVat: 19.95,
      },
      {
        id: "pjdz-3m",
        active: true,
        sku: "PJDZ",
        name: "PJDZ verbindingsprofiel aluminium",
        type: "connection_profile_base",
        color: "aluminium",
        lengthMm: 3000,
        priceExVat: 9.95,
      },
      {
        id: "pj01-7038-38m",
        active: true,
        sku: "PJ01",
        name: "PJ01 verbindingsprofiel RAL7038 matt grey",
        type: "connection_profile_visible",
        color: "RAL7038 matt grey",
        lengthMm: 3800,
        priceExVat: 14.95,
      },
      {
        id: "rail-default",
        active: true,
        sku: "RAIL",
        name: "Montagerail / onderconstructie",
        type: "substructure",
        color: "aluminium",
        lengthMm: 3000,
        priceExVat: 5.0,
        notes: "Placeholder prijs, later vervangen door echte railprijs",
      },
    ],
  };
}

function createDefaultMaterialConfig(): MaterialConfig {
  return {
    system: "spanl_pb7038a",
    discountPercent: "0",
    wastePercent: "5",
    outsideCorners: "4",
    insideCorners: "0",
    railSpacingCm: "60",
  };
}

function toNumber(value: string): number {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function sanitizeSidesForSave(sides: Side[]): SavedSide[] {
  return sides.map((side) => ({
    ...side,
    photo: null,
    previewUrl: "",
  }));
}

function isValidSavedState(value: unknown): value is SavedState {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<SavedState>;
  return (
    !!data.currentStep &&
    !!data.inputMode &&
    typeof data.sideCount === "number" &&
    Array.isArray(data.sides) &&
    !!data.materialConfig &&
    !!data.productLibrary
  );
}

function getAutoLinkedSourceId(
  index: number,
  sides: Side[],
  frontBackEqual: boolean | null,
  leftRightEqual: boolean | null
): string | undefined {
  if (index === 1 && frontBackEqual && sides[0]) return sides[0].id;
  if (index === 3 && leftRightEqual && sides[2]) return sides[2].id;
  return undefined;
}

function getSourceSide(
  side: Side,
  index: number,
  sides: Side[],
  frontBackEqual: boolean | null,
  leftRightEqual: boolean | null
): { source?: Side; isAuto: boolean } {
  const autoId = getAutoLinkedSourceId(index, sides, frontBackEqual, leftRightEqual);
  if (autoId) {
    return {
      source: sides.find((s) => s.id === autoId),
      isAuto: true,
    };
  }

  if (side.linkToSideId) {
    return {
      source: sides.find((s) => s.id === side.linkToSideId),
      isAuto: false,
    };
  }

  return { source: undefined, isAuto: false };
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Page() {
  const [currentStep, setCurrentStep] = useState<StepMode>("surface");
  const [inputMode, setInputMode] = useState<InputMode>("quick");
  const [sideCount, setSideCount] = useState(4);
  const [frontBackEqual, setFrontBackEqual] = useState<boolean | null>(true);
  const [leftRightEqual, setLeftRightEqual] = useState<boolean | null>(true);
  const [sides, setSides] = useState<Side[]>(buildSides(4));
  const [materialConfig, setMaterialConfig] = useState<MaterialConfig>(createDefaultMaterialConfig());
  const [productLibrary, setProductLibrary] = useState<ProductLibrary>(createDefaultLibrary());
  const [globalError, setGlobalError] = useState("");
  const [globalInfo, setGlobalInfo] = useState("");
  const [hasLoadedSavedState, setHasLoadedSavedState] = useState(false);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const cameraInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const previewUrlsRef = useRef<string[]>([]);

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

      setCurrentStep(parsed.currentStep);
      setInputMode(parsed.inputMode);
      setSideCount(parsed.sideCount);
      setFrontBackEqual(parsed.frontBackEqual ?? null);
      setLeftRightEqual(parsed.leftRightEqual ?? null);
      setSides(
        parsed.sides.map((side, index) => ({
          ...side,
          name: side.name || getDefaultSideName(index),
          photo: null,
          previewUrl: "",
        }))
      );
      setMaterialConfig(parsed.materialConfig);
      setProductLibrary(parsed.productLibrary);
      setGlobalInfo("Opgeslagen gegevens zijn geladen. Zijfoto’s moet je opnieuw kiezen.");
    } catch (error) {
      console.error(error);
    } finally {
      setHasLoadedSavedState(true);
    }
  }, []);

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
        } catch {}
      });
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedSavedState) return;

    const data: SavedState = {
      currentStep,
      inputMode,
      sideCount,
      frontBackEqual,
      leftRightEqual,
      sides: sanitizeSidesForSave(sides),
      materialConfig,
      productLibrary,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [
    hasLoadedSavedState,
    currentStep,
    inputMode,
    sideCount,
    frontBackEqual,
    leftRightEqual,
    sides,
    materialConfig,
    productLibrary,
  ]);

  const updateSide = (sideId: string, updater: (side: Side) => Side) => {
    setSides((prev) => prev.map((side) => (side.id === sideId ? updater(side) : side)));
  };

  const setSideField = <K extends keyof Side>(sideId: string, field: K, value: Side[K]) => {
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
      return {
        ...side,
        photo: file,
        previewUrl: URL.createObjectURL(file),
        error: "",
      };
    });
  };

  const handleFileChange = (sideId: string, e: ChangeEvent<HTMLInputElement>) => {
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
          frameCount: "",
          error: "",
        };
      }
      if (mode === "skip") {
        return {
          ...side,
          openingMode: "skip",
          openings: [],
          aiDetectedCount: null,
          frameCount: "",
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

  const resetSidesByCount = (count: number) => {
    setSideCount(count);
    setSides(buildSides(count));
    setGlobalError("");
    setGlobalInfo("");

    if (count < 2) setFrontBackEqual(null);
    else setFrontBackEqual(true);

    if (count < 4) setLeftRightEqual(null);
    else setLeftRightEqual(true);
  };

  const handleManualLinkChange = (sideId: string, sourceId: string) => {
    setSides((prev) =>
      prev.map((side) =>
        side.id === sideId ? { ...side, linkToSideId: sourceId || undefined } : side
      )
    );
  };

  const resetSavedData = () => {
    localStorage.removeItem(STORAGE_KEY);
    previewUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });

    setCurrentStep("surface");
    setInputMode("quick");
    setSideCount(4);
    setFrontBackEqual(true);
    setLeftRightEqual(true);
    setSides(buildSides(4));
    setMaterialConfig(createDefaultMaterialConfig());
    setProductLibrary(createDefaultLibrary());
    setGlobalError("");
    setGlobalInfo("Opgeslagen gegevens zijn verwijderd.");
  };

  const getResolvedWidth = (side: Side, index: number): string => {
    const { source } = getSourceSide(side, index, sides, frontBackEqual, leftRightEqual);
    return source ? source.width : side.width;
  };

  const getResolvedHeight = (side: Side, index: number): string => {
    const { source } = getSourceSide(side, index, sides, frontBackEqual, leftRightEqual);
    return source ? source.height : side.height;
  };

  const getEstimatedDeductionM2 = (side: Side) => {
    const count = toNumber(side.frameCount);
    return round2(count * frameSizeAverages[side.frameSizeType]);
  };

  const getGrossAreaM2 = (side: Side, index: number) => {
    return round2(
      (toNumber(getResolvedWidth(side, index)) / 100) *
        (toNumber(getResolvedHeight(side, index)) / 100)
    );
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

  const getNetAreaM2 = (side: Side, index: number) => {
    return round2(Math.max(0, getGrossAreaM2(side, index) - getOpeningAreaM2(side)));
  };

  const canGoToMaterial = useMemo(() => {
    return sides.some((side, index) => {
      const widthValue = getResolvedWidth(side, index);
      const heightValue = getResolvedHeight(side, index);
      if (!widthValue.trim() || !heightValue.trim()) return false;

      if (side.openingMode === "none" || side.openingMode === "skip") return true;
      if (side.openingMode === "estimate") return true;
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
      return !!side.photo;
    });
  }, [sides, frontBackEqual, leftRightEqual]);

  const totals = useMemo(() => {
    const includedSides = sides.filter((side) => side.openingMode !== "skip");
    return {
      gross: round2(
        includedSides.reduce((sum, side) => {
          const index = sides.findIndex((s) => s.id === side.id);
          return sum + getGrossAreaM2(side, index);
        }, 0)
      ),
      opening: round2(includedSides.reduce((sum, side) => sum + getOpeningAreaM2(side), 0)),
      net: round2(
        includedSides.reduce((sum, side) => {
          const index = sides.findIndex((s) => s.id === side.id);
          return sum + getNetAreaM2(side, index);
        }, 0)
      ),
    };
  }, [sides, frontBackEqual, leftRightEqual]);

  const activeProducts = useMemo(() => {
    return {
      panel: productLibrary.panels.find((p) => p.active && p.type === "panel"),
      starter: productLibrary.accessories.find((p) => p.active && p.type === "starter_profile"),
      end: productLibrary.accessories.find((p) => p.active && p.type === "end_profile"),
      outsideCorner: productLibrary.accessories.find(
        (p) => p.active && p.type === "corner_profile_external"
      ),
      insideCorner: productLibrary.accessories.find(
        (p) => p.active && p.type === "corner_profile_internal"
      ),
      connectionBase: productLibrary.accessories.find(
        (p) => p.active && p.type === "connection_profile_base"
      ),
      connectionVisible: productLibrary.accessories.find(
        (p) => p.active && p.type === "connection_profile_visible"
      ),
      rail: productLibrary.accessories.find((p) => p.active && p.type === "substructure"),
    };
  }, [productLibrary]);

  const result = useMemo(() => {
    const panel = activeProducts.panel;
    const starter = activeProducts.starter;
    const end = activeProducts.end;
    const outsideCorner = activeProducts.outsideCorner;
    const insideCorner = activeProducts.insideCorner;
    const connectionBase = activeProducts.connectionBase;
    const connectionVisible = activeProducts.connectionVisible;
    const rail = activeProducts.rail;

    if (!panel || !starter || !end || !outsideCorner || !insideCorner || !connectionBase || !connectionVisible || !rail) {
      return null;
    }

    const includedSides = sides.filter((side) => side.openingMode !== "skip");

    let panelCount = 0;
    let starterCount = 0;
    let endCount = 0;
    let connectionBaseCount = 0;
    let connectionVisibleCount = 0;
    let railCount = 0;
    let totalRailMeters = 0;

    for (const side of includedSides) {
      const index = sides.findIndex((s) => s.id === side.id);
      const widthCm = toNumber(getResolvedWidth(side, index));
      const heightCm = toNumber(getResolvedHeight(side, index));
      if (widthCm <= 0 || heightCm <= 0) continue;

      const rows = Math.ceil(heightCm / 37);
      const perRow = Math.ceil(widthCm / 420);
      panelCount += rows * perRow;

      starterCount += Math.ceil(widthCm / (starter.lengthMm / 10));
      endCount += Math.ceil(widthCm / (end.lengthMm / 10));

      const verticalJoints = Math.max(perRow - 1, 0);
      if (verticalJoints > 0) {
        connectionBaseCount += Math.ceil(heightCm / (connectionBase.lengthMm / 10)) * verticalJoints;
        connectionVisibleCount += Math.ceil(heightCm / (connectionVisible.lengthMm / 10)) * verticalJoints;
      }

      const rails = Math.ceil(widthCm / Math.max(1, toNumber(materialConfig.railSpacingCm)));
      railCount += rails;
      totalRailMeters += rails * (heightCm / 100);
    }

    const wasteFactor = 1 + toNumber(materialConfig.wastePercent) / 100;
    const discountFactor = 1 - toNumber(materialConfig.discountPercent) / 100;

    const panelCountWithWaste = Math.ceil(panelCount * wasteFactor);

    const outsideCornerPieces =
      Math.ceil(
        Math.max(...includedSides.map((side) => {
          const index = sides.findIndex((s) => s.id === side.id);
          return toNumber(getResolvedHeight(side, index));
        }), 0) / (outsideCorner.lengthMm / 10)
      ) * toNumber(materialConfig.outsideCorners);

    const insideCornerPieces =
      Math.ceil(
        Math.max(...includedSides.map((side) => {
          const index = sides.findIndex((s) => s.id === side.id);
          return toNumber(getResolvedHeight(side, index));
        }), 0) / (insideCorner.lengthMm / 10)
      ) * toNumber(materialConfig.insideCorners);

    const panelCost = panelCountWithWaste * panel.priceExVat;
    const starterCost = starterCount * starter.priceExVat;
    const endCost = endCount * end.priceExVat;
    const outsideCornerCost = outsideCornerPieces * outsideCorner.priceExVat;
    const insideCornerCost = insideCornerPieces * insideCorner.priceExVat;
    const connectionBaseCost = connectionBaseCount * connectionBase.priceExVat;
    const connectionVisibleCost = connectionVisibleCount * connectionVisible.priceExVat;

    const railPieceCount = Math.ceil(totalRailMeters / (rail.lengthMm / 1000));
    const railCost = railPieceCount * rail.priceExVat;

    const subtotal =
      panelCost +
      starterCost +
      endCost +
      outsideCornerCost +
      insideCornerCost +
      connectionBaseCost +
      connectionVisibleCost +
      railCost;

    const totalAfterDiscount = subtotal * discountFactor;

    return {
      panelCount,
      panelCountWithWaste,
      starterCount,
      endCount,
      outsideCornerPieces,
      insideCornerPieces,
      connectionBaseCount,
      connectionVisibleCount,
      railPieceCount,
      totalRailMeters: round2(totalRailMeters),
      panelCost: round2(panelCost),
      starterCost: round2(starterCost),
      endCost: round2(endCost),
      outsideCornerCost: round2(outsideCornerCost),
      insideCornerCost: round2(insideCornerCost),
      connectionBaseCost: round2(connectionBaseCost),
      connectionVisibleCost: round2(connectionVisibleCost),
      railCost: round2(railCost),
      subtotal: round2(subtotal),
      totalAfterDiscount: round2(totalAfterDiscount),
    };
  }, [activeProducts, sides, materialConfig, frontBackEqual, leftRightEqual]);

  const handleImportProducts = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ProductLibrary;
      if (!parsed.panels || !parsed.accessories) {
        setGlobalError("Ongeldig productbestand.");
        return;
      }
      setProductLibrary(parsed);
      setGlobalInfo("Productdata geïmporteerd.");
      setGlobalError("");
    } catch (error) {
      console.error(error);
      setGlobalError("Kon productdata niet importeren.");
    }
  };

  const toggleProductActive = (id: string, type: "panels" | "accessories") => {
    setProductLibrary((prev) => ({
      ...prev,
      [type]: prev[type].map((item) =>
        item.id === id ? { ...item, active: !item.active } : item
      ),
    }));
  };

  const deleteProduct = (id: string, type: "panels" | "accessories") => {
    setProductLibrary((prev) => ({
      ...prev,
      [type]: prev[type].filter((item) => item.id !== id),
    }));
  };

  return (
    <main className="min-h-screen bg-gray-50 text-black">
      <div className="mx-auto max-w-6xl space-y-6 p-4 pb-28 md:p-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-sm md:p-6">
          <h1 className="text-3xl font-bold tracking-tight">GevelPlanner v3.0</h1>
          <p className="mt-2 text-gray-700">
            Productgedreven calculatie voor Spänl panelen, profielen en onderconstructie.
          </p>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep("surface")}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                currentStep === "surface" ? "bg-black text-white" : "border border-gray-300 bg-white"
              }`}
            >
              Stap 1 – Zijdes
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep("material")}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                currentStep === "material" ? "bg-black text-white" : "border border-gray-300 bg-white"
              }`}
            >
              Stap 2 – Producten
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep("result")}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                currentStep === "result" ? "bg-black text-white" : "border border-gray-300 bg-white"
              }`}
            >
              Stap 3 – Resultaat
            </button>
            <button
              type="button"
              onClick={resetSavedData}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium"
            >
              Reset opgeslagen gegevens
            </button>
          </div>
        </section>

        {currentStep === "surface" && (
          <>
            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Aantal zijdes</label>
                  <select
                    className="w-full rounded-xl border border-gray-300 p-3"
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

                {sideCount >= 2 && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">Zijn voor- en achterkant gelijk?</label>
                    <select
                      className="w-full rounded-xl border border-gray-300 p-3"
                      value={frontBackEqual ? "yes" : "no"}
                      onChange={(e) => setFrontBackEqual(e.target.value === "yes")}
                    >
                      <option value="yes">Ja</option>
                      <option value="no">Nee</option>
                    </select>
                  </div>
                )}

                {sideCount >= 4 && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">Zijn linker- en rechterkant gelijk?</label>
                    <select
                      className="w-full rounded-xl border border-gray-300 p-3"
                      value={leftRightEqual ? "yes" : "no"}
                      onChange={(e) => setLeftRightEqual(e.target.value === "yes")}
                    >
                      <option value="yes">Ja</option>
                      <option value="no">Nee</option>
                    </select>
                  </div>
                )}
              </div>
            </section>

            {sides.map((side, index) => {
              const { source, isAuto } = getSourceSide(side, index, sides, frontBackEqual, leftRightEqual);
              const isLinked = !!source;
              const widthValue = getResolvedWidth(side, index);
              const heightValue = getResolvedHeight(side, index);

              const manualLinkOptions = sides.filter((s, optionIndex) => s.id !== side.id && optionIndex < index);

              return (
                <section key={side.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">{side.name}</h2>
                  </div>

                  {isAuto ? (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                      Automatisch gekoppeld aan {source?.name}
                    </div>
                  ) : (
                    <div>
                      <label className="mb-1 block text-sm font-medium">Neem afmetingen over van zijde</label>
                      <select
                        className="w-full rounded-xl border border-gray-300 p-3"
                        value={side.linkToSideId || ""}
                        onChange={(e) => handleManualLinkChange(side.id, e.target.value)}
                      >
                        <option value="">Handmatig invullen</option>
                        {manualLinkOptions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Breedte (cm)</label>
                      <input
                        className={`w-full rounded-xl border border-gray-300 p-3 ${isLinked ? "bg-gray-100" : ""}`}
                        value={widthValue}
                        disabled={isLinked}
                        onChange={(e) => setSideField(side.id, "width", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Hoogte (cm)</label>
                      <input
                        className={`w-full rounded-xl border border-gray-300 p-3 ${isLinked ? "bg-gray-100" : ""}`}
                        value={heightValue}
                        disabled={isLinked}
                        onChange={(e) => setSideField(side.id, "height", e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Foto van deze zijde</label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        className="rounded-xl border border-gray-300 bg-white px-4 py-3 font-medium"
                        onClick={() => cameraInputRefs.current[side.id]?.click()}
                      >
                        Maak foto
                      </button>
                      <button
                        type="button"
                        className="rounded-xl border border-gray-300 bg-white px-4 py-3 font-medium"
                        onClick={() => fileInputRefs.current[side.id]?.click()}
                      >
                        Kies bestand
                      </button>
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

                    {side.previewUrl && (
                      <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-3">
                        <img
                          src={side.previewUrl}
                          alt={side.name}
                          className="max-h-[320px] w-full rounded-xl object-contain"
                        />
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <h3 className="font-semibold">Snel invullen</h3>
                    <div className="mt-3">
                      <label className="mb-1 block text-sm font-medium">Deuren / kozijnen</label>
                      <select
                        className="w-full rounded-xl border border-gray-300 p-3"
                        value={side.openingMode === "none" ? "none" : "estimate"}
                        onChange={(e) =>
                          handleOpeningModeChange(side.id, e.target.value === "none" ? "none" : "estimate")
                        }
                      >
                        <option value="estimate">Gemiddeld inschatten</option>
                        <option value="none">Geen deuren/kozijnen</option>
                      </select>
                    </div>

                    {side.openingMode !== "none" && (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium">Aantal kozijnen</label>
                          <input
                            className="w-full rounded-xl border border-gray-300 p-3"
                            value={side.frameCount}
                            onChange={(e) => setSideField(side.id, "frameCount", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium">Gemiddelde grootte</label>
                          <select
                            className="w-full rounded-xl border border-gray-300 p-3"
                            value={side.frameSizeType}
                            onChange={(e) =>
                              setSideField(side.id, "frameSizeType", e.target.value as FrameSizeType)
                            }
                          >
                            <option value="small">Klein</option>
                            <option value="medium">Gemiddeld</option>
                            <option value="large">Groot</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="text-sm text-gray-500">Bruto</div>
                      <div className="mt-1 text-lg font-semibold">{getGrossAreaM2(side, index).toFixed(2)} m²</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="text-sm text-gray-500">Aftrek</div>
                      <div className="mt-1 text-lg font-semibold">{getOpeningAreaM2(side).toFixed(2)} m²</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="text-sm text-gray-500">Netto</div>
                      <div className="mt-1 text-lg font-semibold">{getNetAreaM2(side, index).toFixed(2)} m²</div>
                    </div>
                  </div>
                </section>
              );
            })}

            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
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
          </>
        )}

        {currentStep === "material" && (
          <>
            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-xl font-semibold">Productbibliotheek</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                <label className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium cursor-pointer">
                  Import productdata (.json)
                  <input type="file" accept="application/json" className="hidden" onChange={handleImportProducts} />
                </label>
                <button
                  type="button"
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium"
                  onClick={() => downloadJson("spanl-productdata-v3.json", productLibrary)}
                >
                  Exporteer productdata
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="text-lg font-semibold">Calculatie-instellingen</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Korting (%)</label>
                  <input
                    className="w-full rounded-xl border border-gray-300 p-3"
                    value={materialConfig.discountPercent}
                    onChange={(e) =>
                      setMaterialConfig((prev) => ({ ...prev, discountPercent: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Zaagverlies (%)</label>
                  <input
                    className="w-full rounded-xl border border-gray-300 p-3"
                    value={materialConfig.wastePercent}
                    onChange={(e) =>
                      setMaterialConfig((prev) => ({ ...prev, wastePercent: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Buitenhoeken</label>
                  <input
                    className="w-full rounded-xl border border-gray-300 p-3"
                    value={materialConfig.outsideCorners}
                    onChange={(e) =>
                      setMaterialConfig((prev) => ({ ...prev, outsideCorners: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Binnenhoeken</label>
                  <input
                    className="w-full rounded-xl border border-gray-300 p-3"
                    value={materialConfig.insideCorners}
                    onChange={(e) =>
                      setMaterialConfig((prev) => ({ ...prev, insideCorners: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="mt-4 max-w-xs">
                <label className="mb-1 block text-sm font-medium">Rail afstand h.o.h. (cm)</label>
                <input
                  className="w-full rounded-xl border border-gray-300 p-3"
                  value={materialConfig.railSpacingCm}
                  onChange={(e) =>
                    setMaterialConfig((prev) => ({ ...prev, railSpacingCm: e.target.value }))
                  }
                />
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-lg font-semibold">Panelen</h3>
                <div className="mt-4 space-y-3">
                  {productLibrary.panels.map((item) => (
                    <div key={item.id} className="rounded-xl border border-gray-200 p-3">
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-sm text-gray-600">
                        {item.sku} • {item.lengthMm} mm • {item.workHeightMm ?? "-"} mm werkhoogte • €{" "}
                        {item.priceExVat.toFixed(2)}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => toggleProductActive(item.id, "panels")}
                          className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                        >
                          {item.active ? "Actief" : "Inactief"}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteProduct(item.id, "panels")}
                          className="rounded-xl border border-red-300 px-3 py-2 text-sm text-red-700"
                        >
                          Verwijder niet-courant product
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-lg font-semibold">Accessoires</h3>
                <div className="mt-4 space-y-3">
                  {productLibrary.accessories.map((item) => (
                    <div key={item.id} className="rounded-xl border border-gray-200 p-3">
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-sm text-gray-600">
                        {item.sku} • {item.lengthMm} mm • € {item.priceExVat.toFixed(2)}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => toggleProductActive(item.id, "accessories")}
                          className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                        >
                          {item.active ? "Actief" : "Inactief"}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteProduct(item.id, "accessories")}
                          className="rounded-xl border border-red-300 px-3 py-2 text-sm text-red-700"
                        >
                          Verwijder niet-courant product
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {currentStep === "result" && (
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-xl font-semibold">Resultaat v3.0</h2>

            {!result ? (
              <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-red-700">
                Niet alle actieve producten zijn beschikbaar. Controleer de productbibliotheek.
              </div>
            ) : (
              <>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="text-sm text-gray-500">Panelen bruto</div>
                    <div className="mt-1 text-lg font-semibold">{result.panelCount}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="text-sm text-gray-500">Panelen incl. zaagverlies</div>
                    <div className="mt-1 text-lg font-semibold">{result.panelCountWithWaste}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="text-sm text-gray-500">Netto oppervlak</div>
                    <div className="mt-1 text-lg font-semibold">{totals.net.toFixed(2)} m²</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="text-sm text-gray-500">Korting</div>
                    <div className="mt-1 text-lg font-semibold">{materialConfig.discountPercent}%</div>
                  </div>
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left">
                        <th className="p-3">Onderdeel</th>
                        <th className="p-3">Aantal</th>
                        <th className="p-3">Kosten</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="p-3">Panelen</td>
                        <td className="p-3">{result.panelCountWithWaste}</td>
                        <td className="p-3">€ {result.panelCost.toFixed(2)}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-3">Startersprofielen</td>
                        <td className="p-3">{result.starterCount}</td>
                        <td className="p-3">€ {result.starterCost.toFixed(2)}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-3">Eindprofielen</td>
                        <td className="p-3">{result.endCount}</td>
                        <td className="p-3">€ {result.endCost.toFixed(2)}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-3">Buitenhoeken</td>
                        <td className="p-3">{result.outsideCornerPieces}</td>
                        <td className="p-3">€ {result.outsideCornerCost.toFixed(2)}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-3">Binnenhoeken</td>
                        <td className="p-3">{result.insideCornerPieces}</td>
                        <td className="p-3">€ {result.insideCornerCost.toFixed(2)}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-3">PJDZ basisprofielen</td>
                        <td className="p-3">{result.connectionBaseCount}</td>
                        <td className="p-3">€ {result.connectionBaseCost.toFixed(2)}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-3">PJ01 zichtprofielen</td>
                        <td className="p-3">{result.connectionVisibleCount}</td>
                        <td className="p-3">€ {result.connectionVisibleCost.toFixed(2)}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-3">Rails / onderconstructie</td>
                        <td className="p-3">
                          {result.railPieceCount} stuks ({result.totalRailMeters.toFixed(2)} m)
                        </td>
                        <td className="p-3">€ {result.railCost.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="text-sm text-gray-500">Subtotaal</div>
                    <div className="mt-1 text-2xl font-semibold">€ {result.subtotal.toFixed(2)}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="text-sm text-gray-500">Totaal na korting</div>
                    <div className="mt-1 text-2xl font-semibold">€ {result.totalAfterDiscount.toFixed(2)}</div>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {globalInfo && (
          <section className="rounded-xl border border-green-300 bg-green-50 p-3 text-sm text-green-700">
            {globalInfo}
          </section>
        )}

        {globalError && (
          <section className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {globalError}
          </section>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row">
          {currentStep === "surface" && (
            <button
              type="button"
              className="rounded-xl bg-black px-5 py-3 font-semibold text-white disabled:opacity-50"
              onClick={() => {
                if (!canGoToMaterial) {
                  setGlobalError("Vul minimaal één zijde compleet in.");
                  return;
                }
                setCurrentStep("material");
                setGlobalError("");
              }}
            >
              ➡️ Ga naar producten
            </button>
          )}

          {currentStep === "material" && (
            <button
              type="button"
              className="rounded-xl bg-black px-5 py-3 font-semibold text-white"
              onClick={() => {
                setCurrentStep("result");
                setGlobalError("");
              }}
            >
              ➡️ Bereken v3.0 resultaat
            </button>
          )}

          {currentStep === "result" && (
            <button
              type="button"
              className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold"
              onClick={() => setCurrentStep("material")}
            >
              ⬅️ Terug naar producten
            </button>
          )}
        </div>
      </div>
    </main>
  );
}