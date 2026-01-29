/**
 * Firebase Configuration
 * Configuración centralizada de Firebase y API
 */

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAChWEnXztMe5YWJTPevIY5afgHMYxZBzQ",
  authDomain: "kds-app-7f1d3.firebaseapp.com",
  databaseURL: "https://kds-app-7f1d3-default-rtdb.firebaseio.com",
  projectId: "kds-app-7f1d3",
  storageBucket: "kds-app-7f1d3.firebasestorage.app",
  messagingSenderId: "236480135078",
  appId: "1:236480135078:web:246c759f840c5f140e1967",
  measurementId: "G-0Q1V5WV35X"
};

// Configuración del Backend API
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000'
  : 'https://api.kdsapp.site';

// Inicializar Firebase (solo si no está inicializado)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  console.log('✅ Firebase inicializado correctamente');
}

// Referencias globales de Firebase
const db = firebase.database();
const auth = firebase.auth();

// Exportar configuración y referencias
window.firebaseConfig = firebaseConfig;
window.API_BASE_URL = API_BASE_URL;
window.db = db;
window.auth = auth;

console.log('🔧 Configuración cargada:', {
  environment: window.location.hostname === 'localhost' ? 'desarrollo' : 'producción',
  apiUrl: API_BASE_URL
});
