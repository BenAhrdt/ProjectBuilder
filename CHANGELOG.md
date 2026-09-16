# Changelog

Alle wichtigen Änderungen an ProjectBuilder werden in dieser Datei dokumentiert.

## 1.5.21 - 16.09.2026

### Verbessert

- Fehlende oder abgelaufene Salesforce-Anmeldungen bieten nun bei allen Salesforce-Aktionen direkt die Verbindungsherstellung an und wiederholen den ursprünglichen Vorgang anschließend automatisch.
- Der Kundenimport bleibt möglich, wenn ausschließlich die optionalen Rabattdaten wegen einer vorübergehenden Wartung nicht verfügbar sind; vorhandene lokale Rabatte bleiben erhalten.

### Behoben

- HTML-Wartungsseiten externer Dienste werden nicht mehr ungefiltert im Salesforce-Kundendialog angezeigt.

## 1.5.20 - 16.09.2026

### Neu

- Verknüpfte Projekte können im geöffneten Projekt direkt aus der neuesten ProjectBuilder-Projektdatei ihrer Salesforce-Opportunity geladen werden. Vor dem vollständigen Ersetzen des lokalen Stands ist eine Bestätigung erforderlich.

### Verbessert

- Die Salesforce-Aktionen stehen im Exportbereich einheitlich nebeneinander: „An Salesforce senden“ links und „Aus Salesforce laden“ rechts.

## 1.5.19 - 15.09.2026

### Neu

- Projekte können als eigenständige `.projectbuilder.json`-Datei exportiert und wieder importiert werden.
- Beim Salesforce-Versand kann die vollständige ProjectBuilder-Projektdatei optional an der Opportunity gespeichert werden. Die standardmäßig aktive Auswahl wird pro Projekt gespeichert und weitere Übertragungen erzeugen Dateiversionen.
- Projekte lassen sich direkt aus der neuesten ProjectBuilder-Projektdatei einer Salesforce-Opportunity wiederherstellen. Fehlende lokale Kunden werden dabei aus Salesforce importiert.

### Verbessert

- Der Projektimport bietet die Quellen „Aus Datei“ und „Aus Salesforce“ an. Der bisherige Legacy-Import aus Excel wurde entfernt und neue Excel-Exporte enthalten kein technisches Importblatt mehr.
- Salesforce-Verknüpfungen werden pro Projekt und Kunde verwaltet. Nach einem Kundenwechsel entsteht eine eigene Opportunity; beim Zurückwechseln kann die zuvor verwendete Opportunity wiederverwendet werden.
- Der Exportbereich ordnet vier Dokumentaktionen übersichtlich an und hebt die Salesforce-Übergabe als abschließende Aktion hervor.

## 1.5.18 - 15.09.2026

### Neu

- Beim Importieren und Aktualisieren von Salesforce-Kunden werden verfügbare Kundenrabatte für PG1 bis PG8 aus den jüngsten eindeutig kalkulierten Opportunity-Positionen übernommen. Preisgruppen ohne belastbaren Treffer bleiben unverändert.

## 1.5.17 - 15.09.2026

### Verbessert

- Beim Salesforce-Preisbuchimport werden die Preisgruppen aus den Vertriebslinien der Verkaufsorganisation 1100 und des Vertriebswegs 10 automatisch als PG1 bis PG8 übernommen.
- Rabattgruppen können in der Artikelübersicht manuell geändert oder entfernt werden; manuelle Zuordnungen bleiben bei späteren Salesforce-Importen erhalten und werden in Backups gesichert.

## 1.5.16 - 15.09.2026

### Behoben

- Kundenrabatte werden in Salesforce als Basisrabatt statt als Zusatzrabatt übertragen und dadurch bei aktivierter Rabattanzeige korrekt im Angebots-PDF ausgegeben.
- Bereits synchronisierte Angebote werden vor der Aktualisierung kontrolliert gelöst und anschließend wieder mit den vollständig aktualisierten Positionen synchronisiert.

### Verbessert

