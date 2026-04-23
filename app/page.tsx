"use client";

import { useState, useRef, ChangeEvent } from "react";

/* =========================
   TYPES
========================= */
type Orientation = "vertical" | "horizontal";
type OpeningType = "window" | "door";

type OpeningGroup = {
  id: string;
  type: OpeningType;
  width: string;
  height: string;
  count: string;
  presetKey: string;
};

type Side = {
  id: string;
  name: string;
  width: string;
  height: string;
  image: File | null;
  preview: string;
  orientation: Orientation;
  openings: OpeningGroup[];
};

/* =========================
   PRESETS (EU)
========================= */
const DOOR_PRESETS: Record<string, { label: string; width: number; height: number }> = {
  d1: { label: "900 x 2100 (standaard)", width: 90, height: 210 },
  d2: { label: "830 x 2015", width: 83, height: 201.5 },
};

const WINDOW_PRESETS: Record<string, { label: string; width: number; height: number }> = {
  w1: { label: "1200 x 1200", width: 120, height: 120 },
  w2: { label: "1000 x 1000", width: 100, height: 100 },
};

/* =========================
   HELPERS
========================= */
const toNum = (v: string) => Number(v.replace(",", ".")) || 0;

const createOpening = (): OpeningGroup => ({
  id: crypto.randomUUID(),
  type: "window",
  width: "",
  height: "",
  count: "1",
  presetKey: "custom",
});

const createSide = (i: number): Side => ({
  id: crypto.randomUUID(),
  name: ["Voor", "Achter", "Links", "Rechts"][i] || `Zijde ${i + 1}`,
  width: "",
  height: "",
  image: null,
  preview: "",
  orientation: "horizontal",
  openings: [],
});

