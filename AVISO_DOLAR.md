# Aviso de variación del dólar al ingresar

Actualizar `Inversiones.gs` en Apps Script y publicar una nueva versión. La interfaz consulta una vez por sesión el par USD/BRL (PTAX venta del Banco Central do Brasil), usando la misma serie y caché de Inversiones.

Compara las últimas dos fechas de publicación disponibles, no el saldo de tenencias ni la moneda elegida para visualizar importes. Variación = (cotización actual / anterior − 1) × 100. Muestra el aviso cuando el valor absoluto es del 3% o más, tanto en subas como en bajas, sin límite superior. Ambas fechas y cotizaciones están visibles; en fines de semana pueden corresponder a los últimos días hábiles.

El usuario puede cerrar el aviso. El cierre se conserva al navegar y recargar durante esa sesión; con un nuevo login vuelve a comprobarse. Si no cierra el aviso, continúa visible al navegar. No hay consultas periódicas ni se impide el ingreso si falla la fuente. No utiliza una cotización ficticia cuando faltan dos publicaciones.
