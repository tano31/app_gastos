# Permisos de la plataforma

Los permisos se administran directamente en la hoja **Usuarios**. El backend agrega las columnas faltantes al consultar usuarios; no cambia valores existentes. Usar `TRUE` para habilitar y `FALSE` o vacío para denegar.

| Columna | Permite |
| --- | --- |
| `admin` | Acceso completo y eliminación de datos. |
| `permiso_ver_movimientos_ajenos` | Consultar movimientos de otros usuarios y seleccionarlos en el dashboard. |
| `permiso_importar_para_otros` | Elegir otro usuario activo al importar Nubank o C6. No otorga acceso de lectura a sus movimientos. |
| `permiso_editar_catalogos` | Crear o editar categorías, etiquetas compartidas (también desde importadores), productos de Mercado y supermercados. No permite eliminar. |

Sin estos permisos, un usuario puede consultar y registrar sus propios movimientos, administrar sus gastos fijos y preferencias, y consultar catálogos compartidos. Si faltan etiquetas en una importación, necesita que un administrador o editor las complete.

Los administradores tienen los tres permisos aunque las columnas estén vacías. Toda solicitud consulta la hoja nuevamente: una revocación se aplica en el servidor sin cerrar sesión. Volver a iniciar sesión actualiza también los controles de la interfaz.

Movimientos, categorías y nombres de categorías se consultan mediante POST con `perfil_token`. GET no devuelve estos datos. Los campos `admin`, `permisos` y `usuario_id` enviados por el cliente no conceden permisos; el backend identifica la cuenta mediante la sesión.

Para activar estos cambios, actualizar todos los archivos modificados de `codigo_app_script`, publicar una nueva versión de la implementación, recargar los archivos de la plataforma y volver a iniciar sesión. No usar el backend anterior con el frontend nuevo ni viceversa.
