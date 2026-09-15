# Changelog

All notable changes to ProjectBuilder are documented here.

## 1.5.13 - 15.09.2026
### Added
- The customer-specific sales analysis can be exported as a complete PDF file in the desktop app.
- A new settings page provides a preferred local port and a browser mode that opens ProjectBuilder in the default browser after the update check and minimizes Electron.
- The project view is divided into Project data, Project structure, and Export sections.

### Improved
- If a preferred port is occupied, ProjectBuilder automatically starts on an available port; the port actually in use is shown in the navigation and settings.
- Customer and project tabs remain accessible while scrolling and use a consistent visual transition into their content.
- The project structure keeps the structure tree, favorites, article search, and article list together in one workspace.
- Duplicate internal back and forward buttons are hidden in the browser; Electron uses clearer navigation arrows.
- Price list, backup, and settings are clearly grouped in the lower navigation.

## 1.5.12 - 14.09.2026
### Added
- The customer detail view is divided into General, Projects, and Sales sections.
- The customer-specific sales overview adds five-year comparisons, average order values, and a labelled ten-year chart.

### Improved
- Projects and Salesforce sales data are loaded only when their tab is opened and are not queried again during normal tab changes.
- Expanded sections and the active customer tab are retained when the view is refreshed.

## 1.5.11 - 14.09.2026
### Added
- The customer view shows Salesforce order intake for the latest five years, including order count and percentage change from the previous year.
- “More details” provides five additional years and an interactive ten-year chart.
- Hovering chart points displays year, order count, order intake, and year-over-year change in a readable tooltip.

### Changed
- The order intake overview uses a compact two-line card layout with color-coded growth and decline.

## 1.5.10 - 14.09.2026
### Changed
- Project card spacing now matches the more compact customer view.
- Salesforce badges and action buttons, as well as the edit buttons for GridVis items and prices, are consistently aligned in the article table.
- The article information card now remains open while moving from the position text into the card; the position menu still does not trigger the card.

### Improved
- Project, customer, structure, and article data are loaded in parallel when opening a project. Salesforce links are added asynchronously and no longer block navigation.
- Only positions belonging to the open project are transferred. Off-screen search articles and their images now require substantially less layout work while resizing the project columns.

## 1.5.9 - 14.09.2026
### Changed
- The article information card now opens only over the text area and closes immediately at the position menu, preventing overlap with the thought-bubble trail.

### Fixed
- Quantity changes on newly added articles are now registered and saved correctly without reopening the project first.

## 1.5.8 - 14.09.2026
### Added
- Added articles show a structured information card after a short hover delay, including available master, pricing, discount, GridVis, and long-text data.
- A subtle, automatically aligned thought-bubble trail visually connects the information card to its article position.

## 1.5.7 - 14.09.2026
### Changed
- New product icons are shown for the 800-MF8 module, CT-AC-RCM transformers, and CT24 current transformers.
- CT24 cables and other transformer accessories use the neutral default icon again.

## 1.5.6 - 14.09.2026
### Added
- The header now provides browser-style back and forward buttons for navigating through visited views. Unavailable directions are disabled automatically.

## 1.5.5 - 14.09.2026
### Changed
- The “Add project” form now uses a compact single-row layout. Project name, customer, description, and the save button have a consistent height and rearrange responsively in smaller windows.

## 1.5.4 - 14.09.2026
### Added
- Projects can be created directly from the customer view, with the currently open customer assigned automatically.
- The project overview can be sorted ascending or descending by project name and customer using mouse or keyboard. Sorting remains active while searching.

### Changed
- The customer view uses more compact spacing and fields so assigned projects become visible without unnecessary scrolling.
- Additional information is collapsible, initially closed when empty, and grows with its content up to a limited height.
- The project view uses consistent compact typography. Long project names are shortened responsively while the complete name remains available as a tooltip.
- Project name, customer, and project discount now use the same compact field height as customer master data.

### Fixed
- CSS rules belonging to the project-overview form no longer affect fields with the same IDs in an open project.

## 1.5.3 - 14.09.2026
### Changed
- When a Salesforce action requires sign-in, users can connect directly from the notice and the original action is retried automatically.
- Delivery time detection now recognizes additional German and English field names as well as typical time values.
- Delivery time remains visible in the synchronization dialog. Missing field access or selectable values are explained instead of silently hiding the field.

## 1.5.2 - 14.09.2026
### Added
- Linked customers, opportunities, and quotes can be opened directly in Salesforce. Links are shown only for successfully synchronized records that still exist in Salesforce.
- The Salesforce success dialog provides direct links to the opportunity and quote and includes the quote number.

### Changed
- The left navigation is narrower while keeping “Import pricelist” fully visible.
- Salesforce synchronization caches reusable metadata, retrieves new quote details concurrently, and generates selected documents together to reduce waiting time.

### Fixed
- Delayed autosaves retain the values from their original customer or project view and can no longer clear customer data or project assignments after navigation through global search.

