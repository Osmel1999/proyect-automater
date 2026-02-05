        // ============================================
        // Capturar código de referido de la URL (?ref=REF-XXXXXX)
        // ============================================
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');
        let partnerData = null; // Se llenará si el código es válido

        if (refCode) {
            console.log('🔗 Código de referido detectado en URL:', refCode);
            // Buscar el partner por código de referido
            firebase.database().ref('partners')
                .orderByChild('codigoReferido')
                .equalTo(refCode)
                .once('value')
                .then(snapshot => {
                    if (snapshot.exists()) {
                        const partners = snapshot.val();
                        const partnerId = Object.keys(partners)[0];
                        partnerData = { id: partnerId, ...partners[partnerId] };
                        console.log('✅ Partner encontrado para referido:', partnerData.nombre, '(ID:', partnerId, ')');
                    } else {
                        console.warn('⚠️ Código de referido no válido o no encontrado:', refCode);
                    }
                })
                .catch(err => {
                    console.error('❌ Error al buscar partner por código de referido:', err);
                });
        } else {
            console.log('ℹ️ Sin código de referido en la URL. Registro normal.');
        }

        // Tabs functionality
        const tabs = document.querySelectorAll('.tab');
        const sections = document.querySelectorAll('.form-section');

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
        });

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
            alertContainer.innerHTML = `
                <div class="alert alert-${type} show">
                    ${message}
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
                
                if (!userSnapshot || !userSnapshot.exists()) {
                    console.error('❌ Usuario no encontrado después de 3 intentos');
                    console.log('📧 Email buscado:', email);
                    throw new Error('Usuario no encontrado en la base de datos. Por favor, contacta soporte.');
                }

                const userData = Object.values(userSnapshot.val())[0];
                const userId = Object.keys(userSnapshot.val())[0];

                console.log('✅ Datos de usuario obtenidos:', { userId, tenantId: userData.tenantId });

                // Store user data in localStorage
                localStorage.setItem('currentUserId', userId);
                localStorage.setItem('currentTenantId', userData.tenantId);
                localStorage.setItem('tenantId', userData.tenantId);
                localStorage.setItem('userEmail', userData.email);
                localStorage.setItem('userName', userData.name);
                localStorage.setItem('businessName', userData.businessName);

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

                // ✅ FIX: Siempre redirigir a select.html después del login
                // El usuario decide a dónde ir (KDS o Dashboard)
                console.log('🔄 Login exitoso, redirigiendo a select...');
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

                // Si hay partner referido válido, agregar datos de referido al usuario
                if (partnerData) {
                    userDataToSave.referidoPor = {
                        partnerId: partnerData.id,
                        codigoReferido: partnerData.codigoReferido,
                        nombrePartner: partnerData.nombre,
                        fechaReferido: new Date().toISOString()
                    };
                    console.log('🤝 Usuario referido por partner:', partnerData.nombre);
                }

                // Create user data in database
                await firebase.database().ref('users/' + userId).set(userDataToSave);

                // Preparar datos del tenant
                const tenantDataToSave = {
                    userId: userId,
                    email: email,
                    restaurant: {
                        name: businessName,
                        phone: '',
                        whatsappConnected: false
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
                if (partnerData) {
                    tenantDataToSave.partnerId = partnerData.id;
                    tenantDataToSave.codigoReferido = partnerData.codigoReferido;
                    tenantDataToSave.referidoPor = {
                        partnerId: partnerData.id,
                        codigoReferido: partnerData.codigoReferido,
                        nombrePartner: partnerData.nombre,
                        fechaReferido: new Date().toISOString()
                    };
                    console.log('🏪 Tenant vinculado al partner:', partnerData.id);
                }

                // Create tenant data in database
                await firebase.database().ref('tenants/' + tenantId).set(tenantDataToSave);

                console.log('✅ Tenant creado en Firebase:', tenantId);

                // Si hay partner referido, actualizar sus estadísticas y crear registro de referido
                if (partnerData) {
                    try {
                        // Incrementar totalReferidos y referidosActivos del partner
                        const partnerRef = firebase.database().ref('partners/' + partnerData.id);
                        
                        await partnerRef.child('estadisticas/totalReferidos').transaction(current => {
                            return (current || 0) + 1;
                        });
                        await partnerRef.child('estadisticas/referidosActivos').transaction(current => {
                            return (current || 0) + 1;
                        });

                        // Crear registro en comisiones_referidos para tracking
                        await firebase.database().ref('comisiones_referidos').push({
                            partnerId: partnerData.id,
                            codigoReferido: partnerData.codigoReferido,
                            tenantId: tenantId,
                            userId: userId,
                            nombreNegocio: businessName,
                            emailNegocio: email,
                            estado: 'activo',
                            fechaRegistro: new Date().toISOString()
                        });

                        console.log('✅ Estadísticas del partner actualizadas y referido registrado');
                    } catch (partnerError) {
                        // No bloquear el registro si falla la actualización del partner
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
