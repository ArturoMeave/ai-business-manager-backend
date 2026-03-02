const express = require('express');
const router = express.Router();
const { 
    register, 
    login, 
    getMe, 
    updateDetails, 
    forgotPassword, 
    resetPassword,
    updatePreferences // 👈 1. IMPORTAMOS LA NUEVA FUNCIÓN
} = require('../controllers/auth.controller');
const auth = require('../middlewares/auth.middleware');

// ==========================================
// 🔓 RUTAS PÚBLICAS (Sin token)
// ==========================================
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword); // Pide el email
router.put('/reset-password/:resettoken', resetPassword); // Usa el código del email

// ==========================================
// 🔒 RUTAS PRIVADAS (Requieren estar logueado)
// ==========================================
// Usamos el middleware 'auth' solo para estas
router.get('/me', auth, getMe); 
router.put('/updatedetails', auth, updateDetails);

// 👇 2. AÑADIMOS LA RUTA PARA LAS PREFERENCIAS DE AJUSTES
router.put('/preferences', auth, updatePreferences);

module.exports = router;