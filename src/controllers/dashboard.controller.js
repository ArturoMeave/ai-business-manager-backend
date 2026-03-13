const dashboardService = require("../services/dashboard.service");
const catchAsync = require('../utils/catchAsync');

// Caché para el dashboard
// Usamos un Map (un diccionario) para guardar los datos de cada usuario por separado.
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos expresados en milisegundos

exports.getDashboardData = catchAsync(async (req, res) => {
  const userId = req.user.id;

  // 1. Miramos si tenemos guardada una foto reciente en la pizarra para este usuario
  if (cache.has(userId)) {
    const cachedRecord = cache.get(userId);
    // Comprobamos si la foto es "fresca" (tiene menos de 5 minutos)
    const isFresh = (Date.now() - cachedRecord.timestamp) < CACHE_DURATION;

    if (isFresh) {
      console.log("Entregando Dashboard desde la caché.");
      return res.json({
        status: "success",
        source: "cache", // Le chivamos al frontend que viene de la memoria
        data: cachedRecord.data,
      });
    }
  }

  // 2. Si no hay caché o está caducada, buscamos en la base de datos
  console.log("Calculando Dashboard desde la base de datos.");
  const stats = await dashboardService.getDashboardStats(userId);

  // 3. Guardamos el resultado en la pizarra para la próxima vez
  cache.set(userId, {
    data: stats,
    timestamp: Date.now()
  });

  // 4. Se lo enviamos al usuario
  res.json({
    status: "success",
    source: "database",
    data: stats,
  });
});