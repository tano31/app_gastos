# Idiomas de la interfaz

Las cinco páginas muestran arriba a la derecha la bandera del idioma seleccionado y una flecha. Al abrir el desplegable aparecen los otros dos idiomas: Argentina (ES), Brasil (PT) y Estados Unidos (EN). El cambio es inmediato y conserva formularios, filtros y selección de archivos. El desplegable se cierra al seleccionar, hacer clic afuera, salir con Tab o presionar Escape.

`i18next.min.js` es la biblioteca local descargada por el usuario y se carga primero en las cinco páginas. `translations.js` contiene los diccionarios con claves estables en español, portugués de Brasil e inglés. `i18n.js` inicializa i18next con esos recursos, español como respaldo, claves planas e interpolación con `{parametro}`; además aplica los textos marcados con `data-i18n` y adapta los mensajes dinámicos existentes. `i18n.css` y los SVG de `img/flag-*.svg` presentan el selector. Todos son archivos locales: no hay dependencia de un servicio de traducción ni de un CDN.

La preferencia se guarda en `controlGastos.language` en localStorage. También se propaga mediante `?lang=es`, `?lang=pt` o `?lang=en` en enlaces y redirecciones, para navegar entre archivos `file://` cuando el navegador aísla el almacenamiento por archivo.

Se traducen títulos, navegación, botones, etiquetas de campos, placeholders, confirmaciones y mensajes conocidos. No se traducen las descripciones, categorías, etiquetas o valores de tipos y medios de pago, contenido de Sheets, CSV ni nombres de archivos. El formato existente de importes BRL permanece igual. Las etiquetas del selector de tablas de Configuración son textos de navegación, no registros del diccionario.

Para agregar un texto estático, crear la misma clave en los tres diccionarios y marcar el elemento con `data-i18n="clave"`. Para un placeholder usar `data-i18n-placeholder="clave"`. Marcar solo el texto, evitando elementos que contengan iconos o controles.

Para un estado dinámico, usar `I18n.message(elemento, textoOriginalEnEspañol)`: conserva el mensaje original y lo vuelve a traducir cuando cambia el idioma. Las plantillas usan parámetros como `{count}`, `{row}` y `{error}`; los datos interpolados se conservan. Los errores conocidos del backend se traducen en el frontend, y los desconocidos mantienen el detalle original. `I18n.t(clave, parametros)` sirve para confirmaciones y textos que no permanecen en el DOM. `I18n.page('index.html')` conserva el idioma en redirecciones.

Pruebas locales con Node.js: `node tests/i18n.test.js`. Para comprobar visualmente, abrir cada página, cambiar entre las tres banderas, navegar a otra página, comprobar un mensaje de validación y verificar que categorías, tipos, medios y vista previa del CSV siguen conservando sus datos. Para usar estos cambios no hace falta actualizar Apps Script.
