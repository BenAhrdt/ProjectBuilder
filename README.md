# ProjectBuilder

ProjectBuilder ist eine Desktop-Anwendung zur Planung und Kalkulation von Janitza-Messprojekten. Projekte werden hierarchisch aus Gebäuden, Verteilungen, Feldern, Messstellen und Artikeln aufgebaut. Preislisten, Kundenrabatte und Projektrabatte fließen automatisch in Kalkulation und Exporte ein.

## Funktionen

- Kunden- und Projektverwaltung mit kundenspezifischen Rabattgruppen
- Import von Janitza-Preislisten inklusive technischer Ausschreibungstexte
- Hierarchische Projektstruktur und grafischer Übersichtsplan
- Projektbezogen anpassbare Breite von Projektstruktur und Artikelliste
- Kennzeichnung optionaler und alternativer Positionen
- Kalkulation mit Listenpreisen oder rabattierten Preisen
- Excel-Projektexport und Datenerfassungsplan
- Ausschreibungsexport als Word-Dokument und GAEB XML
- GAEB-Austauschphasen X81, X82, X83 und X84
- Lokale Datenspeicherung in SQLite
- Windows-Desktopanwendung auf Basis von Electron

## Installation für die Entwicklung

Voraussetzungen:

- Node.js
- npm
- Windows für den vollständigen Electron- und Installer-Workflow

Abhängigkeiten installieren:

```powershell
npm install
```

Desktopanwendung starten:

```powershell
npm run start:electron
```

Nur den lokalen Webserver starten:

```powershell
npm start
```

## Tests

```powershell
npm test
```

## Windows-Release erstellen

```powershell
npm run dist:win
```

Die erzeugten Installationsdateien werden im Verzeichnis `release` abgelegt. Die lokale Projektdatenbank bleibt bei einer Aktualisierung oder Deinstallation standardmäßig erhalten.

## Ausschreibungsexport

Der Export verwendet die Langtexte aus der importierten Preisliste beziehungsweise aus manuell angelegten Artikeln. Verfügbar sind:

- Word (`.docx`) ohne Preise, mit Listenpreisen oder mit rabattierten Preisen
- GAEB X81 – Leistungsbeschreibung
- GAEB X82 – Kostenanschlag
- GAEB X83 – Angebotsaufforderung
- GAEB X84 – Angebotsabgabe

X81 und X83 werden ohne Preise ausgegeben. X82 und X84 können Listenpreise oder rabattierte Preise enthalten. Die erzeugten GAEB-Dateien sollten vor dem produktiven Einsatz mit der verwendeten AVA-Software validiert werden.

## Datenhaltung

In der installierten Electron-Version wird die SQLite-Datenbank im benutzerspezifischen Anwendungsdatenverzeichnis gespeichert. Sie ist nicht Bestandteil eines Updates und wird bei der Deinstallation nicht automatisch gelöscht.

## Änderungen

Alle veröffentlichten Änderungen stehen im [Changelog](CHANGELOG.md).
