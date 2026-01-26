/**
 * Encryption Service - Encriptación de Credenciales de Pago
 * 
 * Este servicio encripta y desencripta las credenciales de pago
 * antes de guardarlas en Firebase para mayor seguridad.
 * 
 * Usa AES-256-GCM para encriptación simétrica
 */

const crypto = require('crypto');

class PaymentEncryptionService {
  constructor() {
    // Usar la clave de encriptación del .env o generar una por defecto
    this.encryptionKey = process.env.PAYMENT_ENCRYPTION_KEY || this.generateDefaultKey();
    
    if (!process.env.PAYMENT_ENCRYPTION_KEY) {
      console.warn('⚠️  PAYMENT_ENCRYPTION_KEY no configurada en .env');
      console.warn('   Usando clave por defecto (NO SEGURO para producción)');
      console.warn(`   Agrega esta línea a tu .env:\n   PAYMENT_ENCRYPTION_KEY=${this.encryptionKey}`);
    }
    
    // Convertir la clave a Buffer de 32 bytes
    this.key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    
    console.log('✅ PaymentEncryptionService inicializado');
  }

  /**
   * Genera una clave de encriptación por defecto
   * @returns {string} Clave aleatoria de 32 caracteres
   */
  generateDefaultKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Encripta un objeto de credenciales
   * @param {Object} credentials - Credenciales a encriptar
   * @returns {string} String encriptado en formato base64
   */
  encrypt(credentials) {
    try {
      // Convertir el objeto a JSON string
      const text = JSON.stringify(credentials);
      
      // Generar un IV (Initialization Vector) aleatorio
      const iv = crypto.randomBytes(16);
      
      // Crear el cipher
      const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
      
      // Encriptar
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Obtener el authentication tag
      const authTag = cipher.getAuthTag();
      
      // Combinar IV + authTag + encrypted y convertir a base64
      const result = Buffer.concat([
        iv,
        authTag,
        Buffer.from(encrypted, 'hex')
      ]).toString('base64');
      
      return result;
      
    } catch (error) {
      console.error('❌ Error encriptando credenciales:', error);
      throw new Error('Error al encriptar credenciales');
    }
  }

  /**
   * Desencripta credenciales
   * @param {string} encryptedData - Datos encriptados en base64
   * @returns {Object} Objeto de credenciales desencriptado
   */
  decrypt(encryptedData) {
    try {
      // Convertir de base64 a Buffer
      const buffer = Buffer.from(encryptedData, 'base64');
      
      // Extraer IV (primeros 16 bytes)
      const iv = buffer.slice(0, 16);
      
      // Extraer authTag (siguientes 16 bytes)
      const authTag = buffer.slice(16, 32);
      
      // Extraer datos encriptados (resto)
      const encrypted = buffer.slice(32).toString('hex');
      
      // Crear el decipher
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
      decipher.setAuthTag(authTag);
      
      // Desencriptar
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      // Parsear el JSON
      return JSON.parse(decrypted);
      
    } catch (error) {
      console.error('❌ Error desencriptando credenciales:', error);
      throw new Error('Error al desencriptar credenciales');
    }
  }

  /**
   * Verifica si los datos están encriptados
   * @param {string} data - Datos a verificar
   * @returns {boolean} True si están encriptados
   */
  isEncrypted(data) {
    try {
      // Intentar convertir de base64
      const buffer = Buffer.from(data, 'base64');
      // Si tiene al menos 32 bytes (IV + authTag), probablemente esté encriptado
      return buffer.length >= 32;
    } catch {
      return false;
    }
  }
}

// Exportar como singleton
module.exports = new PaymentEncryptionService();
