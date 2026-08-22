import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { canonicalId, evaluateAd, parsePrice } from './lib/evaluate.mjs';

const SEARCHES = [
  'https://www.kleinanzeigen.de/s-pcs/silentmaxx/k0c228',
  'https://www.kleinanzeigen.de/s-pcs/fanless-pc/k0c228',
  'https://www.kleinanzeigen.de/s-pcs/luefterlos/k0c228',
  'https://www.kleinanzeigen.de/s-pcs/passiv-silent-pc/k0c228'
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

async function collectLinks(page) {
  const links = new Set();
  for (const search of SEARCHES) {
    await page.goto(search, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const found = await page.locator('a[href*="/s-anzeige/"]').evaluateAll(nodes => nodes.map(node => node.href));
    found.forEach(url => links.add(url.replace(/[?#].*$/, '')));
  }
  return [...links];
}

async function inspectAd(page, url) {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  if (!response || response.status() >= 400) return null;
  const body = await page.locator('body').innerText();
  const unavailable = /anzeige ist nicht mehr verfügbar|gelöscht|reserviert|verkauft/i.test(body);
  const title = await page.locator('h1').first().innerText().catch(() => 'Unbekanntes System');
  const description = await page.locator('[id*="description"], [class*="description"]').first().innerText().catch(() => body.slice(0, 8000));
  const location = body.match(/(?:^|\n)(\d{5}\s+[^\n]{2,45})(?:\n|$)/m)?.[1] ?? 'nicht angegeben';
  const coords = await geocode(location);
  const distance = coords ? distanceKm(DARMSTADT, coords) : null;
  const sellerRating = body.match(/(?:TOP Zufriedenheit|OK Zufriedenheit|Nutzer ist besonders zuverlässig|Zufriedenheit[^\n]*)/i)?.[0] ?? 'nicht verfügbar';
  return { id: canonicalId(url), url, title, description, location, distanceKm: distance, active: !unavailable, price: parsePrice(body), condition: body.match(/Zustand\n([^\n]+)/i)?.[1] ?? 'gebraucht', sellerRating };
}

function notificationBody(item) {
  const saving = item.savings == null ? 'nicht berechenbar' : `${item.savings} €`;
  return [`${item.manufacturerModel}`, `${item.location} · ${item.distanceKm ?? '?'} km`, `CPU: ${item.cpu}`, `GPU: ${item.gpu}`, `RAM: ${item.ramGb} GB · Speicher: ${item.storage}`, `Silent: ${item.silentConcept}`, `3 Monitore: ${item.displaySuitability}`, `Zustand: ${item.condition}`, `Preis: ${item.priceLabel} · Vergleich neu: ca. ${item.comparisonPrice} €`, `Ersparnis: ${saving} · Verkäufer: ${item.sellerRating}`, `Score: ${item.score}/10`, item.url].join('\n');
}

async function notify(item) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) throw new Error('NTFY_TOPIC fehlt');
  const response = await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, { method: 'POST', headers: { Title: 'Neuer passender Silent-PC', Priority: 'high', Tags: 'computer,mag' , Click: item.url }, body: notificationBody(item) });
  if (!response.ok) throw new Error(`ntfy fehlgeschlagen: ${response.status}`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ locale: 'de-DE', userAgent: 'Mozilla/5.0 silent-pc-monitor/1.0' });
try {
  const seen = new Set(await readJson(SEEN_PATH, []));
  const links = await collectLinks(page);
  const evaluated = [];
  const newItems = [];
  for (const url of links.slice(0, 60)) {
    const ad = await inspectAd(page, url).catch(error => { console.warn(`${url}: ${error.message}`); return null; });
    if (!ad || (ad.distanceKm != null && ad.distanceKm > 250)) continue;
    const item = evaluateAd(ad);
    evaluated.push(item);
    if (item.matches && !seen.has(item.id)) {
      newItems.push(item);
      if (process.env.DRY_RUN !== '1') await notify(item);
    }
    if (item.matches) seen.add(item.id);
  }
  await writeJson(RESULTS_PATH, { checkedAt: new Date().toISOString(), searches: SEARCHES, results: evaluated });
  await writeJson(SEEN_PATH, [...seen].slice(-2000));
  console.log(JSON.stringify({ checked: links.length, matching: evaluated.filter(x => x.matches).length, newMatching: newItems.length }, null, 2));
} finally { await browser.close(); }
