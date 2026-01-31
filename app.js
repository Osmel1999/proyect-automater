// Referencias a los contenedores
const pendingCards = document.getElementById('pendingCards');
const cookingCards = document.getElementById('cookingCards');
const readyCards = document.getElementById('readyCards');

// Referencias a los contadores
const pendingBadge = document.getElementById('pendingBadge');
const cookingBadge = document.getElementById('cookingBadge');
const readyBadge = document.getElementById('readyBadge');
const pendingCount = document.getElementById('pendingCount');
const cookingCount = document.getElementById('cookingCount');
const readyCount = document.getElementById('readyCount');

// Sonido de notificación
const notificationSound = document.getElementById('notificationSound');

// Estado de los pedidos
let orders = {};
let previousOrderCount = 0;

// Tenant ID - obtener del usuario autenticado
let currentTenantId = null;

// Inicializar la aplicación
function init() {
    // Verificar autenticación
    currentTenantId = localStorage.getItem('currentTenantId');
    
    if (!currentTenantId) {
        // Si no hay tenant en localStorage, redirigir a auth
        console.warn('⚠️ No hay tenant ID. Redirigiendo a autenticación...');
        window.location.href = '/auth.html';
        return;
    }

    console.log('✅ Tenant ID cargado desde localStorage:', currentTenantId);
    
    // Crear sonido de notificación si no existe
    if (!notificationSound.src) {
        createNotificationSound();
    }
    
    updateClock();
    setInterval(updateClock, 1000);
    
    // Actualizar tiempos transcurridos cada 10 segundos
    setInterval(updateElapsedTimes, 10000);
    
    // Cargar datos del tenant y escuchar pedidos
    loadTenantAndListenToOrders();
}

// Cargar tenant y escuchar pedidos
async function loadTenantAndListenToOrders() {
    try {
        // Cargar datos del tenant desde Firebase
        const tenantSnapshot = await window.db.ref(`tenants/${currentTenantId}`).once('value');
        
        if (!tenantSnapshot.exists()) {
            console.error('❌ Tenant no encontrado:', currentTenantId);
            showError('No se encontró el restaurante. Por favor, verifica tu configuración.');
            return;
        }
        
        const tenantData = tenantSnapshot.val();
        
        console.log('✅ Tenant cargado:', currentTenantId);
        console.log('🏪 Restaurante:', tenantData.restaurant?.name || 'Sin nombre');
        
        // Actualizar título con nombre del restaurante
        const restaurantNameElement = document.querySelector('.restaurant-name');
        if (restaurantNameElement) {
            restaurantNameElement.textContent = '🏪 ' + (tenantData.restaurant?.name || 'KDS');
        }
        
        // Escuchar pedidos del tenant
        listenToOrders();
        
    } catch (error) {
        console.error('❌ Error cargando tenant:', error);
        showError('Error al cargar la configuración del restaurante.');
    }
}

// Mostrar error en la UI
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #f44336; color: white; padding: 1rem 2rem; border-radius: 8px; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => errorDiv.remove(), 5000);
}

// Crear sonido de notificación con Web Audio API
function createNotificationSound() {
    // Usar un beep simple de data URL (compatible con todos los navegadores)
    // Este es un sonido corto de notificación en formato base64
    const audioDataUrl = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTOH0fPTgjMGHm7A7+OZSA0PVqzn77BfGAg+lt/yxnMlBSh+zPHcjzsKF2G56+ukUBELTKXj8bllHAU1jdXzz38qBSF1xu/glkcOE1qw6+6nVRUMR5/f88JyJgUp';
    notificationSound.src = audioDataUrl;
}

// Actualizar reloj
function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('es-CO', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    
    // Intentar con ambos IDs para compatibilidad con caché
    const clockElement = document.getElementById('currentTime') || document.getElementById('clock');
    if (clockElement) {
        clockElement.textContent = timeString;
    } else {
        console.warn('⚠️ No se encontró el elemento del reloj (currentTime o clock)');
    }
}

