# Validación del correo

Los nuevos registros deben confirmar su dirección antes de iniciar sesión. Las cuentas existentes conservan acceso. Los enlaces vencen en 24 horas, son de un solo uso y se confirman pulsando un botón: abrir el correo no activa la cuenta.

## Configuración en Apps Script

1. Agregar `codigo_app_script/ValidacionEmail.gs` y actualizar `Código.gs`, `Perfil.gs` y `appsscript.json` en el proyecto de Apps Script. Para ver el manifiesto, activar «Mostrar el archivo de manifiesto appsscript.json en el editor» en Configuración del proyecto. El manifiesto incluye los permisos de correo y consulta de la cuenta; sin ellos `requireScopes` informa que no son un subconjunto de los ámbitos obligatorios.
2. Con la cuenta **hernanstilitano@gmail.com**, ejecutar `autorizarCorreoValidacion` y aceptar los permisos. Esta función no envía correos de prueba ni exige tener una URL publicada todavía. La URL se comprueba al enviar una validación real.
3. Actualizar la implementación web existente con una nueva versión, ejecutándose como **hernanstilitano@gmail.com**. Conservar su URL y el acceso público necesario para el registro.
4. Recargar el login actualizado. Registrar una cuenta de prueba, abrir el correo de **App de gastos**, pulsar «Validar mi correo» y luego «Confirmar mi correo». Volver a la plataforma e iniciar sesión.

MailApp utiliza la cuenta que ejecuta el script; el remitente se comprueba antes de enviar. No hace falta una contraseña de Gmail ni una clave API. Si el proyecto define `oauthScopes` explícitos, agregar `https://www.googleapis.com/auth/script.send_mail` y `https://www.googleapis.com/auth/userinfo.email` sin quitar los existentes.

El botón de reenvío del login usa el usuario y la contraseña ingresados. Responde de forma genérica para evitar revelar cuentas. Espera mínima: un minuto; máximo cinco correos por usuario al día y veinte por hora/ochenta por día para la plataforma, además de la cuota de Google.

Se agregan `email_verificado` y `email_verificado_en` a Usuarios. Las cuentas nuevas guardan false; una marca vacía conserva el acceso de las cuentas anteriores. `activo` sigue controlando las bajas administrativas. Los tokens se almacenan como hash en las propiedades del script; reenviar reemplaza el enlace anterior. Si falla el envío, la cuenta queda pendiente y puede solicitar otro correo.

La confirmación se sirve desde Apps Script y funciona aunque el login se abra como archivo local. No redirige automáticamente al archivo local. No se realizaron envíos reales desde el entorno de desarrollo.

## Cambio de contraseña

En Configuración → General → Contraseña, se verifica la contraseña actual y la nueva debe cumplir la complejidad del registro. Tras guardar, el correo queda pendiente de validación y se vuelve al login. El reenvío se solicita con la contraseña nueva. Se invalidan las sesiones activas mediante una versión por usuario y las sesiones recordadas mediante el cambio del hash. Si falla el envío, se restauran las credenciales, la validación y la versión anteriores. Actualizar `Código.gs`, `Perfil.gs` y `ValidacionEmail.gs`, y publicar una nueva versión para habilitar esta acción.
