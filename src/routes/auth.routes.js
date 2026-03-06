const express = require('express');
const router = express.Router();
const { 
    register, 
    login, 
    getMe, 
    updateDetails, 
    forgotPassword, 
    resetPassword,
    updatePreferences,
    updatePassword,
    deleteAccount 
} = require('../controllers/auth.controller');
const auth = require('../middlewares/auth.middleware');

// ==========================================
// 🔓 RUTAS PÚBLICAS (Sin token)
// ==========================================
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword); 
router.put('/reset-password/:resettoken', resetPassword); 

// ==========================================
// 🔒 RUTAS PRIVADAS (Requieren estar logueado)
// ==========================================
// Usamos el middleware 'auth' solo para estas
router.get('/me', auth, getMe); 
router.put('/updatedetails', auth, updateDetails);
router.put('/preferences', auth, updatePreferences);
router.put('/updatepassword', auth, updatePassword);

// 👇 AÑADIMOS LA RUTA PARA ELIMINAR LA CUENTA (Con el guion para que coincida con el Frontend)
router.delete('/delete-account', auth, deleteAccount);

module.exports = router;