export function markSeenAfterNotification(seen, key, { dryRun, notified }) {
  if (!dryRun && notified && key) seen.add(key);
  return seen;
}
