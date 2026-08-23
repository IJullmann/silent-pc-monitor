import test from 'node:test';
import assert from 'node:assert/strict';
import { isUnavailable } from '../lib/availability.mjs';

test('does not reject an active Kleinanzeigen page for incidental sold wording', () => {
  assert.equal(isUnavailable('Verkaufe meinen PC. Andere Artikel wurden bereits verkauft.', 'Kleinanzeigen'), false);
});

test('recognizes an explicit unavailable Kleinanzeigen status', () => {
  assert.equal(isUnavailable('Diese Anzeige ist nicht mehr verfügbar.', 'Kleinanzeigen'), true);
});