- „Rabatt anzeigen“, „Zusätzlichen Rabatt immer anzeigen“ und „Export Angebot“ können getrennt gewählt und dauerhaft pro Projekt gespeichert werden.

## 1.5.15 - 15.09.2026

### Verbessert

- Beim Senden von Angeboten an Salesforce kann der gültige Steuerschlüssel ausgewählt werden; Salesforce berechnet daraus Steuersatz und Steuerbetrag.
- ProjectBuilder übernimmt Partnerrollen, Rechnungs- und Lieferadressen sowie Sprache aus dem Salesforce-Kunden.
- Kundengruppe, Preisliste, Zahlungsbedingungen, Incoterms und Versandbedingungen werden aus den SAP-Vertriebsbereichsdaten für Verkaufsorganisation 1100 und Vertriebsweg 10 übernommen.
- Die Lieferzeit-Bedingung wird entsprechend der Salesforce-Vorgabe mit „after receipt of order“ befüllt.

## 1.5.14 - 15.09.2026

### Behoben

- Kundenspezifische Rabatte der Preisgruppen werden in Projekten wieder korrekt geladen und bei der Preisberechnung berücksichtigt.
- Leere Projekte zeigen bei den benötigten GridVis-Items wieder 0 statt 1 an.
- Beim Senden eines Angebots an Salesforce kann „Rabatt anzeigen“ gewählt werden; der Rechnungs-Ländercode wird übertragen, damit Salesforce „Export Angebot“ für ausländische Kunden korrekt berechnet und als automatische Vorschau anzeigt.

## 1.5.13 - 15.09.2026

### Neu

- Die kundenspezifische Vertriebsanalyse kann in der Desktop-App als vollständige PDF-Datei exportiert werden.
- Eine neue Einstellungsseite bietet einen bevorzugten lokalen Port und einen Browsermodus, der ProjectBuilder nach der Updateprüfung im Standardbrowser öffnet und Electron minimiert.
- Die Projektansicht ist in die Bereiche „Projektdaten“, „Projektstruktur“ und „Export“ gegliedert.

### Verbessert

- Ist ein bevorzugter Port belegt, startet ProjectBuilder automatisch auf einem freien Port; der tatsächlich verwendete Port wird in der Navigation und den Einstellungen angezeigt.
- Kunden- und Projekt-Tabs bleiben beim Scrollen erreichbar und verwenden eine einheitliche, in den Inhalt übergehende Darstellung.
- Die Projektstruktur behält Strukturbaum, Favoriten, Artikelsuche und Artikelliste gemeinsam in einer Arbeitsansicht.
- Im Browser werden die doppelten internen Zurück-/Vor-Schaltflächen ausgeblendet; Electron verwendet eindeutigere Navigationspfeile.
- Preisliste, Backup und Einstellungen sind in der unteren Navigation übersichtlich gruppiert.

## 1.5.12 - 14.09.2026

### Neu

- Die Kundendetailansicht ist in die Bereiche „Allgemein“, „Projekte“ und „Vertrieb“ gegliedert.
- Die kundenspezifische Vertriebsübersicht ergänzt Fünfjahresvergleiche, durchschnittliche Auftragswerte und eine beschriftete Zehnjahresgrafik.

### Verbessert

- Projekte und Salesforce-Vertriebsdaten werden erst beim Öffnen ihres Tabs geladen und bei normalen Tab-Wechseln nicht erneut abgefragt.
- Aufklappzustände und der aktive Kunden-Tab bleiben bei Aktualisierungen der Ansicht erhalten.

## 1.5.11 - 14.09.2026

### Neu

- Die Kundenansicht zeigt den Auftragseingang aus Salesforce für die letzten fünf Jahre einschließlich Auftragsanzahl und prozentualer Veränderung zum Vorjahr.
- Unter „Weitere Details“ stehen fünf zusätzliche Jahre und ein interaktives Zehnjahresdiagramm zur Verfügung.
- Diagrammpunkte zeigen beim Darüberfahren Jahr, Auftragsanzahl, Auftragseingang und Veränderung zum Vorjahr in einer gut lesbaren Infobox.

