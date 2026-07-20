# Changelog

Alle wichtigen Änderungen an ProjectBuilder werden in dieser Datei dokumentiert.

## 1.2.1 - 20.07.2026

### Geändert

- Versionsanzeige, Changelog-Oberfläche und Projekt-Löschaktion sind vollständig auf Deutsch, Englisch und Spanisch lokalisiert.
- Der vollständige Changelog steht nun in allen drei Sprachen zur Verfügung und wird passend zur aktiven Sprache geladen.

### Behoben

- Die globale Suche findet Positionen in sämtlichen Projektstrukturen, ohne dass das jeweilige Projekt zuvor geöffnet werden muss.
- Treffer aus anderen Projekten zeigen Projektname und vollständigen Strukturpfad und öffnen direkt die gefundene Position.

## 1.2.0 - 20.07.2026

### Neu

- Eine globale Suche findet Kunden, Projekte, Artikel und Positionen innerhalb des aktuell geöffneten Projekts.
- Suchergebnisse werden nach Bereichen gruppiert und können per Maus, Pfeiltasten oder über das Tastenkürzel `Strg + K` geöffnet werden.
- Projektpositionen aus der globalen Suche werden automatisch aufgeklappt, angesteuert und hervorgehoben.
- Die Benutzeroberfläche steht jetzt auf Deutsch, Englisch und Spanisch zur Verfügung.
- Die Sprachauswahl zeigt grafische Länderflaggen und bleibt über App-Neustarts hinweg gespeichert.

### Geändert

- Der redundante ProjectBuilder-Schriftzug wurde durch das Janitza-Logo ersetzt und der Header kompakter gestaltet.
- Die globale Suche befindet sich platzsparend in der Navbar; ihre Ergebnisse erscheinen rechts daneben, ohne den Inhalt zu verschieben.
- Deutsch ist die Standardsprache, wenn noch keine gültige Sprachauswahl gespeichert wurde.
- Projekte können in der globalen Suche auch über den zugeordneten Kundennamen gefunden werden.

## 1.1.1 - 18.07.2026

### Geändert

- Die Projektstruktur ist standardmäßig zehn Prozent breiter und lässt sich über einen Trenner gegenüber der Artikelliste anpassen.
- Die gewählte Spaltenbreite wird für jedes Projekt separat gespeichert und beim erneuten Öffnen wiederhergestellt.

## 1.1.0 - 18.07.2026

### Neu

- Die Kundenansicht zeigt alle dem jeweiligen Kunden zugeordneten Projekte mit direkter Navigation.
- Projekte bieten eine eigene Ausschreibungsrubrik mit Export als Word, GAEB XML oder in beiden Formaten.
- Ausschreibungen können ohne Preise, mit Listenpreisen oder mit rabattierten Preisen erzeugt und explizit als GAEB X81, X82, X83 oder X84 ausgegeben werden.
- Beim manuellen Anlegen von Artikeln ist das Langtextfeld eindeutig als Ausschreibungstext für Word- und GAEB-Exporte gekennzeichnet.

### Geändert

- Der Word-Ausschreibungsexport orientiert sich mit kompakter technischer Typografie, gegliederten Positionsnummern sowie Fabrikat-, Typ- und Artikelangaben stärker an der Janitza-Vorlage.
- Optionale und alternative Positionen werden in getrennten Summenspalten angezeigt und reagieren auf die Auswahl zwischen Listenpreis und rabattiertem Preis.
- Klickbare Zeilen in Kunden- und Projektlisten sind durch Pointer-Cursor und einen deutlicheren Hoverzustand erkennbar.

### Behoben

- Die Positionstabellen im Word-Ausschreibungsexport werden korrekt als DOCX-Tabellen erzeugt und führen nicht mehr zu einer HTML-Fehlerantwort.
- Word-Ausschreibungen werden clientseitig auf den DOCX-Dateityp geprüft und ausdrücklich mit der Endung `.docx` gespeichert; HTML-Fehlantworten werden nicht mehr heruntergeladen.
- Unbekannte Export-Endpunkte liefern nicht mehr die HTML-Startseite als Download; Word-Ausschreibungen werden dadurch eindeutig als DOCX behandelt.

## 1.0.9 - 17.07.2026

### Neu

- Messstellen können um Eigenschaften für den Datenerfassungsplan ergänzt werden.
- Artikelpositionen lassen sich als optional oder alternativ kennzeichnen.
- Optional- und Alternativpositionen werden separat ausgewiesen und nicht in die reguläre Projektsumme eingerechnet.

### Geändert

- Projektübersicht und Exporte berücksichtigen die neuen Messstellen- und Positionseigenschaften.

## 1.0.8 - 16.07.2026

### Behoben

