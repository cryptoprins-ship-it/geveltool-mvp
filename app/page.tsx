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
  imageName?: string;
  imageError?: string;
  linkToSide?: number;
};

type MaterialType = 'plastic' | 'hardwood' | 'paint';
type Language = 'nl' | 'en';

function toNum(value: string | number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function uploadPreview(file?: File) {
  if (!file) return undefined;
  return URL.createObjectURL(file);
}

const MAX_FILE_MB = 10;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const translations: Record<Language, Record<string, string>> = {
  nl: {
    appTitle: 'GevelPlanner',
    subtitle: 'Bereken en visualiseer je gevel in 2 minuten',
    intro:
      'Bereken eerst je netto oppervlak. Kies daarna pas materiaal om aantallen en kosten te berekenen.',
    language: 'Taal',
    side: 'Zijde',
    addSide: '+ Voeg volgende zijde toe',
    remove: 'Verwijder',
    duplicateSide: 'Dupliceer zijde',
    useSizeFrom: 'Gebruik maat van',
    manualSize: 'Handmatig',
    aiEstimate: 'AI schatting',
    width: 'Breedte (m)',
    height: 'Hoogte (m)',
    deductionMode: 'Aftrekmodus',
    manual: 'Handmatig',
    automaticAi: 'AI automatisch',
    manualDeduction: 'Handmatige aftrek m²',
    aiDeduction: 'AI aftrek m²',
    sidePhoto: 'Laad hier uw foto in',
    choosePhoto: '📸 Maak of kies foto',
    replacePhoto: '🔁 Vervang foto',
    noPhotoSelected: 'Nog geen foto gekozen',
    photoFormats: 'Ondersteund: JPG, PNG, WEBP en vaak HEIC – max 10 MB',
    invalidFile: 'Ongeldig bestand. Gebruik JPG, PNG, WEBP of HEIC.',
    fileTooLarge: 'Bestand is te groot. Maximum is 10 MB.',
    photoLoaded: 'Foto geladen',

    areaStep: 'Stap 1 – Oppervlakteberekening',
    materialStep: 'Stap 2 – Materiaalberekening',
    visualisation: 'Visualisatie',
    goToMaterial: '➡️ Ga naar materiaalberekening',
    backToArea: '⬅️ Terug naar oppervlakteberekening',

    result: 'Resultaat',
    gross: 'Bruto',
    deduction: 'Aftrek',
    net: 'Netto',

    totalGross: 'Totaal bruto oppervlak',
    totalDeduction: 'Totaal aftrek openingen',
    totalNet: 'Totaal netto oppervlak',

    solution: 'Oplossing',
    chooseSolution: 'Kies materiaal',
    plasticBoards: 'Kunststof planken',
    hardwoodBoards: 'Hardhout planken',
    paint: 'Verf',

    boardHeight: 'Werkende plankhoogte (mm)',
    boardLength: 'Planklengte (m)',
    pricePerBoard: 'Prijs per plank (€)',
    waste: 'Snijverlies / reserve (%)',

    layers: 'Aantal lagen',
    coverage: 'Dekking per liter (m²)',
    pricePerLiter: 'Prijs per liter (€)',

    discount: 'Korting (%)',
    totalRows: 'Totaal rijen',
    needed: 'Benodigd',
    estimatedCost: 'Indicatieve kosten',
    boards: 'planken',
    liters: 'liter',

    chooseMaterialFirst: 'Kies eerst een materiaal en vul de materiaalgegevens in om aantallen en kosten te berekenen.',

    plastic: 'Kunststof',
    hardwood: 'Hardhout',
    paintLabel: 'Verf',
    plasticRef: 'Laad hier uw kunststof voorbeeld in',
    hardwoodRef: 'Laad hier uw hardhout voorbeeld in',
    overlay: 'Overlay zichtbaarheid',
    direction: 'Richting',
    horizontal: 'Horizontaal',
    vertical: 'Verticaal',
    paintColor: 'Verfkleur',
  },
  en: {
    appTitle: 'FacadePlanner',
    subtitle: 'Calculate and visualize your facade in 2 minutes',
    intro:
      'First calculate your net surface. Only then choose material to calculate quantities and costs.',
    language: 'Language',
    side: 'Side',
    addSide: '+ Add next side',
    remove: 'Remove',
    duplicateSide: 'Duplicate side',
    useSizeFrom: 'Use size from',
    manualSize: 'Manual',
    aiEstimate: 'AI estimate',
    width: 'Width (m)',
    height: 'Height (m)',
    deductionMode: 'Deduction mode',
    manual: 'Manual',
    automaticAi: 'AI automatic',
    manualDeduction: 'Manual deduction m²',
    aiDeduction: 'AI deduction m²',
    sidePhoto: 'Upload your photo here',
    choosePhoto: '📸 Take or choose photo',
    replacePhoto: '🔁 Replace photo',
    noPhotoSelected: 'No photo selected yet',
    photoFormats: 'Supported: JPG, PNG, WEBP and often HEIC – max 10 MB',
    invalidFile: 'Invalid file. Use JPG, PNG, WEBP or HEIC.',
    fileTooLarge: 'File is too large. Maximum is 10 MB.',
    photoLoaded: 'Photo loaded',

    areaStep: 'Step 1 – Surface calculation',
    materialStep: 'Step 2 – Material calculation',
    visualisation: 'Visualization',
    goToMaterial: '➡️ Go to material calculation',
    backToArea: '⬅️ Back to surface calculation',

    result: 'Result',
    gross: 'Gross',
    deduction: 'Deduction',
    net: 'Net',

    totalGross: 'Total gross surface',
    totalDeduction: 'Total opening deduction',
    totalNet: 'Total net surface',

    solution: 'Solution',
    chooseSolution: 'Choose material',
    plasticBoards: 'Plastic boards',
    hardwoodBoards: 'Hardwood boards',
    paint: 'Paint',

    boardHeight: 'Effective board height (mm)',
    boardLength: 'Board length (m)',
    pricePerBoard: 'Price per board (€)',
    waste: 'Waste / reserve (%)',

    layers: 'Number of coats',
    coverage: 'Coverage per liter (m²)',
    pricePerLiter: 'Price per liter (€)',

    discount: 'Discount (%)',
    totalRows: 'Total rows',
    needed: 'Required',
    estimatedCost: 'Estimated cost',
    boards: 'boards',
    liters: 'liter',

    chooseMaterialFirst: 'First choose a material and enter the material settings to calculate quantities and costs.',

    plastic: 'Plastic',
    hardwood: 'Hardwood',
    paintLabel: 'Paint',
    plasticRef: 'Upload your plastic reference here',
    hardwoodRef: 'Upload your hardwood reference here',
    overlay: 'Overlay visibility',
    direction: 'Direction',
    horizontal: 'Horizontal',
    vertical: 'Vertical',
    paintColor: 'Paint color',
  },
};

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
    imageName: '',
    imageError: '',
    linkToSide: undefined,
  };
}