### Geändert

- Die Jahresübersicht des Auftragseingangs verwendet ein kompaktes zweizeiliges Kartenlayout und kennzeichnet Wachstum beziehungsweise Rückgang farblich.

## 1.5.10 - 14.09.2026

### Geändert

- Die Abstände der Projektkarten entsprechen jetzt der kompakteren Kundenansicht.
- Salesforce-Kennzeichnung und Aktionsschaltflächen sowie die Bearbeiten-Schaltflächen für GridVis-Items und Preise sind in der Artikeltabelle einheitlich ausgerichtet.
- Die Artikel-Infokarte bleibt beim Wechsel vom Positionstext in die Karte zuverlässig geöffnet; das Positionsmenü löst weiterhin keine Infokarte aus.

### Verbessert

- Projekt-, Kunden-, Struktur- und Artikeldaten werden beim Öffnen eines Projekts parallel geladen. Salesforce-Links werden nachträglich ergänzt und blockieren den Seitenwechsel nicht mehr.
- Es werden nur die Positionen des geöffneten Projekts übertragen. Nicht sichtbare Suchartikel und deren Bilder verursachen beim Verschieben der Projektspalten deutlich weniger Layoutarbeit.

## 1.5.9 - 14.09.2026

### Geändert

- Die Artikel-Infokarte öffnet nur noch über dem Textbereich und schließt sofort am Positionsmenü, sodass dessen Bedienung und die Denkblasenpunkte sich nicht überlagern.

### Behoben

- Stückzahländerungen an neu hinzugefügten Artikeln werden sofort korrekt registriert und gespeichert, ohne dass das Projekt zuvor neu geöffnet werden muss.

## 1.5.8 - 14.09.2026

### Neu

- Hinzugefügte Artikel zeigen nach kurzem Verweilen eine übersichtliche Infokarte mit verfügbaren Stamm-, Preis-, Rabatt- und GridVis-Daten sowie dem Langtext.
- Eine dezente, automatisch ausgerichtete Denkblasenspur verbindet die Infokarte optisch mit der Artikelposition.

## 1.5.7 - 14.09.2026

### Geändert

- Neue Produktsymbole werden für das Modul 800-MF8 sowie CT-AC-RCM- und CT24-Stromwandler angezeigt.
- CT24-Kabel und weiteres Wandlerzubehör verwenden wieder das neutrale Standardsymbol.

## 1.5.6 - 14.09.2026

### Neu

- Im Kopfbereich stehen browserähnliche Schaltflächen zum Zurück- und Vorwärtsnavigieren durch die tatsächlich besuchten Ansichten bereit. Nicht verfügbare Richtungen werden automatisch deaktiviert.

## 1.5.5 - 14.09.2026

### Geändert

- Das Formular „Projekt hinzufügen“ ist jetzt kompakt in einer Zeile ausgerichtet. Projektname, Kunde, Beschreibung und Speichern-Schaltfläche besitzen eine einheitliche Höhe und ordnen sich bei kleineren Fenstern responsiv an.

## 1.5.4 - 14.09.2026

### Neu

- In der Kundenansicht können Projekte direkt angelegt werden; der aktuell geöffnete Kunde wird automatisch zugeordnet.
- Die Projektübersicht lässt sich per Maus oder Tastatur auf- und absteigend nach Projektname und Kunde sortieren. Die Sortierung bleibt während der Suche erhalten.

### Geändert

- Die Kundenansicht verwendet kompaktere Abstände und Eingabefelder, damit die zugeordneten Projekte ohne unnötiges Scrollen sichtbar werden.
- Zusatzinformationen sind aufklappbar, bei leerem Inhalt standardmäßig geschlossen und wachsen bis zu einer begrenzten Höhe mit dem Text.
- Die Projektansicht verwendet eine einheitliche kompakte Typografie. Lange Projektnamen werden responsiv gekürzt und bleiben als Tooltip vollständig lesbar.
- Projektname, Kunde und Projektrabatt besitzen nun dieselbe kompakte Feldhöhe wie die Stammdaten in der Kundenansicht.

