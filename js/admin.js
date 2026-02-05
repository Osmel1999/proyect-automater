/**
 * 🛡️ Admin Panel JavaScript
 * Maneja la autenticación, carga de datos y acciones del panel de administración
 */

const API_URL = 'https://api.kdsapp.site';

// Estado
let adminToken = null;
let adminEmail = null;
let allTenants = [];

// ==========================================
// INICIALIZACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Verificar si ya tiene token guardado
    adminToken = sessionStorage.getItem('adminToken');
    adminEmail = localStorage.getItem('userEmail');
    
    if (!adminEmail) {
        // No hay usuario logueado
        alert('Debes iniciar sesión primero');
        window.location.href = 'auth.html';
        return;
    }
    
    // Verificar que es el admin
    checkIfAdmin();
});

async function checkIfAdmin() {
    try {
        const response = await fetch(`${API_URL}/api/admin/check/${encodeURIComponent(adminEmail)}`);
        const data = await response.json();
        
        if (!data.isAdmin) {
            alert('No tienes permisos de administrador');
            window.location.href = 'dashboard.html';
            return;
        }
        
        // Es admin, verificar si ya tiene token válido
        if (adminToken) {
            // Intentar cargar datos para verificar token
            try {
                await loadStats();
                // Token válido, mostrar panel
                showAdminPanel();
            } catch (e) {
                // Token inválido, mostrar PIN
                sessionStorage.removeItem('adminToken');
                adminToken = null;
                showPinModal();
            }
        } else {
            showPinModal();
        }
        
    } catch (error) {
        console.error('Error verificando admin:', error);
        alert('Error de conexión');
        window.location.href = 'dashboard.html';
    }
}

function showPinModal() {
    document.getElementById('pinModal').style.display = 'flex';
    document.getElementById('adminContent').style.display = 'none';
    document.getElementById('pinInput').focus();
    
    // Enter para verificar
    document.getElementById('pinInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            verifyPin();
        }
    });
}

async function verifyPin() {
    const pin = document.getElementById('pinInput').value;
    const errorEl = document.getElementById('pinError');
    
    if (!pin || pin.length !== 4) {
        errorEl.textContent = 'Ingresa un PIN de 4 dígitos';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/admin/verify-pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: adminEmail, pin })
        });
        
        const data = await response.json();
        
        if (data.success) {
            adminToken = data.adminToken;
            sessionStorage.setItem('adminToken', adminToken);
            showAdminPanel();
        } else {
            errorEl.textContent = data.error || 'PIN incorrecto';
            document.getElementById('pinInput').value = '';
            document.getElementById('pinInput').focus();
        }
        
    } catch (error) {
        console.error('Error verificando PIN:', error);
        errorEl.textContent = 'Error de conexión';
    }
}

function showAdminPanel() {
    document.getElementById('pinModal').style.display = 'none';
    document.getElementById('adminContent').style.display = 'block';
    document.getElementById('adminEmail').textContent = adminEmail;
    
    // Cargar datos
    loadStats();
    loadTenants();
}

function logout() {
    sessionStorage.removeItem('adminToken');
    window.location.href = 'dashboard.html';
}

// ==========================================
// CARGA DE DATOS
// ==========================================

async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/api/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Token inválido');
        }
        
        const data = await response.json();
        
        if (data.success) {
            const stats = data.stats;
            
            document.getElementById('totalTenants').textContent = stats.totalTenants;
            document.getElementById('activeTenants').textContent = stats.activeTenants;
            document.getElementById('paidTenants').textContent = stats.paidTenants;
            document.getElementById('expiringTenants').textContent = stats.expiringIn7Days;
            document.getElementById('expiredTenants').textContent = stats.expiredTenants;
            document.getElementById('connectedBots').textContent = stats.connectedBots;
            
            document.getElementById('revenueThisMonth').textContent = formatCurrency(stats.revenue.thisMonth);
            document.getElementById('revenueLastMonth').textContent = formatCurrency(stats.revenue.lastMonth);
        }
        
    } catch (error) {
        console.error('Error cargando stats:', error);
        throw error;
    }
}

