const express = require('express');
const router = express.Router();
const { 
    register, 
    login,
    googleLogin, 
    getMe, 
    updateDetails, 
    forgotPassword, 
    resetPassword,
    updatePreferences,
    updatePassword,
    deleteAccount,
    generate2FA,
    verifyAndEnable2FA,
    verify2FALogin,
    logoutDevice,
    logout // ⚡ Importamos la nueva función
} = require('../controllers/auth.controller');
const auth = require('../middlewares/auth.middleware');

// ==========================================
// 🔓 RUTAS PÚBLICAS (Sin token)
// ==========================================
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin); 
router.post('/forgot-password', forgotPassword); 
router.put('/reset-password/:resettoken', resetPassword); 
router.post('/2fa/verify-login', verify2FALogin); 

// ==========================================
// 🔒 RUTAS PRIVADAS (Requieren estar logueado)
// ==========================================
router.get('/me', auth, getMe); 
router.put('/updatedetails', auth, updateDetails);
router.put('/preferences', auth, updatePreferences);
router.put('/updatepassword', auth, updatePassword);
router.delete('/delete-account', auth, deleteAccount);

// Rutas de configuración del 2FA en el panel de seguridad
router.post('/2fa/generate', auth, generate2FA);
router.post('/2fa/verify', auth, verifyAndEnable2FA);

// Cerrar sesión remota en un dispositivo
router.delete('/sessions/:sessionId', auth, logoutDevice);

// ⚡ NUEVA RUTA: Cerrar sesión en el dispositivo actual
router.post('/logout', auth, logout);

module.exports = router;