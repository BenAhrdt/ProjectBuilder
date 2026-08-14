# Changelog

All notable changes to ProjectBuilder are documented here.

## 1.2.11 - 14.08.2026
### Changed
- Detail views use a separate page for each field to keep large distributions readable.
- Each row displays no more than six meters; additional meters automatically wrap onto further rows.
- Distributions without fields continue to use their own detail page.

## 1.2.10 - 11.08.2026
### Changed
- Buttons, menus, table headings, forms and messages in the article, customer, project and pricelist views are now fully localized in German, English and Spanish.
- Default dialogs and native update and folder dialogs now also use the selected language.
### Fixed
- The English and Spanish interfaces no longer display hard-coded German labels.

## 1.2.9 - 11.08.2026
### Added
- Pricelist imports automatically recognize German and English column names as well as common formatting variants.
- EUR, GBP, USD and AUD pricelists preserve the currency supplied in each file's currency column.
### Changed
- Unsupported pricelists show a clear message when no recognized item-number column is found.

## 1.2.8 - 11.08.2026
### Changed
- Test release for verifying the automatic update from version 1.2.7 without additional publisher verification.

## 1.2.7 - 11.08.2026
### Changed
- The automatic updater's additional publisher verification is temporarily disabled so updates can be installed while the internally signed certificate is not yet centrally trusted on target systems.
- The installer and application remain digitally signed; Windows SmartScreen and security software continue to inspect them unchanged.

## 1.2.6 - 11.08.2026
### Changed
- Test release for verifying automatic update downloads and the progress display introduced in version 1.2.5.

## 1.2.5 - 11.08.2026
### Added
- Update downloads show their status, a progress bar and the current percentage in the lower-left navigation area.
- The interface indicates when an update is ready to install and visibly reports download errors.

## 1.2.4 - 11.08.2026
### Added
- Articles can be removed individually or cleared completely from the article list.
- Before deletion, ProjectBuilder shows the projects using an article and provides direct navigation to each project position.
- Backups of articles, customers and projects can be created manually and restored selectively.
- Automatic backups can run daily, weekly or monthly; missed backups run at the next application start and the latest ten backups are retained.
### Changed
- Import pricelist and Backup & restore are grouped directly above the version information.
- The language selector always shows the native names “Deutsch”, “English” and “Español”, regardless of the active language.
### Fixed
- B21, B23 and B24 articles use their matching product images instead of the generic energy-meter icon.
- Direct navigation from customers, search results and usage notices correctly updates the active navbar section.

## 1.2.3 - 11.08.2026
### Changed
- The Windows application and installer are digitally signed with the ProjectBuilder code-signing certificate.
- The public certificate is attached to the release for review and controlled distribution by corporate IT.

## 1.2.2 - 07.08.2026
### Changed
- Word tender exports now follow the official Janitza tender template with compact Arial typography, structured position numbering and consistent text indentation.
- Manufacturer, type, article number, quantity, unit price and total price are presented clearly and left-aligned below the technical tender text.
- A compact introduction supplements the project description with technical notes and the selected price basis.
- Spacing between the introduction, tender positions and commercial details was refined for a clearer document structure.

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