async function loadTenants() {
    try {
        const response = await fetch(`${API_URL}/api/admin/tenants`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            allTenants = data.tenants;
            renderTenants(allTenants);
        }
        
    } catch (error) {
        console.error('Error cargando tenants:', error);
        document.getElementById('tenantsTableBody').innerHTML = 
            '<tr><td colspan="7" class="error">Error cargando datos</td></tr>';
    }
}

function renderTenants(tenants) {
    const tbody = document.getElementById('tenantsTableBody');
    
    if (tenants.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty">No hay restaurantes</td></tr>';
        return;
    }
    
    tbody.innerHTML = tenants.map(tenant => `
        <tr class="${getRowClass(tenant)}">
            <td>
                <div class="tenant-name">${escapeHtml(tenant.name)}</div>
                <div class="tenant-email">${escapeHtml(tenant.email)}</div>
            </td>
            <td><span class="plan-badge ${tenant.plan}">${tenant.plan}</span></td>
            <td><span class="status-badge ${tenant.status}">${getStatusText(tenant.status)}</span></td>
            <td class="days-cell ${getDaysClass(tenant.daysRemaining)}">
                ${tenant.daysRemaining !== null ? tenant.daysRemaining + 'd' : '∞'}
            </td>
            <td>
                <div class="orders-info">
                    <span>${tenant.ordersThisPeriod}</span>
                    <span class="orders-limit">/ ${tenant.ordersLimit === Infinity ? '∞' : tenant.ordersLimit}</span>
                </div>
            </td>
            <td>
                <span class="connection-status ${tenant.whatsappConnected ? 'connected' : 'disconnected'}">
                    ${tenant.whatsappConnected ? '🟢' : '🔴'}
                </span>
            </td>
            <td class="actions-cell">
                <button class="action-btn" onclick="viewTenant('${tenant.id}')" title="Ver detalles">
                    👁️
                </button>
                <button class="action-btn" onclick="openExtendModal('${tenant.id}', '${escapeHtml(tenant.name)}', '${tenant.plan}')" title="Extender plan">
                    📅
                </button>
                <button class="action-btn" onclick="openNotifyModal('${tenant.id}', '${escapeHtml(tenant.name)}')" title="Enviar notificación">
                    📱
                </button>
            </td>
        </tr>
    `).join('');
}

function filterTenants() {
    const planFilter = document.getElementById('filterPlan').value;
    const statusFilter = document.getElementById('filterStatus').value;
    const search = document.getElementById('searchTenant').value.toLowerCase();
    
    let filtered = allTenants;
    
    if (planFilter !== 'all') {
        filtered = filtered.filter(t => t.plan === planFilter);
    }
    
    if (statusFilter !== 'all') {
        if (statusFilter === 'expiring') {
            filtered = filtered.filter(t => t.daysRemaining !== null && t.daysRemaining <= 7 && t.daysRemaining > 0);
        } else {
            filtered = filtered.filter(t => t.status === statusFilter);
        }
    }
    
    if (search) {
        filtered = filtered.filter(t => 
            t.name.toLowerCase().includes(search) ||
            t.email.toLowerCase().includes(search) ||
            t.id.toLowerCase().includes(search)
        );
    }
    
    renderTenants(filtered);
}

// ==========================================
// MODALES Y ACCIONES
// ==========================================

