# Changelog

Alle wichtigen Änderungen an ProjectBuilder werden in dieser Datei dokumentiert.

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
