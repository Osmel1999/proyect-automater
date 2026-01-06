/**
 * Menú del restaurante
 * Aquí defines todos los items disponibles para ordenar
 */

const menu = [
  // ENTRADAS
  {
    numero: '1',
    nombre: 'Empanadas de Carne',
    descripcion: '3 empanadas caseras de carne',
    precio: 450,
    categoria: 'entradas',
    disponible: true
  },
  {
    numero: '2',
    nombre: 'Papas Fritas',
    descripcion: 'Porción grande de papas fritas',
    precio: 350,
    categoria: 'entradas',
    disponible: true
  },
  
  // PLATOS PRINCIPALES
  {
    numero: '3',
    nombre: 'Hamburguesa Completa',
    descripcion: 'Carne, lechuga, tomate, queso, papas',
    precio: 850,
    categoria: 'principales',
    disponible: true
  },
  {
    numero: '4',
    nombre: 'Milanesa Napolitana',
    descripcion: 'Con jamón, queso, salsa y papas fritas',
    precio: 950,
    categoria: 'principales',
    disponible: true
  },
  {
    numero: '5',
    nombre: 'Pizza Muzzarella',
    descripcion: 'Pizza grande (8 porciones)',
    precio: 1200,
    categoria: 'principales',
    disponible: true
  },
  {
    numero: '6',
    nombre: 'Tacos al Pastor',
    descripcion: '3 tacos con carne al pastor',
    precio: 750,
    categoria: 'principales',
    disponible: true
  },
  
  // BEBIDAS
  {
    numero: '7',
    nombre: 'Coca Cola',
    descripcion: 'Botella 500ml',
    precio: 200,
    categoria: 'bebidas',
    disponible: true
  },
  {
    numero: '8',
    nombre: 'Agua Mineral',
    descripcion: 'Botella 500ml',
    precio: 150,
    categoria: 'bebidas',
    disponible: true
  },
  {
    numero: '9',
    nombre: 'Cerveza',
    descripcion: 'Cerveza artesanal 473ml',
    precio: 400,
    categoria: 'bebidas',
    disponible: true
  },
  
  // POSTRES
  {
    numero: '10',
    nombre: 'Flan Casero',
    descripcion: 'Flan casero con dulce de leche',
    precio: 350,
    categoria: 'postres',
    disponible: true
  },
  {
    numero: '11',
    nombre: 'Brownie con Helado',
    descripcion: 'Brownie tibio con helado de vainilla',
    precio: 450,
    categoria: 'postres',
    disponible: true
  }
];

/**
 * Obtiene todos los items del menú
 */
function obtenerTodos() {
  return menu.filter(item => item.disponible);
}

/**
 * Obtiene un item por su número
 */
function obtenerItem(numero) {
  return menu.find(item => item.numero === numero && item.disponible);
}

/**
 * Obtiene items por categoría
 */
function obtenerPorCategoria(categoria) {
  return menu.filter(item => 
    item.categoria === categoria && item.disponible
  );
}

/**
 * Busca items por texto
 */
function buscar(texto) {
  texto = texto.toLowerCase();
  return menu.filter(item => 
    item.disponible &&
    (item.nombre.toLowerCase().includes(texto) ||
     item.descripcion.toLowerCase().includes(texto))
  );
}

/**
 * Marca un item como no disponible
 */
function marcarNoDisponible(numero) {
  const item = menu.find(i => i.numero === numero);
  if (item) {
    item.disponible = false;
    console.log(`❌ Item #${numero} marcado como no disponible`);
    return true;
  }
  return false;
}

/**
 * Marca un item como disponible
 */
function marcarDisponible(numero) {
  const item = menu.find(i => i.numero === numero);
  if (item) {
    item.disponible = true;
    console.log(`✅ Item #${numero} marcado como disponible`);
    return true;
  }
  return false;
}

module.exports = {
  menu, // Exportar el array completo para el parser
  obtenerTodos,
  obtenerItem,
  obtenerPorCategoria,
  buscar,
  marcarNoDisponible,
  marcarDisponible
};
