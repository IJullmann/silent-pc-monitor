# Silent-PC-Monitor Darmstadt

Sucht täglich nach aktiven gebrauchten Silent-/Fanless-PCs im Umkreis von 250 km um Darmstadt. Silentmaxx wird ausdrücklich berücksichtigt. Treffer werden nur akzeptiert, wenn mindestens 16 GB RAM, SSD/NVMe, ein nachgewiesenes Silent-Konzept und belastbare Hinweise auf drei gleichzeitige Monitore vorhanden sind.

Jeder Treffer enthält Hersteller/Modell, Ort und Entfernung, CPU, GPU, RAM, Speicher, Silent-Konzept, 3-Monitor-Eignung, Zustand, Angebotspreis, einen heuristisch kalkulierten heutigen Vergleichs-Neupreis, Ersparnis, Verkäuferbewertung, Score und Anzeigenlink. Unsichere Angaben werden nicht erfunden, sondern als nicht verfügbar markiert.

## ntfy einrichten

Unter **Settings → Secrets and variables → Actions → New repository secret** ein Secret namens `NTFY_TOPIC` anlegen. Als Wert exakt das bereits in der ntfy-App abonnierte Topic eintragen. Das Secret wird weder protokolliert noch im Code gespeichert.

## Ausführung

- Automatisch täglich um 06:17 UTC (in Deutschland 07:17/08:17 Uhr, je nach Sommerzeit).
- Manuell unter **Actions → Silent-PC-Monitor → Run workflow**.
- Beim ersten manuellen Lauf ist `dry_run` standardmäßig aktiv. Für einen echten ntfy-Test den Haken entfernen.

Bereits gemeldete Anzeigen-IDs stehen in `data/seen.json`; dadurch entstehen keine täglichen Duplikate. `data/latest.json` dokumentiert den letzten Lauf. Die Entfernung wird über OpenStreetMap Nominatim berechnet. Der Vergleichs-Neupreis ist ausdrücklich eine reproduzierbare Schätzung aus CPU-Klasse, RAM, Speicher, GPU und Silent-Aufpreis, kein Händlerangebot.

## Lokal

```sh
npm ci
npx playwright install chromium
npm test
DRY_RUN=1 npm run monitor
```

Hinweis: Marktplätze können ihr HTML oder ihre Schutzmaßnahmen ändern. Der Workflow schlägt dann sichtbar fehl, statt nicht verifizierte oder inaktive Anzeigen zu melden.
