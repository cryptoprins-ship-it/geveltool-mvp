"use client";

import { useState } from "react";

type OpeningGroup = {
  id: string;
  name: string;
  width: number;
  height: number;
  count: number;
};

type Side = {
  id: string;
  name: string;
  before: string | null;
  after: string | null;
  slider: number;
  openings: OpeningGroup[];
};

const defaultSizes = [
  { label: "Custom", w: 0, h: 0 },
  { label: "Window 120x120", w: 120, h: 120 },
  { label: "Window 100x100", w: 100, h: 100 },
  { label: "Door 93x211", w: 93, h: 211 },
  { label: "Door 83x201", w: 83, h: 201 },
];

function createSide(name: string): Side {
  return {
    id: crypto.randomUUID(),
    name,
    before: null,
    after: null,
    slider: 50,
    openings: [],
  };
}

export default function Page() {
  const [sides, setSides] = useState<Side[]>([
    createSide("Voorzijde"),
    createSide("Achterzijde"),
  ]);

  const updateSide = (index: number, data: Partial<Side>) => {
    const copy = [...sides];
    copy[index] = { ...copy[index], ...data };
    setSides(copy);
  };

  const addOpening = (i: number) => {
    const side = sides[i];
    side.openings.push({
      id: crypto.randomUUID(),
      name: "Window",
      width: 120,
      height: 120,
      count: 1,
    });
    updateSide(i, { openings: [...side.openings] });
  };

  const updateOpening = (i: number, id: string, data: Partial<OpeningGroup>) => {
    const side = sides[i];
    side.openings = side.openings.map((o) =>
      o.id === id ? { ...o, ...data } : o
    );
    updateSide(i, { openings: [...side.openings] });
  };

  const totalM2 = (side: Side) => {
    return side.openings.reduce(
      (sum, o) => sum + (o.width / 100) * (o.height / 100) * o.count,
      0
    );
  };

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-black p-4">
      <div className="max-w-5xl mx-auto space-y-6">

        <h1 className="text-3xl font-bold">Gevel Visualizer</h1>

        {sides.map((side, i) => (
          <div key={side.id} className="rounded-2xl border p-5 bg-white shadow">

            <h2 className="text-xl font-semibold mb-4">{side.name}</h2>

            {/* Upload */}
            <div
              className="border-2 border-dashed p-6 text-center rounded-xl"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (!file) return;
                const url = URL.createObjectURL(file);
                updateSide(i, { before: url, after: url });
              }}
            >
              <p className="mb-3 font-semibold">
                Sleep foto hier of kies bestand
              </p>

              <div className="flex gap-3 justify-center">
                <label className="border px-4 py-2 rounded-xl cursor-pointer">
                  📷 Foto
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const url = URL.createObjectURL(f);
                      updateSide(i, { before: url, after: url });
                    }}
                  />
                </label>

                <label className="border px-4 py-2 rounded-xl cursor-pointer">
                  📁 Bestand
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const url = URL.createObjectURL(f);
                      updateSide(i, { before: url, after: url });
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Before After */}
            {side.before && side.after && (
              <div className="mt-5">
                <div className="relative w-full h-64 overflow-hidden rounded-xl">
                  <img
                    src={side.before}
                    className="absolute w-full h-full object-cover"
                  />
                  <img
                    src={side.after}
                    className="absolute top-0 left-0 h-full object-cover"
                    style={{ width: `${side.slider}%` }}
                  />
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={side.slider}
                  onChange={(e) =>
                    updateSide(i, { slider: Number(e.target.value) })
                  }
                  className="w-full mt-2"
                />
              </div>
            )}

            {/* Openings */}
            <div className="mt-6 space-y-3">
              <h3 className="font-semibold">Openingen</h3>

              {side.openings.map((o) => (
                <div key={o.id} className="border p-3 rounded-xl space-y-2">

                  <select
                    className="w-full border p-2 rounded"
                    onChange={(e) => {
                      const preset = defaultSizes.find(
                        (s) => s.label === e.target.value
                      );
                      if (!preset) return;
                      updateOpening(i, o.id, {
                        width: preset.w,
                        height: preset.h,
                      });
                    }}
                  >
                    {defaultSizes.map((s) => (
                      <option key={s.label}>{s.label}</option>
                    ))}
                  </select>

                  <div className="grid grid-cols-3 gap-2">
                    <input
                      placeholder="Breedte"
                      className="border p-2 rounded"
                      value={o.width}
                      onChange={(e) =>
                        updateOpening(i, o.id, {
                          width: Number(e.target.value),
                        })
                      }
                    />
                    <input
                      placeholder="Hoogte"
                      className="border p-2 rounded"
                      value={o.height}
                      onChange={(e) =>
                        updateOpening(i, o.id, {
                          height: Number(e.target.value),
                        })
                      }
                    />
                    <input
                      placeholder="Aantal"
                      className="border p-2 rounded"
                      value={o.count}
                      onChange={(e) =>
                        updateOpening(i, o.id, {
                          count: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              ))}

              <button
                onClick={() => addOpening(i)}
                className="bg-black text-white px-4 py-2 rounded-xl"
              >
                + Opening toevoegen
              </button>
            </div>

            {/* Result */}
            <div className="mt-4 text-lg font-semibold">
              Opening totaal: {totalM2(side).toFixed(2)} m²
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}