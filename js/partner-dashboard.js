/**
 * 🤝 Partner Dashboard JavaScript
 * Panel de control para socios comerciales
 * Consistente con el diseño del dashboard principal
 */

const API_URL = 'https://api.kdsapp.site';

// Estado
let partnerData = null;
let userEmail = null;
let enlaceReferido = '';

// ==========================================
// INICIALIZACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    userEmail = localStorage.getItem('userEmail');
    
    if (!userEmail) {
        showToast('Debes iniciar sesión primero', 'error');
        setTimeout(() => {
            window.location.href = 'auth.html';
        }, 1500);
        return;
    }
    
    await verificarAcceso();
});

async function verificarAcceso() {
    try {
        // Verificar si es partner
        const response = await fetch(`${API_URL}/api/partners/check-role/${encodeURIComponent(userEmail)}`);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error('Error verificando rol');
        }
        
        if (!data.isPartner) {
            showToast('No tienes acceso a este panel', 'error');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            return;
        }
        
        // Es partner, cargar datos
        await cargarDatosPartner();
        
    } catch (error) {
        console.error('Error verificando acceso:', error);
        showToast('Error de conexión', 'error');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
    }
}

async function cargarDatosPartner() {
    try {
        const response = await fetch(`${API_URL}/api/partners/mi-cuenta/info`, {
            headers: {
                'X-User-Email': userEmail
            }
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Error cargando datos');
        }
        
        partnerData = data;
        enlaceReferido = data.partner.enlaceReferido;
        
        // Ocultar loading y mostrar contenido usando clases CSS
        const loadingOverlay = document.getElementById('loadingOverlay');
        const mainContent = document.getElementById('mainContent');
        const partnerHeader = document.getElementById('partnerHeader');
        
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
        if (mainContent) mainContent.classList.remove('hidden');
        if (partnerHeader) partnerHeader.classList.remove('hidden');
        
        // Actualizar UI
        actualizarUI();
        
    } catch (error) {
        console.error('Error cargando datos partner:', error);
        showToast('Error cargando datos', 'error');
    }
}

function actualizarUI() {
    // Header
    document.getElementById('partnerName').textContent = partnerData.partner.nombre;
    
    // Código de referido
    document.getElementById('codigoReferido').textContent = partnerData.partner.codigoReferido;
    
    // Estadísticas
    document.getElementById('totalReferidos').textContent = partnerData.estadisticas.totalReferidos;
    document.getElementById('referidosActivos').textContent = partnerData.estadisticas.referidosActivos;
    document.getElementById('totalGanado').textContent = formatCurrency(partnerData.estadisticas.totalComisionesGeneradas);
    document.getElementById('pendientePago').textContent = formatCurrency(partnerData.estadisticas.comisionesPendientes);
    
    // Tablas
    renderReferidos(partnerData.referidos);
    renderComisiones(partnerData.ultimasComisiones);
}

// ==========================================
// RENDERIZADO DE TABLAS
// ==========================================

function renderReferidos(referidos) {
    const tbody = document.getElementById('referidosTableBody');
    
    if (!referidos || referidos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty">
                    <div class="empty-state">
                        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 48px; height: 48px;">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                        <p>Aún no tienes referidos</p>
                        <span>¡Comparte tu código para empezar a ganar!</span>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = referidos.map(ref => `
        <tr>
            <td>
                <div class="restaurant-info">
                    <span class="restaurant-name">${escapeHtml(ref.nombre)}</span>
                    <span class="restaurant-email">${escapeHtml(ref.email || '')}</span>
                </div>
            </td>
            <td>${formatDate(ref.fechaRegistro)}</td>
            <td><span class="plan-badge ${ref.plan}">${ref.plan}</span></td>
            <td><span class="status-badge ${ref.estado}">${getStatusText(ref.estado)}</span></td>
        </tr>
    `).join('');
}

function renderComisiones(comisiones) {
    const tbody = document.getElementById('comisionesTableBody');
    
    if (!comisiones || comisiones.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty">
                    <div class="empty-state">
                        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 48px; height: 48px;">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                        <p>Aún no tienes comisiones</p>
                        <span>Cuando tus referidos paguen membresías, verás tus comisiones aquí.</span>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = comisiones.map(com => `
        <tr>
            <td>${formatDate(com.fechaGenerada)}</td>
            <td>${escapeHtml(com.tenantNombre)}</td>
            <td><span class="membership-badge">${com.tipoMembresia}</span></td>
            <td class="amount">${formatCurrency(com.valorComision)}</td>
            <td><span class="status-badge ${com.estado}">${getComisionStatusText(com.estado)}</span></td>
        </tr>
    `).join('');
}

// ==========================================
// ACCIONES
// ==========================================

function copiarEnlace() {
    if (!enlaceReferido) {
        showToast('Error: enlace no disponible', 'error');
        return;
    }
    
    navigator.clipboard.writeText(enlaceReferido)
        .then(() => {
            showToast('¡Enlace copiado al portapapeles!', 'success');
        })
        .catch(err => {
            // Fallback para navegadores que no soportan clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = enlaceReferido;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showToast('¡Enlace copiado!', 'success');
        });
}

function cambiarTab(tabId) {
    // Actualizar botones
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabId) {
            tab.classList.add('active');
        }
    });
    
    // Actualizar contenido
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabId}Tab`).classList.add('active');
}

function logout() {
    localStorage.removeItem('userEmail');
    localStorage.removeItem('tenantId');
    window.location.href = 'auth.html';
}

// ==========================================
// UTILIDADES
// ==========================================

function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '$0';
    return '$' + amount.toLocaleString('es-CO');
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getStatusText(status) {
    const statusMap = {
        'active': 'Activo',
        'trial': 'En Trial',
        'expired': 'Expirado',
        'inactive': 'Inactivo'
    };
    return statusMap[status] || status;
}

function getComisionStatusText(estado) {
    const statusMap = {
        'pendiente': '⏳ Pendiente',
        'pagada': '✅ Pagada'
    };
    return statusMap[estado] || estado;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 4000);
}

// ==========================================
// CAMBIO DE CONTRASEÑA
// ==========================================

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyAI0DN6Vy2vnBXOcSsKUXAcLqI0kB3Y7EE",
    authDomain: "automater-whatsapp.firebaseapp.com",
    databaseURL: "https://automater-whatsapp-default-rtdb.firebaseio.com",
    projectId: "automater-whatsapp",
    storageBucket: "automater-whatsapp.firebasestorage.app",
    messagingSenderId: "455122736882",
    appId: "1:455122736882:web:fcd6c0d5e9e845e8bf1ec4"
};

// Inicializar Firebase si no está inicializado
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

function abrirModalCambiarPassword() {
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('passwordModal').classList.add('active');
}

function cerrarModalCambiarPassword() {
    document.getElementById('passwordModal').classList.remove('active');
}

async function cambiarPassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validaciones
    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('Todos los campos son obligatorios', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('La nueva contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('Las contraseñas no coinciden', 'error');
        return;
    }
    
    try {
        const user = firebase.auth().currentUser;
        
        if (!user) {
            // Si no hay usuario activo, re-autenticar
            const credential = firebase.auth.EmailAuthProvider.credential(userEmail, currentPassword);
            await firebase.auth().signInWithEmailAndPassword(userEmail, currentPassword);
        }
        
        // Re-autenticar antes de cambiar la contraseña (requerido por Firebase)
        const credential = firebase.auth.EmailAuthProvider.credential(userEmail, currentPassword);
        await firebase.auth().currentUser.reauthenticateWithCredential(credential);
        
        // Cambiar la contraseña
        await firebase.auth().currentUser.updatePassword(newPassword);
        
        // Marcar que ya no requiere cambio de password
        await fetch(`${API_URL}/api/partners/mi-cuenta/password-cambiado`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Email': userEmail
            }
        });
        
        showToast('¡Contraseña actualizada correctamente!', 'success');
        cerrarModalCambiarPassword();
        
    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        
        if (error.code === 'auth/wrong-password') {
            showToast('La contraseña actual es incorrecta', 'error');
        } else if (error.code === 'auth/user-not-found') {
            showToast('Usuario no encontrado', 'error');
        } else if (error.code === 'auth/too-many-requests') {
            showToast('Demasiados intentos. Intenta más tarde.', 'error');
        } else {
            showToast('Error al cambiar la contraseña: ' + error.message, 'error');
        }
    }
}

