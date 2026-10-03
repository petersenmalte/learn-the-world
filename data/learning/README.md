# Lernbereich – Datenprüfung und Umsetzungsplan

Prüfdatum: 2026-10-03. Die bestehende Anwendung nutzt Vite/TypeScript und MapLibre GL JS 6.11.2, eine einzelne Atlas-Seite und lokal gespeicherte Natural-Earth-/GeoNames-Daten. Der Atlas umfasst 242 Karteneinheiten und 241 PPLC-Datensätze, keine vollständige Staaten-/Hauptstadtliste. Deshalb erhält das Spiel einen eigenen geprüften Datenbestand.

## Arbeitsumfang

- Hash-Navigation (für statisches GitHub Pages), Auswahlmenü oben links, Spielübersicht und vier Varianten je Welt/Kontinent.
- Weißer Kartenhintergrund ohne Satellitenbilder; vorhandenes MapLibre wiederverwenden.
- Getrennte Spiellogik mit Zweiklickbestätigung, Zufallsreihenfolge, dauerhaftem Feedback bis „Weiter“, Ton/Stummschaltung und Eliminierung.
- Länderpolygone aus einem versionierten Natural-Earth-Datensatz; keine selbst gezeichneten Grenzen. Zusätzliche Auswahlpunkte sichern die Erreichbarkeit kleiner Inseln und Kleinstaaten.
- Explizite Staatenliste, Hauptstadtabgleich, Quellen/Stand/Abweichungen und automatisierte Integritäts- sowie Spieltests; anschließend Browserprüfung.

## Bereits verifizierte Referenzen

- [EU, Interinstitutionelle Regeln, Anhang A5 (de)](https://style-guide.europa.eu/o/opportal-service/isg?resource=de/annex-a5-list-countries-territories-currencies.html), abgerufen 2026-10-03. Äquatorialguinea: Ciudad de la Paz; Indonesien: Jakarta. Der Anhang ist ausdrücklich keine völkerrechtliche Anerkennungsliste.
- [EU, Anhang A5 (en)](https://style-guide.europa.eu/o/opportal-service/isg?resource=en/annex-a5-list-countries-territories-currencies.html), Änderungsvermerk 11.03.2026 für Ciudad de la Paz.
- [EEAS: EU und Kosovo](https://www.eeas.europa.eu/kosovo/eu-and-kosovo_en): statusneutrale Bezeichnung unter Verweis auf UNSCR 1244/1999 und IGH-Gutachten.
- [EU-Rat, 15.06.2026](https://www.consilium.europa.eu/en/press/press-releases/2026/06/15/russia-s-war-of-aggression-against-ukraine-new-eu-sanctions-target-energy-revenues-the-military-industrial-complex-propaganda-and-human-rights-violations/): Nichtanerkennung der Annexion der Krim, territoriale Integrität der Ukraine.
- [EEAS: EU und Taiwan](https://www.eeas.europa.eu/delegations/taiwan/european-union-and-taiwan_en?s=242): Ein-China-Politik und gesonderte Beziehungen zu Taiwan.

Die endgültige Datendokumentation folgt mit dem geprüften Datensatz. Eine historische Natural-Earth-Darstellungsvariante wird nicht als aktuelle, amtliche EU-Grenzkarte bezeichnet.
