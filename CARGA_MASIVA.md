# Carga masiva de movimientos

Control gastos → Nuevo movimiento → Carga Masiva permite descargar una plantilla .xlsx y cargarla para revisar y confirmar hasta 200 movimientos. Las listas de tipo, categoría, moneda y medio de pago son validaciones nativas de Excel, alimentadas por los catálogos de la cuenta al descargar. Fecha, descripción y monto se completan manualmente. La hoja Instrucciones explica los formatos. Período es opcional para gastos fijos y, si queda vacío, se usa el mes de la fecha.

El archivo se valida completo antes de permitir guardar. No admite fórmulas, montos negativos, categorías o medios no disponibles. BRL, USD y ARS siguen las mismas conversiones que el formulario manual. Las filas se guardan una por una, con progreso; ante un error se detiene y permite continuar. No hay rollback de filas ya guardadas.

Actualizar `codigo_app_script/Código.gs` y publicar una nueva versión antes de usar la carga. Se agrega `carga_masiva_id` a Movimientos. Cada archivo se identifica con SHA-256 y cada fila con su posición. El mismo archivo, para el mismo usuario, no duplica filas al reintentar o volver a cargarlo. Un archivo editado tiene otro identificador y se considera una nueva carga: no debe usarse para reintentar una importación parcial. Los gastos fijos también conservan el control de pagos duplicados por período existente.

El XLSX incluye una hoja oculta de listas y rangos con nombre; no utiliza macros ni conexiones externas. La lectura utiliza la biblioteca SheetJS ya incluida en el proyecto.
