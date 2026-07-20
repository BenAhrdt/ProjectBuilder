# Changelog

All notable changes to ProjectBuilder are documented here.

## 1.2.1 - 20.07.2026
### Changed
- The version display, changelog interface and project deletion action are fully localized in German, English and Spanish.
- The complete changelog is available in all three languages and follows the active language.
### Fixed
- Global search finds positions in every project structure without requiring the project to be opened first.
- Results from other projects show the project name and full structure path and open the matching position directly.

## 1.2.0 - 20.07.2026
### Added
- Global search for customers, projects, articles and positions in project structures.
- Grouped results with mouse, arrow-key and `Ctrl + K` operation; position hits open, expand and highlight their target.
- German, English and Spanish user interfaces with persistent graphical language selection.
### Changed
- The redundant product heading was replaced by the Janitza logo and the header was made more compact.
- Global search moved into the navbar and opens its results alongside it without moving the content.
- German is the fallback language; projects can also be found by their assigned customer.

## 1.1.1 - 18.07.2026
### Changed
- The project structure is ten percent wider by default and can be resized against the article list; its width is stored per project.

## 1.1.0 - 18.07.2026
### Added
- Customer details show assigned projects with direct navigation.
- Projects support Word and GAEB tender exports, with X81–X84 phases and configurable price output.
- Manually created articles provide a dedicated tender long-text field.
### Changed
- Word exports use compact technical typography and structured position, manufacturer, type and article information.
- Optional and alternative positions have separate totals; clickable customer and project rows have clearer interaction states.
### Fixed
- Word position tables are valid DOCX tables, downloads are verified as DOCX, and unknown export endpoints no longer return the HTML application page.

## 1.0.9 - 17.07.2026
### Added
- Measuring points support data-collection properties; article positions can be optional or alternative and are excluded from regular totals.
### Changed
- Project overviews and exports include the new measuring-point and position properties.

## 1.0.8 - 16.07.2026
### Fixed
- Edited article quantities remain intact when positions are immediately duplicated, deleted or the structure is reloaded.

## 1.0.7 - 13.07.2026
### Added
- Generated SVG project overview with zoom, pan, print, overview/detail pages and optional price display.
### Changed
- Project structures switch between list and discounted prices; long overview labels wrap and detail pages start with discounted prices and visible articles.
### Fixed
- The project header totals only include positions from the currently opened project.

## 1.0.6 - 13.07.2026
### Fixed
- Initial print-view subtotals use discounted position prices while dedicated price views remain unchanged.

## 1.0.5 - 13.07.2026
### Fixed
- Article icons are found independently of the working directory and embedded in Electron Excel exports again.

## 1.0.4 - 11.07.2026
### Changed
- The compact price summary moved to the project header, leaving more space for the project structure.
### Fixed
- The price summary responds correctly to narrower windows.

## 1.0.3 - 11.07.2026
### Changed
- The changelog uses the full view; Electron and Node starts rebuild native SQLite modules for their respective runtime.
### Fixed
- The changelog is no longer squeezed into the view grid and Electron no longer fails with an ABI mismatch after Node tests.

## 1.0.2 - 11.07.2026
### Added
- In-app changelog opened by the book icon; the displayed version comes from `package.json`.
### Changed
- The navigation version is no longer hard-coded.

## 1.0.1 - 11.07.2026
### Added
- Favorites, their order, collapsed project state and descriptions persist in SQLite; compatible browser settings are migrated once.
### Fixed
- Favorites survive changing Express ports and the release workflow reliably publishes installer, blockmap and update metadata.

## 1.0.0 - 11.07.2026
### Added
- First installable Windows version with Electron, an internal Express server, NSIS installer, automatic updates, persistent user database, app icon and shortcuts.
### Changed
- The Electron menu was removed and user data was separated from the installation directory.
### Included
- Customer, article, pricelist and project management, hierarchical structures, favorites, calculations and Excel export.