## 1.5.1 - 13.09.2026
### Changed
- GridVis items and prices have sufficiently wide columns so values and edit buttons remain readable without wrapping.
- The Salesforce synchronization dialog is wider and labels the GAEB document option as “Bill of quantities in GAEB”.

## 1.5.0 - 13.09.2026
### Added
- Projects can be duplicated with their complete structure and article positions from both the project overview and an open customer view.
- Salesforce synchronization now provides persistent settings for contact, delivery time, item grouping, and sending the opportunity alone or together with a quote.
- Overview plan, Excel, Word bill of quantities, and GAEB can be sent individually to the opportunity; repeated uploads create file versions and deselected files are retained.
- The overview plan is selected by default; GAEB defaults to an X82 cost estimate with list prices.
- The overview plan sent to Salesforce is a complete landscape A4 PDF with the initial overview page and all detail pages; discounted prices are displayed.
- The PDF overview plan uses the same node names, structure paths, and article images as the project view.

## 1.4.4 - 13.09.2026
### Fixed
- A synchronized draft quote is reused. If the synchronized quote has another status, a new draft is created; without a synchronized quote, the newest draft is selected automatically.

## 1.4.3 - 13.09.2026
### Added
- When several draft quotes belong to the opportunity, the quote to synchronize can be selected by quote number; a single draft is used automatically.

### Fixed
- A deleted most-recent quote no longer prevents an older quote returned to draft from being synchronized again.
- The Salesforce synchronization success message identifies the quote number actually used.

## 1.4.2 - 13.09.2026
### Added
- Before a Salesforce transfer, the contact and delivery time can be selected from the values available for the customer and quote in Salesforce.

### Fixed
- Switching to a new draft cleanly detaches the previously synchronized quote; a quote later returned to draft can be reused.
- Structured Salesforce errors display their actual message instead of `[object Object]`.

## 1.4.1 - 13.09.2026
### Fixed
- After a Salesforce transfer, the quote is now set as the opportunity's synchronized quote so it can be submitted for approval.

## 1.4.0 - 13.09.2026
### Added
- Projects can synchronize their regular, optional and alternative article positions to Salesforce as an opportunity and quote.
- The article overview can check all article numbers against the active Salesforce price book and displays availability next to each article number.
- Clearing the article list can remove all unused articles while referenced project articles remain protected.
- Salesforce availability badges persist across restarts together with the check time and currencies; imported Salesforce articles are marked as available immediately.
- Changing the selected Salesforce price book creates a new opportunity and quote when required instead of modifying existing Salesforce records with an incompatible price book.
- Active articles can be imported directly from a selectable Salesforce price book in a selectable currency.
- The German interface defaults to “Janitza Electronics (1100)” and EUR when no selection is stored; a combination previously selected in the English or Spanish interface remains active across languages.
- Salesforce and Excel imports merge existing articles by field; empty Excel values no longer remove existing data and detailed Excel text is retained during Salesforce updates.
- The Excel import labels protected empty and zero prices as ignored instead of ambiguously describing them as generally retained.
- ProjectBuilder calculates and totals required GridVis items for meters and modules. Automatic values are persisted and can be overridden per article.
- The project view provides a direct link back to the assigned customer below the project name.
### Changed
- Customer and product master data remains read-only; opportunity products and quote lines are synchronized through the German Janitza price book.
- Draft quotes are updated, while quotes that have progressed beyond draft cause a new draft to be created.
- Quote lines follow the order of the commercial Excel overview and receive a sequential Salesforce position.
- Customer discounts are stored on opportunity products and reflected in quote-line sales prices; the project discount is stored separately on the quote header.
- Salesforce line items are transferred in batches, substantially reducing the number of API requests.
- Independent Salesforce queries run concurrently, and synchronized quotes rely on Salesforce's automatic opportunity-line mirroring to reduce API requests further.
- The project summary uses the available horizontal space and displays required GridVis items separately.
- Customer search, metadata and action buttons remain compact in smaller windows.
### Fixed
- CT24 accessories, passive current transformers, power supplies, communication modules and the UMG 800 are no longer incorrectly counted as GridVis items.

## 1.3.0 - 12.09.2026
### Added
- Customers can be searched by customer number, name, postal code and city through the existing Salesforce SSO login and selectively imported into ProjectBuilder.
- Salesforce-linked customers can be refreshed individually or together from Salesforce.
- Customer data now includes separate address, postal-code and city fields as well as the time of the last Salesforce refresh.
### Changed
- The Salesforce integration accesses Salesforce in read-only mode; local discount groups and notes are preserved during refreshes.
- Missing Salesforce customer numbers also clear the local customer number without causing conflicts between customers without a number.
- Salesforce connections are prepared in the background and reused for fast subsequent requests.
- Search and refresh buttons display clear progress text while Salesforce requests are running.
### Fixed
- Salesforce selection dialogs close only when both mouse-down and mouse-up occur outside the dialog.
- Customer-list actions use consistent spacing and no longer touch the right edge of the window.

## 1.2.12 - 25.08.2026
### Fixed
- Active quantity changes are saved before moving, duplicating, deleting or reloading, preventing article quantities from reverting to `1`.

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
