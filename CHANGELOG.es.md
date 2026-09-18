# Registro de cambios

Aquí se documentan todos los cambios importantes de ProjectBuilder.

## 1.5.27 - 18.09.2026

### Nuevo

- La vista general de proyectos ofrece ahora un menú de acciones ampliable con eliminar y acciones directas de Salesforce para enviar y cargar.
- La duplicación directa sigue disponible como acción rápida visible.

## 1.5.26 - 17.09.2026

### Mejorado

- El resumen de ventas presenta ahora las métricas, el resumen de diez años y la evolución de pedidos en secciones claramente separadas.
- La evolución de pedidos utiliza el ancho disponible y un área de gráfico más grande.
- El diseño se adapta a pantallas pequeñas y sigue optimizado para la exportación a PDF.

## 1.5.25 - 17.09.2026

### Nuevo

- El resumen de clientes muestra el propietario de la cuenta de Salesforce directamente después del nombre del cliente.

### Mejorado

- Los propietarios de cuenta se importan desde Salesforce y se pueden filtrar mediante la búsqueda de clientes y ordenar con el encabezado de la columna.

## 1.5.24 - 17.09.2026

### Nuevo

- La búsqueda de artículos de un proyecto puede buscar opcionalmente en todos los datos disponibles, en lugar de limitarse al número y al nombre del artículo.

### Mejorado

- Todas las columnas del resumen de clientes pueden ordenarse de forma ascendente o descendente.
- Las entradas de navegación Clientes y Proyectos siguen siendo accesos claramente clicables a sus páginas principales desde las vistas de detalle.

### Corregido

- El enlace directo a Salesforce vuelve a mostrarse para los clientes vinculados.
- Los descuentos de clientes también se calculan a partir de posiciones históricas de oportunidades de Salesforce que solo contienen el precio de lista y de venta, sin un descuento base separado.

## 1.5.23 - 16.09.2026

### Mejorado

- Los pedidos históricos de Salesforce se completan de forma fiable a partir de las posiciones netas reales, sin utilizar precios de lista.
- Los pedidos sin posiciones y los pedidos con un importe neto de cero se consideran completos y ya no bloquean las comparaciones anuales ni los promedios históricos.
- Para los años realmente incompletos, el resumen de ventas muestra claramente el total parcial conocido, la cobertura de datos y los números de pedido afectados.

## 1.5.22 - 16.09.2026

### Mejorado

- El resumen de ventas sigue utilizando los importes reales de pedido disponibles y completa de forma eficiente los importes de cabecera ausentes a partir de posiciones netas de pedido completamente disponibles.
- Los años con importes incompletos muestran su cobertura de datos y se excluyen de los cálculos de promedio, evolución y gráfico.

## 1.5.21 - 16.09.2026

### Mejorado

- Las sesiones de Salesforce ausentes o caducadas ofrecen ahora iniciar sesión directamente desde todas las acciones de Salesforce y vuelven a intentar automáticamente la operación original.
- La importación de clientes sigue disponible cuando solo los datos opcionales de descuentos no están disponibles debido a un mantenimiento temporal; se conservan los descuentos locales existentes.

### Corregido

- Las páginas HTML de mantenimiento de servicios externos ya no se muestran sin filtrar en el diálogo de clientes de Salesforce.

## 1.5.20 - 16.09.2026

### Nuevo

- Los proyectos vinculados pueden cargarse directamente desde el proyecto abierto utilizando el archivo de ProjectBuilder más reciente de su oportunidad de Salesforce. Se solicita confirmación antes de sustituir por completo el proyecto local.

### Mejorado

- Las acciones de Salesforce se muestran de forma uniforme una junto a otra en el área de exportación: «Enviar a Salesforce» a la izquierda y «Cargar desde Salesforce» a la derecha.

## 1.5.19 - 15.09.2026

### Nuevo

- Los proyectos pueden exportarse e importarse como archivos independientes `.projectbuilder.json`.
- Los envíos a Salesforce pueden adjuntar opcionalmente el archivo completo del proyecto a la oportunidad. La opción está activa de forma predeterminada, se guarda por proyecto y los envíos posteriores crean versiones del archivo.
- Los proyectos pueden restaurarse directamente desde el archivo de ProjectBuilder más reciente de una oportunidad de Salesforce. Los clientes locales que falten se importan desde Salesforce.