### Behoben

- CSS-Regeln des Formulars in der Projektübersicht wirken nicht mehr versehentlich auf gleichnamige Felder der geöffneten Projektansicht.

## 1.5.3 - 14.09.2026

### Geändert

- Fehlt bei einer Salesforce-Aktion die Anmeldung, kann die Verbindung direkt aus dem Hinweis hergestellt werden; anschließend wird die ursprüngliche Aktion automatisch erneut ausgeführt.
- Die Lieferzeit im Salesforce-Synchronisierungsdialog wird über zusätzliche deutsche und englische Feldbezeichnungen sowie typische Zeitwerte erkannt.
- Die Lieferzeit bleibt im Synchronisierungsdialog sichtbar. Fehlende Feldfreigaben oder Auswahlwerte werden verständlich ausgewiesen, statt das Feld kommentarlos auszublenden.

## 1.5.2 - 14.09.2026

### Neu

- Verknüpfte Kunden, Opportunities und Angebote können direkt in Salesforce geöffnet werden. Die Links erscheinen nur für erfolgreich synchronisierte und in Salesforce vorhandene Datensätze.
- Der Salesforce-Erfolgsdialog bietet direkte Links zur Opportunity und zum Angebot und zeigt beim Angebot zusätzlich die Angebotsnummer an.

### Geändert

- Die linke Navigation ist schmaler und lässt „Preisliste importieren“ weiterhin vollständig sichtbar.
- Die Salesforce-Synchronisierung lädt wiederverwendbare Metadaten nur einmal, ermittelt neue Angebotsdetails parallel und erzeugt ausgewählte Dokumente gemeinsam, um die Wartezeit zu reduzieren.

### Behoben

- Verzögerte automatische Speichervorgänge verwenden die Werte der ursprünglichen Kunden- oder Projektansicht und können beim Navigieren über die globale Suche keine Kundendaten oder Projektzuordnungen mehr leeren.

## 1.5.1 - 13.09.2026

### Geändert

- GridVis-Items und Preise besitzen ausreichend breite Spalten, sodass Werte und Ändern-Schaltflächen ohne Umbruch lesbar bleiben.
- Der Salesforce-Synchronisierungsdialog ist breiter und bezeichnet die GAEB-Dokumentauswahl als „LV in GAEB“.

## 1.5.0 - 13.09.2026

### Neu

- Projekte können sowohl in der Projektübersicht als auch in der geöffneten Kundenansicht einschließlich ihrer vollständigen Struktur und Artikelpositionen dupliziert werden.
- Die Salesforce-Synchronisierung bietet einen persistenten Einstellungsdialog für Kontakt, Lieferzeit, Artikelgruppierung und die Übertragung nur der Opportunity oder zusätzlich des Angebots.
- Übersichtsplan, Excel, Word-LV und GAEB können einzeln zur Opportunity übertragen werden; erneute Übertragungen erzeugen Dateiversionen, abgewählte Dateien werden nicht gelöscht.
- Standardmäßig ist der Übersichtsplan ausgewählt; GAEB wird standardmäßig als X82-Kostenanschlag mit Listenpreisen erstellt.
- Der an Salesforce übertragene Übersichtsplan ist ein vollständiges A4-Querformat-PDF mit erster Gesamtübersichtsseite und allen Detailseiten; rabattierte Preise sind eingeblendet.
- Der PDF-Übersichtsplan übernimmt Knotennamen, Strukturpfade und Artikelbilder identisch aus der Projektansicht.

## 1.4.4 - 13.09.2026

### Behoben

- Ein synchronisiertes Entwurfsangebot wird weiterverwendet. Hat das synchronisierte Angebot einen anderen Status, wird ein neuer Entwurf erzeugt; ohne synchronisiertes Angebot wird automatisch der jüngste Entwurf verwendet.

