const Task = require("../models/Task");
const Client = require("../models/Client");
const Finance = require("../models/Finance");
const mongoose = require("mongoose");

exports.getDashboardStats = async (userId) => {
  const today = new Date();
  
  // ⚡ AHORA SÍ: Creamos objetos Date reales (no strings) para que coincidan con el type: Date de tu MongoDB
  const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  // Le añadimos las 23:59:59 para no perder las transacciones del último día del mes
  const endMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

  const userObjectId = new mongoose.Types.ObjectId(userId);

  const [
    totalClients,
    activeClients,
    pendingTasks,
    completedTasks,
    financeAgg, 
    moneyAtStakeAgg, 
  ] = await Promise.all([
    Client.countDocuments({ owner: userId }),
    Client.countDocuments({ owner: userId, active: true }),
    Task.countDocuments({ owner: userId, status: { $ne: "completed" } }),
    
    // Tareas completadas este mes
    Task.countDocuments({
      owner: userId,
      status: "completed",
      updatedAt: { $gte: startMonth, $lte: endMonth },
    }),

    // Sumamos Ingresos y Gastos del mes comparando Textos con Textos
    Finance.aggregate([
      {
        $match: {
          owner: userObjectId,
          date: { $gte: startMonth, $lte: endMonth },
        },
      },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]),

    // Sumamos el presupuesto Y EL COSTE de tareas pendientes
    Task.aggregate([
      { $match: { owner: userObjectId, status: { $ne: "completed" } } },
      {
        $group: {
          _id: null,
          totalBudget: { $sum: "$budget" },
          totalCost: { $sum: "$cost" },
        },
      },
    ]),
  ]);

  // Extraemos los resultados de finanzas
  let monthlyIncome = 0;
  let monthlyExpenses = 0;
  financeAgg.forEach((mov) => {
    if (mov._id === "ingreso") monthlyIncome = mov.total;
    if (mov._id === "gasto") monthlyExpenses = mov.total;
  });

  const netProfit = monthlyIncome - monthlyExpenses;

  // Extraemos el dinero en juego (Beneficio = Presupuesto - Coste)
  let moneyAtStake = 0;
  if(moneyAtStakeAgg.length > 0) {
    moneyAtStake = moneyAtStakeAgg[0].totalBudget - moneyAtStakeAgg[0].totalCost;
  }

  return {
    kpis: {
      netProfit,
      monthlyIncome,
      monthlyExpenses,
      moneyAtStake,
      activeClients,
      totalClients,
      pendingTasks,
      completedTasks,
    },
  };
};