// Escuchar cambios en Firebase - OPTIMIZADO con listeners granulares
// En lugar de descargar TODOS los pedidos en cada cambio, solo descargamos lo que cambió
// Esto reduce el consumo de Firebase en ~80%
function listenToOrders() {
    if (!currentTenantId) {
        console.error('❌ No hay tenant ID configurado');
        return;
    }
    
    const ordersRef = window.db.ref(`tenants/${currentTenantId}/pedidos`);
    
    console.log(`📡 [OPTIMIZADO] Escuchando pedidos del tenant: ${currentTenantId}`);
    console.log(`📊 Usando listeners granulares (child_added/changed/removed)`);
    
    // Inicializar orders vacío
    orders = {};
    
    // Listener para nuevos pedidos - solo descarga el pedido nuevo
    ordersRef.on('child_added', (snapshot) => {
        const key = snapshot.key;
        const data = snapshot.val();
        
        // Ignorar placeholder
        if (key === '_placeholder') return;
        
        console.log(`📥 Nuevo pedido recibido: ${key}`);
        orders[key] = data;
        
        // Reproducir sonido solo para pedidos nuevos (no al cargar inicial)
        if (previousOrderCount > 0) {
            playNotification();
        }
        previousOrderCount = Object.keys(orders).length;
        
        renderOrders();
        updateCounters();
    });
    
    // Listener para pedidos actualizados - solo descarga el pedido que cambió
    ordersRef.on('child_changed', (snapshot) => {
        const key = snapshot.key;
        const data = snapshot.val();
        
        // Ignorar placeholder
        if (key === '_placeholder') return;
        
        console.log(`🔄 Pedido actualizado: ${key} -> ${data.estado}`);
        orders[key] = data;
        
        renderOrders();
        updateCounters();
    });
    
    // Listener para pedidos eliminados - solo recibe la key
    ordersRef.on('child_removed', (snapshot) => {
        const key = snapshot.key;
        
        // Ignorar placeholder
        if (key === '_placeholder') return;
        
        console.log(`🗑️ Pedido eliminado: ${key}`);
        delete orders[key];
        previousOrderCount = Object.keys(orders).length;
        
        renderOrders();
        updateCounters();
    });
}

// Reproducir sonido de notificación
function playNotification() {
    // Intentar reproducir sonido (puede fallar si el usuario no ha interactuado)
    notificationSound.play().catch(err => {
        console.log('No se pudo reproducir el sonido:', err);
    });
    
    // Vibración en dispositivos móviles
    if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
    }
}

// Renderizar pedidos
function renderOrders() {
    const pending = [];
    const cooking = [];
    const ready = [];
    
    // Clasificar pedidos por estado
    Object.entries(orders).forEach(([firebaseKey, order]) => {
        const orderData = { 
            ...order, 
            firebaseKey,  // Key de Firebase para operaciones
            displayId: order.id || firebaseKey,  // ID para mostrar al usuario
            timestamp: order.timestamp || Date.now()  // Asegurar timestamp válido
        };
        
        switch (order.estado) {
            case 'pendiente':
                pending.push(orderData);
                break;
            case 'cocinando':
                cooking.push(orderData);
                break;
            case 'listo':
                ready.push(orderData);
                break;
        }
    });
    
    // Ordenar por tiempo (más antiguos primero)
    pending.sort((a, b) => a.timestamp - b.timestamp);
    cooking.sort((a, b) => a.timestamp - b.timestamp);
    ready.sort((a, b) => a.timestamp - b.timestamp);
    
    // Renderizar cada columna
    renderColumn(pendingCards, pending, 'pending');
    renderColumn(cookingCards, cooking, 'cooking');
    renderColumn(readyCards, ready, 'ready');
}

