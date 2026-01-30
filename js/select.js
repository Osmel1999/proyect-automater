// Selector page functionality
// Firebase is initialized in config.js before this script loads

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Select.js: DOM loaded, initializing...');
    
    // Verify Firebase is initialized
    if (!firebase.apps.length) {
        console.error('❌ Firebase not initialized!');
        alert('Error: Firebase no está inicializado. Por favor recarga la página.');
        return;
    }
    
    console.log('✅ Firebase initialized:', firebase.app().name);
    
    // Check authentication
    const currentUserId = localStorage.getItem('currentUserId');
    const currentTenantId = localStorage.getItem('currentTenantId');

    console.log('🔑 Authentication check:', {
        userId: currentUserId,
        tenantId: currentTenantId
    });

    if (!currentUserId) {
        console.warn('⚠️ No user ID found, redirecting to auth...');
        window.location.href = '/auth.html';
        return;
    }

        // Check onboarding status and update UI
        async function checkOnboardingStatus() {
            if (!currentTenantId) return;
            
            try {
                const snapshot = await firebase.database().ref(`tenants/${currentTenantId}/onboarding/steps`).once('value');
                const steps = snapshot.val() || {};
                
                // Solo verificar los 3 pasos críticos (igual que en dashboard.html)
                const whatsappConnected = steps.whatsapp_connected || false;
                const menuConfigured = steps.menu_configured || false;
                const messagesCustomized = steps.messages_customized || false;
                
                // Contar pasos completados
                const criticalSteps = [whatsappConnected, menuConfigured, messagesCustomized];
                const completedSteps = criticalSteps.filter(s => s === true).length;
                const allComplete = completedSteps === 3;
                
                console.log(`🔍 Estado del onboarding:
                  - WhatsApp: ${whatsappConnected}
                  - Menú: ${menuConfigured}
                  - Mensajes: ${messagesCustomized}
                  - Completo: ${allComplete}`);
                
                const onboardingBadge = document.getElementById('onboardingBadge');
                
                if (!allComplete) {
                    onboardingBadge.style.display = 'inline-block';
                    onboardingBadge.textContent = 'Completar configuración';
                } else {
                    onboardingBadge.style.display = 'none';
                }
            } catch (error) {
                console.error('Error checking onboarding status:', error);
            }
        }

        // Load user data
        const userName = localStorage.getItem('userName') || 'Usuario';
        const businessName = localStorage.getItem('businessName') || 'Mi Negocio';

        document.getElementById('userName').textContent = userName;
        document.getElementById('businessName').textContent = businessName;

        // Run onboarding check
        checkOnboardingStatus();

        // PIN Modal functionality
        const pinModal = document.getElementById('pinModal');
        const pinDigits = document.querySelectorAll('.pin-digit');
        const pinError = document.getElementById('pinError');
        const pinCancelBtn = document.getElementById('pinCancelBtn');
        const pinVerifyBtn = document.getElementById('pinVerifyBtn');

        // PIN input handling
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

        function showPinModal() {
            pinModal.classList.add('active');
            pinDigits[0].focus();
        }

        function closePinModal() {
            pinModal.classList.remove('active');
            pinDigits.forEach(d => {
                d.value = '';
                d.classList.remove('error');
            });
            pinError.classList.remove('show');
        }

        function getPin() {
            return Array.from(pinDigits).map(d => d.value).join('');
        }

        async function hashPin(pin) {
            const encoder = new TextEncoder();
            const data = encoder.encode(pin);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }

        async function verifyPin() {
            const pin = getPin();
            
            if (pin.length !== 4) {
                return;
            }

            console.log('🔐 Verificando PIN...');
            console.log('   - UserId:', currentUserId);
            console.log('   - TenantId:', currentTenantId);
            console.log('   - PIN ingresado:', pin.replace(/./g, '*'));

            try {
                // Get user PIN from database
                const userRef = firebase.database().ref('users/' + currentUserId);
                console.log('   - Consultando ruta:', `users/${currentUserId}`);
                
                const userSnapshot = await userRef.once('value');
                const userData = userSnapshot.val();

                console.log('   - Datos de usuario obtenidos:', userData ? 'Sí' : 'No');

                if (!userData) {
                    console.error('❌ Usuario no encontrado en Firebase');
                    throw new Error('Usuario no encontrado');
                }

                if (!userData.pin) {
                    console.error('❌ Usuario no tiene PIN configurado');
                    throw new Error('PIN no configurado');
                }

                console.log('   - PIN almacenado existe:', userData.pin ? 'Sí' : 'No');

                // Hash entered PIN and compare
                const hashedPin = await hashPin(pin);
                console.log('   - PIN hasheado:', hashedPin.substring(0, 10) + '...');
                console.log('   - PIN guardado:', userData.pin.substring(0, 10) + '...');
                console.log('   - ¿Coinciden?:', hashedPin === userData.pin);

                if (hashedPin === userData.pin) {
                    console.log('✅ PIN correcto, redirigiendo al dashboard...');
                    // PIN correct, redirect to dashboard directly
                    closePinModal();
                    window.location.href = `/dashboard.html?tenant=${currentTenantId}`;
                } else {
                    // PIN incorrect
                    console.warn('❌ PIN incorrecto');
                    pinError.classList.add('show');
                    pinDigits.forEach(d => {
                        d.classList.add('error');
                        d.value = '';
                    });
                    pinDigits[0].focus();

                    setTimeout(() => {
                        pinDigits.forEach(d => d.classList.remove('error'));
                    }, 500);
                }
            } catch (error) {
                console.error('❌ Error verificando PIN:', error);
                console.error('   - Mensaje:', error.message);
                console.error('   - Stack:', error.stack);
                alert('Error al verificar el PIN. Intenta nuevamente.\n\nDetalles: ' + error.message);
            }
        }

        // Event listeners
        document.getElementById('kdsOption').addEventListener('click', () => {
            window.location.href = '/kds.html';
        });

        document.getElementById('dashboardOption').addEventListener('click', () => {
            showPinModal();
        });

        pinCancelBtn.addEventListener('click', closePinModal);
        pinVerifyBtn.addEventListener('click', verifyPin);

        // Enter key on PIN
        pinDigits.forEach((digit, index) => {
            digit.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && index === pinDigits.length - 1) {
                    verifyPin();
                }
            });
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            try {
                await firebase.auth().signOut();
                localStorage.clear();
                window.location.href = '/auth.html';
            } catch (error) {
                console.error('Error al cerrar sesión:', error);
                alert('Error al cerrar sesión');
            }
        });
}); // End of DOMContentLoaded
