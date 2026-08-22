import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalId, evaluateAd, parsePrice } from '../lib/evaluate.mjs';

test('parses German offer prices', () => assert.equal(parsePrice('Preis 1.250 € VB'), 1250));
test('uses stable Kleinanzeigen id', () => assert.equal(canonicalId('https://www.kleinanzeigen.de/s-anzeige/a/123-456-789?x=1'), '123-456-789'));
test('accepts a complete, active Silent-PC', () => {
  const item = evaluateAd({ active: true, title: 'Silentmaxx 0dB PC', description: 'Ryzen 7 5700G, 32 GB DDR4 RAM, 1 TB NVMe, 3 Monitore, komplett passiv', price: 525, url: 'x' });
  assert.equal(item.matches, true);
  assert.equal(item.ramGb, 32);
  assert.ok(item.savings > 0);
});
test('rejects missing three-display evidence', () => {
  const item = evaluateAd({ active: true, title: 'Silent PC', description: '16 GB RAM, 500 GB SSD, lüfterlos', price: 300, url: 'x' });
  assert.equal(item.matches, false);
});
