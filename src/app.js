const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

const app = express();

// ==========================================
// 1. CONFIGURACIÓN GLOBAL (Las puertas y maletas)
// ==========================================
// 👉 1. CORS: Abrimos la puerta al Frontend primero
app.use(cors()); 

// 👉 2. JSON: Abrimos la maleta de datos para poder leerla
app.use(express.json({ limit: '10kb' })); 

app.use(morgan('dev')); // Muestra las peticiones en la consola

// ==========================================
// 2. SEGURIDAD AVANZADA (Los detectores de metales)
// ==========================================
app.use(helmet()); // Protege las cabeceras HTTP

// Rate Limiting: Bloquea si hacen más de 100 peticiones en 10 min desde la misma IP
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, 
    max: 5000, 
    message: 'Demasiadas peticiones desde esta IP, intenta de nuevo en 10 minutos.'
});
app.use('/api', limiter); // Aplicamos el límite solo a las rutas de la API

// 👇 EL CERRAJERO: Desbloqueamos el candado estricto de Express 5 para que el escáner no explote
app.use((req, res, next) => {
    Object.defineProperty(req, 'query', {
        value: { ...req.query },
        writable: true,
        configurable: true,
        enumerable: true
    });
    next();
});

// 👉 3. SANITIZE: Limpiamos de virus ahora que el candado está abierto
app.use(mongoSanitize()); // Evita inyección de código en MongoDB
app.use(xss()); // Evita scripts maliciosos en los inputs

// ==========================================
// 3. RUTA DE ESTADO (Health Check)
// ==========================================
app.get('/', (req, res) => {
    res.status(200).json({
        message: '🚀 API AI Business Manager v2.0',
        status: 'Online',
        version: '2.0.0',
        timestamp: new Date()
    });
});

// ==========================================
// 4. RUTAS DE LA API (El corazón de la App)
// ==========================================
// Auth: Login y Registro
app.use('/api/auth', require('./routes/auth.routes'));

// Clientes: CRM (Protegido) ✅ ACTIVADO
app.use('/api/clients', require('./routes/client.routes'));

// Tareas: ERP y Gestión (Protegido) ✅ ACTIVADO
app.use('/api/tasks', require('./routes/task.routes'));

// Finanzas: Análisis y Reportes (Protegido) ✅ ACTIVADO
app.use('/api/finance', require('./routes/finance.routes'));

// IA: Chat con la IA (Protegido) ✅ ACTIVADO
app.use('/api/ai', require('./routes/ai.routes'));

// Dashboard: Estadísticas de la App (Protegido) ✅ ACTIVADO
app.use('/api/dashboard', require('./routes/dashboard.routes'));

// ==========================================
// 5. MANEJO DE RUTAS NO ENCONTRADAS (404)
// ==========================================
// Usamos app.use sin ruta. Si la petición llega hasta aquí abajo 
// significa que no encontró ninguna ruta válida arriba.
app.use((req, res) => {
    res.status(404).json({
        status: 'fail',
        message: `No encuentro la ruta ${req.originalUrl} en este servidor`
    });
});

module.exports = app;