### Mejorado

- La importación de proyectos permite elegir entre «Desde archivo» y «Desde Salesforce». Se eliminó la importación heredada desde Excel y las nuevas exportaciones de Excel ya no contienen una hoja técnica de importación.
- Los vínculos de Salesforce se administran por proyecto y cliente. Al cambiar de cliente se utiliza otra oportunidad y, al volver al cliente original, puede reutilizarse la oportunidad anterior.
- El área de exportación organiza claramente cuatro acciones de documentos y destaca el envío a Salesforce como acción final.

## 1.5.18 - 15.09.2026

### Nuevo

- Al importar o actualizar clientes de Salesforce, se recuperan los descuentos disponibles de PG1 a PG8 a partir de las posiciones de oportunidad calculadas de forma inequívoca más recientes. Los grupos sin una coincidencia fiable permanecen sin cambios.

## 1.5.17 - 15.09.2026

### Mejorado

- Las importaciones de listas de precios de Salesforce ahora asignan automáticamente los grupos de precios de las líneas de distribución de la organización de ventas 1100 y el canal 10 a PG1–PG8.
- Los grupos de descuento pueden modificarse o eliminarse manualmente en la vista de artículos; las asignaciones manuales se conservan en futuras importaciones de Salesforce y se incluyen en las copias de seguridad.

## 1.5.16 - 15.09.2026

### Corregido

- Los descuentos del cliente se transfieren a Salesforce como descuentos base en lugar de descuentos adicionales y se muestran correctamente en el PDF de la oferta cuando está activada su visualización.
- Las ofertas ya sincronizadas se desvinculan de forma controlada antes de actualizarlas y se vuelven a sincronizar con todas las posiciones actualizadas.

### Mejorado

- “Mostrar descuento”, “Mostrar siempre el descuento adicional” y “Exportar oferta” pueden seleccionarse por separado y se guardan de forma permanente para cada proyecto.

## 1.5.15 - 15.09.2026

### Mejorado

- Al enviar ofertas a Salesforce, se puede seleccionar el código fiscal aplicable; Salesforce calcula a partir de él el porcentaje y el importe del impuesto.
- ProjectBuilder copia las funciones de interlocutor, las direcciones de facturación y envío y el idioma desde la cuenta de Salesforce.
- El grupo de clientes, la lista de precios, las condiciones de pago, los Incoterms y las condiciones de envío se copian de los datos del área de ventas de SAP para la organización de ventas 1100 y el canal de distribución 10.
- La condición del plazo de entrega se completa con el valor de Salesforce “after receipt of order”.

## 1.5.14 - 15.09.2026
### Corregido
- Los descuentos de grupos de precios específicos del cliente vuelven a cargarse correctamente en los proyectos y se aplican al cálculo de precios.
- Los proyectos vacíos vuelven a mostrar 0 elementos GridVis necesarios en lugar de 1.
- Al enviar una oferta a Salesforce se puede seleccionar «Mostrar descuento»; se transfiere el código del país de facturación para que Salesforce calcule correctamente «Exportar oferta» para clientes extranjeros y lo muestre como vista previa automática.

## 1.5.13 - 15.09.2026
### Nuevo
- El análisis de ventas específico del cliente se puede exportar como un archivo PDF completo en la aplicación de escritorio.
- Una nueva página de configuración ofrece un puerto local preferido y un modo de navegador que abre ProjectBuilder en el navegador predeterminado después de comprobar las actualizaciones y minimiza Electron.
- La vista del proyecto se divide en Datos del proyecto, Estructura del proyecto y Exportar.

### Mejorado
- Si el puerto preferido está ocupado, ProjectBuilder se inicia automáticamente en un puerto disponible; el puerto realmente utilizado aparece en la navegación y la configuración.
- Las pestañas de clientes y proyectos permanecen accesibles al desplazarse y utilizan una transición visual uniforme hacia el contenido.
- La estructura del proyecto mantiene juntos el árbol, los favoritos, la búsqueda y la lista de artículos en un único espacio de trabajo.
- En el navegador se ocultan los botones internos duplicados de atrás y adelante; Electron utiliza flechas de navegación más claras.
- La lista de precios, las copias de seguridad y la configuración están agrupadas claramente en la navegación inferior.