- Geänderte Artikelmengen bleiben beim direkten anschließenden Duplizieren oder Löschen von Projektpositionen erhalten.
- Laufende Mengenänderungen werden vor dem Neuladen der Projektstruktur vollständig gespeichert, sodass Stückzahlen anderer Messstellen nicht mehr auf `1` zurückspringen.

## 1.0.7 - 13.07.2026

### Neu

- Projekte bieten einen automatisch erzeugten SVG-Übersichtsplan mit Zoom, Verschieben und Druckfunktion.
- Eine vertikale Gesamtübersicht und logisch getrennte Detailseiten je Verteilung stehen zur Auswahl.
- Detailseiten können mehrseitig im A4-Querformat gedruckt werden.
- Der Übersichtsplan kann ohne Preise sowie mit Listenpreisen oder rabattierten Zwischensummen dargestellt werden.

### Geändert

- In der Projektstruktur kann projektbezogen zwischen Listenpreisen und rabattierten Artikel- und Zwischensummen umgeschaltet werden.
- Lange Bezeichnungen im Übersichtsplan werden innerhalb der Karten mehrzeilig dargestellt.
- Der Übersichtsplan startet mit Detailseiten, rabattierten Preisen und sichtbaren Artikeln.

### Behoben

- Die Preisübersicht im Projektkopf berücksichtigt nur noch Positionen des aktuell geöffneten Projekts.

## 1.0.6 - 13.07.2026

### Behoben

- Zwischensummen in der ersten Druckansicht werden mit den rabattierten Positionspreisen statt mit Listenpreisen berechnet.
- Die Preislogik der separaten Ansichten für Listenpreise und rabattierte Preise bleibt unverändert.

## 1.0.5 - 13.07.2026

### Behoben

- Artikel-Icons werden im Excel-Export der installierten Electron-Version wieder angezeigt.
- Icon-Dateien werden unabhängig vom aktuellen Arbeitsverzeichnis gefunden und direkt in die Arbeitsmappe eingebettet.

## 1.0.4 - 11.07.2026

### Geändert

- Preisübersicht wurde aus der linken Projektstruktur in den oberen Projektkopf verschoben.
- Listenpreis, Rabatt, Projektrabatt und rabattierter Preis werden kompakt neben dem Projektnamen angezeigt.
- Die Projektstruktur bietet dadurch mehr Platz für Gebäude, Positionen und Artikel.

### Behoben

- Preisübersicht passt sich bei kleineren Fensterbreiten responsiv an.

## 1.0.3 - 11.07.2026

### Geändert

- Changelog nutzt jetzt die gesamte verfügbare Ansichtsfläche.
- Lokaler Electron-Start baut native SQLite-Module automatisch für Electron neu.
- Normaler Node-Start baut native SQLite-Module automatisch für Node.js neu.

### Behoben

- Changelog wurde durch das globale View-Grid links oben eingequetscht dargestellt.
- `npm run start:electron` konnte nach Node-Tests mit einem ABI-Fehler abbrechen.

## 1.0.2 - 11.07.2026

### Neu

- Changelog-Ansicht direkt in der Anwendung.
- Buchsymbol neben der aktuellen Version öffnet die Versionshistorie.
- Angezeigte App-Version wird zentral aus `package.json` gelesen.

### Geändert

- Versionsnummer in der Navigation ist nicht mehr fest im Frontend hinterlegt.

## 1.0.1 - 11.07.2026

### Neu

- Favoriten und deren Reihenfolge werden dauerhaft in SQLite gespeichert.
- Eingeklappte Favoriten, Projektknoten und Projektbeschreibungen werden gespeichert.
- Bestehende passende Browser-Einstellungen werden beim ersten Laden übernommen.

### Behoben

- Favoriten gingen durch den wechselnden lokalen Express-Port nach einem Neustart verloren.
- Release-Workflow veröffentlicht Installer, Blockmap und Update-Metadaten zuverlässig.

## 1.0.0 - 11.07.2026

### Neu

- Erste installierbare Windows-Version von ProjectBuilder.
- Electron-Container mit internem Express-Server auf einem freien lokalen Port.
- Windows-Installer über electron-builder und NSIS.
- Automatische Updateprüfung über öffentliche GitHub Releases.
- SQLite-Datenbank wird dauerhaft im Windows-Benutzerverzeichnis gespeichert.
- Eigenes App- und Installer-Symbol.
- Desktop- und Startmenü-Verknüpfungen.

### Geändert

- Das Electron-Anwendungsmenü wurde vollständig entfernt.
- Benutzerdaten sind vom Installationsverzeichnis getrennt und bleiben bei Updates erhalten.

### Enthalten

- Kundenverwaltung.
- Artikelverwaltung und Preislistenimport.
- Projektverwaltung mit hierarchischen Projektstrukturen.
- Artikel-Favoriten, Projektkalkulation und Excel-Export.
