const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

// Marktanker vom 23.08.2026: aktuelle Komplettsysteme und Komponentenpreise.
// Die Quellen und das Aktualisierungsdatum werden in jedem Ergebnis ausgegeben.
const PRICE_CATALOG = {
  updatedAt: '2026-08-23',
  sources: [
    'idealo: Ryzen 5 5600G / 32 GB / 1 TB Komplettsysteme 776–850 €',
    'idealo: Ryzen 5 5600G / 16 GB / 500 GB Komplettsysteme ab 641 €',
    'idealo: Ryzen 5 5600G boxed ab 152 €'
  ],
  cpu: {
    '3600': 95, '4600G': 120, '5600': 125, '5600G': 152, '5600GT': 155,
    '5700G': 190, '5800X': 185, '7600': 190, '7600X': 205, '7700': 275,
    '10400': 115, '10500': 125, '10600': 140, '10700': 180, '10900': 260,
    '11400': 125, '11500': 135, '11600': 150, '11700': 195,
    '12400': 145, '12500': 165, '12600': 190, '12700': 260,
    '13400': 190, '13500': 225, '13600': 260, '13700': 340,
    '14400': 205, '14500': 240, '14600': 285, '14700': 365
  },
  basePlatform: 285,
  ram16: 45,
  ram32: 75,
  ssd500: 45,
  ssd1000: 70,
  assemblyAndOs: 145,
  silentPremium: 180
};

export function parsePrice(text = '') {
  const match = text.match(/(?:€\s*)?((?:\d{1,3}(?:[. ]\d{3})+)|\d{2,4})(?:[,.]\d{2})?\s*(?:€|EUR)/i);
  return match ? Number(match[1].replace(/[. ]/g, '')) : null;
}

export function parseRam(text = '') {
  const values = [...text.matchAll(/(\d{1,3})\s*GB\s*(?:DDR\d?|RAM|Arbeitsspeicher)/gi)].map(m => Number(m[1]));
  return values.length ? Math.max(...values) : null;
}

export function parseStorage(text = '') {
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(TB|GB)\s*(NVMe|M\.2|SSD)/i);
  if (!match) return null;
  const amount = Number(match[1].replace(',', '.'));
  return { label: `${match[1]} ${match[2]} ${match[3]}`, gb: Math.round(amount * (match[2].toUpperCase() === 'TB' ? 1000 : 1)), type: match[3] };
}

export function detectSilent(text = '') {
  if (/silentmaxx/i.test(text)) return { proven: true, concept: 'Silentmaxx-System (bevorzugt)', points: 3 };
  if (/cirrus7|ichbinleise|primecomputer/i.test(text) && /passiv|fanless|lüfterlos|silent|leise/i.test(text)) return { proven: true, concept: 'spezialisierter Silent-PC-Hersteller', points: 2.8 };
  if (/komplett\s*passiv|vollpassiv|fanless|lüfterlos|ohne\s*lüfter/i.test(text)) return { proven: true, concept: 'passiv/lüfterlos', points: 2.7 };
  if (/semi[- ]?passiv|0\s*dB|silent\s*(?:pc|system)|geräuscharm(?:er|es)?\s*(?:pc|system)|flüsterleise(?:r|s)?\s*(?:pc|system)|besonders\s+leise(?:r|s)?\s*(?:pc|system)|sehr\s+leise(?:r|s)?\s*(?:pc|system)|low[- ]noise\s*(?:pc|system)/i.test(text)) return { proven: true, concept: 'nachweislich leises System', points: 2.2 };
  return { proven: false, concept: 'nicht nachgewiesen', points: 0 };
}

export function detectDisplays(text = '') {
  const explicit = text.match(/(?:bis zu|für|unterstützt)?\s*(\d)\s*(?:monitore|displays|bildschirme)/i);
  if (explicit && Number(explicit[1]) >= 3) return { suitable: true, evidence: `${explicit[1]} Monitore laut Anzeige` };
  const ports = ['displayport', 'mini displayport', 'hdmi', 'dvi', 'usb-c', 'thunderbolt']
    .reduce((sum, port) => sum + ([...text.toLowerCase().matchAll(new RegExp(port.replace('-', '[- ]?'), 'g'))].length), 0);
  if (ports >= 3) return { suitable: true, evidence: `mindestens ${ports} genannte Grafikausgänge` };
  const gpu = text.match(/(?:RTX|GTX)\s*\d{3,4}(?:\s*Ti)?|Radeon\s+(?:RX\s*)?\d{3,4}\s*(?:XT)?|Quadro\s+[A-Z]?\d{3,4}/i)?.[0];
  if (gpu) return { suitable: true, evidence: `${gpu}; üblicherweise 3+ gleichzeitige Displays, Anschlüsse vor Kauf prüfen` };
  return { suitable: false, evidence: '3 gleichzeitige Monitore nicht belegt' };
}

