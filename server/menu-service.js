/**
 * Menu Service - Gestión de menús por tenant desde Firebase
 * Lee los menús configurados en el dashboard de cada restaurante
 */

const firebaseService = require('./firebase-service');

// Cache de menús por tenant (5 minutos de TTL)
const menuCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene el menú de un tenant desde Firebase (con caché)
 * @param {string} tenantId - ID del tenant
 * @returns {Promise<Array>} Array de items del menú
 */
async function obtenerMenuTenant(tenantId) {
  // Verificar caché
  const cached = menuCache.get(tenantId);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log(`📋 [Menu] Usando caché para tenant ${tenantId}`);
    return cached.items;
  }

  try {
    console.log(`🔄 [Menu] Cargando menú desde Firebase para tenant ${tenantId}`);
    
    // Leer menú desde Firebase
    const snapshot = await firebaseService.database
      .ref(`tenants/${tenantId}/menu/items`)
      .once('value');
    
    const menuData = snapshot.val();

    if (!menuData || Object.keys(menuData).length === 0) {
      console.warn(`⚠️ [Menu] Tenant ${tenantId} no tiene menú configurado, usando menú de ejemplo`);
      return obtenerMenuEjemplo();
    }

    // Convertir objeto a array y filtrar solo disponibles
    const items = Object.values(menuData)
      .filter(item => item.available !== false)
      .map((item, index) => ({
        numero: String(index + 1),
        nombre: item.name,
        descripcion: item.description || '',
        precio: item.price,
        categoria: item.category || 'otros',
        disponible: item.available !== false,
        id: item.id
      }));

    console.log(`✅ [Menu] Cargados ${items.length} items para tenant ${tenantId}`);

    // Guardar en caché
    menuCache.set(tenantId, {
      items,
      timestamp: Date.now()
    });

    return items;

  } catch (error) {
    console.error(`❌ [Menu] Error cargando menú para tenant ${tenantId}:`, error);
    return obtenerMenuEjemplo();
  }
}

/**
 * Obtiene todos los items del menú de un tenant
 * @param {string} tenantId - ID del tenant
 * @returns {Promise<Array>}
 */
async function obtenerTodos(tenantId) {
  return await obtenerMenuTenant(tenantId);
}

/**
 * Obtiene un item del menú por su número
 * @param {string} tenantId - ID del tenant
 * @param {string} numero - Número del item
 * @returns {Promise<Object|null>}
 */
async function obtenerItem(tenantId, numero) {
  const menu = await obtenerMenuTenant(tenantId);
  return menu.find(item => item.numero === numero && item.disponible) || null;
}

/**
 * Obtiene items por categoría
 * @param {string} tenantId - ID del tenant
 * @param {string} categoria - Categoría a filtrar
 * @returns {Promise<Array>}
 */
async function obtenerPorCategoria(tenantId, categoria) {
  const menu = await obtenerMenuTenant(tenantId);
  return menu.filter(item => 
    item.categoria === categoria && item.disponible
  );
}

/**
 * Busca items por texto
 * @param {string} tenantId - ID del tenant
 * @param {string} texto - Texto a buscar
 * @returns {Promise<Array>}
 */
async function buscar(tenantId, texto) {
  const menu = await obtenerMenuTenant(tenantId);
  texto = texto.toLowerCase();
  return menu.filter(item => 
    item.disponible &&
    (item.nombre.toLowerCase().includes(texto) ||
     item.descripcion.toLowerCase().includes(texto))
  );
}

/**
 * Invalida el caché del menú de un tenant
 * @param {string} tenantId - ID del tenant
 */
function invalidarCache(tenantId) {
  menuCache.delete(tenantId);
  console.log(`🗑️ [Menu] Caché invalidado para tenant ${tenantId}`);
}

/**
 * Menú de ejemplo para tenants sin menú configurado
 */
function obtenerMenuEjemplo() {
  console.log('📋 [Menu] Retornando menú de ejemplo');
  return [
    {
      numero: '1',
      nombre: 'Hamburguesa Clásica',
      descripcion: 'Hamburguesa de carne con lechuga y tomate',
      precio: 500,
      categoria: 'principales',
      disponible: true
    },
    {
      numero: '2',
      nombre: 'Pizza Margarita',
      descripcion: 'Pizza con salsa de tomate y queso',
      precio: 800,
      categoria: 'principales',
      disponible: true
    },
    {
      numero: '3',
      nombre: 'Papas Fritas',
      descripcion: 'Porción de papas fritas crujientes',
      precio: 300,
      categoria: 'entradas',
      disponible: true
    },
    {
      numero: '4',
      nombre: 'Coca Cola',
      descripcion: 'Bebida 500ml',
      precio: 200,
      categoria: 'bebidas',
      disponible: true
    }
  ];
}

module.exports = {
  obtenerTodos,
  obtenerItem,
  obtenerPorCategoria,
  buscar,
  invalidarCache,
  obtenerMenuTenant
};
