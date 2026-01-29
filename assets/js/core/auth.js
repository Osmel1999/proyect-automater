/**
 * Authentication Service
 * Manejo centralizado de autenticación con Firebase
 */

const AuthService = {
  /**
   * Verificar si el usuario está autenticado
   */
  async checkAuth() {
    return new Promise((resolve, reject) => {
      const unsubscribe = auth.onAuthStateChanged(user => {
        unsubscribe();
        if (user) {
          console.log('✅ Usuario autenticado:', user.email);
          resolve(user);
        } else {
          console.log('❌ Usuario no autenticado');
          reject(new Error('No authenticated'));
        }
      });
    });
  },

  /**
   * Iniciar sesión con email y contraseña
   */
  async login(email, password) {
    try {
      console.log('🔐 Intentando login:', email);
      const result = await auth.signInWithEmailAndPassword(email, password);
      console.log('✅ Login exitoso');
      return result.user;
    } catch (error) {
      console.error('❌ Error en login:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  },

  /**
   * Registrar nuevo usuario
   */
  async register(email, password, userData = {}) {
    try {
      console.log('📝 Registrando usuario:', email);
      const result = await auth.createUserWithEmailAndPassword(email, password);
      const user = result.user;
      
      // Guardar datos adicionales del usuario
      await db.ref(`users/${user.uid}`).set({
        email: email,
        ...userData,
        createdAt: Date.now()
      });
      
      console.log('✅ Usuario registrado exitosamente');
      return user;
    } catch (error) {
      console.error('❌ Error en registro:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  },

  /**
   * Cerrar sesión
   */
  async logout() {
    try {
      console.log('👋 Cerrando sesión...');
      await auth.signOut();
      localStorage.clear();
      console.log('✅ Sesión cerrada');
      window.location.href = '/auth.html';
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error);
      throw error;
    }
  },

  /**
   * Obtener usuario actual
   */
  getCurrentUser() {
    return auth.currentUser;
  },

  /**
   * Obtener ID del usuario actual
   */
  getCurrentUserId() {
    const user = auth.currentUser;
    return user ? user.uid : null;
  },

  /**
   * Verificar si el usuario tiene acceso a un restaurante
   */
  async hasAccessToRestaurant(userId, restaurantId) {
    try {
      const snapshot = await db.ref(`tenants/${restaurantId}/users/${userId}`).once('value');
      return snapshot.exists();
    } catch (error) {
      console.error('Error verificando acceso:', error);
      return false;
    }
  },

  /**
   * Traducir códigos de error de Firebase
   */
  getErrorMessage(code) {
    const messages = {
      'auth/user-not-found': 'Usuario no encontrado',
      'auth/wrong-password': 'Contraseña incorrecta',
      'auth/email-already-in-use': 'Este email ya está registrado',
      'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
      'auth/invalid-email': 'Email inválido',
      'auth/operation-not-allowed': 'Operación no permitida',
      'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
      'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
      'auth/requires-recent-login': 'Por seguridad, vuelve a iniciar sesión',
      'auth/invalid-credential': 'Credenciales inválidas',
      'auth/network-request-failed': 'Error de red. Verifica tu conexión'
    };
    return messages[code] || `Error de autenticación: ${code}`;
  },

  /**
   * Redirigir según estado de autenticación
   */
  async redirectIfNotAuthenticated(redirectTo = '/auth.html') {
    try {
      await this.checkAuth();
      return true;
    } catch (error) {
      window.location.href = redirectTo;
      return false;
    }
  },

  /**
   * Redirigir si YA está autenticado
   */
  async redirectIfAuthenticated(redirectTo = '/select.html') {
    try {
      await this.checkAuth();
      window.location.href = redirectTo;
      return true;
    } catch (error) {
      return false;
    }
  }
};

// Exportar como variable global
window.AuthService = AuthService;

console.log('🔐 AuthService cargado correctamente');