function extract(text, patterns) {
  for (const pattern of patterns) {
    const value = text.match(pattern)?.[0];
    if (value) return value.replace(/\s+/g, ' ').trim();
  }
  return 'nicht angegeben';
}

export function assessCpuVideo(cpu = '', gpu = '', text = '') {
  const ryzen = cpu.match(/Ryzen\s+([3579])\s*(\d{4,5})([A-Z]*)/i);
  const intel = cpu.match(/Core\s+i([3579])[ -](\d{4,5})([A-Z]*)/i);
  let performanceOk = false;
  let cpuLabel = 'CPU unter Mindestleistung oder nicht erkannt';
  let integratedDecoder = false;

  if (ryzen) {
    const model = Number(ryzen[2]);
    performanceOk = model >= 3600;
    integratedDecoder = /G/i.test(ryzen[3]);
    cpuLabel = performanceOk ? 'Ryzen 5 3600/5600G oder besser' : 'Ryzen unter Mindestleistung';
  } else if (intel) {
    const tier = Number(intel[1]);
    const digits = intel[2];
    const generation = digits.length === 5 ? Number(digits.slice(0, 2)) : Number(digits[0]);
    performanceOk = tier >= 5 && generation >= 10;
    integratedDecoder = performanceOk && !/F/i.test(intel[3]);
    cpuLabel = performanceOk ? `Intel Core i${tier}, Generation ${generation}` : 'Intel Core unter i5/10. Generation';
  }

  const discreteDecoder = /RTX|GTX\s*(?:9\d{2}|1\d{3}|2\d{3}|3\d{3}|4\d{3}|5\d{3})|Radeon\s+(?:RX|Pro)|Quadro/i.test(`${gpu} ${text}`);
  const explicitDecoder = /(?:H\.?264|AVC).{0,40}(?:H\.?265|HEVC)|(?:H\.?265|HEVC).{0,40}(?:H\.?264|AVC)|hardware[- ]?(?:decoding|decoder|dekodierung)/i.test(text);
  const decodingOk = integratedDecoder || discreteDecoder || explicitDecoder;
  return {
    qualified: performanceOk && decodingOk,
    performanceOk,
    decodingOk,
    evidence: `${cpuLabel}; H.264/H.265: ${decodingOk ? (integratedDecoder ? 'Hardware-Decoding über iGPU' : discreteDecoder ? 'Hardware-Decoding über GPU' : 'laut Anzeige') : 'nicht belegt'}`
  };
}

function assessUpgrades(text, ram, storage) {
  const explicitlyUpgradable = /aufrüst|erweiterbar|RAM[- ]?(?:Slot|Steckplatz)|SO-?DIMM|DIMM|M\.2[- ]?(?:Slot|Steckplatz)|freier?\s+(?:Slot|Steckplatz)|SATA[- ]?(?:Anschluss|Port)/i.test(text);
  const upgrades = [];
  let cost = 0;
  if (ram != null && ram < 32) { upgrades.push(`RAM auf 32 GB: ca. ${ram < 16 ? 70 : 45} €`); cost += ram < 16 ? 70 : 45; }
  if (storage && storage.gb < 1000) { upgrades.push('SSD/NVMe auf 1 TB: ca. 60 €'); cost += 60; }
  if (!storage) { upgrades.push('1-TB-SSD/NVMe: ca. 70 €'); cost += 70; }
  return { explicitlyUpgradable, cost, upgrades };
}

export function assessWindows11(cpuVideo, text, ram, storage) {
  const explicitlyUnsupported = /Windows\s*11.{0,60}(?:nicht\s+(?:offiziell\s+)?unterstützt|unsupported|Bypass|Umgehung)/i.test(text);
  const compatibilityEvidence = /Windows\s*11|Win\s*11|TPM\s*2(?:\.0)?|fTPM|Secure\s*Boot|UEFI/i.test(text);
  const ramOk = ram >= 16;
  const storageOk = Boolean(storage && storage.gb >= 256);
  const officiallySuitable = cpuVideo.performanceOk && !explicitlyUnsupported;
  const parts = [cpuVideo.performanceOk ? 'CPU-Klasse offiziell geeignet' : 'CPU nicht geeignet', ramOk ? `${ram} GB RAM` : 'mindestens 16 GB RAM nötig', storageOk ? `${storage.gb} GB SSD/NVMe` : 'mindestens 256 GB SSD/NVMe nötig'];
  parts.push(explicitlyUnsupported ? 'Windows 11 laut Anzeige nicht offiziell unterstützt' : compatibilityEvidence ? 'Windows 11/TPM/UEFI belegt' : 'TPM 2.0 und UEFI/Secure Boot vor Kauf bestätigen');
  return { officiallySuitable, compatibilityEvidence, smooth: officiallySuitable && ramOk && storageOk, evidence: parts.join('; ') };
}

