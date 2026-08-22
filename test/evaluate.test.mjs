import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalId, evaluateAd, parsePrice } from '../lib/evaluate.mjs';

test('parses German offer prices', () => assert.equal(parsePrice('Preis 1.250 € VB'), 1250));
test('uses stable Kleinanzeigen id', () => assert.equal(canonicalId('https://www.kleinanzeigen.de/s-anzeige/a/123-456-789?x=1'), '123-456-789'));
test('uses stable eBay id', () => assert.equal(canonicalId('https://www.ebay.de/itm/Silent-PC/188047936595?x=1'), '188047936595'));
test('accepts a complete, active Silent-PC', () => {
  const item = evaluateAd({ active: true, title: 'Silentmaxx 0dB PC', description: 'Ryzen 7 5700G, 32 GB DDR4 RAM, 1 TB NVMe, 3 Monitore, komplett passiv', price: 525, url: 'x' });
  assert.equal(item.matches, true);
  assert.equal(item.classification, 'A');
  assert.equal(item.ramGb, 32);
  assert.ok(item.savings > 0);
});
test('rejects missing three-display evidence', () => {
  const item = evaluateAd({ active: true, title: 'Silent PC', description: '16 GB RAM, 500 GB SSD, lüfterlos', price: 300, url: 'x' });
  assert.equal(item.matches, false);
  assert.equal(item.classification, null);
});
test('classifies a promising offer with two open facts as B', () => {
  const item = evaluateAd({ active: true, source: 'eBay', title: 'Silentmaxx PC Ryzen 7 5700G', description: '16 GB DDR4 RAM, sehr leiser PC', price: 450, url: 'x' });
  assert.equal(item.classification, 'B');
  assert.deepEqual(item.openQuestions, ['SSD/NVMe nicht eindeutig angegeben', '3-Monitor-Anschlüsse bestätigen']);
});
test('rejects an under-specified offer with more than two open facts', () => {
  const item = evaluateAd({ active: true, source: 'Kleinanzeigen', title: 'Leiser PC Ryzen 5 5600G', description: 'Besonders leiser PC', price: 250, url: 'x' });
  assert.equal(item.classification, null);
});
test('accepts a demonstrably quiet non-Silentmaxx system', () => {
  const item = evaluateAd({ active: true, title: 'Office PC', description: 'Besonders leiser PC, Ryzen 5 5600G, 16 GB DDR4 RAM, 500 GB SSD, 3 Monitore', price: 390, url: 'x' });
  assert.equal(item.matches, true);
  assert.equal(item.silentConcept, 'nachweislich leises System');
});
test('prefers Silentmaxx in scoring', () => {
  const base = { active: true, description: 'Ryzen 5 5600G, 16 GB DDR4 RAM, 500 GB SSD, 3 Monitore', price: 390, url: 'x' };
  const preferred = evaluateAd({ ...base, title: 'Silentmaxx PC' });
  const alternative = evaluateAd({ ...base, title: 'Sehr leiser PC' });
  assert.ok(preferred.score > alternative.score);
});