## 1.4.3 - 13.09.2026

### Neu

- Sind mehrere Entwurfsangebote mit der Opportunity verknüpft, kann das zu synchronisierende Angebot anhand seiner Angebotsnummer ausgewählt werden; ein einzelner Entwurf wird automatisch verwendet.

### Behoben

- Gelöschte zuletzt verwendete Angebote verhindern nicht mehr, dass ein älteres, wieder auf Entwurf gesetztes Angebot erneut synchronisiert wird.
- Die Erfolgsmeldung der Salesforce-Synchronisation nennt die tatsächlich verwendete Angebotsnummer.

## 1.4.2 - 13.09.2026

### Neu

- Vor der Salesforce-Übertragung lassen sich Kontakt und Lieferzeit direkt aus den für den Kunden beziehungsweise das Angebot verfügbaren Salesforce-Werten auswählen.

### Behoben

- Beim Wechsel auf einen neuen Angebotsentwurf wird das bisher synchronisierte Angebot sauber getrennt; ein später wieder auf Entwurf gesetztes Angebot kann erneut verwendet werden.
- Strukturierte Salesforce-Fehler werden mit ihrer tatsächlichen Meldung statt als `[object Object]` angezeigt.

## 1.4.1 - 13.09.2026

### Behoben

- Nach der Salesforce-Übertragung wird das Angebot nun als synchronisiertes Angebot der Opportunity gesetzt und kann dadurch zur Genehmigung eingereicht werden.

## 1.4.0 - 13.09.2026

### Neu

- Projekte können ihre regulären, optionalen und alternativen Artikelpositionen als Opportunity und Angebot in Salesforce synchronisieren.
- Die Artikelübersicht kann alle Artikelnummern gegen das aktive Salesforce-Preisbuch prüfen und zeigt die Verfügbarkeit direkt an der Artikelnummer an.
- Beim Leeren der Artikelliste können alle nicht verwendeten Artikel gezielt entfernt werden, während referenzierte Projektartikel geschützt bleiben.
- Salesforce-Verfügbarkeitskennzeichen bleiben einschließlich Prüfzeitpunkt und verfügbarer Währungen nach einem Neustart erhalten; importierte Salesforce-Artikel werden unmittelbar als verfügbar markiert.
- Ein Wechsel des ausgewählten Salesforce-Preisbuchs erzeugt bei Bedarf eine neue Opportunity und ein neues Angebot, statt bestehende Salesforce-Datensätze mit inkompatiblem Preisbuch zu verändern.
- Aktive Artikel lassen sich direkt aus einem auswählbaren Salesforce-Preisbuch und in einer auswählbaren Währung importieren.
- In der deutschen Oberfläche werden ohne gespeicherte Auswahl automatisch „Janitza Electronics (1100)“ und EUR verwendet; eine zuvor in der englischen oder spanischen Oberfläche gewählte Kombination bleibt sprachübergreifend erhalten.
- Salesforce- und Excel-Import ergänzen bestehende Artikel feldbezogen; leere Excel-Werte entfernen keine vorhandenen Angaben und ausführliche Excel-Texte bleiben bei Salesforce-Aktualisierungen erhalten.
- Der Excel-Import bezeichnet geschützte Leer- und Nullpreise eindeutig als ignoriert statt missverständlich als allgemein beibehalten.
- ProjectBuilder ermittelt und summiert benötigte GridVis-Items für Messgeräte und Module. Automatische Werte werden persistent gespeichert und können je Artikel manuell überschrieben werden.
- Die Projektansicht bietet unter dem Projektnamen einen direkten Rücksprung zum zugeordneten Kunden.

### Geändert