function cpuMarketData(cpu) {
  const model = cpu.match(/(?:Ryzen\s+[3579]\s*|Core\s+i[3579][ -])(\d{4,5})([A-Z]*)/i);
  if (!model) return { price: 150, releaseYear: 2020, model: 'unbekannt' };
  const key = `${model[1]}${model[2].toUpperCase()}`;
  const numeric = Number(model[1]);
  let releaseYear;
  if (/Ryzen/i.test(cpu)) releaseYear = numeric >= 7000 ? 2022 : numeric >= 5000 ? 2021 : numeric >= 4000 ? 2020 : 2019;
  else {
    const generation = model[1].length === 5 ? Number(model[1].slice(0, 2)) : Number(model[1][0]);
    releaseYear = ({ 10: 2020, 11: 2021, 12: 2022, 13: 2023, 14: 2024 })[generation] ?? 2020;
  }
  return { price: PRICE_CATALOG.cpu[key] ?? 170, releaseYear, model: key };
}

function warrantyMonths(text) {
  const match = text.match(/(\d{1,2})\s*(?:Monate?|Mon\.)\s*(?:Garantie|Gewährleistung)/i);
  if (match) return Number(match[1]);
  if (/2\s*Jahre?\s*(?:Garantie|Gewährleistung)/i.test(text)) return 24;
  if (/(?:Garantie|Gewährleistung)\s*(?:bis|noch)/i.test(text)) return 6;
  return 0;
}

function conditionFactor(condition = '', text = '') {
  const value = `${condition} ${text}`;
  if (/defekt|bastler|ersatzteil/i.test(value)) return 0.25;
  if (/neu|unbenutzt|originalverpackt/i.test(value)) return 0.92;
  if (/wie neu|neuwertig|sehr gut/i.test(value)) return 0.78;
  if (/refurbished|generalüberholt/i.test(value)) return 0.72;
  if (/gut(?:er|es)? zustand|gepflegt/i.test(value)) return 0.65;
  return 0.58;
}

function calculateMarketValue({ cpu, gpu, ram, storage, silent, condition, text }) {
  const cpuData = cpuMarketData(cpu);
  const ramPrice = ram >= 32 ? PRICE_CATALOG.ram32 : PRICE_CATALOG.ram16;
  const storagePrice = storage?.gb >= 1000 ? PRICE_CATALOG.ssd1000 : PRICE_CATALOG.ssd500;
  const gpuPrice = /RTX\s*4/i.test(gpu) ? 450 : /RTX\s*3/i.test(gpu) ? 330 : /RTX|GTX|Radeon\s+RX|Quadro/i.test(gpu) ? 220 : 0;
  const replacementNewPrice = Math.round((PRICE_CATALOG.basePlatform + cpuData.price + ramPrice + storagePrice + gpuPrice + PRICE_CATALOG.assemblyAndOs + (silent.proven ? PRICE_CATALOG.silentPremium : 0)) / 10) * 10;
  const estimatedAge = Math.max(0, new Date().getFullYear() - cpuData.releaseYear);
  const ageFactor = Math.max(0.38, Math.pow(0.88, estimatedAge));
  const months = warrantyMonths(text);
  const warrantyFactor = months >= 24 ? 1.08 : months >= 12 ? 1.05 : months > 0 ? 1.03 : 1;
  const adjustedMarketValue = Math.round(replacementNewPrice * ageFactor * conditionFactor(condition, text) * warrantyFactor / 10) * 10;
  return { replacementNewPrice, adjustedMarketValue, estimatedAge, warrantyMonths: months, priceBasisDate: PRICE_CATALOG.updatedAt, priceSources: PRICE_CATALOG.sources };
}

