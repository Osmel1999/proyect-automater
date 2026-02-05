// Authentication page functionality
// Firebase is initialized in config.js before this script loads

// API URL
const API_URL = 'https://api.kdsapp.site';

// Código de referido (si viene en la URL)
let codigoReferido = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Auth.js: DOM loaded, initializing...');
    
    // Verify Firebase is initialized
    if (!firebase.apps.length) {
        console.error('❌ Firebase not initialized!');
        alert('Error: Firebase no está inicializado. Por favor recarga la página.');
        return;
    }
    
    console.log('✅ Firebase initialized:', firebase.app().name);
    
    // Check URL params for register mode and referral code
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    codigoReferido = urlParams.get('ref');
    
    // Si hay código de referido, guardarlo y mostrar indicador
    if (codigoReferido) {
        console.log('🎯 Código de referido detectado:', codigoReferido);
        localStorage.setItem('codigoReferido', codigoReferido);
        verificarYMostrarCodigoReferido(codigoReferido);
    } else {
        // Verificar si ya había un código guardado (período de gracia de 30 días)
        const savedCodigo = localStorage.getItem('codigoReferido');
        if (savedCodigo) {
            codigoReferido = savedCodigo;
            console.log('🎯 Código de referido recuperado de localStorage:', codigoReferido);
            verificarYMostrarCodigoReferido(codigoReferido);
        }
    }

    // Tabs functionality
    const tabs = document.querySelectorAll('.tab');
    const sections = document.querySelectorAll('.form-section');
    
    // If mode=register, switch to register tab and show trial modal
    if (mode === 'register') {
        // Switch to register tab
        tabs.forEach(t => t.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        
        const registerTab = document.querySelector('[data-tab="register"]');
        const registerSection = document.getElementById('registerSection');
        
        if (registerTab) registerTab.classList.add('active');
        if (registerSection) registerSection.classList.add('active');
        
        // Show trial modal
        const trialModal = document.getElementById('trialModal');
        if (trialModal) {
            setTimeout(() => {
                trialModal.classList.add('active');
            }, 300);
        }
    }
    
    // Trial modal close button
    const closeTrialModalBtn = document.getElementById('closeTrialModal');
    const trialModal = document.getElementById('trialModal');
    
    if (closeTrialModalBtn && trialModal) {
        closeTrialModalBtn.addEventListener('click', () => {
            trialModal.classList.remove('active');
        });
        
        // Close on backdrop click
        trialModal.addEventListener('click', (e) => {
            if (e.target === trialModal) {
                trialModal.classList.remove('active');
            }
        });
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && trialModal.classList.contains('active')) {
                trialModal.classList.remove('active');
            }
        });
    }

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                tabs.forEach(t => t.classList.remove('active'));
                sections.forEach(s => s.classList.remove('active'));
                
                tab.classList.add('active');
                document.getElementById(targetTab + 'Section').classList.add('active');
            });
        });

        // PIN input handling
        const pinDigits = document.querySelectorAll('.pin-digit');
        pinDigits.forEach((digit, index) => {
            digit.addEventListener('input', (e) => {
                if (e.target.value.length === 1 && index < pinDigits.length - 1) {
                    pinDigits[index + 1].focus();
                }
            });

            digit.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
                    pinDigits[index - 1].focus();
                }
            });
            
            // Validar PIN en tiempo real
            digit.addEventListener('input', () => {
                const pin = getPin();
                const pinError = document.getElementById('pinError');
                if (pin.length === 4) {
                    if (validatePin(pin)) {
                        pinError.classList.remove('show');
                    } else {
                        pinError.classList.add('show');
                    }
                } else {
                    pinError.classList.remove('show');
                }
            });
        });

        // Validación en tiempo real para contraseña
        const registerPassword = document.getElementById('registerPassword');
        const registerPasswordConfirm = document.getElementById('registerPasswordConfirm');
        const passwordError = document.getElementById('passwordError');
        const passwordConfirmError = document.getElementById('passwordConfirmError');

        if (registerPassword) {
            registerPassword.addEventListener('input', () => {
                const password = registerPassword.value;
                if (password.length > 0 && password.length < 6) {
                    passwordError.classList.add('show');
                } else {
                    passwordError.classList.remove('show');
                }
                // También verificar confirmación si ya tiene valor
                if (registerPasswordConfirm.value.length > 0) {
                    if (password !== registerPasswordConfirm.value) {
                        passwordConfirmError.classList.add('show');
                    } else {
                        passwordConfirmError.classList.remove('show');
                    }
                }
            });
        }

        if (registerPasswordConfirm) {
            registerPasswordConfirm.addEventListener('input', () => {
                const password = registerPassword.value;
                const confirm = registerPasswordConfirm.value;
                if (confirm.length > 0 && password !== confirm) {
                    passwordConfirmError.classList.add('show');
                } else {
                    passwordConfirmError.classList.remove('show');
                }
            });
        }

        // Validate PIN
        function validatePin(pin) {
            // Check if all digits are the same
            if (/^(\d)\1{3}$/.test(pin)) {
                return false;
            }

            // Check for sequential patterns
            const sequential = ['0123', '1234', '2345', '3456', '4567', '5678', '6789', '9876', '8765', '7654', '6543', '5432', '4321', '3210'];
            if (sequential.includes(pin)) {
                return false;
            }

            return true;
        }

        // Get PIN value
        function getPin() {
            return Array.from(pinDigits).map(d => d.value).join('');
        }

        // Hash PIN (simple client-side hash, will be re-hashed on server)
        async function hashPin(pin) {
            const encoder = new TextEncoder();
            const data = encoder.encode(pin);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }

        // Show alert
        function showAlert(message, type = 'error') {
            const alertContainer = document.getElementById('alertContainer');
            const icon = type === 'error' 
                ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                     <circle cx="12" cy="12" r="10"/>
                     <line x1="15" y1="9" x2="9" y2="15"/>
                     <line x1="9" y1="9" x2="15" y2="15"/>
                   </svg>`
                : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                     <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                     <polyline points="22 4 12 14.01 9 11.01"/>
                   </svg>`;
            
            alertContainer.innerHTML = `
                <div class="alert alert-${type} show">
                    ${icon}
                    <span>${message}</span>
                </div>
            `;

            setTimeout(() => {
                alertContainer.innerHTML = '';
            }, 5000);
        }

        // Login form submission
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;

            document.getElementById('loginLoading').classList.add('show');
            document.getElementById('loginForm').style.display = 'none';

            try {
                // Asegurar que no hay sesión previa activa
                const currentUser = firebase.auth().currentUser;
                if (currentUser) {
                    console.log('⚠️ Sesión previa activa, cerrando primero...');
                    await firebase.auth().signOut();
                    // Esperar un momento para que Firebase procese el cierre
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                // Sign in with Firebase Auth
                const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
                const user = userCredential.user;

                console.log('✅ Firebase Auth login exitoso:', user.uid);

                // Get user data from database con retry
                let userSnapshot = null;
                let retries = 3;
                
                while (retries > 0) {
                    try {
                        console.log(`🔍 Buscando usuario en BD (intento ${4 - retries}/3)...`);
                        
                        userSnapshot = await firebase.database()
                            .ref('users')
                            .orderByChild('email')
                            .equalTo(email)
                            .once('value');
                        
                        console.log('📦 Snapshot recibido:', userSnapshot.exists() ? 'SÍ existe' : 'NO existe');
                        
                        if (userSnapshot.exists()) {
                            console.log('✅ Usuario encontrado en BD');
                            break;
                        }
                        
                        console.log(`⚠️ Usuario no encontrado en BD, reintentando... (${retries - 1} intentos restantes)`);
                        retries--;
                        
                        if (retries > 0) {
                            await new Promise(resolve => setTimeout(resolve, 1500));
                        }
                    } catch (dbError) {
                        console.error('❌ Error al consultar BD:', dbError);
                        retries--;
                        if (retries > 0) {
                            await new Promise(resolve => setTimeout(resolve, 1500));
                        }
                    }
                }
                
                // Si no se encontró en users, buscar en partners
                if (!userSnapshot || !userSnapshot.exists()) {
                    console.log('🔍 Usuario no encontrado en users, buscando en partners...');
                    
                    const partnerSnapshot = await firebase.database()
                        .ref('partners')
                        .orderByChild('email')
                        .equalTo(email)
                        .once('value');
                    
                    if (partnerSnapshot.exists()) {
                        console.log('✅ Usuario es un PARTNER');
                        const partnerData = Object.values(partnerSnapshot.val())[0];
                        const partnerId = Object.keys(partnerSnapshot.val())[0];
                        
                        // Guardar datos del partner
                        localStorage.setItem('userEmail', email);
                        localStorage.setItem('userName', partnerData.nombre);
                        localStorage.setItem('userRole', 'partner');
                        localStorage.setItem('partnerId', partnerId);
                        
                        console.log('✅ Login exitoso como partner');
                        
                        // Redirigir al partner dashboard
                        window.location.href = 'partner-dashboard.html';
                        return;
                    }
                    
                    // No se encontró ni en users ni en partners
                    console.error('❌ Usuario no encontrado en users ni partners');
                    console.log('📧 Email buscado:', email);
                    throw new Error('Usuario no encontrado en la base de datos. Por favor, contacta soporte.');
                }

                const userData = Object.values(userSnapshot.val())[0];
                const userId = Object.keys(userSnapshot.val())[0];

                console.log('✅ Datos de usuario obtenidos:', { userId, tenantId: userData.tenantId });

                // Verificar membresía del tenant
                const tenantSnapshot = await firebase.database()
                    .ref(`tenants/${userData.tenantId}/membership`)
                    .once('value');
                
                const membership = tenantSnapshot.val();
                console.log('📋 Membresía del tenant:', membership);
                
                let membershipStatus = 'active';
                let membershipPlan = 'trial';
                let daysRemaining = 0;
                
                if (membership) {
                    membershipPlan = membership.plan || 'trial';
                    
                    // Verificar si el trial o plan ha expirado
                    if (membershipPlan === 'trial' && membership.trialEndDate) {
                        const trialEnd = new Date(membership.trialEndDate);
                        const now = new Date();
                        
                        if (now > trialEnd) {
                            membershipStatus = 'expired';
                            console.log('⚠️ Trial expirado');
                            
                            // Actualizar estado en Firebase
                            await firebase.database()
                                .ref(`tenants/${userData.tenantId}/membership/status`)
                                .set('expired');
                        } else {
                            membershipStatus = 'active';
                            daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
                            console.log(`✅ Trial activo - ${daysRemaining} días restantes`);
                        }
                    } else if (membership.paidPlanEndDate) {
                        // Verificar plan de pago
                        const planEnd = new Date(membership.paidPlanEndDate);
                        const now = new Date();
                        
                        if (now > planEnd) {
                            membershipStatus = 'expired';
                            await firebase.database()
                                .ref(`tenants/${userData.tenantId}/membership/status`)
                                .set('expired');
                        } else {
                            membershipStatus = membership.status || 'active';
                            daysRemaining = Math.ceil((planEnd - now) / (1000 * 60 * 60 * 24));
                        }
                    }
                }

                // Store user data in localStorage
                localStorage.setItem('currentUserId', userId);
                localStorage.setItem('currentTenantId', userData.tenantId);
                localStorage.setItem('tenantId', userData.tenantId);
                localStorage.setItem('userEmail', userData.email);
                localStorage.setItem('userName', userData.name);
                localStorage.setItem('businessName', userData.businessName);
                
                // Guardar datos de membresía
                localStorage.setItem('membershipPlan', membershipPlan);
                localStorage.setItem('membershipStatus', membershipStatus);
                localStorage.setItem('membershipDaysRemaining', daysRemaining.toString());

                console.log('✅ Datos guardados en localStorage');
                
                // ✅ DEBUG: Verificar localStorage antes de redirección
                console.log('📊 localStorage verificado:', {
                    currentUserId: localStorage.getItem('currentUserId'),
                    currentTenantId: localStorage.getItem('currentTenantId'),
                    tenantId: localStorage.getItem('tenantId'),
                    userEmail: localStorage.getItem('userEmail'),
                    userName: localStorage.getItem('userName'),
                    businessName: localStorage.getItem('businessName')
                });

                // ✅ Verificar si es un socio comercial (partner)
                console.log('🔄 Login exitoso, verificando rol del usuario...');
                
                try {
                    const roleResponse = await fetch(`${API_URL}/api/partners/check-role/${encodeURIComponent(email)}`);
                    const roleData = await roleResponse.json();
                    
                    if (roleData.success && roleData.isPartner) {
                        console.log('🤝 Usuario es un socio comercial, redirigiendo a partner-dashboard...');
                        setTimeout(() => {
                            window.location.href = '/partner-dashboard.html';
                        }, 100);
                        return;
                    }
                } catch (roleError) {
                    console.log('⚠️ Error verificando rol de partner (continuando con flujo normal):', roleError);
                }
                
                // Si no es partner, redirigir a select.html
                console.log('🎯 URL de redirección:', '/select.html');
                console.log('⏰ Timestamp:', new Date().toISOString());
                
                // Agregar un delay muy pequeño para asegurar que localStorage se guarde
                setTimeout(() => {
                    console.log('🚀 Ejecutando redirección AHORA...');
                    window.location.href = '/select.html';
                }, 100);

            } catch (error) {
                console.error('❌ Error al iniciar sesión:', error);
                document.getElementById('loginLoading').classList.remove('show');
                document.getElementById('loginForm').style.display = 'block';
                
                let errorMessage = 'Error al iniciar sesión. Verifica tus credenciales.';
                if (error.code === 'auth/user-not-found') {
                    errorMessage = 'Usuario no encontrado. ¿Necesitas registrarte?';
                } else if (error.code === 'auth/wrong-password') {
                    errorMessage = 'Contraseña incorrecta. Intenta de nuevo.';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = 'Correo electrónico inválido.';
                } else if (error.code === 'auth/too-many-requests') {
                    errorMessage = 'Demasiados intentos fallidos. Intenta más tarde.';
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                showAlert(errorMessage, 'error');
            }
        });

        // Register form submission
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('registerName').value;
            const businessName = document.getElementById('registerBusinessName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
            const pin = getPin();

            // Validate passwords match
            if (password !== passwordConfirm) {
                document.getElementById('passwordConfirmError').classList.add('show');
                return;
            } else {
                document.getElementById('passwordConfirmError').classList.remove('show');
            }

            // Validate password length
            if (password.length < 6) {
                document.getElementById('passwordError').classList.add('show');
                return;
            } else {
                document.getElementById('passwordError').classList.remove('show');
            }

            // Validate PIN
            if (!validatePin(pin)) {
                document.getElementById('pinError').classList.add('show');
                return;
            } else {
                document.getElementById('pinError').classList.remove('show');
            }

            document.getElementById('registerLoading').classList.add('show');
            document.getElementById('registerForm').style.display = 'none';

            try {
                // Create user with Firebase Auth
                const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;

                // Hash the PIN
                const hashedPin = await hashPin(pin);

                // Generate userId (solo alfanumérico, sin guiones)
                const userId = 'user' + Date.now() + Math.random().toString(36).substr(2, 9).replace(/[^a-z0-9]/gi, '');

                // Generate tenantId (identificador único para el negocio - solo alfanumérico)
                const tenantId = 'tenant' + Date.now() + Math.random().toString(36).substr(2, 9).replace(/[^a-z0-9]/gi, '');

                // Preparar datos del usuario
                const userDataToSave = {
                    email: email,
                    name: name,
                    businessName: businessName,
                    pin: hashedPin,
                    tenantId: tenantId,
                    createdAt: new Date().toISOString(),
                    onboardingCompleted: false,
                    whatsappConnected: false,
                    firebaseUid: user.uid
                };

                // Si hay código de referido, buscar el partner directamente en Firebase
                let partnerReferido = null;
                if (codigoReferido) {
                    console.log('🔗 Buscando partner por código de referido:', codigoReferido);
                    try {
                        const partnerSnap = await firebase.database().ref('partners')
                            .orderByChild('codigoReferido')
                            .equalTo(codigoReferido)
                            .once('value');
                        
                        if (partnerSnap.exists()) {
                            const partners = partnerSnap.val();
                            const pId = Object.keys(partners)[0];
                            partnerReferido = { id: pId, ...partners[pId] };
                            console.log('✅ Partner encontrado:', partnerReferido.nombre, '(ID:', pId, ')');
                            
                            // Agregar datos de referido al usuario
                            userDataToSave.referidoPor = {
                                partnerId: partnerReferido.id,
                                codigoReferido: partnerReferido.codigoReferido,
                                nombrePartner: partnerReferido.nombre,
                                fechaReferido: new Date().toISOString()
                            };
                        } else {
                            console.warn('⚠️ Código de referido no encontrado en Firebase:', codigoReferido);
                        }
                    } catch (refError) {
                        console.error('⚠️ Error buscando partner por código:', refError);
                    }
                }

                // Create user data in database
                await firebase.database().ref('users/' + userId).set(userDataToSave);

                // Create tenant data in database (nuevo registro)
                // Calcular fecha de expiración del trial (30 días)
                const trialStartDate = new Date();
                const trialEndDate = new Date();
                trialEndDate.setDate(trialEndDate.getDate() + 30);
                
                const tenantDataToSave = {
                    userId: userId,
                    email: email,
                    restaurant: {
                        name: businessName,
                        phone: '',
                        whatsappConnected: false
                    },
                    // Información de membresía
                    membership: {
                        plan: 'trial',
                        status: 'active',
                        trialStartDate: trialStartDate.toISOString(),
                        trialEndDate: trialEndDate.toISOString(),
                        paidPlanStartDate: null,
                        paidPlanEndDate: null,
                        lastPaymentDate: null
                    },
                    onboarding: {
                        steps: {
                            whatsapp_connected: false,
                            menu_configured: false,
                            messages_configured: false,
                            test_completed: false
                        },
                        progress: 0,
                        currentStep: 'whatsapp',
                        startedAt: new Date().toISOString(),
                        lastUpdated: new Date().toISOString()
                    },
                    menu: {
                        categories: [],
                        items: []
                    },
                    messages: {
                        welcome: '¡Hola! 👋 Bienvenido a ' + businessName + '. ¿En qué puedo ayudarte?',
                        orderConfirm: 'Perfecto, tu pedido ha sido confirmado. ✅',
                        goodbye: '¡Gracias por tu pedido! Que tengas un excelente día. 😊'
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                // Si hay partner referido válido, agregar datos al tenant
                if (partnerReferido) {
                    tenantDataToSave.partnerId = partnerReferido.id;
                    tenantDataToSave.codigoReferido = partnerReferido.codigoReferido;
                    tenantDataToSave.fueReferido = true;
                    tenantDataToSave.fechaVinculacion = Date.now();
                    tenantDataToSave.referidoPor = {
                        partnerId: partnerReferido.id,
                        codigoReferido: partnerReferido.codigoReferido,
                        nombrePartner: partnerReferido.nombre,
                        fechaReferido: new Date().toISOString()
                    };
                    console.log('🏪 Tenant vinculado al partner:', partnerReferido.nombre);
                }

                await firebase.database().ref('tenants/' + tenantId).set(tenantDataToSave);
                console.log('✅ Tenant creado en Firebase:', tenantId);
                
                // 🤝 Si hay partner referido, actualizar estadísticas y crear registro
                if (partnerReferido) {
                    try {
                        const partnerRef = firebase.database().ref('partners/' + partnerReferido.id);
                        
                        // Incrementar estadísticas del partner
                        await partnerRef.child('estadisticas/totalReferidos').transaction(current => (current || 0) + 1);
                        await partnerRef.child('estadisticas/referidosActivos').transaction(current => (current || 0) + 1);

                        // Crear registro en comisiones_referidos para tracking
                        await firebase.database().ref('comisiones_referidos').push({
                            partnerId: partnerReferido.id,
                            codigoReferido: partnerReferido.codigoReferido,
                            tenantId: tenantId,
                            userId: userId,
                            nombreNegocio: businessName,
                            emailNegocio: email,
                            estado: 'activo',
                            fechaRegistro: new Date().toISOString()
                        });

                        console.log('✅ Estadísticas del partner actualizadas y referido registrado');
                        
                        // Limpiar código de referido del localStorage
                        localStorage.removeItem('codigoReferido');
                    } catch (partnerError) {
                        console.error('⚠️ Error al actualizar estadísticas del partner (no crítico):', partnerError);
                    }
                }

                // Store user data in localStorage
                localStorage.setItem('currentUserId', userId);
                localStorage.setItem('currentTenantId', tenantId);
                localStorage.setItem('tenantId', tenantId);
                localStorage.setItem('userEmail', email);
                localStorage.setItem('userName', name);
                localStorage.setItem('businessName', businessName);
                
                // Verificar que se guardó correctamente
                console.log('✅ Usuario registrado y datos guardados en localStorage:', {
                    userId,
                    tenantId,
                    email,
                    name,
                    businessName
                });

                showAlert('¡Cuenta creada exitosamente! Redirigiendo al inicio...', 'success');

                // Redirect to select after 1.5 seconds (dar tiempo a que se guarde localStorage)
                setTimeout(() => {
                    console.log('🔄 Redirigiendo a select con tenantId:', localStorage.getItem('tenantId'));
                    window.location.href = '/select.html';
                }, 1500);

            } catch (error) {
                console.error('Error al registrar usuario:', error);
                document.getElementById('registerLoading').classList.remove('show');
                document.getElementById('registerForm').style.display = 'block';
                
                let errorMessage = 'Error al crear la cuenta.';
                if (error.code === 'auth/email-already-in-use') {
                    errorMessage = 'Este correo ya está registrado.';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = 'Correo electrónico inválido.';
                } else if (error.code === 'auth/weak-password') {
                    errorMessage = 'La contraseña es muy débil.';
                }
                
                showAlert(errorMessage, 'error');
            }
        });

}); // End of DOMContentLoaded

