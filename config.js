// Configuración de Firebase
// Proyecto: kds-app-7f1d3
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
    ? 'http://localhost:3000'  // Desarrollo local
    : 'https://api.kdsapp.site';  // Producción

// Exportar como variable global
window.API_BASE_URL = API_BASE_URL;

console.log('🔧 API Base URL:', API_BASE_URL);

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Exportar referencia a la base de datos
window.db = database;
