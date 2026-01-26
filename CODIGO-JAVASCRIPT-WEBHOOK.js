/**
 * CÓDIGO JAVASCRIPT PARA AGREGAR AL DASHBOARD.HTML
 * 
 * Funciones para generar y copiar la URL de webhook personalizada
 * por tenant para configuración de pagos multi-tenant.
 * 
 * INSTRUCCIONES:
 * 1. Abre dashboard.html
 * 2. Busca la sección de JavaScript (cerca del final, donde están las funciones de pagos)
 * 3. Agrega estas funciones ANTES del cierre de </script>
 */

/**
 * Genera y actualiza la URL de webhook para el tenant actual
 * Debe llamarse cuando:
 * - Se abre el modal de configuración de pagos
 * - Se selecciona un gateway (especialmente Wompi)
 */
function updateWebhookUrl() {
  const tenantId = currentTenantId || localStorage.getItem('currentTenantId');
  
  if (!tenantId) {
    console.warn('⚠️ No hay tenantId para generar webhook URL');
    return;
  }

  // URL base de tu backend (usa la variable global o el default)
  const API_BASE_URL = window.API_BASE_URL || 'https://api.kdsapp.site';
  
  // Generar URL de webhook personalizada para este tenant
  const webhookUrl = `${API_BASE_URL}/api/payments/webhook/wompi/${tenantId}`;
  
  // Actualizar el input de webhook URL
  const webhookInput = document.getElementById('webhook-url');
  if (webhookInput) {
    webhookInput.value = webhookUrl;
    console.log(`🔗 Webhook URL generada para ${tenantId}: ${webhookUrl}`);
  } else {
    console.warn('⚠️ Input webhook-url no encontrado');
  }
}

/**
 * Copia la URL de webhook al portapapeles
 * Proporciona feedback visual al usuario
 */
async function copyWebhookUrl() {
  const webhookInput = document.getElementById('webhook-url');
  const copyBtn = event.target.closest('.btn-copy');
  
  if (!webhookInput) {
    console.error('❌ No se encontró el input de webhook URL');
    alert('Error: No se pudo copiar la URL');
    return;
  }

  try {
    // Método moderno: usar Clipboard API
    await navigator.clipboard.writeText(webhookInput.value);
    
    // Feedback visual exitoso
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '✅ Copiado!';
    copyBtn.classList.add('copied');
    
    // Restaurar el botón después de 2 segundos
    setTimeout(() => {
      copyBtn.textContent = originalText;
      copyBtn.classList.remove('copied');
    }, 2000);
    
    console.log('✅ URL copiada al portapapeles:', webhookInput.value);
    
  } catch (error) {
    console.error('❌ Error copiando URL (método moderno):', error);
    
    // Fallback: método antiguo para navegadores que no soportan Clipboard API
    try {
      webhookInput.select();
      webhookInput.setSelectionRange(0, 99999); // Para dispositivos móviles
      
      // Ejecutar comando de copiar
      const successful = document.execCommand('copy');
      
      if (successful) {
        copyBtn.textContent = '✅ Copiado!';
        setTimeout(() => {
          copyBtn.textContent = '📋 Copiar';
        }, 2000);
        console.log('✅ URL copiada (método fallback)');
      } else {
        throw new Error('execCommand falló');
      }
      
    } catch (fallbackError) {
      console.error('❌ Error copiando URL (método fallback):', fallbackError);
      
      // Último recurso: alert para copiar manualmente
      alert('No se pudo copiar automáticamente. Por favor, copia manualmente la URL:\n\n' + webhookInput.value);
    }
  }
}

/**
 * MODIFICAR LA FUNCIÓN EXISTENTE selectGateway()
 * 
 * Busca la función selectGateway() en dashboard.html y agrega esta línea
 * al final (después de mostrar el formulario de credenciales):
 */
function selectGateway(gateway) {
  // ...código existente para limpiar selección anterior...
  // ...código existente para marcar el gateway seleccionado...
  // ...código existente para mostrar formulario de credenciales...
  
  // 🔥 AGREGAR ESTA LÍNEA AL FINAL:
  // Si es Wompi, actualizar la URL de webhook
  if (gateway === 'wompi') {
    setTimeout(() => {
      updateWebhookUrl();
    }, 100); // Pequeño delay para asegurar que el DOM esté actualizado
  }
}

/**
 * MODIFICAR LA FUNCIÓN QUE ABRE EL MODAL DE PAGOS
 * 
 * Busca la función que abre el modal (probablemente openPaymentsModal() o similar)
 * y agrega esta línea al final:
 */
// Ejemplo de función que abre el modal:
function openPaymentsModal() {
  // ...código existente para abrir modal...
  // ...código existente para cargar configuración...
  
  // 🔥 AGREGAR ESTA LÍNEA AL FINAL:
  updateWebhookUrl();
}

/**
 * AGREGAR AL EVENT LISTENER DE DOMContentLoaded
 * 
 * Si tienes un listener de DOMContentLoaded, agrega esto:
 */
document.addEventListener('DOMContentLoaded', function() {
  // ...código existente...
  
  // 🔥 AGREGAR ESTO:
  // Actualizar webhook URL si el modal de pagos está visible
  updateWebhookUrl();
});

/**
 * ALTERNATIVA: Si usas un observer para detectar cambios
 * Puedes agregar updateWebhookUrl() cuando el modal se hace visible:
 */
// Ejemplo con MutationObserver (solo si lo usas):
const paymentsModal = document.getElementById('payments-modal');
if (paymentsModal) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const isVisible = paymentsModal.style.display !== 'none';
        if (isVisible) {
          updateWebhookUrl();
        }
      }
    });
  });
  
  observer.observe(paymentsModal, { attributes: true });
}

// ============================================
// RESUMEN DE CAMBIOS NECESARIOS:
// ============================================
// 
// 1. ✅ Agregar función updateWebhookUrl()
// 2. ✅ Agregar función copyWebhookUrl()
// 3. ✅ Modificar selectGateway() para llamar updateWebhookUrl()
// 4. ✅ Modificar función de abrir modal para llamar updateWebhookUrl()
// 5. ✅ (Opcional) Agregar al DOMContentLoaded
// 
// ============================================
