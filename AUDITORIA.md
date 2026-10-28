# Registro de actividad de la plataforma

## Activación

Agregar `codigo_app_script/Auditoria.gs` y actualizar `Código.gs`, `ValidacionEmail.gs` y `SeguridadLogin.gs`. Publicar una nueva versión de Apps Script y recargar la app. La hoja `Auditoria` se crea automáticamente. Los administradores pueden consultarla en Configuración → General → Registro de actividad, con filtros por usuario, acción, resultado y fechas UTC, en páginas de 50 eventos. No hay opción de borrar ni editar el log desde la app. Las lecturas de este registro también se auditan.

## Estructura

| Campo | Contenido |
| --- | --- |
| evento_id | UUID para identificar y correlacionar el evento |
| fecha_utc | Momento del registro en ISO UTC; la interfaz muestra la hora local |
| actor_id / actor_usuario | Cuenta que hizo la petición; en un acceso fallido, cuenta identificada por el nombre introducido, sin afirmar que esté autenticada |
| accion | Acción del servidor, por ejemplo login, delete, update_wish_status |
| entidad / registro_id | Hoja y registro afectado, cuando la acción devuelve o recibe su ID |
| resultado | exito, fallo o sin_cambio (reintento duplicado) |
| codigo | Código de resultado disponible; si no lo hay, fallo genérico |
| antes / despues | Campos permitidos del registro, cuando se pudo obtener una captura |
| detalle | Campos solicitados y modificados, indicadores de duplicado, carga masiva y contadores disponibles |
| duracion_ms / origen | Tiempo de procesamiento y origen web, enlace_email o editor |

## Cobertura

- Inicios correctos y fallidos, bloqueo de tres intentos, recuperación y cierre de sesión.
- Alta de cuentas, validación de correo, solicitud de reenvío, cambio de contraseña y desbloqueo desde el editor.
- Creación, edición y eliminación mediante las acciones de la plataforma: movimientos, gastos fijos, tenencias, objetivos, Wishlist, productos, medios de pago, supermercados, categorías, etiquetas y preferencias.
- Importaciones como eventos de lote. La carga masiva de movimientos genera un evento por petición/fila. Las importaciones por banco y gastos fijos registran los contadores que devuelve la acción; no generan automáticamente capturas de cada fila interna.
- Solicitudes rechazadas también quedan registradas. Una solicitud de reenvío usa respuesta genérica: el log no afirma que el correo haya sido enviado.

## Privacidad y límites

No se copian campos de contraseñas, hashes, salts, tokens, claves API, correos, documentos, imágenes, direcciones de perfil, archivos importados ni texto de las consultas a Fino. Los snapshots usan una lista explícita de campos permitidos; pueden incluir descripciones y montos financieros, por lo que deben tratarse como información privada. El texto de Wishlist no se replica en la auditoría. Los identificadores desconocidos introducidos en el login no se guardan.

Antes/después son capturas alrededor de la operación, no una transacción de base de datos: dos acciones concurrentes pueden modificar el registro entre capturas. Algunos cambios de preferencias solo dejan la lista de campos solicitados. Las operaciones por lotes no tienen detalle por cada fila interna. Un resultado fallido puede haber realizado escrituras parciales si la función original trabaja por lotes; el log describe el resultado de la petición, no garantiza rollback.

Si falla la escritura del log, se intenta guardar una copia sin snapshots en propiedades del script y recuperarla en la siguiente acción auditada. La respuesta incluye `auditoria_pendiente`; la vista de administración informa la cantidad pendiente. Si también falla el almacenamiento en propiedades, se registra `AUDIT_WRITE_FAILED` con el ID en el registro de ejecuciones. El guardado de negocio y el de auditoría no son atómicos. Un fallo después de escribir pero antes de confirmar puede producir dos filas con el mismo evento_id al recuperar; ese ID permite reconocerlas.

La auditoría comienza con esta versión; no reconstruye acciones anteriores. Los cambios manuales en Google Sheets o funciones ejecutadas directamente en el editor no se interceptan, salvo el desbloqueo específicamente instrumentado. Los cambios automáticos de esquema o migraciones al leer hojas tampoco generan un evento por celda. Apps Script no proporciona aquí una IP confiable del cliente: no se inventa ni se usa una IP enviada por el navegador.

## Operación recomendada

Restringir el acceso de edición al Google Sheet y al proyecto Apps Script a los administradores necesarios. Realizar copias periódicas de la hoja de auditoría según el volumen; esta versión no elimina ni archiva automáticamente registros. El log no es inmutable frente a alguien con permisos para editar el Sheet. Revisar fallos, bloqueos y eventos pendientes desde General, y verificar los registros de ejecuciones si aparece `AUDIT_WRITE_FAILED`.