## 1.5.12 - 14.09.2026
### Nuevo
- La vista detallada del cliente se divide en las secciones General, Proyectos y Ventas.
- El resumen de ventas específico del cliente añade comparaciones de cinco años, valores medios de pedido y un gráfico de diez años etiquetado.

### Mejorado
- Los proyectos y los datos de ventas de Salesforce solo se cargan al abrir su pestaña y no se vuelven a consultar durante cambios normales de pestaña.
- Las secciones desplegadas y la pestaña activa del cliente se conservan al actualizar la vista.

## 1.5.11 - 14.09.2026
### Nuevo
- La vista del cliente muestra la entrada de pedidos de Salesforce de los últimos cinco años, incluida la cantidad de pedidos y la variación porcentual respecto al año anterior.
- “Más detalles” ofrece cinco años adicionales y un gráfico interactivo de diez años.
- Al pasar el puntero sobre los puntos del gráfico se muestran el año, la cantidad de pedidos, la entrada de pedidos y la variación interanual.

### Modificado
- El resumen de entrada de pedidos utiliza tarjetas compactas de dos líneas y distingue por color el crecimiento y la disminución.

## 1.5.10 - 14.09.2026
### Modificado
- El espaciado de las tarjetas del proyecto ahora coincide con la vista compacta del cliente.
- Las insignias de Salesforce y los botones de acción, así como los botones de edición de elementos GridVis y precios, están alineados de forma uniforme en la tabla de artículos.
- La tarjeta informativa del artículo permanece abierta al mover el puntero desde el texto de la posición hasta la tarjeta; el menú de posición sigue sin activarla.

### Mejorado
- Los datos del proyecto, cliente, estructura y artículos se cargan en paralelo. Los enlaces de Salesforce se añaden después y ya no bloquean el cambio de página.
- Solo se transfieren las posiciones del proyecto abierto. Los artículos de búsqueda no visibles y sus imágenes requieren considerablemente menos trabajo de diseño al redimensionar las columnas.

## 1.5.9 - 14.09.2026
### Modificado
- La tarjeta informativa del artículo ahora se abre solo sobre el área de texto y se cierra inmediatamente en el menú de posición, evitando que se superponga con la estela de la burbuja.

### Corregido
- Los cambios de cantidad en artículos recién añadidos ahora se registran y guardan correctamente sin tener que volver a abrir el proyecto.

## 1.5.8 - 14.09.2026
### Nuevo
- Los artículos añadidos muestran, tras una breve pausa, una tarjeta estructurada con los datos maestros, precios, descuentos, GridVis y texto largo disponibles.
- Una sutil estela de burbuja de pensamiento, alineada automáticamente, conecta visualmente la tarjeta informativa con la posición del artículo.

## 1.5.7 - 14.09.2026
### Modificado
- Se muestran nuevos iconos de producto para el módulo 800-MF8 y los transformadores CT-AC-RCM y CT24.
- Los cables CT24 y otros accesorios de transformadores vuelven a utilizar el icono predeterminado neutro.

## 1.5.6 - 14.09.2026
### Añadido
- El encabezado ahora incluye botones de retroceso y avance similares a los del navegador para recorrer las vistas visitadas. Las direcciones no disponibles se desactivan automáticamente.

## 1.5.5 - 14.09.2026
### Cambiado
- El formulario «Añadir proyecto» ahora utiliza un diseño compacto en una sola fila. El nombre del proyecto, el cliente, la descripción y el botón de guardar tienen una altura uniforme y se reorganizan de forma adaptable en ventanas pequeñas.

## 1.5.4 - 14.09.2026
### Nuevo
- Los proyectos se pueden crear directamente desde la vista del cliente y el cliente abierto se asigna automáticamente.
- La vista general de proyectos se puede ordenar de forma ascendente o descendente por nombre de proyecto y cliente mediante ratón o teclado. El orden se conserva durante la búsqueda.

### Modificado
- La vista del cliente utiliza espacios y campos más compactos para mostrar los proyectos asignados sin desplazamiento innecesario.
- La información adicional es plegable, permanece cerrada inicialmente si está vacía y crece con el contenido hasta una altura limitada.
- La vista del proyecto utiliza una tipografía compacta y uniforme. Los nombres largos se acortan de forma adaptable y el nombre completo permanece disponible como ayuda emergente.
- El nombre del proyecto, el cliente y el descuento utilizan la misma altura compacta que los datos maestros del cliente.

