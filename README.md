# Silent-PC-Monitor Darmstadt

Sucht täglich auf Kleinanzeigen und eBay sowie bei den Refurbished-Händlern AfB Shop, ITSCO, ESM Computer und LapStore nach aktiven gebrauchten Silent-/Fanless-PCs und nachweislich leisen Komplettsystemen. Lokale Angebote werden im Umkreis von 250 km um Darmstadt berücksichtigt; bei überregionalen Händlern und eBay wird deutschlandweiter Versand akzeptiert. Silentmaxx wird bevorzugt; außerdem werden Systeme anderer Hersteller wie cirrus7, ichbinleise und PrimeComputer sowie herstellerunabhängig belegte leise PCs berücksichtigt. Die bloße Nennung einer leisen Einzelkomponente reicht nicht aus.

Für Videobearbeitung gilt Ryzen 5 3600/5600G oder besser beziehungsweise Intel Core i5 der 10. Generation oder neuer als Mindestleistung. Zusätzlich muss H.264/H.265-Hardware-Decoding über iGPU, Grafikkarte oder eine ausdrückliche Angabe belegt sein. Sehr alte, nur wegen geringer Leistung lautlose Mini-PCs werden dadurch ausgeschlossen. 16 GB RAM und eine kleinere SSD bleiben zulässig; der Monitor kalkuliert empfohlene Kosten für 32 GB RAM und 1 TB SSD und zieht sie von Ersparnis und Score ab. Angebote unter 16 GB oder ohne klaren SSD-Nachweis können nur als B-Treffer erscheinen, wenn die Aufrüstbarkeit ausdrücklich belegt ist.

Die Suche berücksichtigt außerdem Begriffe und Marken wie `silent office pc`, `silent workstation`, `low noise pc`, `geräuschloser pc`, `passiv gekühlter pc`, `0 dB pc`, Noctua, Fractal Design Silent PC, be quiet Silent Base, Streacom, HDPLEX, Akasa fanless, cirrus7 nimbini sowie die häufige Schreibvariante `silent maxx`. Marken- oder Komponentennamen allein gelten nur als Suchsignal; für eine A- oder B-Einstufung muss die Anzeige weiterhin ein tatsächlich leises Gesamtsystem belegen.

Jeder Treffer enthält Hersteller/Modell, Ort und Entfernung, CPU samt Video-Decoding-Bewertung, GPU, RAM, Speicher, Aufrüstungsvorschläge und -kosten, Silent-Konzept, 3-Monitor-Eignung, Zustand, Angebotspreis, heutigen Ersatz-Neupreis, alters-/zustands-/garantiebereinigten Vergleichswert, Ersparnis nach Aufrüstung, Verkäuferbewertung, Score und Anzeigenlink. Die Preisbasis ist datiert und beruht auf konkreten Marktankern für Komplettsysteme und Komponenten. Unsichere Angaben werden nicht erfunden, sondern als nicht verfügbar markiert.

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

Nur Anzeigen, deren ntfy-Benachrichtigung tatsächlich erfolgreich versendet wurde, kommen in `data/seen.json`; Trockenläufe und fehlgeschlagene Pushes verändern den Duplikatspeicher nicht. `data/latest.json` dokumentiert den letzten Lauf. Die Entfernung wird über OpenStreetMap Nominatim berechnet. Die Preisberechnung bleibt eine reproduzierbare Schätzung aus datierten Marktpreisen, Ausstattung, geschätztem Plattformalter, Zustand und ausgewiesener Garantie, kein verbindliches Händlerangebot.

## Lokal

```sh
npm ci
npx playwright install chromium
npm test
DRY_RUN=1 npm run monitor
```

Hinweis: Marktplätze können ihr HTML oder ihre Schutzmaßnahmen ändern. Der Workflow schlägt dann sichtbar fehl, statt nicht verifizierte oder inaktive Anzeigen zu melden.