export default function Page() {
  const [language, setLanguage] = useState<Language>('nl');
  const t = translations[language];

  const [sides, setSides] = useState<Side[]>([createSide(1, t)]);
  const [material, setMaterial] = useState<MaterialType | ''>('');
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

  function duplicateSide(id: number) {
    setSides((prev) => {
      const source = prev.find((s) => s.id === id);
      if (!source) return prev;

      const newId = prev.length > 0 ? Math.max(...prev.map((s) => s.id)) + 1 : 1;

      const clone: Side = {
        id: newId,
        name: `${t.side} ${newId}`,
        width: source.width,
        height: source.height,
        deductionMode: source.deductionMode,
        deductionM2: source.deductionM2,
        aiDeductionM2: source.aiDeductionM2,
        image: undefined,
        imageName: '',
        imageError: '',
        linkToSide: source.linkToSide,
      };

      return [...prev, clone];
    });
  }

  function removeSide(id: number) {
    setSides((prev) => {
      if (prev.length === 1) return prev;
      const filtered = prev.filter((s) => s.id !== id);
      return filtered.map((s) =>
        s.linkToSide === id ? { ...s, linkToSide: undefined } : s
      );
    });
  }

  function updateSide(id: number, patch: Partial<Side>) {
    setSides((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function validateImage(file?: File) {
    if (!file) return { ok: false, error: '' };

    const typeOk =
      ALLOWED_TYPES.includes(file.type) ||
      file.name.toLowerCase().endsWith('.heic') ||
      file.name.toLowerCase().endsWith('.heif');

    if (!typeOk) return { ok: false, error: t.invalidFile };
    if (file.size > MAX_FILE_MB * 1024 * 1024) return { ok: false, error: t.fileTooLarge };

    return { ok: true, error: '' };
  }

  function handleSideImage(id: number, file?: File) {
    const result = validateImage(file);
    if (!file) return;

    if (!result.ok) {
      updateSide(id, {
        image: undefined,
        imageName: '',
        imageError: result.error,
      });
      return;
    }

    updateSide(id, {
      image: uploadPreview(file),
      imageName: file.name,
      imageError: '',
    });
  }

  function handleReferenceImage(file: File | undefined, type: 'plastic' | 'wood') {
    const result = validateImage(file);
    if (!file || !result.ok) return;

    if (type === 'plastic') {
      setPlasticRef(uploadPreview(file));
    } else {
      setWoodRef(uploadPreview(file));
    }
  }

  function updateMaterial(next: MaterialType | '') {
    setMaterial(next);
    setSelectedVisual((next || 'plastic') as MaterialType);

    if (next === 'paint') {
      setUnitSize('8');
      setUnitPrice('22');
    } else if (next === 'hardwood') {
      setUnitSize('4');
      setUnitPrice('49');
    } else if (next === 'plastic') {
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
      let width = toNum(side.width);
      let height = toNum(side.height);

      if (side.linkToSide) {
        const ref = sides.find((s) => s.id === side.linkToSide);
        if (ref) {
          width = toNum(ref.width);
          height = toNum(ref.height);
        }
      }

      const grossM2 = width * height;
      const deduction = side.deductionMode === 'ai' ? toNum(side.aiDeductionM2) : toNum(side.deductionM2);
      const safeDeduction = Math.min(grossM2, Math.max(0, deduction));
      const netM2 = Math.max(0, grossM2 - safeDeduction);

      return { ...side, calculatedWidth: width, calculatedHeight: height, grossM2, safeDeduction, netM2 };
    });
  }, [sides]);

  const areaTotals = useMemo(() => {
    const grossM2 = calculatedSides.reduce((sum, s) => sum + s.grossM2, 0);
    const deductionM2 = calculatedSides.reduce((sum, s) => sum + s.safeDeduction, 0);
    const netM2 = calculatedSides.reduce((sum, s) => sum + s.netM2, 0);
    return { grossM2, deductionM2, netM2 };
  }, [calculatedSides]);

  const materialResult = useMemo(() => {
    if (!material) return null;

    const wasteFactor = 1 + toNum(wastePercent) / 100;
    const discountFactor = 1 - toNum(discountPercent) / 100;
    const netM2 = areaTotals.netM2;

    if (material === 'paint') {
      const coats = Math.max(1, toNum(layers));
      const coverage = Math.max(0.1, toNum(unitSize));
      const liters = (netM2 * coats) / coverage;
      const litersWithWaste = liters * wasteFactor;
      const totalPrice = litersWithWaste * toNum(unitPrice) * discountFactor;

      return {
        rows: 0,
        quantity: litersWithWaste,
        quantityLabel: t.liters,
        totalPrice,
      };
    }

    const plankHeightM = Math.max(0.01, toNum(plankHeightMm) / 1000);
    const plankLengthM = Math.max(0.1, toNum(unitSize));

    const totalRows = calculatedSides.reduce((sum, s) => sum + rowsForSide(s.calculatedHeight, plankHeightM), 0);
    const totalLinearMeters = calculatedSides.reduce(
      (sum, s) => sum + rowsForSide(s.calculatedHeight, plankHeightM) * toNum(s.calculatedWidth),
      0
    );
    const planks = (totalLinearMeters / plankLengthM) * wasteFactor;
    const totalPrice = planks * toNum(unitPrice) * discountFactor;

    return {
      rows: totalRows,
      quantity: planks,
      quantityLabel: t.boards,
      totalPrice,
    };
  }, [
    material,
    wastePercent,
    discountPercent,
    areaTotals.netM2,
    layers,
    unitSize,
    unitPrice,
    plankHeightMm,
    calculatedSides,
    t,
  ]);

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

        <div style={cardStyle}>
          <h1 style={{ fontSize: 32, margin: 0 }}>{t.appTitle}</h1>
          <p style={{ marginTop: 8, fontSize: 18, fontWeight: 600 }}>{t.subtitle}</p>
          <p style={{ marginTop: 12 }}>{t.intro}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24 }}>
          <div>
            <div id="oppervlakte" style={cardStyle}>
              <h2>{t.areaStep}</h2>

              {calculatedSides.map((side) => (
                <div key={side.id} style={sectionStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                    <input
                      value={side.name}
                      onChange={(e) => updateSide(side.id, { name: e.target.value })}
                      style={{ ...inputStyle, minWidth: 180, marginTop: 0 }}
                    />
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button onClick={() => runAiEstimate(side.id)} style={btnSecondary}>{t.aiEstimate}</button>
                      <button onClick={() => duplicateSide(side.id)} style={btnSecondary}>{t.duplicateSide}</button>
                      <button onClick={() => removeSide(side.id)} style={btnSecondary}>{t.remove}</button>
                    </div>
                  </div>

                  <div style={uploadCardStyle}>
                    <label>{t.sidePhoto}</label>
                    <div style={{ marginTop: 10 }}>
                      <label style={{ display: 'inline-block', cursor: 'pointer' }}>
                        <span style={btnPrimary}>{side.image ? t.replacePhoto : t.choosePhoto}</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handleSideImage(side.id, e.target.files?.[0])}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>

                    <div style={{ marginTop: 10, fontSize: 13 }}>
                      {side.imageName ? `✅ ${side.imageName}` : t.noPhotoSelected}
                    </div>

                    <div style={{ marginTop: 6, fontSize: 12, color: '#334155' }}>{t.photoFormats}</div>

                    {side.imageError && (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#b91c1c', fontWeight: 600 }}>
                        {side.imageError}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 16 }}>
                    <div>
                      <label>{t.useSizeFrom}</label>
                      <select
                        value={side.linkToSide ?? ''}
                        onChange={(e) =>
                          updateSide(side.id, {
                            linkToSide: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        style={inputStyle}
                      >
                        <option value="">{t.manualSize}</option>
                        {sides
                          .filter((s) => s.id !== side.id)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label>{t.width}</label>
                      <input
                        value={side.linkToSide ? String(side.calculatedWidth) : side.width}
                        onChange={(e) => updateSide(side.id, { width: e.target.value })}
                        style={{
                          ...inputStyle,
                          background: side.linkToSide ? '#e2e8f0' : '#fff',
                        }}
                        disabled={!!side.linkToSide}
                      />
                    </div>

                    <div>
                      <label>{t.height}</label>
                      <input
                        value={side.linkToSide ? String(side.calculatedHeight) : side.height}
                        onChange={(e) => updateSide(side.id, { height: e.target.value })}
                        style={{
                          ...inputStyle,
                          background: side.linkToSide ? '#e2e8f0' : '#fff',
                        }}
                        disabled={!!side.linkToSide}
                      />
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

                  <div style={{ marginTop: 16, background: '#fff', borderRadius: 16, padding: 16, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, marginBottom: 10 }}>{t.result}</div>
                    <div style={rowStyle}><span>{t.gross}</span><span>{side.grossM2.toFixed(2)} m²</span></div>
                    <div style={rowStyle}><span>{t.deduction}</span><span>{side.safeDeduction.toFixed(2)} m²</span></div>
                    <div style={{ ...rowStyle, fontWeight: 700 }}><span>{t.net}</span><span>{side.netM2.toFixed(2)} m²</span></div>
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

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button onClick={addSide} style={btnPrimary}>{t.addSide}</button>
                <button
                  onClick={() => {
                    document.getElementById('materiaal')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  style={{ ...btnPrimary, background: '#2563eb' }}
                >
                  {t.goToMaterial}
                </button>
              </div>

              <div style={{ ...sectionStyle, marginTop: 24 }}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>{t.result}</div>
                <div style={rowStyle}><span>{t.totalGross}</span><span>{areaTotals.grossM2.toFixed(2)} m²</span></div>
                <div style={rowStyle}><span>{t.totalDeduction}</span><span>{areaTotals.deductionM2.toFixed(2)} m²</span></div>
                <div style={{ ...rowStyle, fontWeight: 700 }}><span>{t.totalNet}</span><span>{areaTotals.netM2.toFixed(2)} m²</span></div>
              </div>
            </div>
          </div>

          <div>
            <div id="materiaal" style={cardStyle}>
              <h2>{t.materialStep}</h2>

              <button
                onClick={() => {
                  document.getElementById('oppervlakte')?.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{ ...btnSecondary, marginBottom: 16, width: '100%' }}
              >
                {t.backToArea}
              </button>

              <div>
                <label>{t.solution}</label>
                <select value={material} onChange={(e) => updateMaterial(e.target.value as MaterialType | '')} style={inputStyle}>
                  <option value="">{t.chooseSolution}</option>
                  <option value="plastic">{t.plasticBoards}</option>
                  <option value="hardwood">{t.hardwoodBoards}</option>
                  <option value="paint">{t.paint}</option>
                </select>
              </div>

              {!material ? (
                <div style={{ ...sectionStyle, marginTop: 16 }}>
                  {t.chooseMaterialFirst}
                </div>
              ) : (
                <>
                  {material === 'paint' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
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

                  {materialResult && (
                    <div style={{ ...sectionStyle, marginTop: 16 }}>
                      {material !== 'paint' && (
                        <div style={rowStyle}><span>{t.totalRows}</span><span>{materialResult.rows}</span></div>
                      )}
                      <div style={rowStyle}><span>{t.needed}</span><span>{materialResult.quantity.toFixed(1)} {materialResult.quantityLabel}</span></div>
                      <div style={{ ...rowStyle, fontWeight: 700, fontSize: 18 }}>
                        <span>{t.estimatedCost}</span>
                        <span>€ {materialResult.totalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={cardStyle}>
              <h2>{t.visualisation}</h2>

              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <button onClick={() => setSelectedVisual('plastic')} style={selectedVisual === 'plastic' ? btnPrimary : btnSecondary}>{t.plastic}</button>
                <button onClick={() => setSelectedVisual('hardwood')} style={selectedVisual === 'hardwood' ? btnPrimary : btnSecondary}>{t.hardwood}</button>
                <button onClick={() => setSelectedVisual('paint')} style={selectedVisual === 'paint' ? btnPrimary : btnSecondary}>{t.paintLabel}</button>
              </div>

              {selectedVisual === 'plastic' && (
                <div style={uploadCardStyle}>
                  <label>{t.plasticRef}</label>
                  <div style={{ marginTop: 10 }}>
                    <label style={{ display: 'inline-block', cursor: 'pointer' }}>
                      <span style={btnPrimary}>{t.choosePhoto}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleReferenceImage(e.target.files?.[0], 'plastic')}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                </div>
              )}

              {selectedVisual === 'hardwood' && (
                <div style={uploadCardStyle}>
                  <label>{t.hardwoodRef}</label>
                  <div style={{ marginTop: 10 }}>
                    <label style={{ display: 'inline-block', cursor: 'pointer' }}>
                      <span style={btnPrimary}>{t.choosePhoto}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleReferenceImage(e.target.files?.[0], 'wood')}
                        style={{ display: 'none' }}
                      />
                    </label>
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

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 24,
  padding: 24,
  boxShadow: '0 1px 4px rgba(0,0,0,.08)',
  marginBottom: 24,
};

const sectionStyle: React.CSSProperties = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: 18,
  padding: 16,
  marginBottom: 16,
};

const uploadCardStyle: React.CSSProperties = {
  marginTop: 8,
  padding: 14,
  borderRadius: 16,
  border: '1px dashed #94a3b8',
  background: '#f8fafc',
};