### Corregido
- Las reglas CSS del formulario de la vista general de proyectos ya no afectan a campos con los mismos identificadores dentro de un proyecto abierto.

## 1.5.3 - 14.09.2026
### Modificado
- Cuando una acción de Salesforce requiere iniciar sesión, el usuario puede conectarse directamente desde el aviso y la acción original se repite automáticamente.
- La detección del plazo de entrega reconoce más nombres de campo en alemán e inglés y valores de tiempo habituales.
- El plazo de entrega permanece visible en el diálogo de sincronización. La falta de acceso al campo o de valores seleccionables se explica en lugar de ocultar el campo.

## 1.5.2 - 14.09.2026
### Nuevo
- Los clientes, oportunidades y ofertas vinculados se pueden abrir directamente en Salesforce. Los enlaces solo aparecen para registros sincronizados correctamente que siguen existiendo en Salesforce.
- El diálogo de confirmación de Salesforce ofrece enlaces directos a la oportunidad y la oferta e incluye el número de oferta.

### Modificado
- La navegación izquierda es más estrecha y mantiene completamente visible «Importar lista de precios».
- La sincronización con Salesforce reutiliza metadatos almacenados, obtiene en paralelo los datos de ofertas nuevas y genera conjuntamente los documentos seleccionados para reducir la espera.

### Corregido
- Los guardados automáticos retardados conservan los valores de su vista original y ya no pueden vaciar datos de clientes ni asignaciones de proyectos al navegar mediante la búsqueda global.

## 1.5.1 - 13.09.2026
### Modificado
- Los elementos GridVis y los precios tienen columnas suficientemente anchas para mostrar los valores y botones de edición sin saltos de línea.
- El diálogo de sincronización con Salesforce es más ancho y denomina la opción GAEB «Pliego en GAEB».

## 1.5.0 - 13.09.2026
### Nuevo
- Los proyectos se pueden duplicar con toda su estructura y posiciones tanto desde la vista general de proyectos como desde la vista de un cliente abierto.
- La sincronización con Salesforce ofrece ajustes persistentes para el contacto, el plazo de entrega, la agrupación de artículos y el envío solo de la oportunidad o junto con una oferta.
- El plano general, Excel, el pliego en Word y GAEB pueden enviarse individualmente a la oportunidad; los reenvíos crean versiones y los archivos desmarcados se conservan.
- El plano general está seleccionado por defecto; GAEB usa por defecto una estimación de costes X82 con precios de lista.
- El plano general enviado a Salesforce es un PDF A4 horizontal completo con la primera página general y todas las páginas detalladas; muestra los precios descontados.
- El plano general en PDF utiliza los mismos nombres de nodos, rutas de estructura e imágenes de artículos que la vista del proyecto.

## 1.4.4 - 13.09.2026
### Corregido
- Se reutiliza el borrador sincronizado. Si la oferta sincronizada tiene otro estado, se crea un borrador nuevo; si no hay oferta sincronizada, se utiliza automáticamente el borrador más reciente.

## 1.4.3 - 13.09.2026
### Nuevo
- Si hay varios borradores de oferta en la oportunidad, se puede seleccionar por número la oferta que se sincronizará; si solo hay uno, se utiliza automáticamente.

### Corregido
- La eliminación de la última oferta utilizada ya no impide volver a sincronizar una oferta anterior que haya regresado al estado de borrador.
- El mensaje de éxito de la sincronización con Salesforce indica el número de oferta utilizado.

## 1.4.2 - 13.09.2026
### Nuevo
- Antes de transferir a Salesforce, se pueden seleccionar el contacto y el plazo de entrega entre los valores disponibles en Salesforce.

### Corregido
- Al cambiar a un nuevo borrador se desvincula correctamente la oferta sincronizada anteriormente; una oferta que vuelva a borrador puede reutilizarse.
- Los errores estructurados de Salesforce muestran su mensaje real en lugar de `[object Object]`.

## 1.4.1 - 13.09.2026
### Corregido
- Tras la transferencia a Salesforce, la oferta se establece ahora como oferta sincronizada de la oportunidad para que pueda enviarse a aprobación.

