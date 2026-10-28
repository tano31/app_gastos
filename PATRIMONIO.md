# Mi patrimonio

La sección se encuentra en Inversiones, debajo de USD/BRL. La carga es manual.
Crear o editar una tenencia no agrega movimientos ni calcula rentabilidad.

## Publicación

1. Crear Tenencias.gs en el proyecto Apps Script y copiar codigo_app_script/Tenencias.gs.
2. Actualizar Código.gs con las rutas holdings, save_holding y holding_rates.
3. Publicar una nueva versión de la implementación existente.
4. Recargar inversiones.html.

La primera consulta crea la hoja tenencias. El primer guardado crea
tenencias_historial. Cada usuario consulta y edita exclusivamente sus registros,
incluidos los administradores. El autor y las fechas de auditoría los fija el servidor.

tenencias: id, usuario_id, nombre, clase, moneda, ubicacion, formato, saldo,
capital_aportado, fecha_valor, creado_en, actualizado_en.

tenencias_historial: id, tenencia_id, usuario_id, fecha, operacion_id, antes, despues.
Los dos últimos campos contienen instantáneas JSON. Los reintentos de la misma
operación no generan nuevas filas. Si falla el historial, se revierte el cambio.

## Importes y cotizaciones

- El saldo representa el valor actual, en moneda original. El capital aportado es
  opcional y nunca se agrega al saldo para calcular patrimonio.
- Las inversiones se registran en formato digital. El dinero disponible puede
  ser físico o digital.
- BRL muestra inversiones y, por separado, dinero disponible. Las otras tarjetas
  muestran el total físico y digital de cada moneda.
- USD y ARS utilizan las tasas de la hoja TC (unidades por BRL). EUR utiliza la
  referencia PTAX venta EUR/BRL, si existen tenencias en euros.
- El total usa la moneda de la barra superior y muestra las fechas de las tasas.
  Si faltan conversiones, se marca como parcial; los saldos originales se conservan.
- Los datos usan la caché de sesión de cinco minutos. Actualizar y guardar
  invalidan la caché. No se conectan cuentas bancarias ni se realizan pagos.

Validación: node tests/tenencias.test.js
# Objetivo de patrimonio

La franja de resumen muestra «Patrimonio total» y «Mi objetivo». Cada cuenta puede definir y editar un monto objetivo positivo y su moneda (BRL, USD, EUR o ARS). Se guarda en la hoja `objetivos_patrimonio`, creada automáticamente. El objetivo se convierte a la moneda de la barra superior usando las mismas cotizaciones del patrimonio y no se suma al patrimonio. Al editar se conserva el monto y la moneda originales. Si falta una cotización, muestra — con una explicación al pasar el cursor.

Para habilitarlo, actualizar `Código.gs` y `Tenencias.gs` en Apps Script y publicar una nueva versión. Las cuentas sin objetivo muestran la opción «Cargar monto»; un error de lectura se informa sin confundirlo con la ausencia de objetivo.