- Kunden- und Produktstammdaten werden ausschließlich gelesen; Opportunity-Produkte und Angebotspositionen werden über das deutsche Janitza-Preisbuch synchronisiert.
- Entwurfsangebote werden aktualisiert. Bei bereits weiterbearbeiteten Angeboten wird automatisch ein neuer Entwurf angelegt.
- Angebotspositionen übernehmen die Reihenfolge der kaufmännischen Excel-Übersicht und erhalten eine fortlaufende Salesforce-Position.
- Kundenrabatte werden an Opportunity-Produkten und als Verkaufspreis der Angebotsposition abgebildet; der Projektrabatt wird getrennt am Angebotskopf gespeichert.
- Salesforce-Positionen werden gesammelt übertragen, wodurch die Synchronisation deutlich weniger API-Aufrufe benötigt.
- Unabhängige Salesforce-Abfragen und die Positionsübertragung an Opportunity und Angebot laufen parallel, um die Synchronisation zu beschleunigen.
- Die Projektzusammenfassung nutzt den verfügbaren Platz in einer Zeile und weist die benötigten GridVis-Items separat aus.
- Die Kundenübersicht ordnet Suche, Metadaten und Aktionsschaltflächen auch in kleineren Fenstern kompakt an.

### Behoben

- CT24-Zubehör, passive Stromwandler, Netzteile, Kommunikationsmodule und das UMG 800 werden nicht mehr fälschlich als itempflichtige GridVis-Geräte gezählt.

## 1.3.0 - 12.09.2026

### Neu

- Kunden können über den bestehenden Salesforce-SSO-Zugang nach Kundennummer, Name, PLZ und Ort gesucht und gezielt in ProjectBuilder übernommen werden.
- Mit Salesforce verknüpfte Kunden lassen sich einzeln oder gemeinsam aus Salesforce aktualisieren.
- Kundendaten enthalten nun getrennte Felder für Adresse, PLZ und Ort sowie den Zeitpunkt der letzten Salesforce-Aktualisierung.

### Geändert

- Die Salesforce-Anbindung greift ausschließlich lesend auf Salesforce zu; lokale Rabattgruppen und Zusatzinformationen bleiben bei Aktualisierungen erhalten.
- Fehlende Salesforce-Kundennummern leeren auch die entsprechende lokale Kundennummer, ohne Konflikte zwischen Kunden ohne Kundennummer zu verursachen.
- Salesforce-Verbindungen werden im Hintergrund vorbereitet und für schnelle Folgeabfragen wiederverwendet.
- Such- und Aktualisierungsschaltflächen zeigen während laufender Salesforce-Abfragen einen verständlichen Status.

### Behoben

- Salesforce-Auswahldialoge schließen nur noch, wenn sowohl Maustaste-drücken als auch Maustaste-loslassen außerhalb des Dialogs erfolgen.
- Die Aktionsschaltflächen der Kundenübersicht besitzen konsistente Abstände und werden nicht mehr an den rechten Fensterrand gedrängt.

## 1.2.12 - 25.08.2026

### Behoben

- Noch aktive Mengenänderungen werden vor dem Verschieben, Duplizieren, Löschen oder Neuladen gespeichert, sodass Artikelstückzahlen nicht mehr auf `1` zurückspringen.

## 1.2.11 - 14.08.2026

### Geändert

- Detailansichten verwenden eine eigene Seite je Feld, damit umfangreiche Verteilungen übersichtlich bleiben.
- Pro Zeile werden höchstens sechs Messstellen dargestellt; weitere Messstellen werden automatisch in zusätzliche Zeilen umgebrochen.
- Verteilungen ohne Felder behalten weiterhin eine eigene Detailseite.

## 1.2.10 - 11.08.2026

### Geändert

- Buttons, Menüs, Tabellenüberschriften, Formulare und Meldungen in den Artikel-, Kunden-, Projekt- und Preislistenansichten sind vollständig auf Deutsch, Englisch und Spanisch lokalisiert.
- Die Standarddialoge sowie die nativen Update- und Ordnerdialoge verwenden nun ebenfalls die ausgewählte Sprache.

### Behoben

- In der englischen und spanischen Oberfläche werden keine fest eingebauten deutschen Beschriftungen mehr angezeigt.

## 1.2.9 - 11.08.2026

### Neu