/* =========================
   MAIN
========================= */
export default function Page() {
  const [sides, setSides] = useState<Side[]>([
    createSide(0),
    createSide(1),
    createSide(2),
    createSide(3),
  ]);

  /* =========================
     IMAGE
  ========================= */
  const handleImage = (sideId: string, file: File | null) => {
    if (!file) return;

    setSides((prev) =>
      prev.map((s) =>
        s.id === sideId
          ? {
              ...s,
              image: file,
              preview: URL.createObjectURL(file),
            }
          : s
      )
    );
  };

  /* =========================
     OPENINGS
  ========================= */
  const addOpening = (sideId: string) => {
    setSides((prev) =>
      prev.map((s) =>
        s.id === sideId ? { ...s, openings: [...s.openings, createOpening()] } : s
      )
    );
  };

  const updateOpening = (
    sideId: string,
    openingId: string,
    field: keyof OpeningGroup,
    value: string
  ) => {
    setSides((prev) =>
      prev.map((s) =>
        s.id === sideId
          ? {
              ...s,
              openings: s.openings.map((o) =>
                o.id === openingId ? { ...o, [field]: value } : o
              ),
            }
          : s
      )
    );
  };

  /* =========================
     CALC
  ========================= */
  const calcOpeningM2 = (side: Side) => {
    return side.openings.reduce((sum, o) => {
      const w = toNum(o.width) / 100;
      const h = toNum(o.height) / 100;
      const c = toNum(o.count);
      return sum + w * h * c;
    }, 0);
  };

  const calcNet = (side: Side) => {
    const w = toNum(side.width) / 100;
    const h = toNum(side.height) / 100;
    return Math.max(0, w * h - calcOpeningM2(side));
  };

  /* =========================
     UI
  ========================= */
  return (
    <main className="p-6 space-y-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold">Spanl Visualizer</h1>

      {sides.map((side) => (
        <div key={side.id} className="border p-4 rounded-xl space-y-4">
          <h2 className="text-xl font-semibold">{side.name}</h2>

          {/* DIMENSIONS */}
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Breedte cm"
              value={side.width}
              onChange={(e) =>
                setSides((prev) =>
                  prev.map((s) =>
                    s.id === side.id ? { ...s, width: e.target.value } : s
                  )
                )
              }
              className="border p-2 rounded"
            />
            <input
              placeholder="Hoogte cm"
              value={side.height}
              onChange={(e) =>
                setSides((prev) =>
                  prev.map((s) =>
                    s.id === side.id ? { ...s, height: e.target.value } : s
                  )
                )
              }
              className="border p-2 rounded"
            />
          </div>

          {/* ORIENTATION */}
          <select
            value={side.orientation}
            onChange={(e) =>
              setSides((prev) =>
                prev.map((s) =>
                  s.id === side.id
                    ? { ...s, orientation: e.target.value as Orientation }
                    : s
                )
              )
            }
            className="border p-2 rounded w-full"
          >
            <option value="horizontal">Horizontaal</option>
            <option value="vertical">Verticaal</option>
          </select>

          {/* IMAGE */}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImage(side.id, e.target.files?.[0] || null)}
          />

          {/* BEFORE AFTER */}
          {side.preview && (
            <BeforeAfter image={side.preview} orientation={side.orientation} />
          )}

          {/* OPENINGS */}
          <div>
            <button
              onClick={() => addOpening(side.id)}
              className="bg-black text-white px-3 py-1 rounded"
            >
              + Kozijn/deur
            </button>

            {side.openings.map((o) => (
              <div key={o.id} className="border p-3 mt-3 rounded space-y-2">
                <select
                  value={o.presetKey}
                  onChange={(e) => {
                    const val = e.target.value;

                    if (val === "custom") {
                      updateOpening(side.id, o.id, "presetKey", "custom");
                      return;
                    }

                    const preset =
                      o.type === "door"
                        ? DOOR_PRESETS[val]
                        : WINDOW_PRESETS[val];

                    updateOpening(side.id, o.id, "presetKey", val);
                    updateOpening(side.id, o.id, "width", String(preset.width));
                    updateOpening(side.id, o.id, "height", String(preset.height));
                  }}
                  className="border p-2 w-full rounded"
                >
                  <option value="custom">Custom</option>

                  <optgroup label="Standaard">
                    {(o.type === "door"
                      ? Object.entries(DOOR_PRESETS)
                      : Object.entries(WINDOW_PRESETS)
                    ).map(([k, p]) => (
                      <option key={k} value={k}>
                        {p.label}
                      </option>
                    ))}
                  </optgroup>
                </select>

                <div className="grid grid-cols-3 gap-2">
                  <input
                    placeholder="Breedte"
                    value={o.width}
                    onChange={(e) =>
                      updateOpening(side.id, o.id, "width", e.target.value)
                    }
                    className="border p-2"
                  />
                  <input
                    placeholder="Hoogte"
                    value={o.height}
                    onChange={(e) =>
                      updateOpening(side.id, o.id, "height", e.target.value)
                    }
                    className="border p-2"
                  />
                  <input
                    placeholder="Aantal"
                    value={o.count}
                    onChange={(e) =>
                      updateOpening(side.id, o.id, "count", e.target.value)
                    }
                    className="border p-2"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* RESULT */}
          <div className="bg-gray-100 p-3 rounded">
            Netto m²: {calcNet(side).toFixed(2)}
          </div>
        </div>
      ))}
    </main>
  );
}

/* =========================
   BEFORE / AFTER COMPONENT
========================= */
function BeforeAfter({
  image,
  orientation,
}: {
  image: string;
  orientation: Orientation;
}) {
  const [slider, setSlider] = useState(50);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="relative w-full max-w-xl">
      <div ref={ref} className="relative overflow-hidden rounded">
        <img src={image} className="w-full" />

        <div
          className="absolute top-0 left-0 h-full overflow-hidden"
          style={{ width: `${slider}%` }}
        >
          <img
            src={image}
            className={`w-full ${
              orientation === "vertical" ? "brightness-110 contrast-110" : "sepia"
            }`}
          />
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={slider}
        onChange={(e) => setSlider(Number(e.target.value))}
        className="w-full mt-2"
      />
    </div>
  );
}