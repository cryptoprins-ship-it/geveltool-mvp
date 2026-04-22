'use client';

import React, { useMemo, useState } from 'react';

type Side = {
  id: number;
  name: string;
  width: string;
  height: string;
  deductionMode: 'manual' | 'ai';
  deductionM2: string;
  aiDeductionM2: string;
  image?: string;
};

type MaterialType = 'plastic' | 'hardwood' | 'paint';

function toNum(value: string | number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function createSide(id: number): Side {
  return {
    id,
    name: `Zijde ${id}`,
    width: '',
    height: '',
    deductionMode: 'manual',
    deductionM2: '0',
    aiDeductionM2: '0',
    image: undefined,
  };
}

function uploadPreview(file?: File) {
  if (!file) return undefined;
  return URL.createObjectURL(file);
}

export default function Page() {
  const [sides, setSides] = useState<Side[]>([createSide(1)]);
  const [material, setMaterial] = useState<MaterialType>('plastic');
  const [unitSize, setUnitSize] = useState('4');
  const [unitPrice, setUnitPrice] = useState('34.5');
  const [plankHeightMm, setPlankHeightMm] = useState('190');
  const [layers, setLayers] = useState('2');
  const [wastePercent, setWastePercent] = useState('10');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [selectedVisual, setSelectedVisual] = useState<MaterialType>('plastic');
  const [overlayOpacity, setOverlayOpacity] = useState(68);
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [plasticRef, setPlasticRef] = useState<string | undefined>();
  const [woodRef, setWoodRef] = useState<string | undefined>();
  const [paintColor, setPaintColor] = useState('#d9d4ca');

  function addSide() {
    setSides((prev) => [...prev, createSide(prev.length + 1)]);
  }

  function removeSide(id: number) {
    setSides((prev) => (prev.length === 1 ? prev : prev.filter((s) => s.id !== id)));
  }

  function updateSide(id: number, patch: Partial<Side>) {
    setSides((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function updateMaterial(next: MaterialType) {
    setMaterial(next);
    setSelectedVisual(next);
    if (next === 'paint') {
      setUnitSize('8');
      setUnitPrice('22');
    } else if (next === 'hardwood') {
      setUnitSize('4');
      setUnitPrice('49');
    } else {
      setUnitSize('4');
      setUnitPrice('34.5');
    }
  }

  function runAiEstimate(id: number) {
    const side = sides.find((s) => s.id === id);
    if (!side) return;
    const gross = toNum(side.width) * toNum(side.height);
    const estimate = gross > 0 ? Math.max(0, Math.round(gross * 0.18 * 10) / 10) : 0;
    updateSide(id, { aiDeductionM2: String(estimate), deductionMode: 'ai' });
  }

  function rowsForSide(heightValue: string | number, plankHeightM: number) {
    const h = toNum(heightValue);
    if (h <= 0) return 0;
    return Math.ceil(h / plankHeightM);
  }

  const calculatedSides = useMemo(() => {
    return sides.map((side) => {
      const width = toNum(side.width);
      const height = toNum(side.height);
      const grossM2 = width * height;
      const deduction = side.deductionMode === 'ai' ? toNum(side.aiDeductionM2) : toNum(side.deductionM2);
      const safeDeduction = Math.min(grossM2, Math.max(0, deduction));
      const netM2 = Math.max(0, grossM2 - safeDeduction);
      return { ...side, grossM2, safeDeduction, netM2 };
    });
  }, [sides]);

  const totals = useMemo(() => {
    const grossM2 = calculatedSides.reduce((sum, s) => sum + s.grossM2, 0);
    const deductionM2 = calculatedSides.reduce((sum, s) => sum + s.safeDeduction, 0);
    const netM2 = calculatedSides.reduce((sum, s) => sum + s.netM2, 0);
    const wasteFactor = 1 + toNum(wastePercent) / 100;
    const discountFactor = 1 - toNum(discountPercent) / 100;

    if (material === 'paint') {
      const coats = Math.max(1, toNum(layers));
      const coverage = Math.max(0.1, toNum(unitSize));
      const liters = (netM2 * coats) / coverage;
      const litersWithWaste = liters * wasteFactor;
      const totalPrice = litersWithWaste * toNum(unitPrice) * discountFactor;
      return {
        grossM2,
        deductionM2,
        netM2,
        quantity: litersWithWaste,
        quantityLabel: 'liter',
        rows: 0,
        totalPrice,
      };
    }

    const plankHeightM = Math.max(0.01, toNum(plankHeightMm) / 1000);
    const plankLengthM = Math.max(0.1, toNum(unitSize));
    const totalRows = calculatedSides.reduce((sum, s) => sum + rowsForSide(s.height, plankHeightM), 0);
    const totalLinearMeters = calculatedSides.reduce(
      (sum, s) => sum + rowsForSide(s.height, plankHeightM) * toNum(s.width),
      0
    );
    const planks = (totalLinearMeters / plankLengthM) * wasteFactor;
    const totalPrice = planks * toNum(unitPrice) * discountFactor;

    return {
      grossM2,
      deductionM2,
      netM2,
      quantity: planks,
      quantityLabel: 'planken',
      rows: totalRows,
      totalPrice,
    };
  }, [calculatedSides, material, layers, unitPrice, unitSize, plankHeightMm, wastePercent, discountPercent]);

  const currentTexture =
    selectedVisual === 'plastic' ? plasticRef : selectedVisual === 'hardwood' ? woodRef : undefined;

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)', marginBottom: 24 }}>
          <h1 style={{ fontSize: 32, margin: 0 }}>GevelTool MVP</h1>
          <p style={{ color: '#475569', marginTop: 12 }}>
            Upload foto’s per gevelzijde, vul breedte en hoogte in, trek kozijnen handmatig of via AI-schatting af en vergelijk direct kunststof, hardhout of verf.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24 }}>
          <div>
            <div style={{ background: '#fff', borderRadius: 24, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
              <h2>Gevelzijdes</h2>

              {calculatedSides.map((side) => (
                <div key={side.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 18, padding: 16, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                    <input
                      value={side.name}
                      onChange={(e) => updateSide(side.id, { name: e.target.value })}
                      style={{ padding: 10, borderRadius: 12, border: '1px solid #cbd5e1', minWidth: 180 }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => runAiEstimate(side.id)} style={btnSecondary}>AI schatting</button>
                      <button onClick={() => removeSide(side.id)} style={btnSecondary}>Verwijder</button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    <div>
                      <label>Breedte (m)</label>
                      <input value={side.width} onChange={(e) => updateSide(side.id, { width: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <label>Hoogte (m)</label>
                      <input value={side.height} onChange={(e) => updateSide(side.id, { height: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <label>Aftrekmodus</label>
                      <select
                        value={side.deductionMode}
                        onChange={(e) => updateSide(side.id, { deductionMode: e.target.value as 'manual' | 'ai' })}
                        style={inputStyle}
                      >
                        <option value="manual">Handmatig</option>
                        <option value="ai">AI automatisch</option>
                      </select>
                    </div>
                    <div>
                      <label>{side.deductionMode === 'ai' ? 'AI aftrek m²' : 'Handmatige aftrek m²'}</label>
                      <input
                        value={side.deductionMode === 'ai' ? side.aiDeductionM2 : side.deductionM2}
                        onChange={(e) =>
                          updateSide(
                            side.id,
                            side.deductionMode === 'ai' ? { aiDeductionM2: e.target.value } : { deductionM2: e.target.value }
                          )
                        }
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 230px', gap: 16, marginTop: 16 }}>
                    <div>
                      <label>Foto van deze zijde</label>
                      <div style={{ marginTop: 6 }}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => updateSide(side.id, { image: uploadPreview(e.target.files?.[0]) })}
                        />
                      </div>
                    </div>

                    <div style={{ background: '#fff', borderRadius: 16, padding: 16, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 700, marginBottom: 10 }}>Resultaat</div>
                      <div style={rowStyle}><span>Bruto</span><span>{side.grossM2.toFixed(2)} m²</span></div>
                      <div style={rowStyle}><span>Aftrek</span><span>{side.safeDeduction.toFixed(2)} m²</span></div>
                      <div style={{ ...rowStyle, fontWeight: 700 }}><span>Netto</span><span>{side.netM2.toFixed(2)} m²</span></div>
                    </div>
                  </div>

                  {side.image && (
                    <div style={{ marginTop: 16, borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                      <div style={{ position: 'relative', aspectRatio: '16/9', background: '#cbd5e1' }}>
                        <img
                          src={side.image}
                          alt={side.name}
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        {selectedVisual === 'paint' ? (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              backgroundColor: paintColor,
                              opacity: overlayOpacity / 100,
                              mixBlendMode: 'multiply',
                            }}
                          />
                        ) : currentTexture ? (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              backgroundImage: `url(${currentTexture})`,
                              backgroundSize: orientation === 'horizontal' ? 'auto 90px' : '90px auto',
                              backgroundRepeat: 'repeat',
                              opacity: overlayOpacity / 100,
                              mixBlendMode: 'multiply',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              opacity: 0.7,
                              backgroundImage:
                                orientation === 'horizontal'
                                  ? 'repeating-linear-gradient(0deg, rgba(90,75,60,.55) 0px, rgba(90,75,60,.55) 10px, rgba(155,130,110,.5) 10px, rgba(155,130,110,.5) 46px)'
                                  : 'repeating-linear-gradient(90deg, rgba(90,75,60,.55) 0px, rgba(90,75,60,.55) 10px, rgba(155,130,110,.5) 10px, rgba(155,130,110,.5) 46px)',
                              mixBlendMode: 'multiply',
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button onClick={addSide} style={btnPrimary}>+ Voeg volgende zijde toe</button>
            </div>
          </div>

          <div>
            <div style={{ background: '#fff', borderRadius: 24, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)', marginBottom: 24 }}>
              <h2>Materiaal en prijs</h2>

              <div style={{ marginBottom: 12 }}>
                <label>Oplossing</label>
                <select value={material} onChange={(e) => updateMaterial(e.target.value as MaterialType)} style={inputStyle}>
                  <option value="plastic">Kunststof planken</option>
                  <option value="hardwood">Hardhout planken</option>
                  <option value="paint">Verf</option>
                </select>
              </div>

              {material === 'paint' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label>Aantal lagen</label>
                    <input value={layers} onChange={(e) => setLayers(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label>Dekking per liter (m²)</label>
                    <input value={unitSize} onChange={(e) => setUnitSize(e.target.value)} style={inputStyle} />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label>Werkende plankhoogte (mm)</label>
                    <input value={plankHeightMm} onChange={(e) => setPlankHeightMm(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label>Planklengte (m)</label>
                    <input value={unitSize} onChange={(e) => setUnitSize(e.target.value)} style={inputStyle} />
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <div>
                  <label>{material === 'paint' ? 'Prijs per liter (€)' : 'Prijs per plank (€)'}</label>
                  <input value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label>Snijverlies / reserve (%)</label>
                  <input value={wastePercent} onChange={(e) => setWastePercent(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label>Korting (%)</label>
                <input value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} style={inputStyle} />
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, marginTop: 16 }}>
                <div style={rowStyle}><span>Bruto oppervlak</span><span>{totals.grossM2.toFixed(2)} m²</span></div>
                <div style={rowStyle}><span>Aftrek openingen</span><span>{totals.deductionM2.toFixed(2)} m²</span></div>
                <div style={{ ...rowStyle, fontWeight: 700 }}><span>Netto oppervlak</span><span>{totals.netM2.toFixed(2)} m²</span></div>
                {material !== 'paint' && <div style={rowStyle}><span>Totaal rijen</span><span>{totals.rows}</span></div>}
                <div style={rowStyle}><span>Benodigd</span><span>{totals.quantity.toFixed(1)} {totals.quantityLabel}</span></div>
                <div style={{ ...rowStyle, fontSize: 18, fontWeight: 700 }}><span>Indicatieve kosten</span><span>€ {totals.totalPrice.toFixed(2)}</span></div>
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 24, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
              <h2>Visualisatie</h2>

              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button onClick={() => setSelectedVisual('plastic')} style={selectedVisual === 'plastic' ? btnPrimary : btnSecondary}>Kunststof</button>
                <button onClick={() => setSelectedVisual('hardwood')} style={selectedVisual === 'hardwood' ? btnPrimary : btnSecondary}>Hardhout</button>
                <button onClick={() => setSelectedVisual('paint')} style={selectedVisual === 'paint' ? btnPrimary : btnSecondary}>Verf</button>
              </div>

              {selectedVisual === 'plastic' && (
                <div style={{ marginBottom: 16 }}>
                  <label>Referentiefoto kunststof</label>
                  <div style={{ marginTop: 6 }}>
                    <input type="file" accept="image/*" onChange={(e) => setPlasticRef(uploadPreview(e.target.files?.[0]))} />
                  </div>
                </div>
              )}

              {selectedVisual === 'hardwood' && (
                <div style={{ marginBottom: 16 }}>
                  <label>Referentiefoto hardhout</label>
                  <div style={{ marginTop: 6 }}>
                    <input type="file" accept="image/*" onChange={(e) => setWoodRef(uploadPreview(e.target.files?.[0]))} />
                  </div>
                </div>
              )}

              {selectedVisual === 'paint' && (
                <div style={{ marginBottom: 16 }}>
                  <label>Verfkleur</label>
                  <div style={{ marginTop: 6 }}>
                    <input type="color" value={paintColor} onChange={(e) => setPaintColor(e.target.value)} />
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label>Overlay zichtbaarheid: {overlayOpacity}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={overlayOpacity}
                  onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label>Richting</label>
                <select value={orientation} onChange={(e) => setOrientation(e.target.value as 'horizontal' | 'vertical')} style={inputStyle}>
                  <option value="horizontal">Horizontaal</option>
                  <option value="vertical">Verticaal</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid #cbd5e1',
  marginTop: 6,
  boxSizing: 'border-box',
};

const btnPrimary: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 12,
  border: 'none',
  background: '#0f172a',
  color: '#fff',
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 12,
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#0f172a',
  cursor: 'pointer',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 8,
};