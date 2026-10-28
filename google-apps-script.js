/**
 * Pegá este código en Extensiones > Apps Script dentro de tu Google Sheet.
 * Luego publicalo como Web App y copiá la URL en GOOGLE_SHEETS_WEB_APP_URL de app.js.
 */
function doPost(e) {
  const sheetName = 'Movimientos';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(['id', 'fecha', 'descripcion', 'tipo', 'categoria', 'medioPago', 'monto', 'creadoEn']);
  }

  const data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    data.id,
    data.fecha,
    data.descripcion,
    data.tipo,
    data.categoria,
    data.medioPago,
    data.monto,
    data.creadoEn,
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
