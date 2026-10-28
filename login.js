const GOOGLE_SHEETS_WEB_APP_URL =
    'https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec';

document.getElementById('resendVerificationButton')?.addEventListener('click', async function () {
    const usuario=document.getElementById('loginUser').value.trim();
    const password=document.getElementById('loginPassword').value;
    if (!usuario || !password) {
        I18n.message(loginStatus, 'Ingresá tu usuario y contraseña para reenviar la validación.');
        return;
    }
    this.disabled=true;
    try {
        const reply=await fetch(GOOGLE_SHEETS_WEB_APP_URL,{method:'POST',body:JSON.stringify({action:'resend_email_verification',usuario,password})});
        const result=await reply.json();
        I18n.message(loginStatus,result.message || result.error || 'No se pudo solicitar el correo.');
    } catch(error) {I18n.message(loginStatus,'No se pudo conectar con el servidor.');}
    finally {this.disabled=false;}
});


const loginView =
    document.getElementById('loginView');

const registerView =
    document.getElementById('registerView');

const loginForm =
    document.getElementById('loginForm');

const registerForm =
    document.getElementById('registerForm');

const loginStatus =
    document.getElementById('loginStatus');

if(sessionStorage.getItem('controlGastos.passwordChanged')==='true'){
    sessionStorage.removeItem('controlGastos.passwordChanged');
    I18n.message(loginStatus,'Contraseña actualizada. Revisá tu correo y validá tu dirección antes de iniciar sesión con la nueva contraseña.');
}

const registerStatus =
    document.getElementById('registerStatus');

const loginButton =
    document.getElementById('loginButton');

const registerButton =
    document.getElementById('registerButton');

const loginLoader =
    document.getElementById('loginLoader');

const passwordRules =
    document.querySelector('.password-rules');


/* ===============================
   CAMBIAR ENTRE LOGIN / REGISTRO
================================ */

document
    .getElementById('showRegisterButton')
    .addEventListener('click', () => {

        loginView.classList.add('hidden');

        registerView.classList.remove('hidden');

    });


document
    .getElementById('backToLoginButton')
    .addEventListener('click', () => {

        registerView.classList.add('hidden');

        loginView.classList.remove('hidden');

        I18n.message(registerStatus, '');

    });


/* ===============================
   MOSTRAR CONTRASEÑA
================================ */

const loginPassword =
    document.getElementById('loginPassword');
let rememberedLogin = false;
let rememberedPassword = '';
const toggleRegisterPassword = document.getElementById('toggleRegisterPassword');
function setRegisterPasswordVisibility(visible) {
    document.getElementById('registerPassword').type = visible ? 'text' : 'password';
    document.getElementById('registerPasswordConfirm').type = visible ? 'text' : 'password';
    toggleRegisterPassword.setAttribute('aria-pressed', String(visible));
    toggleRegisterPassword.dataset.i18nAriaLabel = visible ? 'password.hideBoth' : 'password.showBoth';
    toggleRegisterPassword.setAttribute('aria-label', I18n.t(visible ? 'password.hideBoth' : 'password.showBoth'));
    toggleRegisterPassword.innerHTML = visible ? '<i class="fa-regular fa-eye-slash" aria-hidden="true"></i>' : '<i class="fa-regular fa-eye" aria-hidden="true"></i>';
}
toggleRegisterPassword.addEventListener('click', () => {
    setRegisterPasswordVisibility(document.getElementById('registerPassword').type === 'password');
});
registerForm.addEventListener('reset', () => setRegisterPasswordVisibility(false));

document
    .getElementById('togglePassword')
    .addEventListener('click', function () {

        const visible =
            loginPassword.type === 'text';

        loginPassword.type =
            visible ? 'password' : 'text';

        this.innerHTML =
            visible
                ? '<i class="fa-regular fa-eye"></i>'
                : '<i class="fa-regular fa-eye-slash"></i>';

    });


/* ===============================
   LOGIN
================================ */