// Renderizar una columna
function renderColumn(container, orders, status) {
    container.innerHTML = '';
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-text">No hay pedidos aquí</div>
            </div>
        `;
        return;
    }
    
    orders.forEach(order => {
        const card = createOrderCard(order, status);
        container.appendChild(card);
    });
}

// Crear tarjeta de pedido
function createOrderCard(order, status) {
    const card = document.createElement('div');
    card.className = `order-card ${status}`;
    card.dataset.orderId = order.firebaseKey;  // Guardar la key de Firebase para operaciones
    card.dataset.displayId = order.displayId;  // Guardar el ID de display para búsquedas
    
    // Calcular tiempo transcurrido - asegurar que timestamp sea un número válido
    const timestamp = Number(order.timestamp) || Date.now();
    const elapsed = Date.now() - timestamp;
    const minutes = Math.floor(elapsed / 60000);
    const elapsedClass = minutes > 30 ? 'danger' : minutes > 20 ? 'warning' : '';
    
    // Verificar si es urgente (más de 25 minutos)
    const isUrgent = minutes > 25;
    
    card.innerHTML = `
        <div class="order-header">
            <div class="order-number">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                #${order.displayId}
            </div>
            <div class="order-time">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                ${formatTime(order.timestamp)} - <span class="elapsed-time ${elapsedClass}">${minutes} min</span>
            </div>
        </div>
        
        <div class="order-customer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>
            ${order.cliente || 'Cliente'}
            ${order.telefono ? `<span class="phone-number">${order.telefono}</span>` : ''}
        </div>
        
        <ul class="order-items">
            ${order.items.map(item => `
                <li class="order-item">
                    <span class="item-quantity">${item.cantidad}</span>
                    <span class="item-name">${item.nombre}</span>
                    ${item.notas ? `<div class="item-notes">${item.notas}</div>` : ''}
                </li>
            `).join('')}
        </ul>
        
        <div class="order-actions">
            ${getActionButtons(order.estado, order.firebaseKey)}
        </div>
    `;
    
    return card;
}

// Obtener botones de acción según el estado
function getActionButtons(estado, orderId) {
    switch (estado) {
        case 'pendiente':
            return `
                <button class="btn btn-start" onclick="changeStatus('${orderId}', 'cocinando')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polygon points="10 8 16 12 10 16 10 8"></polygon>
                    </svg>
                    Empezar a Cocinar
                </button>
            `;
        case 'cocinando':
            return `
                <button class="btn btn-ready" onclick="changeStatus('${orderId}', 'listo')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Marcar como Listo
                </button>
            `;
        case 'listo':
            return `
                <button class="btn btn-complete" onclick="completeOrder('${orderId}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                    Entregado
                </button>
            `;
        default:
            return '';
    }
}

// Cambiar estado de un pedido
function changeStatus(orderId, newStatus) {
    if (!currentTenantId) {
        console.error('❌ No hay tenant configurado');
        return;
    }
    
    const updates = {};
    updates[`tenants/${currentTenantId}/pedidos/${orderId}/estado`] = newStatus;
    
    // Agregar timestamp de cambio de estado
    if (newStatus === 'cocinando') {
        updates[`tenants/${currentTenantId}/pedidos/${orderId}/inicioCocinado`] = Date.now();
    } else if (newStatus === 'listo') {
        updates[`tenants/${currentTenantId}/pedidos/${orderId}/horaListo`] = Date.now();
    }
    
    window.db.ref().update(updates);
}

// Completar pedido (moverlo a historial)
function completeOrder(orderId) {
    if (!currentTenantId) {
        console.error('❌ No hay tenant configurado');
        return;
    }
    
    const order = orders[orderId];
    
    if (confirm(`¿Confirmar que el pedido #${orderId} fue entregado?`)) {
        // Mover a historial del tenant
        const historyRef = window.db.ref(`tenants/${currentTenantId}/historial/${orderId}`);
        historyRef.set({
            ...order,
            estado: 'entregado',
            horaEntrega: Date.now()
        });
        
        // Eliminar de pedidos activos del tenant
        window.db.ref(`tenants/${currentTenantId}/pedidos/${orderId}`).remove();
        
        // Actualizar estadísticas del tenant
        const statsRef = window.db.ref(`tenants/${currentTenantId}/stats`);
        statsRef.once('value').then((snapshot) => {
            const stats = snapshot.val() || {};
            statsRef.update({
                totalOrders: (stats.totalOrders || 0) + 1,
                lastOrderAt: new Date().toISOString()
            });
        });
    }
}

// Actualizar contadores
function updateCounters() {
    const pending = Object.values(orders).filter(o => o.estado === 'pendiente').length;
    const cooking = Object.values(orders).filter(o => o.estado === 'cocinando').length;
    const ready = Object.values(orders).filter(o => o.estado === 'listo').length;
    
    pendingBadge.textContent = pending;
    cookingBadge.textContent = cooking;
    readyBadge.textContent = ready;
    
    pendingCount.textContent = pending;
    cookingCount.textContent = cooking;
    readyCount.textContent = ready;
    
    // Actualizar título del documento
    const total = pending + cooking + ready;
    document.title = total > 0 ? `(${total}) KDS - Cocina` : 'KDS - Cocina';
}

// Formatear tiempo
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-CO', { 
        hour: '2-digit', 
        minute: '2-digit'
    });
}

// Actualizar tiempos transcurridos en las tarjetas
function updateElapsedTimes() {
    document.querySelectorAll('.order-card').forEach(card => {
        const firebaseKey = card.dataset.orderId;
        const order = orders[firebaseKey];
        
        if (!order || !order.timestamp) {
            return;
        }
        
        // Calcular tiempo transcurrido
        const elapsed = Date.now() - order.timestamp;
        const minutes = Math.floor(elapsed / 60000);
        
        // Actualizar el texto del tiempo
        const elapsedSpan = card.querySelector('.elapsed-time');
        if (elapsedSpan) {
            // Actualizar clase de color
            elapsedSpan.className = 'elapsed-time';
            if (minutes > 30) {
                elapsedSpan.classList.add('danger');
            } else if (minutes > 20) {
                elapsedSpan.classList.add('warning');
            }
            
            // Actualizar texto
            elapsedSpan.textContent = `${minutes} min`;
        }
        
        // Actualizar indicador de urgente en tiempo real si es necesario
        const orderHeader = card.querySelector('.order-header');
        if (orderHeader && minutes > 25) {
            card.classList.add('urgent');
        } else {
            card.classList.remove('urgent');
        }
    });
}

// Formatear dinero
function formatMoney(amount) {
    return new Intl.NumberFormat('es-CO').format(amount);
}

// Exponer funciones globales
window.changeStatus = changeStatus;
window.completeOrder = completeOrder;

// Iniciar la aplicación cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
