(function () {
  'use strict';
  const dictionaries = window.APP_TRANSLATIONS;
  const locales = {es: 'es-AR', pt: 'pt-BR', en: 'en-US'};
  const storageKey = 'controlGastos.language';
  const bindings = new Map();
  let language = 'es';
  try {
    const saved = localStorage.getItem(storageKey);
    if (Object.hasOwn(locales, saved)) language = saved;
  } catch (error) { /* La interfaz funciona aunque el almacenamiento esté bloqueado. */ }
  // file:// puede aislar el almacenamiento por archivo. Propagar el idioma en la URL.
  const requested = new URL(window.location.href).searchParams.get('lang');
  if (Object.hasOwn(locales, requested)) language = requested;

  const translator = window.i18next.createInstance();
  translator.init({
    lng: language,
    fallbackLng: 'es',
    supportedLngs: Object.keys(locales),
    resources: Object.fromEntries(Object.entries(dictionaries).map(([code, texts]) => [code, {translation: texts}])),
    keySeparator: false,
    nsSeparator: false,
    initAsync: false,
    initImmediate: false,
    // Los textos se insertan mediante textContent, no como HTML.
    interpolation: {prefix: '{', suffix: '}', escapeValue: false}
  });

  function page(href) {
    const url = new URL(href, window.location.href);
    url.searchParams.set('lang', language);
    if(window.PlatformCurrency)url.searchParams.set('currency',window.PlatformCurrency.code);
    return url.href;
  }

  const normalize = text => String(text).trim().replace(/\s+/g, ' ');
  const exact = new Map(Object.entries(dictionaries.es).map(([key, text]) => [normalize(text), key]));
  const patterns = Object.entries(dictionaries.es).filter(([, text]) => text.includes('{')).map(([key, text]) => {
    const names = [];
    const escaped = text.split(/(\{\w+\})/).map(part => {
      if (/^\{\w+\}$/.test(part)) { names.push(part.slice(1, -1)); return '(.+?)'; }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('');
    return {key, names, regex: new RegExp('^' + escaped + '$')};
  });

  function t(key, values = {}) {
    return translator.t(key, {...values, lng: language});
  }

  // Solo se invoca para mensajes de interfaz, nunca para datos de tablas o formularios.
  function translate(source, depth = 0) {
    if (!source) return '';
    if (String(source).startsWith('• ')) {
      return String(source).split('\n').map(line => '• ' + translate(line.replace(/^• /, ''), depth)).join('\n');
    }
    const text = normalize(source);
    if (exact.has(text)) return t(exact.get(text));
    for (const pattern of patterns) {
      const match = text.match(pattern.regex);
      if (!match) continue;
      const values = {};
      pattern.names.forEach((name, index) => {
        const value = match[index + 1];
        values[name] = (name === 'error' || name === 'table') && depth < 3 ? translate(value, depth + 1) : value;
      });
      return t(pattern.key, values);
    }
    return String(source);
  }

  // Nombres de presentación; los valores guardados en Sheets conservan su identidad.
  const categoryLabels = [
    ['Desconocido','Desconhecido','Unknown'],
    ['Supermercado','Supermercado','Groceries'],
    ['Vivienda y servicios','Moradia e serviços','Housing and utilities'],
    ['Prestamos','Empréstimos','Loans'],
    ['Viajes y vacaciones','Viagens e férias','Travel and vacations'],
    ['Compras personales','Compras pessoais','Personal shopping'],
    ['Restaurantes y comidas','Restaurantes e refeições','Restaurants and dining'],
    ['Transporte','Transporte','Transportation'],
    ['Cuidado personal','Cuidados pessoais','Personal care'],
    ['Alquiler','Aluguel','Rent'], ['Servicios','Serviços','Utilities'],
    ['Comida','Alimentação','Food'], ['Salud','Saúde','Health'],
    ['Ocio','Lazer','Leisure'], ['Sueldo','Salário','Salary'],
    ['Ahorro','Poupança','Savings'], ['Otro','Outro','Other'],
    ['Otros','Outros','Others'], ['Devolucion','Reembolso','Refund'],
    ['Educación','Educação','Education'], ['Mascotas','Animais de estimação','Pets'],
    ['Seguros','Seguros','Insurance'], ['Impuestos','Impostos','Taxes'],
    ['Suscripciones','Assinaturas','Subscriptions'], ['Entretenimiento','Entretenimento','Entertainment'],
    ['Ropa y calzado','Roupas e calçados','Clothing and footwear'],
    ['Regalos y donaciones','Presentes e doações','Gifts and donations'],
    ['Inversiones','Investimentos','Investments']
  ];
  const categoryKey = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
  function category(value) {
    const labels = categoryLabels.find(labels => labels.some(label => categoryKey(label) === categoryKey(value)));
    return labels ? labels[{es:0,pt:1,en:2}[language]] : String(value || '');
  }
  function categoryValue(value, available = []) {
    const exact = available.find(name => name === value);
    if (exact !== undefined) return exact;
    const labels = categoryLabels.find(labels => labels.some(label => categoryKey(label) === categoryKey(value)));
    return available.find(name => categoryKey(name) === categoryKey(value) || labels && labels.some(label => categoryKey(label) === categoryKey(name))) ?? value;
  }

  function message(element, source) {
    bindings.set(element, String(source));
    element.textContent = translate(source);
  }

  function apply() {
    document.documentElement.lang = locales[language];
    document.querySelectorAll('[data-i18n]').forEach(element => {
      if (!bindings.has(element)) element.textContent = t(element.dataset.i18n);
    });
    ['placeholder', 'aria-label', 'title', 'alt'].forEach(attribute => {
      document.querySelectorAll('[data-i18n-' + attribute + ']').forEach(element => {
        element.setAttribute(attribute, t(element.getAttribute('data-i18n-' + attribute)));
      });
    });
    bindings.forEach((source, element) => {
      if (element.isConnected === false) bindings.delete(element);
      else element.textContent = translate(source);
    });
    document.documentElement.style.setProperty('--password-valid-message', JSON.stringify(t('password.secure')));
    document.querySelectorAll('[data-language]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.language === language));
      button.hidden = button.dataset.language === language;
    });
    const selected = languages.find(item => item.code === language);
    selectedFlag.src = 'img/flag-' + selected.flag + '.svg';
    selectedLabel.textContent = selected.label;
    toggle.title = selected.name;
    toggle.setAttribute('aria-label', selected.name + ' — ' + t('language.choose'));
    menu.setAttribute('aria-label', t('language.choose'));
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      const url = new URL(href, window.location.href);
      if (!href.startsWith('#') && url.origin === new URL(window.location.href).origin && /\.html$/i.test(url.pathname)) {
        link.setAttribute('href', page(href));
      }
    });
  }

  function setLanguage(next) {
    if (!Object.hasOwn(locales, next)) return;
    language = next;
    translator.changeLanguage(language);
    try { localStorage.setItem(storageKey, language); } catch (error) { /* Preferencia en memoria. */ }
    apply();
    closeMenu();
    window.dispatchEvent(new CustomEvent('languagechange', {detail: {language}}));
  }

  const selector = document.createElement('nav');
  selector.className = 'language-selector';
  selector.setAttribute('aria-label', 'Español / Português / English');
  const languages = [
    {code: 'es', flag: 'ar', label: 'ES', name: 'Español (Argentina)'},
    {code: 'pt', flag: 'br', label: 'PT', name: 'Português (Brasil)'},
    {code: 'en', flag: 'us', label: 'EN', name: 'English (United States)'}
  ];
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'language-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'language-options');
  const selectedFlag = document.createElement('img');
  selectedFlag.alt = '';
  selectedFlag.width = 30;
  selectedFlag.height = 20;
  const selectedLabel = document.createElement('span');
  const arrow = document.createElement('span');
  arrow.className = 'language-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '▾';
  toggle.append(selectedFlag, selectedLabel, arrow);
  const menu = document.createElement('div');
  menu.id = 'language-options';
  menu.className = 'language-options';
  menu.setAttribute('role', 'group');
  menu.hidden = true;

  function closeMenu(restoreFocus = false) {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus) toggle.focus();
  }
  function openMenu(focusFirst = false) {
    menu.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    if (focusFirst) menu.querySelector('button:not([hidden])').focus();
  }
  toggle.addEventListener('click', () => menu.hidden ? openMenu() : closeMenu());
  toggle.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); openMenu(true); }
  });
  selector.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeMenu(true); }
  });
  selector.addEventListener('focusout', event => {
    if (!selector.contains(event.relatedTarget)) closeMenu();
  });
  document.addEventListener('click', event => {
    if (!selector.contains(event.target)) closeMenu();
  });

  languages.forEach(({code, flag, label, name}) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.language = code;
    button.title = name;
    button.setAttribute('aria-label', name);
    const img = document.createElement('img');
    img.src = 'img/flag-' + flag + '.svg';
    img.alt = '';
    img.width = 30;
    img.height = 20;
    const text = document.createElement('span');
    text.textContent = label;
    button.append(img, text);
    button.addEventListener('click', () => { setLanguage(code); toggle.focus(); });
    menu.appendChild(button);
  });
  selector.append(toggle, menu);
  document.body.appendChild(selector);
  window.I18n = {t, translate, category, categoryValue, message, setLanguage, page, get language() {return language;}, get locale() {return locales[language];}};
  apply();
})();
