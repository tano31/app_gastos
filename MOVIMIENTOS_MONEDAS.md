# Carga de movimientos en BRL, ARS y USD

El selector junto a Monto controla la moneda de carga y es independiente de la
moneda de visualización de la barra superior. BRL es el valor inicial.

Para publicar, actualizar Código.gs y ConversionMonedas.gs en Apps Script y crear
una nueva versión de la implementación existente. Recargar Control gastos.

La columna monto continúa representando BRL para mantener compatibles los
gráficos, totales, importadores y el asistente. monto_ars y monto_usd contienen
los equivalentes. Se agregan moneda_original y monto_original al registrar
movimientos manuales; los registros anteriores se conservan.

ARS y USD se convierten usando la última cotización de TC anterior o igual a la
fecha del movimiento. Sin una cotización válida no se guarda el movimiento en
moneda extranjera. BRL conserva el comportamiento existente: puede guardarse sin
conversión histórica, dejando ARS y USD pendientes.

La tarea actualizarConversionesExistentes respeta los importes originales de los
movimientos multimoneda y recalcula su equivalente BRL con las tasas disponibles.
El formulario no actualiza saldos de tenencias.

Pruebas: tests/movimiento-historico.test.js y tests/movimiento-formulario.test.js.
