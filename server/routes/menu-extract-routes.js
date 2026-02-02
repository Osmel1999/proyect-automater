/**
 * Rutas para extraccion de menu con IA
 */

const express = require('express');
const router = express.Router();
const geminiService = require('../services/gemini-service');
const admin = require('firebase-admin');

/**
 * POST /api/menu/extract-from-image
 * Extrae items del menu desde una imagen usando Gemini Vision
 * 
 * Body: { image: "base64...", mimeType: "image/jpeg", tenantId: "..." }
 */
router.post('/extract-from-image', async (req, res) => {
  try {
    const { image, mimeType, tenantId } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'No se proporciono imagen'
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'No se proporciono tenantId'
      });
    }

    console.log(`[Menu Extract] Procesando imagen para tenant ${tenantId}`);
    console.log(`[Menu Extract] Tamano de imagen: ${Math.round(image.length / 1024)} KB`);

    // Limpiar base64 si tiene prefijo
    let cleanBase64 = image;
    if (image.includes(',')) {
      cleanBase64 = image.split(',')[1];
    }

    // Extraer menu con Gemini
    const items = await geminiService.extractMenuFromImage(cleanBase64, mimeType || 'image/jpeg');

    console.log(`[Menu Extract] Extraidos ${items.length} items para tenant ${tenantId}`);

    res.json({
      success: true,
      items: items,
      count: items.length
    });

  } catch (error) {
    console.error('[Menu Extract] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al procesar la imagen'
    });
  }
});

/**
 * POST /api/menu/save-extracted
 * Guarda los items extraidos en Firebase
 * 
 * Body: { tenantId: "...", items: [...], replaceAll: true/false }
 */
router.post('/save-extracted', async (req, res) => {
  try {
    const { tenantId, items, replaceAll } = req.body;

    if (!tenantId || !items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: 'Datos invalidos'
      });
    }

    const db = admin.database();
    const menuRef = db.ref(`tenants/${tenantId}/menu/items`);

    if (replaceAll) {
      // Reemplazar todo el menu
      const menuData = {};
      items.forEach(item => {
        const itemId = item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        menuData[itemId] = {
          id: itemId,
          name: item.name,
          price: item.price,
          category: item.category || 'General',
          description: item.description || '',
          available: item.available !== false
        };
      });
      await menuRef.set(menuData);
    } else {
      // Agregar al menu existente
      for (const item of items) {
        const itemId = item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await menuRef.child(itemId).set({
          id: itemId,
          name: item.name,
          price: item.price,
          category: item.category || 'General',
          description: item.description || '',
          available: item.available !== false
        });
      }
    }

    console.log(`[Menu Save] Guardados ${items.length} items para tenant ${tenantId} (replace: ${replaceAll})`);

    res.json({
      success: true,
      message: `${items.length} items guardados correctamente`,
      count: items.length
    });

  } catch (error) {
    console.error('[Menu Save] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al guardar el menu'
    });
  }
});

module.exports = router;