export function evaluateAd(ad) {
  const text = `${ad.title}\n${ad.description}`;
  const ram = parseRam(text);
  const storage = parseStorage(text);
  const silent = detectSilent(text);
  const displays = detectDisplays(text);
  const price = ad.price ?? parsePrice(text);
  const cpu = extract(text, [/Ryzen\s+(?:[3579]\s*)?\d{4,5}[A-Z]*/i, /Core\s+i[3579][ -]\d{4,5}[A-Z]*/i, /Xeon\s+[A-Z]\d?[- ]\d{4,5}[A-Z]*/i]);
  const gpu = extract(text, [/(?:RTX|GTX)\s*\d{3,4}(?:\s*Ti)?/i, /Radeon\s+(?:RX\s*)?\d{3,4}\s*(?:XT)?/i, /Quadro\s+[A-Z]?\d{3,4}/i, /(?:Intel|AMD)\s+(?:UHD|Iris|Vega)[^,\n]{0,20}/i]);
  const cpuVideo = assessCpuVideo(cpu, gpu, text);
  const windows11 = assessWindows11(cpuVideo, text, ram, storage);
  const upgrade = assessUpgrades(text, ram, storage);
  const maker = text.match(/silentmaxx|cirrus7|ichbinleise|primecomputer/i)?.[0];
  const model = maker ? `${maker} ${ad.title.replace(new RegExp(maker, 'ig'), '').trim()}` : ad.title;
  const market = calculateMarketValue({ cpu, gpu, ram, storage, silent, condition: ad.condition, text });
  const comparisonPrice = market.adjustedMarketValue;
  const savingsBeforeUpgrades = price == null ? null : comparisonPrice - price;
  const savings = savingsBeforeUpgrades == null ? null : savingsBeforeUpgrades - upgrade.cost;
  let score = 0;
  score += silent.points;
  score += ram >= 32 ? 2 : ram >= 16 ? 1 : 0;
  score += storage ? 1 : 0;
  score += displays.suitable ? 2 : 0;
  score += price != null && savings > 0 ? Math.min(2, savings / comparisonPrice * 4) : 0;
  score -= Math.min(1.5, upgrade.cost / 100);
  const openQuestions = [];
  if (ram == null) openQuestions.push('RAM nicht angegeben');
  else if (ram < 16) openQuestions.push(`RAM-Aufrüstung nötig (${ram} GB vorhanden)`);
  if (!storage) openQuestions.push('SSD/NVMe nicht eindeutig angegeben');
  if (!displays.suitable) openQuestions.push('3-Monitor-Anschlüsse bestätigen');
  const distanceVerified = ad.source !== 'Kleinanzeigen' || ad.distanceKm != null;
  if (!distanceVerified) openQuestions.push('Entfernung zu Darmstadt unklar');
  if (!cpuVideo.performanceOk) openQuestions.push('CPU unter Mindestleistung');
  else if (!cpuVideo.decodingOk) openQuestions.push('H.264/H.265-Hardware-Decoding nicht belegt');
  if (windows11.officiallySuitable && !windows11.compatibilityEvidence) openQuestions.push('TPM 2.0 und UEFI/Secure Boot bestätigen');
  if (!windows11.officiallySuitable) openQuestions.push('Windows 11 nicht offiziell unterstützt');

  const baseRequirements = ad.active && silent.proven && price != null && cpuVideo.qualified && windows11.officiallySuitable && distanceVerified;
  const completeHardware = windows11.smooth && windows11.compatibilityEvidence && displays.suitable;
  const upgradeCandidate = upgrade.explicitlyUpgradable && (ram == null || ram >= 8) && (!storage || storage.gb >= 128);
  const storagelessCandidate = !storage && ram >= 16;
  const maximumOpenQuestions = storagelessCandidate ? 3 : 2;

  const classification = baseRequirements && completeHardware
    ? 'A'
    : baseRequirements && (ram >= 16 || upgradeCandidate || storagelessCandidate) && openQuestions.length >= 1 && openQuestions.length <= maximumOpenQuestions
      ? 'B'
      : null;
  const matches = classification === 'A';
  return { ...ad, manufacturerModel: model, cpu, cpuVideoSuitability: cpuVideo.evidence, windows11Suitability: windows11.evidence, gpu, ramGb: ram, storage: storage?.label ?? 'nicht angegeben', upgradeable: upgrade.explicitlyUpgradable, recommendedUpgrades: upgrade.upgrades, upgradeCost: upgrade.cost, silentConcept: silent.concept, displaySuitability: displays.evidence, replacementNewPrice: market.replacementNewPrice, comparisonPrice, estimatedAge: market.estimatedAge, warrantyMonths: market.warrantyMonths, priceBasisDate: market.priceBasisDate, priceSources: market.priceSources, savingsBeforeUpgrades, savings, score: Math.max(0, Math.round(score * 10) / 10), classification, openQuestions, matches, priceLabel: price == null ? 'nicht angegeben' : euro.format(price) };
}

export function canonicalId(url) {
  return url.match(/\/([0-9]+-[0-9]+-[0-9]+)(?:\?|$)/)?.[1]
    ?? url.match(/ebay\.[^/]+\/itm\/(?:[^/]+\/)?(\d{9,15})/i)?.[1]
    ?? url.replace(/[?#].*$/, '');
}
