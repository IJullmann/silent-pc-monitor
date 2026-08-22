import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { canonicalId, evaluateAd, parsePrice } from './lib/evaluate.mjs';

const SEARCH_TERMS = [
  'silentmaxx', 'silent maxx', 'fanless pc', 'lüfterloser pc', 'passiv silent pc',
  'leiser pc', 'geräuscharmer pc', 'silent office pc', 'silent workstation',
  'low noise pc', 'geräuschloser pc', 'passiv gekühlter pc', '0 dB pc',
  'Noctua PC', 'Fractal Design Silent PC', 'be quiet Silent Base PC',
  'Streacom', 'HDPLEX', 'Akasa fanless', 'cirrus7', 'cirrus7 nimbini',
  'ichbinleise', 'primecomputer'
];
const REFURBISHED_TERMS = ['silentmaxx', 'silent maxx', 'fanless', 'silent workstation', 'Streacom', 'HDPLEX', 'Akasa fanless', 'cirrus7 nimbini'];
const kleinanzeigenSlug = term => term.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const SOURCES = [
  {
    name: 'Kleinanzeigen', type: 'local',
    searches: SEARCH_TERMS.map(term => `https://www.kleinanzeigen.de/s-pcs/${kleinanzeigenSlug(term)}/k0c228`),
    linkSelector: 'a[href*="/s-anzeige/"]'
  },
  {
    name: 'eBay', type: 'shipping',
    searches: SEARCH_TERMS
      .map(term => `https://www.ebay.de/sch/i.html?_nkw=${encodeURIComponent(term)}&_sacat=179&_ipg=60&LH_ItemCondition=3000`),
    linkSelector: 'a[href*="/itm/"]'
  },
  {
    name: 'AfB Shop (refurbished)', type: 'shipping',
    searches: REFURBISHED_TERMS.map(term => `https://www.afbshop.de/search?sSearch=${encodeURIComponent(term)}`),
    linkSelector: 'a[href]'
  },
  {
    name: 'ITSCO (refurbished)', type: 'shipping',
    searches: REFURBISHED_TERMS.map(term => `https://www.itsco.de/search?sSearch=${encodeURIComponent(term)}`),
    linkSelector: 'a[href]'
  },
  {
    name: 'ESM Computer (refurbished)', type: 'shipping',
    searches: REFURBISHED_TERMS.map(term => `https://www.esm-computer.de/search?sSearch=${encodeURIComponent(term)}`),
    linkSelector: 'a[href]'
  },
  {
    name: 'LapStore (refurbished)', type: 'shipping',
    searches: REFURBISHED_TERMS.map(term => `https://www.lapstore.de/f.php/shop/lapstore/f/1493/lang/de/kw/${kleinanzeigenSlug(term)}/`),
    linkSelector: 'a[href]'
  }
];
const SEEN_PATH = 'data/seen.json';
const RESULTS_PATH = 'data/latest.json';
const DARMSTADT = { lat: 49.8728, lon: 8.6512 };

