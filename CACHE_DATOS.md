# Caché de datos durante la sesión

Las nueve páginas autenticadas cargan datos-cache.js antes de los módulos que
consultan Apps Script. Las lecturas autorizadas se reutilizan durante cinco
minutos en la misma pestaña, incluso al navegar entre páginas. Se utiliza
sessionStorage y, si el navegador no permite guardarlo, memoria de la página.

- La primera consulta se realiza al servidor.
- La caché distingue la implementación, los parámetros y el usuario con su sesión
  y permisos. No se comparte entre cuentas.
- Guardar, editar, eliminar, importar o registrar pagos invalida las lecturas.
  También se invalida si la escritura falla: el servidor pudo haberla completado.
- Los cambios en otra pestaña avisan a las demás para invalidar su caché.
- Los botones con identificadores refresh o retry fuerzan nuevas consultas.
- Recargar el documento manualmente elimina la caché antes de las consultas.
- Cerrar sesión, incluido el cierre por inactividad, borra la caché.
- No se guardan errores, consultas del chat, notificaciones ni optimizaciones de
  precios. Esas operaciones siguen consultando al servidor.

Los cambios hechos directamente en Google Sheets o desde otro dispositivo
se ven al actualizar manualmente o cuando vence la caché. La página HTML
sigue abriéndose al navegar; lo que se evita son las consultas repetidas de datos.

El límite aproximado es de dos millones de caracteres; se descartan las
consultas más antiguas si se supera. No requiere cambios ni despliegues de Apps Script.

Validación: node tests/datos-cache.test.js
