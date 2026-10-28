# Activar el asistente de gastos

Fino incluye «Cuánto falta para mi objetivo». Propone analizar los últimos tres meses completos y permite ajustar las fechas. Consulta el objetivo y los saldos propios de Inversiones, convierte a la moneda seleccionada y calcula el faltante y el excedente mensual (ingresos menos gastos, sin descontar otra vez el ahorro registrado). Estima meses enteros sin rendimientos ni cambios futuros de cotización y ofrece escenarios hipotéticos de reducción de gastos del 5% y 10%. Si falta el objetivo, tenencias, ingresos o cotizaciones, o no hay meses completos o excedente, no calcula un plazo.

Para habilitar esta consulta, actualizar `AsistenteGastos.gs` y `Tenencias.gs` en Apps Script y publicar una nueva versión. El resumen enviado a OpenAI incluye el monto objetivo, el patrimonio total, las fechas de saldos y los cálculos de proyección; no incluye nombres de cuentas ni datos de otros usuarios. No se enviaron consultas reales durante las pruebas de desarrollo.

El botón del asistente aparece en las páginas de la aplicación después de iniciar sesión. Antes de enviar cada consulta (rápida o escrita), pregunta si se desea analizar el mes actual o un período personalizado con fechas desde/hasta. La conversación se mantiene en memoria mientras la página está abierta.

El período personalizado admite hasta 366 días y no permite fechas futuras. Se compara con el período inmediatamente anterior de igual duración. El mes actual conserva la comparación con los mismos días del mes anterior. Si cambia el período, se inicia un contexto nuevo para evitar mezclar cifras. Elegir o cancelar un período no consume consultas de OpenAI; la consulta se envía después de confirmar. La moneda se toma del selector general de la plataforma.

## Configurar OpenAI

1. Creá un proyecto en la plataforma de OpenAI, habilitá la facturación de la API y generá una clave para ese proyecto.
2. En el proyecto de Google Apps Script, abrí **Configuración del proyecto → Propiedades de la secuencia de comandos**.
3. Agregá estas propiedades:

| Propiedad | Valor |
| --- | --- |
| `OPENAI_API_KEY` | Tu clave secreta. No la pegues en el chat, en Google Sheets ni en los archivos del navegador. |
| `OPENAI_MODEL` | Opcional. Predeterminado: `gpt-4o-mini`, para coincidir con la prueba exitosa de Postman. Debe ser un modelo disponible en tu proyecto. |
| `OPENAI_API_MODE` | Opcional. Predeterminado: `chat_completions`, usando `/v1/chat/completions`. Usá `responses` para `/v1/responses` si tu clave tiene permisos para ese endpoint. |
| `OPENAI_DAILY_LIMIT` | Opcional. Predeterminado: `20`. Entre 1 y 200 consultas por usuario y día. |

4. Copiá **AsistenteGastos.gs** y la versión actualizada de **Código.gs** al proyecto de Apps Script. El resto de los archivos existentes debe permanecer, especialmente Perfil.gs, CatalogoCategorias.gs, GastosFijos.gs, Notificaciones.gs y ConversionMonedas.gs.
5. Publicá una nueva versión de la aplicación web, conservando su URL. Si Google solicita permisos para conexiones externas, autorizá el despliegue.
6. Recargá la app y abrí el robot. La conexión se comprueba al abrir el panel; OpenAI se consulta recién al enviar una pregunta.

## Qué envía el asistente

Envía la pregunta, hasta seis mensajes anteriores y un resumen calculado en el servidor: ingresos, gastos, ahorro registrado, principales categorías/comercios, períodos equivalentes y gastos fijos pendientes del mes. Solo incluye movimientos del usuario autenticado, incluso si es administrador. No envía contraseñas, tokens de sesión, email, documento ni imágenes de facturas a OpenAI.

Los nombres de comercios y descripciones de los gastos pendientes sí forman parte del resumen. No se suman los productos de items_mercado a los movimientos financieros. No se realizan pagos ni se modifican registros desde el chat.

En USD y ARS se usan las conversiones guardadas en los movimientos. Los importes sin conversión se identifican como datos faltantes; los pendientes usan la cotización disponible a la fecha de corte. La comparación mensual usa la misma cantidad de días en ambos períodos.

## Consumo y pruebas

El límite diario cuenta intentos enviados al servicio, incluidos los que terminan en error, y se reinicia según el día civil de la hoja. No es un límite monetario: configurá también los controles de consumo de tu proyecto de OpenAI. El historial no se guarda en Sheets; las solicitudes usan `store: false` y esto no equivale a una garantía de retención cero por parte del proveedor.

## Diagnosticar una conexión que funciona en Postman

Una prueba con `/v1/chat/completions` y `gpt-4o-mini` no verifica el acceso a otro modelo ni a `/v1/responses`.

1. En las propiedades del mismo proyecto Apps Script, agregá o actualizá `OPENAI_MODEL` con el valor `gpt-4o-mini` y `OPENAI_API_MODE` con el valor `chat_completions`. Conservá tu clave en `OPENAI_API_KEY`.
2. Actualizá `AsistenteGastos.gs` en el editor y guardá los cambios.
3. En el selector de funciones de la barra superior del editor, elegí `probarConexionOpenAI` y presioná **Ejecutar**. Esta función realiza una consulta mínima a OpenAI, sin información financiera; puede generar un consumo mínimo de API. No usa el límite de consultas del chat.
4. Si Google solicita autorización, revisá y autorizá los permisos del script.
5. Abrí el **Registro de ejecución**. El resultado muestra `ok`, HTTP, modelo y tipo de API. Si falla, muestra además código/tipo del error y el ID de solicitud cuando está disponible. No muestra la clave ni el mensaje remoto que podría contenerla.
6. Podés compartir ese resultado de diagnóstico. No compartas la propiedad `OPENAI_API_KEY` ni capturas donde aparezca.
7. Cuando la prueba funcione, publicá una nueva versión de la implementación existente y recargá la app.

Un 401 indica un problema de autenticación; un 403 puede deberse a permisos o restricciones de origen. `model_not_found` puede indicar un nombre incorrecto o falta de acceso al modelo. El código de error permite distinguir las causas sin asumir que la clave es inválida.

Las pruebas locales usan Sheets y OpenAI simulados. Para verificar una respuesta real hace falta configurar una clave y publicar el backend. No hay respuestas ficticias de IA cuando falta la conexión: el panel muestra que el asistente aún no está activado.

Referencias oficiales: [Generación de texto](https://developers.openai.com/api/docs/guides/text), [GPT-4o mini](https://developers.openai.com/api/docs/models/gpt-4o-mini), [Errores de la API](https://developers.openai.com/api/docs/guides/error-codes), [Autenticación](https://developers.openai.com/api/reference/overview).
