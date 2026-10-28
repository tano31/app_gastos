"use strict";

// C6: columna A = fecha, E = descripción, I = importe en BRL.
// Comparte con Nubank el registro autenticado, las categorías y los duplicados.
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec";

const csvFile = document.getElementById("csvFile");
const dropZone = document.getElementById("dropZone");
const selectedFile = document.getElementById("selectedFile");
const fileName = document.getElementById("fileName");
const fileStatus = document.getElementById("fileStatus");
const removeFile = document.getElementById("removeFile");
const previewSection = document.getElementById("previewSection");
const previewSummary = document.getElementById("previewSummary");
const previewBody = document.getElementById("previewBody");
const importButton = document.getElementById("importButton");

let movimientos = [];
let archivoSeleccionado = null;
let importando = false;
let pagamentosOmitidos = 0;

function estado(mensaje, error = false) {
  I18n.message(fileStatus, mensaje);
  fileStatus.classList.toggle("error", error);
}

function limpiar() {
  if (importando) return;
  if (window.ImportLabels) ImportLabels.reset();
  window.ImportSummary?.reset();
  archivoSeleccionado = null;
  movimientos = [];
  pagamentosOmitidos = 0;
  csvFile.value = "";
  selectedFile.hidden = true;
  previewSection.hidden = true;
  previewBody.replaceChildren();
  importButton.disabled = true;
  estado("");
}

// CSV C6 separado por punto y coma: admite campos entre comillas y saltos CRLF.
function parsearCSV(texto) {
  const filas = [];
  let fila = [], campo = "", comillas = false;
  texto = texto.replace(/^\uFEFF/, "");
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') {
      if (campo.trim()) throw new Error("Comillas inesperadas en el CSV.");
      comillas = true;
    } else if (c === ';') {
      fila.push(campo); campo = "";
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(campo);
      if (fila.some(v => v.trim() !== "")) filas.push(fila);
      fila = []; campo = "";
    } else campo += c;
  }
  if (comillas) throw new Error("Hay comillas sin cerrar en el CSV.");
  fila.push(campo);
  if (fila.some(v => v.trim() !== "")) filas.push(fila);
  return filas;
}

function parsearMonto(valor) {
  let t = String(valor).trim().replace(/R\$/gi, "").replace(/\s/g, "");
  if (!/^-?[\d.,]+$/.test(t)) throw new Error(`Importe inválido: ${valor}`);
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  if (!Number.isFinite(n) || n === 0) throw new Error(`Importe inválido: ${valor}`);
  return n;
}

function extraerMovimientos(texto) {
  const filas = parsearCSV(texto);
  if (filas.length < 2) throw new Error("El archivo no contiene movimientos.");
  const encabezados = filas[0].map(x => x.trim().toLowerCase());
  const fechaIdx = 0, tituloIdx = 4, montoIdx = 8;
  const normalizar = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
  if (normalizar(encabezados[fechaIdx] || '') !== 'data de compra' ||
      normalizar(encabezados[tituloIdx] || '') !== 'descricao' ||
      normalizar(encabezados[montoIdx] || '') !== 'valor (em r$)') {
    throw new Error("El CSV de C6 debe contener Data de Compra en A, Descrição en E y Valor (em R$) en I, separado por punto y coma.");
  }
  if (filas.length - 1 > 2000) throw new Error("El máximo es de 2000 movimientos por archivo.");
  pagamentosOmitidos = 0;
  return filas.slice(1).map((fila, i) => {
    if (fila.length !== encabezados.length) throw new Error(`Fila ${i + 2}: cantidad de columnas incorrecta.`);
    const originalDate = fila[fechaIdx].trim();
    const match = originalDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const date = match ? match[3] + '-' + match[2] + '-' + match[1] : '';
    const title = fila[tituloIdx].trim();
    const esEstorno = /\bestorno\b/i.test(title);
    if (!esEstorno && /^(?:pagamento\b|inclusao de pagamento\b)/i.test(title.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) {pagamentosOmitidos++; return null;}
    const amount = parsearMonto(fila[montoIdx]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date + "T12:00:00Z")) ||
        new Date(date + "T12:00:00Z").toISOString().slice(0, 10) !== date) {
      throw new Error(`Fila ${i + 2}: fecha inválida.`);
    }
    if (!title) throw new Error(`Fila ${i + 2}: descripción vacía.`);
    return { date, title, amount: esEstorno ? Math.abs(amount) : amount };
  }).filter(m => m !== null);
}

const formatoBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function mostrarVistaPrevia() {
  previewBody.replaceChildren();
  for (const mov of movimientos.slice(0, 100)) {
    const tr = document.createElement("tr");
    const fecha = document.createElement("td");
    const titulo = document.createElement("td");
    const monto = document.createElement("td");
    const tipo = document.createElement("td");
    const categoria = document.createElement("td");
    fecha.textContent = mov.date;
    titulo.textContent = mov.title;
    monto.textContent = window.PlatformCurrency?PlatformCurrency.format(mov.amount,mov.date):formatoBRL.format(mov.amount);
    const esEstorno = /\bestorno\b/i.test(mov.title);
    tipo.textContent = esEstorno ? 'Ingreso' : 'Gasto variable';
    const categoryName = esEstorno ? 'Devolucion' : window.ImportLabels?.category(mov.title);
    categoria.textContent = categoryName ? (I18n.category?.(categoryName) ?? categoryName) : '—';
    if (mov.amount < 0) monto.classList.add("negative");
    tr.append(fecha, titulo, monto, tipo, categoria);
    previewBody.appendChild(tr);
  }
  const negativos = movimientos.filter(m => m.amount < 0).length;
  I18n.message(previewSummary, `${movimientos.length} movimientos encontrados (${negativos} con importe negativo).`);
  if (pagamentosOmitidos) I18n.message(previewSummary, I18n.t('c6.filteredSummary', {count: movimientos.length, omitted: pagamentosOmitidos}));
  previewSection.hidden = false;
  importButton.disabled = importando || movimientos.length === 0 || (window.ImportLabels && !ImportLabels.ready());
}

async function seleccionarArchivo(file) {
  if (importando) return;
  limpiar();
  if (!file || !file.name.toLowerCase().endsWith(".csv")) {
    estado("Seleccioná un archivo CSV válido.", true);
    return;
  }
  if (file.size > 2_000_000) {
    estado("El archivo supera el límite de 2 MB.", true);
    return;
  }
  try {
    const texto = await file.text();
    const leidos = extraerMovimientos(texto);
    archivoSeleccionado = file;
    movimientos = leidos;
    fileName.textContent = file.name;
    selectedFile.hidden = false;
    if (window.ImportLabels) await ImportLabels.review(leidos, () => {mostrarVistaPrevia();if(ImportLabels.ready())window.ImportSummary?.set(movimientos,'import_c6');});
    if (archivoSeleccionado !== file) return;
    window.ImportSummary?.set(movimientos,'import_c6');
    mostrarVistaPrevia();
    estado("Archivo validado. Revisá la vista previa antes de importar.");
  } catch (error) {
    estado(error.message || "No se pudo leer el archivo.", true);
  }
}

csvFile.addEventListener("change", () => seleccionarArchivo(csvFile.files[0]));
dropZone.addEventListener("dragover", event => { event.preventDefault(); dropZone.classList.add("drag-over"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
dropZone.addEventListener("drop", event => {
  event.preventDefault();
  dropZone.classList.remove("drag-over");
  seleccionarArchivo(event.dataTransfer.files[0]);
});
removeFile.addEventListener("click", limpiar);

importButton.addEventListener("click", async () => {
  if (importando || !archivoSeleccionado || !movimientos.length || (window.ImportLabels && !ImportLabels.ready())) return;
  if (!APPS_SCRIPT_URL.startsWith("https://script.google.com/macros/s/") || !APPS_SCRIPT_URL.endsWith("/exec")) {
    estado("Configurá APPS_SCRIPT_URL en c6.js con la URL /exec de tu implementación actual.", true);
    return;
  }
  const importUser = document.getElementById('importUser');
  const targetUser = importUser.value;
  if (!targetUser) { estado(I18n.t('import.selectUser'), true); return; }
  if (!window.ImportSummary && !window.confirm(I18n.t('import.confirmUser', {count: movimientos.length, user: targetUser}))) return;
  importUser.disabled = true;
  importando = true;
  importButton.disabled = true;
  I18n.message(importButton, "Importando...");
  estado("Enviando movimientos a Google Sheets...");
  try {
    const user = JSON.parse(sessionStorage.getItem('controlGastos.user') || 'null');
    if (!user || !user.perfil_token) throw new Error('Volvé a iniciar sesión para registrar movimientos.');
    if(window.ImportSummary && !await ImportSummary.confirm()) {
      importButton.disabled=false;I18n.message(importButton,I18n.t('nubank.submit'));estado('');return;
    }
    const respuesta = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "import_c6", movimientos, revisar_etiquetas: true, import_usuario_id: targetUser, perfil_token: user.perfil_token })
    });
    if (!respuesta.ok) throw new Error(`Error HTTP ${respuesta.status}.`);
    const resultado = await respuesta.json();
    if (!resultado.ok) {
      console.error("Apps Script:", resultado.diagnostico || resultado.error);
      throw new Error(resultado.error || "Google Apps Script rechazó la importación.");
    }

    const sinTC = Number(resultado.sinCotizacion || 0);
    estado(`Importación terminada: ${resultado.importados ?? 0} nuevos, ${resultado.duplicados ?? 0} duplicados.` +
      (sinTC ? ` ${sinTC} sin cotización histórica.` : ""));
    I18n.message(importButton, "Importación finalizada");
  } catch (error) {
    estado(`No se pudo confirmar la importación: ${error.message}. Revisá la hoja antes de reintentar.`, true);
    importButton.disabled = false;
    I18n.message(importButton, "Reintentar importación");
  } finally {
    importando = false;
    importUser.disabled = false;
  }
});

document.getElementById("logoutButton").addEventListener("click", async () => {
  if (window.Auth) await Auth.logout();
  sessionStorage.removeItem("controlGastos.loggedIn");
  sessionStorage.removeItem("controlGastos.user");
  window.location.href = I18n.page('login.html');
});

window.addEventListener?.('languagechange', () => { if (movimientos.length) mostrarVistaPrevia(); });

window.addEventListener?.('currencychange', () => { if (movimientos.length) mostrarVistaPrevia(); });
