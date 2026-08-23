import test from 'node:test';
import assert from 'node:assert/strict';
import { markSeenAfterNotification } from '../lib/seen.mjs';

test('dry runs never mark an offer as seen', () => {
  const seen = new Set();
  markSeenAfterNotification(seen, 'A:offer-1', { dryRun: true, notified: true });
  assert.equal(seen.size, 0);
});

test('failed notifications never mark an offer as seen', () => {
  const seen = new Set();
  markSeenAfterNotification(seen, 'A:offer-1', { dryRun: false, notified: false });
  assert.equal(seen.size, 0);
});

test('only a real successful notification marks an offer as seen', () => {
  const seen = new Set();
  markSeenAfterNotification(seen, 'A:offer-1', { dryRun: false, notified: true });
  assert.deepEqual([...seen], ['A:offer-1']);
});
