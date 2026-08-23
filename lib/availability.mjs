export function isUnavailable(text = '', sourceName = '') {
  if (sourceName === 'Kleinanzeigen') {
    return /(?:diese|die)\s+anzeige\s+ist\s+nicht\s+mehr\s+verfügbar|anzeige\s+(?:wurde|ist)\s+(?:vom anbieter\s+)?gelöscht|angebot\s+ist\s+reserviert/i.test(text);
  }
  if (sourceName === 'eBay') {
    return /dieses\s+angebot\s+wurde\s+beendet|artikel\s+ist\s+nicht\s+mehr\s+verfügbar|angebot\s+beendet/i.test(text);
  }
  return /momentan\s+ausverkauft|nicht\s+auf\s+lager|derzeit\s+nicht\s+verfügbar/i.test(text);
}
