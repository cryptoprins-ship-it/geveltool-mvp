"use client";

import { useState } from "react";

type Opening = {
  id: string;
  type: "window" | "door";
  width: number;
  height: number;
  count: number;
};

type Side = {
  name: string;
  width: number;
  height: number;
  before?: string;
  after?: string;
  openings: Opening[];
  orientation: "vertical" | "horizontal";
};

const presets = {
  windows: [
    { label: "Custom", w: 0, h: 0 },
    { label: "100 x 100", w: 100, h: 100 },
    { label: "120 x 100", w: 120, h: 100 },
    { label: "140 x 120", w: 140, h: 120 },
  ],
  doors: [
    { label: "Custom", w: 0, h: 0 },
    { label: "88 x 211", w: 88, h: 211 },
    { label: "93 x 231", w: 93, h: 231 },
  ],
};

function calcOpeningArea(openings: Opening[]) {
  return openings.reduce(
    (sum, o) => sum + (o.width / 100) * (o.height / 100) * o.count,
    0
  );
}

function BeforeAfter({ before, after }: { before?: string; after?: string }) {
  const [pos, setPos] = useState(50);

  if (!before || !after) return null;

  return (
    <div className="relative w-full h-64 rounded-xl overflow-hidden border">
      <img src={before} className="absolute w-full h-full object-cover" />
      <div
        className="absolute top-0 left-0 h-full overflow-hidden"
        style={{ width: `${pos}%` }}
      >
        <img src={after} className="w-full h-full object-cover" />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="absolute bottom-2 w-full"
      />
    </div>
  );
}

export default function Page() {
  const [sides, setSides] = useState<Side[]>([
    { name: "Front", width: 0, height: 0, openings: [], orientation: "vertical" },
    { name: "Back", width: 0, height: 0, openings: [], orientation: "vertical" },
    { name: "Left", width: 0, height: 0, openings: [], orientation: "vertical" },
    { name: "Right", width: 0, height: 0, openings: [], orientation: "vertical" },
  ]);

  const updateSide = (i: number, data: Partial<Side>) => {
    const copy = [...sides];
    copy[i] = { ...copy[i], ...data };
    setSides(copy);
  };

  const addOpening = (i: number, type: "window" | "door") => {
    const copy = [...sides];
    copy[i].openings.push({
      id: crypto.randomUUID(),
      type,
      width: 0,
      height: 0,
      count: 1,
    });
    setSides(copy);
  };

  const totals = sides.reduce(
    (acc, s) => {
      const gross = (s.width / 100) * (s.height / 100);
      const open = calcOpeningArea(s.openings);
      return {
        gross: acc.gross + gross,
        open: acc.open + open,
      };
    },
    { gross: 0, open: 0 }
  );

  const net = totals.gross - totals.open;

  return (
    <main className="bg-gray-100 min-h-screen p-4">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-6">

        {/* LEFT */}
        <div className="lg:col-span-2 space-y-6">

          {sides.map((s, i) => (
            <div key={i} className="bg-white p-4 rounded-xl shadow">

              <h2 className="font-bold text-lg mb-2">{s.name}</h2>

              <div className="grid md:grid-cols-2 gap-3">
                <input
                  placeholder="Width (cm)"
                  className="border p-2 rounded"
                  onChange={(e) =>
                    updateSide(i, { width: Number(e.target.value) })
                  }
                />
                <input
                  placeholder="Height (cm)"
                  className="border p-2 rounded"
                  onChange={(e) =>
                    updateSide(i, { height: Number(e.target.value) })
                  }
                />
              </div>

              {/* orientation */}
              <div className="mt-3">
                <select
                  className="border p-2 rounded w-full"
                  value={s.orientation}
                  onChange={(e) =>
                    updateSide(i, { orientation: e.target.value as any })
                  }
                >
                  <option value="vertical">Vertical</option>
                  <option value="horizontal">Horizontal</option>
                </select>
              </div>

              {/* uploads */}
              <div className="grid md:grid-cols-2 gap-3 mt-3">
                <input
                  type="file"
                  onChange={(e) =>
                    updateSide(i, {
                      before: URL.createObjectURL(e.target.files![0]),
                    })
                  }
                />
                <input
                  type="file"
                  onChange={(e) =>
                    updateSide(i, {
                      after: URL.createObjectURL(e.target.files![0]),
                    })
                  }
                />
              </div>

              <div className="mt-3">
                <BeforeAfter before={s.before} after={s.after} />
              </div>

              {/* openings */}
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => addOpening(i, "window")}
                  className="text-sm bg-gray-200 px-3 py-1 rounded"
                >
                  + Window
                </button>
                <button
                  onClick={() => addOpening(i, "door")}
                  className="text-sm bg-gray-200 px-3 py-1 rounded ml-2"
                >
                  + Door
                </button>

                {s.openings.map((o, idx) => (
                  <div key={o.id} className="grid grid-cols-4 gap-2 mt-2">
                    <input
                      placeholder="W"
                      onChange={(e) =>
                        (o.width = Number(e.target.value))
                      }
                      className="border p-2 rounded"
                    />
                    <input
                      placeholder="H"
                      onChange={(e) =>
                        (o.height = Number(e.target.value))
                      }
                      className="border p-2 rounded"
                    />
                    <input
                      placeholder="Qty"
                      onChange={(e) =>
                        (o.count = Number(e.target.value))
                      }
                      className="border p-2 rounded"
                    />
                    <div className="flex items-center text-sm">
                      {o.type}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 text-sm text-gray-600">
                Openings: {calcOpeningArea(s.openings).toFixed(2)} m²
              </div>
            </div>
          ))}

        </div>

        {/* RIGHT */}
        <div className="bg-white p-4 rounded-xl shadow h-fit sticky top-4">

          <h2 className="font-bold text-lg mb-3">Summary</h2>

          <div className="space-y-2 text-sm">
            <div>Gross: {totals.gross.toFixed(2)} m²</div>
            <div>Openings: {totals.open.toFixed(2)} m²</div>
            <div className="font-bold">Net: {net.toFixed(2)} m²</div>
          </div>

        </div>

      </div>
    </main>
  );
}