## 1.4.0 - 13.09.2026
### Nuevo
- Los proyectos pueden sincronizar sus posiciones de artículos regulares, opcionales y alternativos con Salesforce como oportunidad y oferta.
- La vista de artículos puede comprobar todos los números de artículo en la lista de precios activa de Salesforce y muestra la disponibilidad junto a cada número.
- Al vaciar la lista se pueden eliminar todos los artículos no utilizados mientras se protegen los artículos referenciados por proyectos.
- Los indicadores de disponibilidad de Salesforce se conservan tras reiniciar junto con la fecha de comprobación y las monedas; los artículos importados se marcan inmediatamente como disponibles.
- Al cambiar la lista de precios de Salesforce seleccionada se crean, cuando es necesario, una nueva oportunidad y una nueva oferta en lugar de modificar registros existentes con una lista incompatible.
- Los artículos activos pueden importarse directamente desde una lista de precios de Salesforce y en una moneda seleccionables.
- La interfaz alemana utiliza por defecto «Janitza Electronics (1100)» y EUR cuando no hay una selección guardada; una combinación elegida previamente en la interfaz inglesa o española se conserva al cambiar de idioma.
- Las importaciones de Salesforce y Excel combinan los artículos existentes por campo; los valores vacíos de Excel no eliminan datos y los textos detallados de Excel se conservan al actualizar desde Salesforce.
- La importación de Excel identifica claramente los precios vacíos y cero protegidos como ignorados en lugar de describirlos de forma ambigua como conservados.
- ProjectBuilder calcula y suma los ítems de GridVis necesarios para medidores y módulos. Los valores automáticos se guardan y pueden sobrescribirse por artículo.
- La vista del proyecto ofrece un acceso directo al cliente asignado debajo del nombre del proyecto.
### Modificado
- Los datos maestros de clientes y productos permanecen en modo de solo lectura; los productos de oportunidad y las posiciones de oferta se sincronizan mediante la lista de precios alemana de Janitza.
- Las ofertas en borrador se actualizan; si una oferta ya ha avanzado, se crea automáticamente un nuevo borrador.
- Las posiciones de oferta siguen el orden del resumen comercial de Excel y reciben una posición consecutiva en Salesforce.
- Los descuentos de cliente se guardan en los productos de oportunidad y se reflejan en el precio de venta de las posiciones; el descuento del proyecto se guarda por separado en la cabecera de la oferta.
- Las posiciones de Salesforce se transfieren por lotes, reduciendo considerablemente el número de solicitudes API.
- Las consultas independientes de Salesforce se ejecutan en paralelo y las ofertas sincronizadas utilizan la transferencia automática de posiciones a la oportunidad para reducir aún más las solicitudes API.
- El resumen del proyecto aprovecha el espacio horizontal y muestra por separado los ítems de GridVis necesarios.
- La búsqueda, los metadatos y las acciones de clientes permanecen compactos en ventanas pequeñas.
### Corregido
- Los accesorios CT24, transformadores de corriente pasivos, fuentes de alimentación, módulos de comunicación y el UMG 800 ya no se contabilizan incorrectamente como ítems de GridVis.

## 1.3.0 - 12.09.2026
### Nuevo
- Los clientes pueden buscarse por número, nombre, código postal y ciudad mediante el acceso SSO existente de Salesforce e importarse selectivamente en ProjectBuilder.
- Los clientes vinculados con Salesforce pueden actualizarse individualmente o en conjunto desde Salesforce.
- Los datos del cliente incluyen ahora campos separados para dirección, código postal y ciudad, además de la fecha de la última actualización desde Salesforce.
### Modificado
- La integración accede a Salesforce en modo de solo lectura; los grupos de descuento y las notas locales se conservan durante las actualizaciones.
- Si Salesforce no contiene un número de cliente, también se vacía el número local sin provocar conflictos entre clientes sin número.
- Las conexiones de Salesforce se preparan en segundo plano y se reutilizan para acelerar las consultas posteriores.
- Los botones de búsqueda y actualización muestran el progreso mientras se ejecutan consultas de Salesforce.
### Corregido
- Los diálogos de selección de Salesforce solo se cierran cuando tanto la pulsación como la liberación del ratón ocurren fuera del diálogo.
- Las acciones de la lista de clientes mantienen espacios consistentes y ya no quedan pegadas al borde derecho.

