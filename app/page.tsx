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
type Language = 'nl' | 'en';

function toNum(value: string | number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function createSide(id: number, t: Record<string, string>): Side {
  return {
    id,
    name: `${t.side} ${id}`,
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

const translations: Record<Language, Record<string, string>> = {
  nl: {
    appTitle: 'GevelTool MVP',
    intro:
      'Upload foto’s per gevelzijde, vul breedte en hoogte in, trek kozijnen handmatig of via AI-schatting af en vergelijk direct kunststof, hardhout of verf.',
    side: 'Zijde',
    sidesTitle: 'Gevelzijdes',
    materialPrice: 'Materiaal en prijs',
    visualisation: 'Visualisatie',
    goal: 'Doel: van foto naar berekening en visualisatie in één workflow.',
    aiEstimate: 'AI schatting',
    remove: 'Verwijder',
    width: 'Breedte (m)',
    height: 'Hoogte (m)',
    deductionMode: 'Aftrekmodus',
    manual: 'Handmatig',
    automaticAi: 'AI automatisch',
    aiDeduction: 'AI aftrek m²',
    manualDeduction: 'Handmatige aftrek m²',
    sidePhoto: 'Laad hier uw foto in',
    photoFormats: 'Ondersteund: JPG, PNG of WEBP',
    result: 'Resultaat',
    gross: 'Bruto',
    deduction: 'Aftrek',
    net: 'Netto',
    addSide: '+ Voeg volgende zijde toe',
    solution: 'Oplossing',
    plasticBoards: 'Kunststof planken',
    hardwoodBoards: 'Hardhout planken',
    paint: 'Verf',
    layers: 'Aantal lagen',
    coverage: 'Dekking per liter (m²)',
    boardHeight: 'Werkende plankhoogte (mm)',
    boardLength: 'Planklengte (m)',
    pricePerLiter: 'Prijs per liter (€)',
    pricePerBoard: 'Prijs per plank (€)',
    waste: 'Snijverlies / reserve (%)',
    discount: 'Korting (%)',
    grossSurface: 'Bruto oppervlak',
    deductionOpenings: 'Aftrek openingen',
    netSurface: 'Netto oppervlak',
    totalRows: 'Totaal rijen',
    needed: 'Benodigd',
    estimatedCost: 'Indicatieve kosten',
    liters: 'liter',
    boards: 'planken',
    plastic: 'Kunststof',
    hardwood: 'Hardhout',
    paintLabel: 'Verf',
    plasticRef: 'Laad hier uw kunststof voorbeeld in',
    hardwoodRef: 'Laad hier uw hardhout voorbeeld in',
    paintColor: 'Verfkleur',
    overlay: 'Overlay zichtbaarheid',
    direction: 'Richting',
    horizontal: 'Horizontaal',
    vertical: 'Verticaal',
    language: 'Taal',
  },
  en: {
    appTitle: 'FacadeTool MVP',
    intro:
      'Upload photos per facade side, enter width and height, subtract frames manually or with an AI estimate, and compare plastic cladding, hardwood or paint.',
    side: 'Side',
    sidesTitle: 'Facade sides',
    materialPrice: 'Material and price',
    visualisation: 'Visualisation',
    goal: 'Goal: from photo to calculation and visualisation in one workflow.',
    aiEstimate: 'AI estimate',
    remove: 'Remove',
    width: 'Width (m)',
    height: 'Height (m)',
    deductionMode: 'Deduction mode',
    manual: 'Manual',
    automaticAi: 'AI automatic',
    aiDeduction: 'AI deduction m²',
    manualDeduction: 'Manual deduction m²',
    sidePhoto: 'Upload your photo here',
    photoFormats: 'Supported: JPG, PNG or WEBP',
    result: 'Result',
    gross: 'Gross',
    deduction: 'Deduction',
    net: 'Net',
    addSide: '+ Add next side',
    solution: 'Solution',
    plasticBoards: 'Plastic boards',
    hardwoodBoards: 'Hardwood boards',
    paint: 'Paint',
    layers: 'Number of coats',
    coverage: 'Coverage per liter (m²)',
    boardHeight: 'Effective board height (mm)',
    boardLength: 'Board length (m)',
    pricePerLiter: 'Price per liter (€)',
    pricePerBoard: 'Price per board (€)',
    waste: 'Waste / reserve (%)',
    discount: 'Discount (%)',
    grossSurface: 'Gross surface',
    deductionOpenings: 'Opening deduction',
    netSurface: 'Net surface',
    totalRows: 'Total rows',
    needed: 'Required',
    estimatedCost: 'Estimated cost',
    liters: 'liter',
    boards: 'boards',
    plastic: 'Plastic',
    hardwood: 'Hardwood',
    paintLabel: 'Paint',
    plasticRef: 'Upload your plastic reference here',
    hardwoodRef: 'Upload your hardwood reference here',
    paintColor: 'Paint color',
    overlay: 'Overlay visibility',
    direction: 'Direction',
    horizontal: 'Horizontal',
    vertical: 'Vertical',
    language: 'Language',
  },
};

export default function Page() {
  const [language, setLanguage] = useState<Language>('nl');
  const t = translations[language];

  const [sides, setSides] = useState<Side[]>([createSide(1, t)]);
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
    setSides((prev) => [...prev, createSide(prev.length + 1, t)]);
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
        quantityLabel: t.liters,
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
      quantityLabel: t.boards,
      rows: totalRows,
      totalPrice,
    };
  }, [calculatedSides, material, layers, unitPrice, unitSize, plankHeightMm, wastePercent, discountPercent, t]);

  const currentTexture =
    selectedVisual === 'plastic' ? plasticRef : selectedVisual === 'hardwood' ? woodRef : undefined;

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', padding: 24, fontFamily: 'Arial, sans-serif', color: '#000' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <div style={{ minWidth: 180 }}>
            <label>{t.language}</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} style={inputStyle}>
              <option value="nl">Nederlands</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 24, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)', marginBottom: 24 }}>
          <h1 style={{ fontSize: 32, margin: 0 }}>{t.appTitle}</h1>
          <p style={{ color: '#000', marginTop: 12 }}>
            {t.intro}
          </p>
          <div style={{ marginTop: 12, color: '#000', fontWeight: 600 }}>
            {t.goal}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24 }}>
          <div>
            <div style={{ background: '#fff', borderRadius: 24, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
              <h2>{t.sidesTitle}</h2>

              {calculatedSides.map((side) => (
                <div key={side.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 18, padding: 16, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                    <input
                      value={side.name}
                      onChange={(e) => updateSide(side.id, { name: e.target.value })}
                      style={{ padding: 10, borderRadius: 12, border: '1px solid #cbd5e1', minWidth: 180, color: '#000' }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => runAiEstimate(side.id)} style={btnSecondary}>{t.aiEstimate}</button>
                      <button onClick={() => removeSide(side.id)} style={btnSecondary}>{t.remove}</button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    <div>
                      <label>{t.width}</label>
                      <input value={side.width} onChange={(e) => updateSide(side.id, { width: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <label>{t.height}</label>
                      <input value={side.height} onChange={(e) => updateSide(side.id, { height: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <label>{t.deductionMode}</label>
                      <select
                        value={side.deductionMode}
                        onChange={(e) => updateSide(side.id, { deductionMode: e.target.value as 'manual' | 'ai' })}
                        style={inputStyle}
                      >
                        <option value="manual">{t.manual}</option>
                        <option value="ai">{t.automaticAi}</option>
                      </select>
                    </div>
                    <div>
                      <label>{side.deductionMode === 'ai' ? t.aiDeduction : t.manualDeduction}</label>
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
                      <label>{t.sidePhoto}</label>
                      <div style={{ marginTop: 6 }}>
                        <input
                          type="file"
                          accept="image/jpeg, image/png, image/webp"
                          onChange={(e) => updateSide(side.id, { image: uploadPreview(e.target.files?.[0]) })}
                          style={{ color: '#000' }}
                        />
                        <div style={{ fontSize: 12, marginTop: 6 }}>{t.photoFormats}</div>
                      </div>
                    </div>

                    <div style={{ background: '#fff', borderRadius: 16, padding: 16, border: '1px solid #e2e8f0', color: '#000' }}>
                      <div style={{ fontWeight: 700, marginBottom: 10 }}>{t.result}</div>
                      <div style={rowStyle}><span>{t.gross}</span><span>{side.grossM2.toFixed(2)} m²</span></div>
                      <div style={rowStyle}><span>{t.deduction}</span><span>{side.safeDeduction.toFixed(2)} m²</span></div>
                      <div style={{ ...rowStyle, fontWeight: 700 }}><span>{t.net}</span><span>{side.netM2.toFixed(2)} m²</span></div>
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

              <button onClick={addSide} style={btnPrimary}>{t.addSide}</button>
            </div>
          </div>

          <div>
            <div style={{ background: '#fff', borderRadius: 24, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)', marginBottom: 24 }}>
              <h2>{t.materialPrice}</h2>

              <div style={{ marginBottom: 12 }}>
                <label>{t.solution}</label>
                <select value={material} onChange={(e) => updateMaterial(e.target.value as MaterialType)} style={inputStyle}>
                  <option value="plastic">{t.plasticBoards}</option>
                  <option value="hardwood">{t.hardwoodBoards}</option>
                  <option value="paint">{t.paint}</option>
                </select>
              </div>

              {material === 'paint' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label>{t.layers}</label>
                    <input value={layers} onChange={(e) => setLayers(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label>{t.coverage}</label>
                    <input value={unitSize} onChange={(e) => setUnitSize(e.target.value)} style={inputStyle} />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label>{t.boardHeight}</label>
                    <input value={plankHeightMm} onChange={(e) => setPlankHeightMm(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label>{t.boardLength}</label>
                    <input value={unitSize} onChange={(e) => setUnitSize(e.target.value)} style={inputStyle} />
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <div>
                  <label>{material === 'paint' ? t.pricePerLiter : t.pricePerBoard}</label>
                  <input value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label>{t.waste}</label>
                  <input value={wastePercent} onChange={(e) => setWastePercent(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label>{t.discount}</label>
                <input value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} style={inputStyle} />
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, marginTop: 16, color: '#000' }}>
                <div style={rowStyle}><span>{t.grossSurface}</span><span>{totals.grossM2.toFixed(2)} m²</span></div>
                <div style={rowStyle}><span>{t.deductionOpenings}</span><span>{totals.deductionM2.toFixed(2)} m²</span></div>
                <div style={{ ...rowStyle, fontWeight: 700 }}><span>{t.netSurface}</span><span>{totals.netM2.toFixed(2)} m²</span></div>
                {material !== 'paint' && <div style={rowStyle}><span>{t.totalRows}</span><span>{totals.rows}</span></div>}
                <div style={rowStyle}><span>{t.needed}</span><span>{totals.quantity.toFixed(1)} {totals.quantityLabel}</span></div>
                <div style={{ ...rowStyle, fontSize: 18, fontWeight: 700 }}><span>{t.estimatedCost}</span><span>€ {totals.totalPrice.toFixed(2)}</span></div>
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 24, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
              <h2>{t.visualisation}</h2>

              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <button onClick={() => setSelectedVisual('plastic')} style={selectedVisual === 'plastic' ? btnPrimary : btnSecondary}>{t.plastic}</button>
                <button onClick={() => setSelectedVisual('hardwood')} style={selectedVisual === 'hardwood' ? btnPrimary : btnSecondary}>{t.hardwood}</button>
                <button onClick={() => setSelectedVisual('paint')} style={selectedVisual === 'paint' ? btnPrimary : btnSecondary}>{t.paintLabel}</button>
              </div>

              {selectedVisual === 'plastic' && (
                <div style={{ marginBottom: 16 }}>
                  <label>{t.plasticRef}</label>
                  <div style={{ marginTop: 6 }}>
                    <input type="file" accept="image/jpeg, image/png, image/webp" onChange={(e) => setPlasticRef(uploadPreview(e.target.files?.[0]))} style={{ color: '#000' }} />
                  </div>
                </div>
              )}

              {selectedVisual === 'hardwood' && (
                <div style={{ marginBottom: 16 }}>
                  <label>{t.hardwoodRef}</label>
                  <div style={{ marginTop: 6 }}>
                    <input type="file" accept="image/jpeg, image/png, image/webp" onChange={(e) => setWoodRef(uploadPreview(e.target.files?.[0]))} style={{ color: '#000' }} />
                  </div>
                </div>
              )}

              {selectedVisual === 'paint' && (
                <div style={{ marginBottom: 16 }}>
                  <label>{t.paintColor}</label>
                  <div style={{ marginTop: 6 }}>
                    <input type="color" value={paintColor} onChange={(e) => setPaintColor(e.target.value)} />
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label>{t.overlay}: {overlayOpacity}%</label>
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
                <label>{t.direction}</label>
                <select value={orientation} onChange={(e) => setOrientation(e.target.value as 'horizontal' | 'vertical')} style={inputStyle}>
                  <option value="horizontal">{t.horizontal}</option>
                  <option value="vertical">{t.vertical}</option>
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
  color: '#000',
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