loginForm.addEventListener(
    'submit',
    async (event) => {

        event.preventDefault();

        I18n.message(loginStatus, '');
        loginStatus.className = 'login-status';

        const usuario =
            document
                .getElementById('loginUser')
                .value
                .trim();

        const password =
            loginPassword.value;


        loginButton.disabled = true;
        I18n.message(loginButton, 'Iniciando sesión...');

        loginLoader.classList.remove('hidden');


        try {
            if (rememberedLogin) {
                const saved = Auth.remembered();
                if (saved && saved.username === usuario && password === rememberedPassword && document.getElementById('rememberSession').checked) {
                    if (await Auth.resume()) window.location.href = I18n.page('dashboard.html');
                    else {
                        showManualLogin();
                        loginPassword.value = '';
                        await Credentials.clear();
                        I18n.message(loginStatus, 'Tu sesión venció. Iniciá sesión nuevamente.');
                    }
                    return;
                }
                showManualLogin();
            }

            const response =
                await fetch(
                    GOOGLE_SHEETS_WEB_APP_URL,
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'text/plain;charset=utf-8'
                        },

                        body: JSON.stringify({
                            action: 'login',
                            recordar: document.getElementById('rememberSession').checked,
                            usuario,
                            password
                        })
                    }
                );


            const result =
                await response.json();


            if (!result.ok) {

                I18n.message(loginStatus, result.error ||
                    'Usuario o contraseña incorrectos.');

                loginStatus.classList.add('error');

                return;
            }


            sessionStorage.setItem(
                'controlGastos.loggedIn',
                'true'
            );


            sessionStorage.setItem(
                'controlGastos.user',
                JSON.stringify(result.usuario)
            );


            Auth.remember(result.usuario.sesion_recordada, result.usuario.usuario_id);
            Auth.enter(result.usuario);
            try {
                const saved = Auth.remembered();
                if (saved) {
                    if (!await Credentials.save(result.usuario.usuario_id, password, saved.expiresAt)) {
                        if (window.alert) window.alert(I18n.t('login.passwordStorageError'));
                    }
                } else await Credentials.clear();
            } catch (error) {
                if (window.alert) window.alert(I18n.t('login.passwordStorageError'));
            }
            loginPassword.value = '';
            window.location.href = I18n.page('dashboard.html');

        }

        catch (error) {

            console.error(error);

            I18n.message(loginStatus, 'No se pudo conectar con el servidor.');

            loginStatus.classList.add('error');

        }

        finally {

            loginButton.disabled = false;

            I18n.message(loginButton, 'Iniciar sesión');

            loginLoader.classList.add('hidden');

        }

    }
);


/* ===============================
   CREAR USUARIO
================================ */

function validarPassword(password) {

    const errores = [];

    if (password.length < 8) {
        errores.push(
            'La contraseña debe tener al menos 8 caracteres.'
        );
    }

    if (!/[A-Z]/.test(password)) {
        errores.push(
            'Debe contener al menos una letra mayúscula.'
        );
    }

    if (!/[a-z]/.test(password)) {
        errores.push(
            'Debe contener al menos una letra minúscula.'
        );
    }

    if (!/[0-9]/.test(password)) {
        errores.push(
            'Debe contener al menos un número.'
        );
    }

    if (
        !/[!@#$%^&*(),.?":{}|<>_\-+=/\\[\];']/.test(password)
    ) {
        errores.push(
            'Debe contener al menos un carácter especial.'
        );
    }

    return errores;
}

registerForm.addEventListener(
    'submit',
    async (event) => {

        event.preventDefault();


        I18n.message(registerStatus, '');
        registerStatus.className =
            'login-status';


        const usuarioId =
            document
                .getElementById('registerUserId')
                .value
                .trim();


        const documento =
            document
                .getElementById('registerDocument')
                .value
                .trim();


        const email =
            document
                .getElementById('registerEmail')
                .value
                .trim()
                .toLowerCase();


        const password =
            document
                .getElementById('registerPassword')
                .value;


        const passwordConfirm =
            document
                .getElementById(
                    'registerPasswordConfirm'
                )
                .value;


        if (
            password !== passwordConfirm
        ) {

            I18n.message(registerStatus, 'Las contraseñas no coinciden.');

            registerStatus.classList.add(
                'error'
            );

            return;

        }


        const passwordErrors =
            validarPassword(password);

        if (passwordErrors.length > 0) {

            I18n.message(registerStatus, passwordErrors.map(error => `• ${error}`).join('\n'));

            registerStatus.classList.add(
                'error'
            );

            return;
        }


        registerButton.disabled = true;

        I18n.message(registerButton, 'Creando usuario...');


        try {

            const response =
                await fetch(
                    GOOGLE_SHEETS_WEB_APP_URL,
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'text/plain;charset=utf-8'
                        },

                        body: JSON.stringify({

                            action: 'register',

                            usuario_id:
                                usuarioId,

                            usuario_doc:
                                documento,

                            usuario_email:
                                email,

                            password

                        })

                    }
                );


            const result =
                await response.json();


            if (!result.ok) {

                I18n.message(registerStatus, result.error ||
                    'No se pudo crear el usuario.');

                registerStatus.classList.add(
                    'error'
                );

                return;

            }


            I18n.message(registerStatus, result.message || 'Cuenta creada. Revisá tu correo para validar tu dirección.');
            I18n.message(loginStatus, result.message || 'Cuenta creada. Revisá tu correo para validar tu dirección.');

            registerStatus.classList.add(
                'success'
            );


            registerForm.reset();


            setTimeout(() => {

                registerView
                    .classList
                    .add('hidden');

                loginView
                    .classList
                    .remove('hidden');

            }, 1500);

        }

        catch (error) {

            console.error(error);

            I18n.message(registerStatus, 'No se pudo conectar con el servidor.');

            registerStatus.classList.add(
                'error'
            );

        }

        finally {

            registerButton.disabled = false;

            I18n.message(registerButton, 'Crear cuenta');

        }

    }
);