async function readJson(path, fallback) { try { return JSON.parse(await fs.readFile(path, 'utf8')); } catch { return fallback; } }
async function writeJson(path, value) { await fs.mkdir('data', { recursive: true }); await fs.writeFile(path, JSON.stringify(value, null, 2) + '\n'); }
const rad = degrees => degrees * Math.PI / 180;
function distanceKm(a, b) { const dLat = rad(b.lat-a.lat), dLon = rad(b.lon-a.lon); const h = Math.sin(dLat/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2; return Math.round(6371*2*Math.asin(Math.sqrt(h))); }

async function geocode(location) {
  if (!location) return null;
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=de&q=${encodeURIComponent(location)}`, { headers: { 'User-Agent': 'silent-pc-monitor/1.0 (GitHub Actions)' } });
  if (!response.ok) return null;
  const row = (await response.json())[0];
  return row ? { lat: Number(row.lat), lon: Number(row.lon) } : null;
}

const KEYWORDS = /silent\s*maxx|silentmaxx|silent\s*(?:pc|office|workstation)|fanless|lüfterlos|lautlos|passiv|geräuscharm|geräuschlos|low[- ]noise|leiser?\s+pc|0\s*dB|noctua|fractal\s+design|silent\s+base|streacom|hdplex|akasa|cirrus7|nimbini|ichbinleise|primecomputer/i;

async function collectLinks(browser) {
  const links = new Map();
  const stats = [];
  for (const source of SOURCES) {
    const sourceLinks = new Map();
    let successfulSearches = 0;
    for (const search of source.searches) {
      const page = await browser.newPage({ locale: 'de-DE', userAgent: 'Mozilla/5.0 silent-pc-monitor/1.0' });
      try {
        await page.goto(search, { waitUntil: 'domcontentloaded', timeout: 45000 });
        const found = await page.locator(source.linkSelector).evaluateAll(nodes => nodes.map(node => ({ url: node.href, text: node.textContent ?? '' })));
        for (const row of found) {
          if (!row.url || (source.name.includes('refurbished') && !KEYWORDS.test(`${row.text} ${row.url}`))) continue;
          const clean = source.name === 'eBay' ? row.url.match(/^https:\/\/www\.ebay\.de\/itm\/(?:[^/?]+\/)?\d+/i)?.[0] : row.url.replace(/[?#].*$/, '');
          if (clean) sourceLinks.set(clean, source);
        }
        successfulSearches++;
      } catch (error) { console.warn(`${source.name} Suche fehlgeschlagen: ${error.message}`); }
      finally { await page.close().catch(() => {}); }
    }
    for (const [url, sourceInfo] of [...sourceLinks].slice(0, 50)) links.set(url, sourceInfo);
    stats.push({ source: source.name, successfulSearches, candidates: sourceLinks.size });
  }
  console.log('Quellenstatus', JSON.stringify(stats));
  return [...links].map(([url, source]) => ({ url, source }));
}

async function inspectAd(page, url, source) {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  if (!response || response.status() >= 400) return null;
  const body = await page.locator('body').innerText();
  const unavailable = /anzeige ist nicht mehr verfügbar|gelöscht|reserviert|verkauft|dieses angebot wurde beendet|momentan ausverkauft|nicht auf lager|derzeit nicht verfügbar/i.test(body);
  const title = await page.locator('h1').first().innerText().catch(() => 'Unbekanntes System');
  const description = await page.locator('[id*="description"], [class*="description"]').first().innerText().catch(() => body.slice(0, 8000));
  const localLocation = body.match(/(?:^|\n)(\d{5}\s+[^\n]{2,45})(?:\n|$)/m)?.[1];
  const ebayLocation = body.match(/Standort:\s*([^\n]+)/i)?.[1];
  const location = source.type === 'shipping' ? (ebayLocation ?? 'Online-Händler · Versand') : (localLocation ?? 'nicht angegeben');
  const coords = source.type === 'local' ? await geocode(location) : null;
  const distance = coords ? distanceKm(DARMSTADT, coords) : null;
  const sellerRating = body.match(/(?:\d{1,3}(?:[,.]\d)?%\s+positive Bewertungen|TOP Zufriedenheit|OK Zufriedenheit|Nutzer ist besonders zuverlässig|Zufriedenheit[^\n]*)/i)?.[0] ?? 'nicht verfügbar';
  const condition = body.match(/(?:Artikelzustand|Zustand)\s*:?\s*\n?([^\n]+)/i)?.[1] ?? (/refurbished|generalüberholt/i.test(body) ? 'refurbished' : 'gebraucht');
  return { id: `${source.name}:${canonicalId(url)}`, source: source.name, url, title, description, location, distanceKm: distance, active: !unavailable, price: parsePrice(body), condition, sellerRating };
}

function notificationBody(item) {
  const saving = item.savings == null ? 'nicht berechenbar' : `${item.savings} €`;
  return [`Klasse ${item.classification}: ${item.manufacturerModel}`, `${item.location} · ${item.distanceKm ?? 'Versand/unklar'} km`, `CPU: ${item.cpu}`, `GPU: ${item.gpu}`, `RAM: ${item.ramGb ?? 'nicht angegeben'} GB · Speicher: ${item.storage}`, `Silent: ${item.silentConcept}`, `3 Monitore: ${item.displaySuitability}`, `Zustand: ${item.condition}`, `Preis: ${item.priceLabel} · Vergleich neu: ca. ${item.comparisonPrice} €`, `Ersparnis: ${saving} · Verkäufer: ${item.sellerRating}`, `Score: ${item.score}/10`, item.url].join('\n');
}

async function notify(item) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) throw new Error('NTFY_TOPIC fehlt');
  const response = await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, { method: 'POST', headers: { Title: 'Neuer passender Silent-PC', Priority: 'high', Tags: 'computer,mag' , Click: item.url }, body: notificationBody(item) });
  if (!response.ok) throw new Error(`ntfy fehlgeschlagen: ${response.status}`);
}

async function notifyBSummary(items) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic || items.length === 0) return;
  const rows = items.slice(0, 8).map((item, index) => `${index + 1}. ${item.manufacturerModel} · ${item.priceLabel}\nOffen: ${item.openQuestions.join(', ')}\n${item.url}`);
  const suffix = items.length > 8 ? `\n\n+ ${items.length - 8} weitere B-Treffer in data/latest.json` : '';
  const response = await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, { method: 'POST', headers: { Title: `${items.length} neue B-Treffer: Angaben prüfen`, Priority: 'default', Tags: 'computer,warning', Click: items[0].url }, body: `${rows.join('\n\n')}${suffix}` });
  if (!response.ok) throw new Error(`ntfy B-Zusammenfassung fehlgeschlagen: ${response.status}`);
}

const browser = await chromium.launch({ headless: true });
try {
  const seen = new Set(await readJson(SEEN_PATH, []));
  const links = await collectLinks(browser);
  const page = await browser.newPage({ locale: 'de-DE', userAgent: 'Mozilla/5.0 silent-pc-monitor/1.0' });
  const evaluated = [];
  const newAItems = [];
  const newBItems = [];
  for (const { url, source } of links.slice(0, 140)) {
    const ad = await inspectAd(page, url, source).catch(error => { console.warn(`${url}: ${error.message}`); return null; });
    if (!ad || (ad.distanceKm != null && ad.distanceKm > 250)) continue;
    const item = evaluateAd(ad);
    evaluated.push(item);
    const seenKey = item.classification ? `${item.classification}:${item.id}` : null;
    if (item.classification === 'A' && !seen.has(seenKey)) {
      newAItems.push(item);
      if (process.env.DRY_RUN !== '1') { await notify(item); seen.add(seenKey); }
    }
    if (item.classification === 'B' && !seen.has(seenKey)) newBItems.push(item);
  }
  if (process.env.DRY_RUN !== '1' && newBItems.length) {
    await notifyBSummary(newBItems);
    newBItems.forEach(item => seen.add(`B:${item.id}`));
  }
  await writeJson(RESULTS_PATH, { checkedAt: new Date().toISOString(), sources: SOURCES.map(({ name, searches }) => ({ name, searches })), results: evaluated });
  await writeJson(SEEN_PATH, [...seen].slice(-2000));
  console.log(JSON.stringify({ checked: links.length, aMatches: evaluated.filter(x => x.classification === 'A').length, bMatches: evaluated.filter(x => x.classification === 'B').length, newA: newAItems.length, newB: newBItems.length }, null, 2));
} finally { await browser.close(); }
