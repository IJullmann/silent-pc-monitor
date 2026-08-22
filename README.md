# Silent-PC-Monitor Darmstadt

Sucht täglich auf Kleinanzeigen und eBay sowie bei den Refurbished-Händlern AfB Shop, ITSCO, ESM Computer und LapStore nach aktiven gebrauchten Silent-/Fanless-PCs und nachweislich leisen Komplettsystemen. Lokale Angebote werden im Umkreis von 250 km um Darmstadt berücksichtigt; bei überregionalen Händlern und eBay wird deutschlandweiter Versand akzeptiert. Silentmaxx wird bevorzugt; außerdem werden Systeme anderer Hersteller wie cirrus7, ichbinleise und PrimeComputer sowie herstellerunabhängig belegte leise PCs berücksichtigt. Treffer werden nur akzeptiert, wenn mindestens 16 GB RAM, SSD/NVMe, ein nachgewiesenes Silent-/Leise-Konzept und belastbare Hinweise auf drei gleichzeitige Monitore vorhanden sind. Die bloße Nennung einer leisen Einzelkomponente reicht nicht aus.

Die Suche berücksichtigt außerdem Begriffe und Marken wie `silent office pc`, `silent workstation`, `low noise pc`, `geräuschloser pc`, `passiv gekühlter pc`, `0 dB pc`, Noctua, Fractal Design Silent PC, be quiet Silent Base, Streacom, HDPLEX, Akasa fanless, cirrus7 nimbini sowie die häufige Schreibvariante `silent maxx`. Marken- oder Komponentennamen allein gelten nur als Suchsignal; für eine A- oder B-Einstufung muss die Anzeige weiterhin ein tatsächlich leises Gesamtsystem belegen.

Jeder Treffer enthält Hersteller/Modell, Ort und Entfernung, CPU, GPU, RAM, Speicher, Silent-Konzept, 3-Monitor-Eignung, Zustand, Angebotspreis, einen heuristisch kalkulierten heutigen Vergleichs-Neupreis, Ersparnis, Verkäuferbewertung, Score und Anzeigenlink. Unsichere Angaben werden nicht erfunden, sondern als nicht verfügbar markiert.

## Trefferklassen

- **A-Treffer:** alle Pflichtangaben sind zweifelsfrei erfüllt. Jeder neue A-Treffer löst sofort einen ausführlichen ntfy-Push aus.
- **B-Treffer:** aktives, nachweislich leises und bepreistes Angebot mit erkannter CPU, bei dem höchstens zwei Angaben offen sind (etwa Monitoranschlüsse, SSD oder RAM-Aufrüstung). Neue B-Treffer werden in einer gemeinsamen ntfy-Zusammenfassung mit Warnhinweisen gemeldet.

A- und B-Treffer haben getrennten Duplikatschutz. Wird eine Anzeige später von B zu A aufgewertet, erfolgt deshalb noch eine A-Benachrichtigung.

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
