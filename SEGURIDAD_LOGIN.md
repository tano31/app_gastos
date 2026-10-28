# Intentos de inicio de sesión

Agregar `codigo_app_script/SeguridadLogin.gs` y actualizar `Código.gs` y `ValidacionEmail.gs` en Apps Script. Publicar una nueva versión.

Cada cuenta dispone de tres intentos fallidos consecutivos dentro de 24 horas. El tercer error inicia un bloqueo de 24 horas completas. Una contraseña correcta antes del bloqueo reinicia el contador. Durante el bloqueo no se acepta ni siquiera la contraseña correcta y los intentos adicionales no prolongan su duración. Email, documento y usuario comparten el contador por ID; cambiar de navegador no evita el bloqueo. El reenvío de validación aplica el mismo control y conserva su respuesta genérica.

Para desbloquear antes de tiempo, el administrador debe abrir Configuración del proyecto → Propiedades de la secuencia de comandos y agregar `LOGIN_USUARIO_DESBLOQUEAR`, con el usuario, correo o documento afectado. Después ejecutar `desbloquearUsuarioDesdeEditor` desde hernanstilitano@gmail.com. La función borra el bloqueo y esa propiedad auxiliar. No cambia la contraseña, el estado activo ni la validación del correo.

Los contadores se guardan en propiedades del script como `login_attempts:ID`, nunca en el navegador. No se almacenan las contraseñas intentadas. Las sesiones ya iniciadas no se cierran por errores de acceso posteriores.