// ==========================================
// FUNCIONES DE CÓDIGO DE REFERIDO
// ==========================================

/**
 * Verifica el código de referido y muestra un indicador si es válido
 * Usa Firebase directamente (sin depender de API backend)
 */
async function verificarYMostrarCodigoReferido(codigo) {
    try {
        const snapshot = await firebase.database().ref('partners')
            .orderByChild('codigoReferido')
            .equalTo(codigo)
            .once('value');
        
        if (snapshot.exists()) {
            const partners = snapshot.val();
            const partnerInfo = Object.values(partners)[0];
            mostrarIndicadorReferido(codigo, partnerInfo.nombre);
        } else {
            console.log('⚠️ Código de referido no válido:', codigo);
            localStorage.removeItem('codigoReferido');
        }
    } catch (error) {
        console.error('Error verificando código de referido:', error);
    }
}

/**
 * Muestra un indicador visual de que el usuario viene referido
 */
function mostrarIndicadorReferido(codigo, partnerNombre) {
    // Crear el indicador
    const indicator = document.createElement('div');
    indicator.id = 'referralIndicator';
    indicator.className = 'referral-indicator';
    indicator.innerHTML = `
        <div class="referral-badge">
            <span class="referral-icon">🎯</span>
            <span class="referral-text">
                Referido por <strong>${partnerNombre || codigo}</strong>
            </span>
            <button class="referral-remove" onclick="removerCodigoReferido()" title="Eliminar">×</button>
        </div>
    `;
    
    // Insertar al inicio del body
    document.body.insertBefore(indicator, document.body.firstChild);
    
    // Agregar estilos
    const style = document.createElement('style');
    style.textContent = `
        .referral-indicator {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #4f46e5, #7c3aed);
            padding: 10px 20px;
            z-index: 1000;
            text-align: center;
        }
        .referral-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: white;
            font-size: 14px;
        }
        .referral-icon {
            font-size: 18px;
        }
        .referral-remove {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 14px;
            line-height: 1;
            margin-left: 8px;
        }
        .referral-remove:hover {
            background: rgba(255,255,255,0.3);
        }
        .auth-container {
            margin-top: 50px !important;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Remueve el código de referido
 */
function removerCodigoReferido() {
    codigoReferido = null;
    localStorage.removeItem('codigoReferido');
    const indicator = document.getElementById('referralIndicator');
    if (indicator) {
        indicator.remove();
    }
}
