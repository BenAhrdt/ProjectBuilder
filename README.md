# ProjectBuilder

ProjectBuilder ist eine Desktop-Anwendung zur Planung und Kalkulation von Janitza-Messprojekten. Projekte werden hierarchisch aus Gebäuden, Verteilungen, Feldern, Messstellen und Artikeln aufgebaut. Preislisten, Kundenrabatte und Projektrabatte fließen automatisch in Kalkulation und Exporte ein.

## Funktionen

- Kunden- und Projektverwaltung mit kundenspezifischen Rabattgruppen
- Import von Janitza-Preislisten inklusive technischer Ausschreibungstexte
- Hierarchische Projektstruktur und grafischer Übersichtsplan
- Drag-&-Drop-Hinweise: grün für Unterebenen und blau für die Einfügeposition
- Projektbezogen anpassbare Breite von Projektstruktur und Artikelliste
- Projektdateien und Bilder mit Vorschau; das Öffnen erfolgt in einem neuen Tab
- Kennzeichnung optionaler und alternativer Positionen
- Anzeige des zugeordneten Inbetriebnahmetyps neben dem GridVis-Item-Badge und
  Aufschlüsselung der benötigten Inbetriebnahmen nach Typ 1 bis Typ 5;
  CON- und Kommunikationsmodule werden dabei ausgenommen
- Kalkulation mit Listenpreisen oder rabattierten Preisen
- Excel-Projektexport und Datenerfassungsplan
- Zusätzliches Excel-Blatt `Inbetriebnahme` mit automatisch abgeleiteten
  Messstellen- und Wandlerinformationen
- GridVis-Items-Menü mit AZR-/Item-Berechnungen und Projektübernahme
- Durchsuchbare FAQ und technische Gerätedaten per Excel-Import
- Ausschreibungsexport als Word-Dokument und GAEB XML
- GAEB-Austauschphasen X81, X82, X83 und X84
- Lokale Datenspeicherung in SQLite
- Mehrere getrennte Datenbankprofile mit Kopieren, Wechseln und Löschen
- Kunden- und Projektlisten können vollständig geleert werden
- Salesforce-Status, Anmeldung/Abmeldung und Fortschrittsanzeige für lange
  Aktionen einschließlich Projekt-Senden und -Laden
- Mehrere farbige Labels und wiederverwendbare Labelvorlagen fuer Strukturknoten
  und Artikel; Labels koennen gezielt an untergeordnete Ebenen vererbt oder dort
  ausgeblendet werden
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

Veröffentlichte Windows-Builds werden mit einem selbstsignierten ProjectBuilder-Code-Signing-Zertifikat signiert. Das öffentliche Zertifikat liegt dem GitHub Release bei und muss vor der Installation durch die zuständige IT geprüft und auf den Zielrechnern als vertrauenswürdig verteilt werden. Der private Schlüssel wird ausschließlich verschlüsselt in GitHub Secrets hinterlegt und nicht in das Repository aufgenommen.

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

ProjectBuilder kann mehrere getrennte Datenbankprofile verwalten. Kunden,
Projekte, Artikel, Projektdateien und automatische Backups bleiben je Profil
getrennt. Das Standardprofil verwendet weiterhin die bestehende lokale
Datenbank.

Projektdateien enthalten Artikelnummern und Positionsdaten, aber keine
vollständigen Artikelstammdaten. Für einen Import müssen die Artikel deshalb im
aktiven Datenbankprofil vorhanden sein; fehlende Artikelnummern werden beim
Import gemeldet.

## Änderungen

Alle veröffentlichten Änderungen stehen im [Changelog](CHANGELOG.md).