- Der Preislistenimport erkennt deutsche und englische Spaltenbezeichnungen sowie unterschiedliche Schreibweisen automatisch.
- EUR-, GBP-, USD- und AUD-Preislisten übernehmen die Währung direkt aus der jeweiligen Währungsspalte.

### Geändert

- Nicht unterstützte Preislisten zeigen eine verständliche Meldung, wenn keine bekannte Artikelnummernspalte gefunden wird.

## 1.2.8 - 11.08.2026

### Geändert

- Testrelease zur Überprüfung des automatischen Updates von Version 1.2.7 ohne zusätzliche Herausgeberprüfung.

## 1.2.7 - 11.08.2026

### Geändert

- Die zusätzliche Herausgeberprüfung des automatischen Updaters ist vorübergehend deaktiviert, damit Updates trotz des intern signierten, auf Zielsystemen noch nicht zentral vertrauten Zertifikats installiert werden können.
- Installationsprogramm und Anwendung bleiben weiterhin digital signiert; Windows SmartScreen und Sicherheitssoftware prüfen sie unverändert.

## 1.2.6 - 11.08.2026

### Geändert

- Testrelease zur Überprüfung des automatischen Update-Downloads und der in Version 1.2.5 eingeführten Fortschrittsanzeige.

## 1.2.5 - 11.08.2026

### Neu

- Der Update-Download zeigt links unten einen Status, einen Fortschrittsbalken und den aktuellen Prozentwert an.
- Nach dem Download wird angezeigt, dass das Update zur Installation bereitsteht; Downloadfehler werden ebenfalls sichtbar gemeldet.

## 1.2.4 - 11.08.2026

### Neu

- Artikel können einzeln oder vollständig aus der Artikelliste gelöscht werden.
- Vor dem Löschen zeigt ProjectBuilder die verwendenden Projekte an und ermöglicht den direkten Sprung zur jeweiligen Projektposition.
- Backups für Artikel, Kunden und Projekte können manuell erstellt und selektiv wiederhergestellt werden.
- Automatische Backups lassen sich täglich, wöchentlich oder monatlich ausführen; verpasste Sicherungen werden beim nächsten Programmstart nachgeholt und die letzten zehn Sicherungen aufbewahrt.

### Geändert

- Die Hilfsfunktionen „Preisliste importieren“ und „Backup & Wiederherstellung“ sind direkt oberhalb der Versionsinformation angeordnet.
- Die Sprachauswahl zeigt die festen Eigennamen „Deutsch“, „English“ und „Español“ unabhängig von der aktiven Sprache.

### Behoben

- B21-, B23- und B24-Artikel verwenden die passenden Produktbilder statt des allgemeinen Energy-Meter-Symbols.
- Bei direkter Navigation aus Kunden-, Such- und Verwendungshinweisen wird der aktive Bereich der Navbar korrekt aktualisiert.

## 1.2.3 - 11.08.2026

### Geändert

- Windows-Anwendung und Installationsprogramm werden digital mit dem ProjectBuilder-Code-Signing-Zertifikat signiert.
- Das öffentliche Zertifikat wird dem Release zur Prüfung und kontrollierten Verteilung durch die Unternehmens-IT beigefügt.

## 1.2.2 - 07.08.2026

### Geändert

- Der Word-Ausschreibungsexport folgt nun der Form der offiziellen Janitza-Ausschreibungsvorlage mit kompakter Arial-Typografie, gegliederten Positionsnummern und einheitlichen Texteinzügen.
- Hersteller, Typ, Artikelnummer sowie Menge, Einzelpreis und Gesamtpreis werden übersichtlich und linksbündig unter dem technischen Ausschreibungstext dargestellt.
- Ein kompakter Vorspann ergänzt die Projektbeschreibung um fachliche Vorbemerkungen und die gewählte Preisbasis.
- Abstände zwischen Vorspann, Leistungspositionen und kaufmännischen Angaben wurden für eine ruhigere Dokumentstruktur angepasst.

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