async function viewTenant(tenantId) {
    try {
        const response = await fetch(`${API_URL}/api/admin/tenant/${tenantId}`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const tenant = data.tenant;
            
            document.getElementById('tenantModalTitle').textContent = tenant.config.restaurantName || tenant.id;
            document.getElementById('tenantModalBody').innerHTML = `
                <div class="tenant-details">
                    <div class="detail-section">
                        <h3>📍 Información General</h3>
                        <p><strong>ID:</strong> ${tenant.id}</p>
                        <p><strong>Email:</strong> ${tenant.config.email || 'N/A'}</p>
                        <p><strong>Teléfono:</strong> ${tenant.whatsapp.phoneNumber || 'N/A'}</p>
                        <p><strong>Nombre:</strong> ${tenant.config.restaurantName || 'N/A'}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h3>📋 Membresía</h3>
                        <p><strong>Plan:</strong> <span class="plan-badge ${tenant.membership.plan}">${tenant.membership.plan || 'trial'}</span></p>
                        <p><strong>Estado:</strong> ${tenant.membership.status || 'active'}</p>
                        <p><strong>Expira:</strong> ${tenant.membership.paidPlanEndDate || tenant.membership.trialEndDate || 'N/A'}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h3>📊 Uso del Plan</h3>
                        ${tenant.usage ? `
                            <p><strong>Pedidos este período:</strong> ${tenant.usage.usage.ordersThisPeriod} / ${tenant.usage.usage.ordersLimit === Infinity ? '∞' : tenant.usage.usage.ordersLimit}</p>
                            <p><strong>Uso:</strong> ${tenant.usage.usage.usagePercent}%</p>
                            <p><strong>Días restantes:</strong> ${tenant.usage.usage.daysRemaining}</p>
                        ` : '<p>No disponible</p>'}
                    </div>
                    
                    <div class="detail-section">
                        <h3>📱 WhatsApp</h3>
                        <p><strong>Conectado:</strong> ${tenant.whatsapp.connected ? '🟢 Sí' : '🔴 No'}</p>
                        <p><strong>Número:</strong> ${tenant.whatsapp.phoneNumber || 'N/A'}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h3>💳 Historial de Pagos</h3>
                        ${tenant.payments.length > 0 ? `
                            <table class="mini-table">
                                <thead>
                                    <tr><th>Fecha</th><th>Plan</th><th>Monto</th><th>Estado</th></tr>
                                </thead>
                                <tbody>
                                    ${tenant.payments.map(p => `
                                        <tr>
                                            <td>${new Date(p.paidAt || p.createdAt).toLocaleDateString()}</td>
                                            <td>${p.plan}</td>
                                            <td>${formatCurrency(p.amount)}</td>
                                            <td>${p.status}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : '<p>Sin pagos registrados</p>'}
                    </div>
                </div>
            `;
            
            document.getElementById('tenantModal').style.display = 'flex';
        }
        
    } catch (error) {
        console.error('Error cargando tenant:', error);
        alert('Error cargando detalles');
    }
}

function closeTenantModal() {
    document.getElementById('tenantModal').style.display = 'none';
}

function openExtendModal(tenantId, tenantName, currentPlan) {
    document.getElementById('extendTenantId').value = tenantId;
    document.getElementById('extendTenantName').textContent = tenantName;
    document.getElementById('extendPlan').value = currentPlan !== 'trial' ? currentPlan : 'emprendedor';
    document.getElementById('extendDays').value = 30;
    document.getElementById('extendReason').value = '';
    document.getElementById('extendModal').style.display = 'flex';
}

function closeExtendModal() {
    document.getElementById('extendModal').style.display = 'none';
}

async function confirmExtend() {
    const tenantId = document.getElementById('extendTenantId').value;
    const plan = document.getElementById('extendPlan').value;
    const days = document.getElementById('extendDays').value;
    const reason = document.getElementById('extendReason').value;
    
    try {
        const response = await fetch(`${API_URL}/api/admin/tenant/${tenantId}/extend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ plan, days, reason })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`✅ Plan ${plan} activado por ${days} días`);
            closeExtendModal();
            loadTenants();
            loadStats();
        } else {
            alert('❌ Error: ' + data.error);
        }
        
    } catch (error) {
        console.error('Error extendiendo plan:', error);
        alert('Error de conexión');
    }
}

function openNotifyModal(tenantId, tenantName) {
    document.getElementById('notifyTenantId').value = tenantId;
    document.getElementById('notifyTenantName').textContent = tenantName;
    document.getElementById('notifyType').value = 'info';
    document.getElementById('notifyMessage').value = '';
    document.getElementById('notifyModal').style.display = 'flex';
}

function closeNotifyModal() {
    document.getElementById('notifyModal').style.display = 'none';
}

async function sendNotification() {
    const tenantId = document.getElementById('notifyTenantId').value;
    const type = document.getElementById('notifyType').value;
    const message = document.getElementById('notifyMessage').value;
    
    if (!message.trim()) {
        alert('Escribe un mensaje');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/admin/tenant/${tenantId}/notify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ message, type })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Notificación enviada');
            closeNotifyModal();
        } else {
            alert('⚠️ ' + data.message);
        }
        
    } catch (error) {
        console.error('Error enviando notificación:', error);
        alert('Error de conexión');
    }
}

// ==========================================
// UTILIDADES
// ==========================================

function formatCurrency(amount) {
    return '$' + (amount || 0).toLocaleString('es-CO');
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
}

function getStatusText(status) {
    const texts = {
        'active': 'Activo',
        'expired': 'Expirado',
        'cancelled': 'Cancelado'
    };
    return texts[status] || status;
}

function getRowClass(tenant) {
    if (tenant.status === 'expired') return 'row-expired';
    if (tenant.daysRemaining !== null && tenant.daysRemaining <= 3) return 'row-urgent';
    if (tenant.daysRemaining !== null && tenant.daysRemaining <= 7) return 'row-warning';
    return '';
}

function getDaysClass(days) {
    if (days === null) return '';
    if (days <= 0) return 'expired';
    if (days <= 3) return 'urgent';
    if (days <= 7) return 'warning';
    return 'ok';
}

// ==========================================
// GESTIÓN DE SOCIOS COMERCIALES
// ==========================================

let allPartners = [];
let allComisiones = [];

/**
 * Cargar datos de partners
 */
async function loadPartnersData() {
    try {
        // Cargar partners
        const partnersResponse = await fetch(`${API_URL}/api/partners`, {
            headers: {
                'X-User-Email': adminEmail
            }
        });
        const partnersData = await partnersResponse.json();
        
        if (partnersData.success) {
            allPartners = partnersData.partners || [];
            renderPartners(allPartners);
            updatePartnersStats();
        }
        
        // Cargar comisiones pendientes
        const comisionesResponse = await fetch(`${API_URL}/api/partners/comisiones/all?estado=pendiente`, {
            headers: {
                'X-User-Email': adminEmail
            }
        });
        const comisionesData = await comisionesResponse.json();
        
        if (comisionesData.success) {
            allComisiones = comisionesData.comisiones || [];
            renderComisionesAdmin(allComisiones);
        }
        
    } catch (error) {
        console.error('Error cargando datos de partners:', error);
    }
}

/**
 * Actualizar estadísticas de partners
 */
function updatePartnersStats() {
    const activos = allPartners.filter(p => p.estado === 'activo');
    const totalReferidos = allPartners.reduce((sum, p) => sum + (p.estadisticas?.totalReferidos || 0), 0);
    const pendientes = allPartners.reduce((sum, p) => sum + (p.estadisticas?.comisionesPendientes || 0), 0);
    
    document.getElementById('totalPartners').textContent = activos.length;
    document.getElementById('totalReferidosPartners').textContent = totalReferidos;
    document.getElementById('comisionesPendientes').textContent = formatCurrency(pendientes);
}

/**
 * Renderizar tabla de partners
 */
function renderPartners(partners) {
    const tbody = document.getElementById('partnersTableBody');
    
    if (!partners || partners.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty">No hay socios registrados</td></tr>';
        return;
    }
    
    tbody.innerHTML = partners.map(partner => `
        <tr>
            <td>
                <div class="partner-info">
                    <span class="partner-name">${escapeHtml(partner.nombre)}</span>
                    <span class="partner-email">${escapeHtml(partner.email)}</span>
                </div>
            </td>
            <td><code class="code-badge">${partner.codigoReferido}</code></td>
            <td>${partner.estadisticas?.totalReferidos || 0}</td>
            <td>${formatCurrency(partner.estadisticas?.totalComisionesGeneradas || 0)}</td>
            <td class="amount-pending">${formatCurrency(partner.estadisticas?.comisionesPendientes || 0)}</td>
            <td><span class="status-badge ${partner.estado}">${partner.estado}</span></td>
            <td class="actions-cell">
                <button class="action-btn" onclick="verPartner('${partner.id}')" title="Ver detalles">👁️</button>
                <button class="action-btn" onclick="copiarCodigoPartner('${partner.codigoReferido}')" title="Copiar código">📋</button>
                <button class="action-btn" onclick="togglePartnerEstado('${partner.id}', '${partner.estado}')" title="${partner.estado === 'activo' ? 'Desactivar' : 'Activar'}">
                    ${partner.estado === 'activo' ? '🔴' : '🟢'}
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * Renderizar comisiones pendientes
 */
function renderComisionesAdmin(comisiones) {
    const tbody = document.getElementById('comisionesAdminTableBody');
    
    if (!comisiones || comisiones.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty">No hay comisiones pendientes</td></tr>';
        return;
    }
    
    tbody.innerHTML = comisiones.map(com => `
        <tr>
            <td>${formatDateShort(com.fechaGenerada)}</td>
            <td>${escapeHtml(com.partnerNombre)}</td>
            <td>${escapeHtml(com.tenantNombre)}</td>
            <td><span class="membership-badge">${com.tipoMembresia}</span></td>
            <td class="amount">${formatCurrency(com.valorComision)}</td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="openPayCommissionModal('${com.id}', '${escapeHtml(com.partnerNombre)}', ${com.valorComision})">
                    💵 Pagar
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * Cambiar tab de partners
 */
function cambiarPartnerTab(tabId) {
    document.querySelectorAll('.partners-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabId) {
            tab.classList.add('active');
        }
    });
    
    document.querySelectorAll('.partners-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const tabContentId = tabId === 'socios' ? 'sociosTab' : 'comisionesAdminTab';
    document.getElementById(tabContentId).classList.add('active');
}

/**
 * Modal nuevo partner
 */
function openNewPartnerModal() {
    document.getElementById('partnerNombre').value = '';
    document.getElementById('partnerEmail').value = '';
    document.getElementById('partnerTelefono').value = '';
    document.getElementById('partnerBanco').value = '';
    document.getElementById('partnerTipoCuenta').value = '';
    document.getElementById('partnerNumeroCuenta').value = '';
    document.getElementById('partnerCedula').value = '';
    document.getElementById('newPartnerModal').style.display = 'flex';
}

function closeNewPartnerModal() {
    document.getElementById('newPartnerModal').style.display = 'none';
}

/**
 * Crear nuevo partner
 */
async function crearNuevoPartner() {
    const nombre = document.getElementById('partnerNombre').value.trim();
    const emailPartner = document.getElementById('partnerEmail').value.trim();
    const telefono = document.getElementById('partnerTelefono').value.trim();
    const banco = document.getElementById('partnerBanco').value.trim();
    const tipoCuenta = document.getElementById('partnerTipoCuenta').value;
    const numeroCuenta = document.getElementById('partnerNumeroCuenta').value.trim();
    const cedula = document.getElementById('partnerCedula').value.trim();
    
    if (!nombre || !emailPartner) {
        alert('Nombre y email son obligatorios');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/partners`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Email': adminEmail
            },
            body: JSON.stringify({
                nombre,
                emailPartner,
                telefono,
                banco,
                tipoCuenta,
                numeroCuenta,
                cedula,
                titular: nombre
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`✅ Socio creado!\n\nCódigo de referido: ${data.partner.codigoReferido}\nEnlace: ${data.partner.enlaceReferido}`);
            closeNewPartnerModal();
            loadPartnersData();
        } else {
            alert('❌ Error: ' + data.error);
        }
        
    } catch (error) {
        console.error('Error creando partner:', error);
        alert('Error de conexión');
    }
}

/**
 * Ver detalles de un partner
 */
async function verPartner(partnerId) {
    const partner = allPartners.find(p => p.id === partnerId);
    if (!partner) return;
    
    alert(`
📋 Detalles del Socio

Nombre: ${partner.nombre}
Email: ${partner.email}
Teléfono: ${partner.telefono || 'No registrado'}
Código: ${partner.codigoReferido}

📊 Estadísticas:
- Referidos: ${partner.estadisticas?.totalReferidos || 0}
- Total generado: ${formatCurrency(partner.estadisticas?.totalComisionesGeneradas || 0)}
- Total pagado: ${formatCurrency(partner.estadisticas?.totalComisionesPagadas || 0)}
- Pendiente: ${formatCurrency(partner.estadisticas?.comisionesPendientes || 0)}

💳 Datos de Pago:
- Banco: ${partner.datosPago?.banco || 'No registrado'}
- Cuenta: ${partner.datosPago?.tipoCuenta || ''} ${partner.datosPago?.numeroCuenta || 'No registrada'}
- Cédula: ${partner.datosPago?.cedula || 'No registrada'}
    `.trim());
}

/**
 * Copiar código de partner
 */
function copiarCodigoPartner(codigo) {
    navigator.clipboard.writeText(codigo)
        .then(() => alert('✅ Código copiado: ' + codigo))
        .catch(() => alert('Código: ' + codigo));
}

/**
 * Activar/Desactivar partner
 */
async function togglePartnerEstado(partnerId, estadoActual) {
    const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
    
    if (!confirm(`¿${nuevoEstado === 'activo' ? 'Activar' : 'Desactivar'} este socio?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/partners/${partnerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Email': adminEmail
            },
            body: JSON.stringify({ estado: nuevoEstado })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Estado actualizado');
            loadPartnersData();
        } else {
            alert('❌ Error: ' + data.error);
        }
        
    } catch (error) {
        console.error('Error actualizando partner:', error);
        alert('Error de conexión');
    }
}

/**
 * Modal pagar comisión
 */
function openPayCommissionModal(comisionId, partnerName, amount) {
    document.getElementById('payCommissionId').value = comisionId;
    document.getElementById('payPartnerName').textContent = partnerName;
    document.getElementById('payCommissionAmount').textContent = formatCurrency(amount);
    document.getElementById('payReference').value = '';
    document.getElementById('payCommissionModal').style.display = 'flex';
}

function closePayCommissionModal() {
    document.getElementById('payCommissionModal').style.display = 'none';
}

/**
 * Confirmar pago de comisión
 */
async function confirmarPagoComision() {
    const comisionId = document.getElementById('payCommissionId').value;
    const referencia = document.getElementById('payReference').value.trim();
    
    if (!referencia) {
        alert('Ingresa la referencia del pago');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/partners/comisiones/${comisionId}/pagar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Email': adminEmail
            },
            body: JSON.stringify({ referenciaPago: referencia })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Comisión marcada como pagada');
            closePayCommissionModal();
            loadPartnersData();
        } else {
            alert('❌ Error: ' + data.error);
        }
        
    } catch (error) {
        console.error('Error pagando comisión:', error);
        alert('Error de conexión');
    }
}

/**
 * Formatear fecha corta
 */
function formatDateShort(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short'
    });
}

// Cargar datos de partners cuando se muestra el panel
const originalShowAdminPanel = showAdminPanel;
showAdminPanel = function() {
    originalShowAdminPanel();
    loadPartnersData();
};
