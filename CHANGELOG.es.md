# Registro de cambios

Aquí se documentan todos los cambios importantes de ProjectBuilder.

## 1.2.1 - 20.07.2026
### Modificado
- La versión mostrada, la interfaz del registro y la eliminación de proyectos están completamente localizadas en alemán, inglés y español.
- El registro de cambios completo está disponible en los tres idiomas y se carga según el idioma activo.
### Corregido
- La búsqueda global encuentra posiciones en todas las estructuras sin tener que abrir antes el proyecto correspondiente.
- Los resultados de otros proyectos muestran el proyecto y la ruta completa y abren directamente la posición encontrada.

## 1.2.0 - 20.07.2026
### Nuevo
- Búsqueda global de clientes, proyectos, artículos y posiciones en las estructuras de proyecto.
- Resultados agrupados manejables con ratón, flechas y `Ctrl + K`; las posiciones se abren, despliegan y resaltan automáticamente.
- Interfaz en alemán, inglés y español con selección gráfica de idioma persistente.
### Modificado
- El título redundante fue sustituido por el logotipo de Janitza y el encabezado es más compacto.
- La búsqueda global está en la barra lateral y muestra los resultados a su derecha sin desplazar el contenido.
- El alemán es el idioma de reserva; los proyectos también se encuentran por el cliente asignado.

## 1.1.1 - 18.07.2026
### Modificado
- La estructura del proyecto es un diez por ciento más ancha de forma predeterminada, puede redimensionarse y guarda su ancho por proyecto.

## 1.1.0 - 18.07.2026
### Nuevo
- Los detalles del cliente muestran sus proyectos con navegación directa.
- Los proyectos permiten exportar licitaciones Word y GAEB, con fases X81–X84 y precios configurables.
- Los artículos manuales incluyen un campo específico para el texto largo de licitación.
### Modificado
- Word utiliza tipografía técnica compacta e información estructurada de posición, fabricante, tipo y artículo.
- Las posiciones opcionales y alternativas tienen totales separados; las filas navegables muestran mejor su interacción.
### Corregido
- Las tablas son DOCX válidos, las descargas se verifican como DOCX y las rutas de exportación desconocidas ya no devuelven la aplicación HTML.

## 1.0.9 - 17.07.2026
### Nuevo
- Los puntos de medición admiten propiedades de recopilación; las posiciones pueden ser opcionales o alternativas y quedan fuera del total normal.
### Modificado
- Los planos y exportaciones incluyen las nuevas propiedades.

## 1.0.8 - 16.07.2026
### Corregido
- Las cantidades editadas se conservan al duplicar, eliminar o recargar inmediatamente la estructura.

## 1.0.7 - 13.07.2026
### Nuevo
- Plano SVG generado con zoom, desplazamiento, impresión, páginas generales/detalladas y visualización opcional de precios.
### Modificado
- La estructura alterna entre precios de lista y descontados; las etiquetas largas se ajustan y las páginas detalladas arrancan con precios descontados y artículos visibles.
### Corregido
- Los totales del encabezado solo incluyen posiciones del proyecto abierto.

## 1.0.6 - 13.07.2026
### Corregido
- Los subtotales de la vista de impresión inicial usan precios descontados sin alterar las vistas de precios separadas.

## 1.0.5 - 13.07.2026
### Corregido
- Los iconos se localizan independientemente del directorio de trabajo y vuelven a incluirse en las exportaciones Excel de Electron.

## 1.0.4 - 11.07.2026
### Modificado
- El resumen compacto de precios pasó al encabezado y dejó más espacio para la estructura.
### Corregido
- El resumen de precios responde correctamente en ventanas estrechas.

## 1.0.3 - 11.07.2026
### Modificado
- El registro usa toda la vista; los inicios Electron y Node reconstruyen los módulos SQLite para su entorno.
### Corregido
- El registro ya no queda comprimido y Electron no falla por incompatibilidad ABI después de pruebas Node.

## 1.0.2 - 11.07.2026
### Nuevo
- Registro integrado accesible mediante el icono de libro; la versión mostrada procede de `package.json`.
### Modificado
- La versión de navegación ya no está codificada de forma fija.

## 1.0.1 - 11.07.2026
### Nuevo
- Favoritos, orden, estado plegado y descripciones persisten en SQLite; los ajustes compatibles del navegador se migran una vez.
### Corregido
- Los favoritos sobreviven al cambio de puerto Express y el flujo publica instalador, blockmap y metadatos de actualización.

## 1.0.0 - 11.07.2026
### Nuevo
- Primera versión instalable para Windows con Electron, servidor Express interno, NSIS, actualizaciones, base de datos persistente, icono y accesos directos.
### Modificado
- Se eliminó el menú Electron y los datos de usuario se separaron del directorio de instalación.
### Incluido
- Gestión de clientes, artículos, listas y proyectos, estructuras jerárquicas, favoritos, cálculos y exportación Excel.