## 1.2.12 - 25.08.2026
### Corregido
- Los cambios de cantidad activos se guardan antes de mover, duplicar, eliminar o recargar, evitando que las cantidades de artículos vuelvan a `1`.

## 1.2.11 - 14.08.2026
### Modificado
- Las vistas detalladas utilizan una página independiente por campo para mantener legibles las distribuciones grandes.
- Cada fila muestra como máximo seis puntos de medición; los puntos adicionales pasan automáticamente a filas nuevas.
- Las distribuciones sin campos siguen utilizando su propia página detallada.

## 1.2.10 - 11.08.2026
### Modificado
- Los botones, menús, encabezados de tablas, formularios y mensajes de las vistas de artículos, clientes, proyectos y listas de precios están completamente traducidos al alemán, inglés y español.
- Los diálogos estándar y los diálogos nativos de actualización y selección de carpetas también utilizan ahora el idioma seleccionado.
### Corregido
- Las interfaces en inglés y español ya no muestran etiquetas fijas en alemán.

## 1.2.9 - 11.08.2026
### Nuevo
- La importación reconoce automáticamente nombres de columnas en alemán e inglés, además de variantes habituales de formato.
- Las listas en EUR, GBP, USD y AUD conservan la moneda indicada en la columna correspondiente de cada archivo.
### Modificado
- Las listas no compatibles muestran un mensaje claro cuando no se encuentra una columna reconocida de número de artículo.

## 1.2.8 - 11.08.2026
### Modificado
- Versión de prueba para verificar la actualización automática desde la versión 1.2.7 sin verificación adicional del editor.

## 1.2.7 - 11.08.2026
### Modificado
- La verificación adicional del editor del actualizador automático se desactiva temporalmente para permitir actualizaciones mientras el certificado firmado internamente aún no sea de confianza central en los equipos de destino.
- El instalador y la aplicación siguen estando firmados digitalmente; Windows SmartScreen y el software de seguridad continúan comprobándolos sin cambios.

## 1.2.6 - 11.08.2026
### Modificado
- Versión de prueba para verificar la descarga automática de actualizaciones y la barra de progreso introducida en la versión 1.2.5.

## 1.2.5 - 11.08.2026
### Nuevo
- Las descargas de actualizaciones muestran su estado, una barra de progreso y el porcentaje actual en la parte inferior izquierda.
- La interfaz indica cuándo una actualización está lista para instalarse y muestra los errores de descarga.

## 1.2.4 - 11.08.2026
### Nuevo
- Los artículos se pueden eliminar individualmente o borrar por completo de la lista de artículos.
- Antes de eliminarlos, ProjectBuilder muestra los proyectos que utilizan el artículo y permite saltar directamente a cada posición del proyecto.
- Se pueden crear copias manuales de artículos, clientes y proyectos y restaurar áreas seleccionadas.
- Las copias automáticas pueden ejecutarse diaria, semanal o mensualmente; las copias pendientes se realizan al iniciar la aplicación y se conservan las diez más recientes.
### Modificado
- Importar lista de precios y Copia y restauración están agrupados directamente encima de la información de versión.
- El selector de idioma siempre muestra los nombres nativos “Deutsch”, “English” y “Español”, independientemente del idioma activo.
### Corregido
- Los artículos B21, B23 y B24 usan sus imágenes de producto correspondientes en lugar del icono genérico de medidor de energía.
- La navegación directa desde clientes, resultados de búsqueda y avisos de uso actualiza correctamente la sección activa de la barra lateral.

## 1.2.3 - 11.08.2026
### Modificado
- La aplicación de Windows y el instalador se firman digitalmente con el certificado de firma de código de ProjectBuilder.
- El certificado público se adjunta a la versión para su revisión y distribución controlada por el departamento de TI.

## 1.2.2 - 07.08.2026
### Modificado
- La exportación de licitaciones a Word sigue ahora la plantilla oficial de Janitza, con tipografía Arial compacta, numeración estructurada y sangrías uniformes.
- El fabricante, tipo, número de artículo, cantidad, precio unitario y precio total aparecen claramente alineados a la izquierda debajo del texto técnico.
- Una introducción compacta complementa la descripción del proyecto con indicaciones técnicas y la base de precios seleccionada.
- Se ajustaron los espacios entre la introducción, las posiciones y los datos comerciales para mejorar la estructura del documento.

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
