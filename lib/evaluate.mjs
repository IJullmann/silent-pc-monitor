const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

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
  if (/silentmaxx|silentmaxx/i.test(text)) return { proven: true, concept: 'Silentmaxx-System' };
  if (/komplett\s*passiv|vollpassiv|fanless|lüfterlos|ohne\s*lüfter/i.test(text)) return { proven: true, concept: 'passiv/lüfterlos' };
  if (/semi[- ]?passiv|0\s*dB|silent\s*(?:pc|system|gehäuse)/i.test(text)) return { proven: true, concept: 'nachweisliches Silent-Konzept' };
  return { proven: false, concept: 'nicht nachgewiesen' };
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

export function evaluateAd(ad) {
  const text = `${ad.title}\n${ad.description}`;
  const ram = parseRam(text);
  const storage = parseStorage(text);
  const silent = detectSilent(text);
  const displays = detectDisplays(text);
  const price = ad.price ?? parsePrice(text);
  const cpu = extract(text, [/Ryzen\s+(?:[3579]\s*)?\d{4,5}[A-Z]*/i, /Core\s+i[3579][ -]\d{4,5}[A-Z]*/i, /Xeon\s+[A-Z]\d?[- ]\d{4,5}[A-Z]*/i]);
  const gpu = extract(text, [/(?:RTX|GTX)\s*\d{3,4}(?:\s*Ti)?/i, /Radeon\s+(?:RX\s*)?\d{3,4}\s*(?:XT)?/i, /Quadro\s+[A-Z]?\d{3,4}/i, /(?:Intel|AMD)\s+(?:UHD|Iris|Vega)[^,\n]{0,20}/i]);
  const model = /silentmaxx/i.test(text) ? `Silentmaxx ${ad.title.replace(/silentmaxx/ig, '').trim()}` : ad.title;
  const base = cpu.includes('Ryzen 9') || cpu.includes('i9') ? 900 : cpu.includes('Ryzen 7') || cpu.includes('i7') ? 750 : 600;
  const comparisonPrice = Math.round((base + (ram >= 32 ? 120 : 60) + (storage?.gb >= 1000 ? 100 : 50) + (gpu !== 'nicht angegeben' ? 220 : 0) + (silent.proven ? 180 : 0)) / 10) * 10;
  const savings = price == null ? null : comparisonPrice - price;
  let score = 0;
  score += silent.proven ? 3 : 0;
  score += ram >= 32 ? 2 : ram >= 16 ? 1 : 0;
  score += storage ? 1 : 0;
  score += displays.suitable ? 2 : 0;
  score += price != null && savings > 0 ? Math.min(2, savings / comparisonPrice * 4) : 0;
  const matches = ad.active && silent.proven && ram >= 16 && Boolean(storage) && displays.suitable && price != null;
  return { ...ad, manufacturerModel: model, cpu, gpu, ramGb: ram, storage: storage?.label ?? 'nicht angegeben', silentConcept: silent.concept, displaySuitability: displays.evidence, comparisonPrice, savings, score: Math.round(score * 10) / 10, matches, priceLabel: price == null ? 'nicht angegeben' : euro.format(price) };
}

export function canonicalId(url) {
  return url.match(/\/([0-9]+-[0-9]+-[0-9]+)(?:\?|$)/)?.[1] ?? url.replace(/[?#].*$/, '');
}
