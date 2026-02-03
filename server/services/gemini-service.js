/**
 * Servicio de Google Gemini para extraccion de menu desde imagenes
 * Usa Gemini Flash para OCR + estructuracion de datos
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Usar gemini-2.5-flash que es el modelo estable actual con soporte vision
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/**
 * Extrae items del menu desde una imagen usando Gemini Vision
 * @param {string} imageBase64 - Imagen en base64 (sin el prefijo data:image/...)
 * @param {string} mimeType - Tipo de imagen (image/jpeg, image/png, etc)
 * @returns {Promise<Array>} Array de items del menu
 */
async function extractMenuFromImage(imageBase64, mimeType = 'image/jpeg') {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY no configurada');
  }

  const prompt = `Analiza esta imagen de un menu de restaurante y extrae TODOS los platos/productos con sus precios.

IMPORTANTE:
- Extrae CADA producto que veas con su precio
- Si hay categorias (ej: "Pizzas", "Bebidas"), incluyelas
- Los precios pueden estar en diferentes formatos ($12.000, 12000, $12,000)
- Si no puedes leer un precio, usa 0
- Si hay descripciones cortas, incluyelas

Responde UNICAMENTE con un JSON valido en este formato exacto (sin markdown, sin explicaciones):
[
  {
    "nombre": "Nombre del plato",
    "precio": 12000,
    "categoria": "Categoria si existe",
    "descripcion": "Descripcion corta si existe"
  }
]

Si no puedes extraer ningun item, responde: []`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBase64
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 32,
          topP: 1,
          maxOutputTokens: 4096,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Error de Gemini API:', errorData);
      throw new Error(`Error de Gemini API: ${response.status}`);
    }

    const data = await response.json();
    
    // Extraer el texto de la respuesta
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResponse) {
      console.error('Respuesta vacia de Gemini:', data);
      throw new Error('No se pudo extraer informacion del menu');
    }

    console.log('[Gemini] Respuesta raw:', textResponse.substring(0, 500));

    // Limpiar y parsear JSON
    let cleanJson = textResponse.trim();
    
    // Remover markdown si existe
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    // Parsear JSON
    const items = JSON.parse(cleanJson);

    if (!Array.isArray(items)) {
      throw new Error('La respuesta no es un array valido');
    }

    // Validar y limpiar items
    const validItems = items
      .filter(item => item.nombre && typeof item.nombre === 'string')
      .map((item, index) => ({
        id: `item_${Date.now()}_${index}`,
        name: item.nombre.trim(),
        price: parsePrice(item.precio),
        category: item.categoria?.trim() || 'General',
        description: item.descripcion?.trim() || '',
        available: true
      }));

    console.log(`[Gemini] Extraidos ${validItems.length} items del menu`);
    
    return validItems;

  } catch (error) {
    console.error('[Gemini] Error extrayendo menu:', error);
    throw error;
  }
}

/**
 * Parsea un precio a numero
 */
function parsePrice(precio) {
  if (typeof precio === 'number') return precio;
  if (!precio) return 0;
  
  // Remover simbolos de moneda y separadores
  const cleaned = String(precio)
    .replace(/[$.,\s]/g, '')
    .replace(/[^\d]/g, '');
  
  return parseInt(cleaned, 10) || 0;
}

module.exports = {
  extractMenuFromImage
};