const registerPassword =
    document.getElementById(
        'registerPassword'
    );

const ruleLength =
    document.getElementById(
        'ruleLength'
    );

const ruleUpper =
    document.getElementById(
        'ruleUpper'
    );

const ruleLower =
    document.getElementById(
        'ruleLower'
    );

const ruleNumber =
    document.getElementById(
        'ruleNumber'
    );

const ruleSpecial =
    document.getElementById(
        'ruleSpecial'
    );


function updatePasswordRule(
  element,
  valid
) {

  element.classList.toggle(
    'valid',
    valid
  );

  element.classList.toggle(
    'invalid',
    !valid
  );

  element.querySelector(
    'i'
  ).className =
    valid
      ? 'fa-solid fa-circle-check'
      : 'fa-regular fa-circle';
}


registerPassword.addEventListener(
  'input',
  () => {

    const password =
      registerPassword.value;

    const validLength =
      password.length >= 8;

    const validUpper =
      /[A-Z]/.test(password);

    const validLower =
      /[a-z]/.test(password);

    const validNumber =
      /[0-9]/.test(password);

    const validSpecial =
      /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\];']/.test(password);


    updatePasswordRule(
      ruleLength,
      validLength
    );

    updatePasswordRule(
      ruleUpper,
      validUpper
    );

    updatePasswordRule(
      ruleLower,
      validLower
    );

    updatePasswordRule(
      ruleNumber,
      validNumber
    );

    updatePasswordRule(
      ruleSpecial,
      validSpecial
    );


    const passwordValida =
      validLength &&
      validUpper &&
      validLower &&
      validNumber &&
      validSpecial;


    passwordRules.classList.toggle(
      'collapsed',
      passwordValida
    );

  }
);

// Al volver al navegador se valida el token y se renueva la sesión del perfil.
function showManualLogin() {
    rememberedLogin = false;
    rememberedPassword = '';
    loginPassword.required = true;
    loginPassword.placeholder = I18n.t('login.passwordPlaceholder');
    document.getElementById('togglePassword').disabled = false;
}
document.getElementById('loginUser').addEventListener('input', showManualLogin);
loginPassword.addEventListener('input', showManualLogin);
document.getElementById('rememberSession').addEventListener('change', showManualLogin);
if (window.addEventListener) window.addEventListener('languagechange', () => {
    if (rememberedLogin && !rememberedPassword) loginPassword.placeholder = I18n.t('login.passwordPlaceholder');
});
(async function restoreRememberedSession() {
    if (sessionStorage.getItem('controlGastos.idleLogout') === 'true') {
        loginStatus.classList.add('idle-notice');
        const minutes = Number(sessionStorage.getItem('controlGastos.idleLogoutMinutes'));
        const duration = [5,10,20,30,60].includes(minutes) ? minutes : 30;
        I18n.message(loginStatus, 'Sesión cerrada por ' + duration + ' minutos de inactividad. Iniciá sesión.');
    }
    const saved = Auth.remembered();
    if (!saved) { try { await Credentials.clear(); } catch (error) { /* No impedir el ingreso manual. */ } return; }
    if (saved.signedOut || sessionStorage.getItem('controlGastos.idleLogout') === 'true') {
        document.getElementById('loginUser').value = saved.username || '';
        rememberedLogin = !!saved.username;
        if (rememberedLogin) {
            loginButton.disabled = true;
            try {
                const loaded = await Credentials.load(saved.username) || '';
                if (!rememberedLogin || document.getElementById('loginUser').value !== saved.username) {
                    loginButton.disabled = false;
                    return;
                }
                rememberedPassword = loaded;
            }
            catch (error) { rememberedPassword = ''; }
            loginPassword.value = rememberedPassword;
            loginPassword.type = 'password';
            loginPassword.placeholder = I18n.t('login.passwordPlaceholder');
            loginPassword.required = false;
            document.getElementById('togglePassword').disabled = false;
            loginButton.disabled = false;
            if (!rememberedPassword && sessionStorage.getItem('controlGastos.idleLogout') !== 'true') I18n.message(loginStatus, 'Escribí tu contraseña e iniciá sesión una vez para guardarla en este navegador.');
        }
        return;
    }
    loginButton.disabled = true;
    loginLoader.classList.remove('hidden');
    I18n.message(loginStatus, 'Recuperando tu sesión...');
    try {
        if (await Auth.resume()) window.location.href = I18n.page('dashboard.html');
        else I18n.message(loginStatus, 'Tu sesión venció. Iniciá sesión nuevamente.');
    } catch (error) {
        I18n.message(loginStatus, 'No se pudo conectar con el servidor.');
    } finally {
        loginButton.disabled = false;
        loginLoader.classList.add('hidden');
    }
})();
