/**
 * 🤝 Partner Dashboard JavaScript
 * Panel de control para socios comerciales
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
        
        // Mostrar contenido
        document.getElementById('loadingOverlay').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        
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
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
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
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="1" x2="12" y2="23"/>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
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
