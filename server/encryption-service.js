/**
 * Servicio de Cifrado para Tokens de WhatsApp
 * 
 * Cifra y descifra tokens de acceso de WhatsApp de forma segura
 * usando AES-256-GCM
 */

const crypto = require('crypto');

// Algoritmo de cifrado (AES-256-GCM)
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // Tamaño del vector de inicialización
const AUTH_TAG_LENGTH = 16; // Tamaño del tag de autenticación

class EncryptionService {
  constructor() {
    // Obtener la clave de cifrado desde variables de entorno
    const encryptionKey = process.env.ENCRYPTION_KEY;
    
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY no está configurada en las variables de entorno');
    }
    
    // Convertir la clave a un buffer de 32 bytes (256 bits)
    this.key = Buffer.from(encryptionKey.padEnd(32, '0').slice(0, 32), 'utf-8');
    
    console.log('✅ Servicio de cifrado inicializado correctamente');
  }
  
  /**
   * Cifra un token de WhatsApp
   * @param {string} plainText - Token en texto plano
   * @returns {string} Token cifrado (formato: iv:authTag:encrypted)
   */
  encrypt(plainText) {
    try {
      if (!plainText) {
        throw new Error('El texto a cifrar no puede estar vacío');
      }
      
      // Generar un vector de inicialización aleatorio
      const iv = crypto.randomBytes(IV_LENGTH);
      
      // Crear cifrador
      const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
      
      // Cifrar el texto
      let encrypted = cipher.update(plainText, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Obtener el tag de autenticación
      const authTag = cipher.getAuthTag();
      
      // Combinar IV + authTag + texto cifrado
      const result = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
      
      console.log('🔐 Token cifrado exitosamente');
      return result;
      
    } catch (error) {
      console.error('❌ Error al cifrar token:', error.message);
      throw new Error('Error al cifrar el token');
    }
  }
  
  /**
   * Descifra un token de WhatsApp
   * @param {string} encryptedData - Token cifrado (formato: iv:authTag:encrypted)
   * @returns {string} Token en texto plano
   */
  decrypt(encryptedData) {
    try {
      if (!encryptedData) {
        throw new Error('El dato a descifrar no puede estar vacío');
      }
      
      // Separar IV, authTag y texto cifrado
      const parts = encryptedData.split(':');
      
      if (parts.length !== 3) {
        throw new Error('Formato de dato cifrado inválido');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      // Crear descifrador
      const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(authTag);
      
      // Descifrar el texto
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      console.log('🔓 Token descifrado exitosamente');
      return decrypted;
      
    } catch (error) {
      console.error('❌ Error al descifrar token:', error.message);
      throw new Error('Error al descifrar el token');
    }
  }
  
  /**
   * Genera una clave de cifrado aleatoria
   * (Usar solo para generar ENCRYPTION_KEY inicial)
   * @returns {string} Clave de 32 caracteres
   */
  static generateEncryptionKey() {
    return crypto.randomBytes(16).toString('hex');
  }
  
  /**
   * Valida si un token cifrado tiene el formato correcto
   * @param {string} encryptedData - Token cifrado
   * @returns {boolean} true si el formato es válido
   */
  isValidEncryptedFormat(encryptedData) {
    if (!encryptedData || typeof encryptedData !== 'string') {
      return false;
    }
    
    const parts = encryptedData.split(':');
    return parts.length === 3 && 
           parts[0].length === IV_LENGTH * 2 && 
           parts[1].length === AUTH_TAG_LENGTH * 2;
  }
}

// Exportar una instancia única (Singleton)
module.exports = new EncryptionService();
