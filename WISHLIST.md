# Wishlist

Agregar `codigo_app_script/Wishlist.gs`, actualizar `Código.gs` y publicar una nueva versión. La hoja `Wishlist` se crea automáticamente con propuestas, propietario, estado, fechas, administrador que actualizó y clave de reintento.

Los usuarios ven únicamente sus propuestas; los administradores ven todas y pueden cambiar su estado. El servidor identifica al usuario por su sesión, exige permiso admin para modificar estados y establece siempre `enviado` al crear. Estados: enviado, en_analisis, rechazado, aprobado. No admite editar ni eliminar propuestas desde la interfaz.

El límite es de 250 palabras separadas por espacios o saltos de línea (también se valida en servidor), con máximo adicional de 20.000 caracteres. Los reintentos de un mismo envío no crean duplicados. No se envían correos ni mensajes a terceros.
