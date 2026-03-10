const express = require('express');
const router = express.Router();
const { 
    getFinances, 
    createFinance,
    updateFinance, 
    deleteFinance, 
    getSummary,
    downloadInvoice // 👈 NUEVO: Importamos el controlador del PDF
} = require('../controllers/finance.controller');
const auth = require('../middlewares/auth.middleware');

// Protegemos todas las rutas de este archivo
router.use(auth);

// ¡Importante! La ruta 'summary' debe ir ANTES de '/:id' para que no confunda la palabra "summary" con un ID
router.get('/summary', getSummary);

router.route('/')
    .get(getFinances)
    .post(createFinance);

// 👇 ⚡ NUEVA RUTA: Descargar la factura en PDF
router.get('/:id/invoice', downloadInvoice);

router.route('/:id')
.put(updateFinance)
.delete(deleteFinance);


module.exports = router;