# Moneda de gastos fijos

En Configuración → Bases → Gastos fijos, cada registro admite BRL, ARS o USD.
Los gastos anteriores sin moneda se interpretan como BRL. Se agrega la columna
moneda al final de Gastos_fijos sin modificar sus montos existentes.

La tabla y los avisos muestran el importe en moneda original. La selección de
varios gastos presenta un total separado por moneda.

Al pagar desde Gastos fijos o la campana, se convierte con la cotización de TC
anterior o igual a la fecha del pago. Movimientos conserva monto en BRL, los
equivalentes ARS/USD y moneda_original/monto_original. Si falta cotización, no se
registra el lote. Los vencimientos pagados siguen sin duplicarse por cambiar moneda.
El asistente también convierte los pendientes según la moneda del catálogo.

Para publicar: actualizar GastosFijos.gs, Notificaciones.gs, AsistenteGastos.gs
y Código.gs. ConversionMonedas.gs debe incluir convertirMovimientoMoneda,
incorporada con la carga multimoneda de Control gastos. Publicar una nueva
versión de la implementación existente y recargar la aplicación.

Excel conserva compatibilidad con archivos anteriores (BRL). Opcionalmente admite
una columna moneda con BRL, ARS o USD.
