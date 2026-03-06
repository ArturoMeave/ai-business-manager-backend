const Task = require("../models/Task");
const Client = require("../models/Client");
const Finance = require("../models/Finance");
const mongoose = require("mongoose");

exports.getDashboardStats = async (userId) => {
  const today = new Date();
  
  const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

  // Fecha de hace 6 meses
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

  const userObjectId = new mongoose.Types.ObjectId(userId);

  const [
    totalClients,
    activeClients,
    pendingTasks,
    completedTasks,
    financeAgg, 
    moneyAtStakeAgg,
    chartAgg,     // Gráfico de Finanzas
    clientsAgg    // ⚡ NUEVO: Gráfico de Clientes
  ] = await Promise.all([
    Client.countDocuments({ owner: userId }),
    Client.countDocuments({ owner: userId, active: true }),
    Task.countDocuments({ owner: userId, status: { $ne: "completed" } }),
    Task.countDocuments({
      owner: userId,
      status: "completed",
      updatedAt: { $gte: startMonth, $lte: endMonth },
    }),
    Finance.aggregate([
      { $match: { owner: userObjectId, date: { $gte: startMonth, $lte: endMonth } } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]),
    Task.aggregate([
      { $match: { owner: userObjectId, status: { $ne: "completed" } } },
      { $group: { _id: null, totalBudget: { $sum: "$budget" }, totalCost: { $sum: "$cost" } } },
    ]),
    // Dinero de los últimos 6 meses
    Finance.aggregate([
      { $match: { owner: userObjectId, date: { $gte: sixMonthsAgo, $lte: endMonth } } },
      { 
        $group: { 
          _id: { month: { $month: "$date" }, year: { $year: "$date" }, type: "$type" }, 
          total: { $sum: "$amount" } 
        } 
      }
    ]),
    // ⚡ NUEVO: Clientes creados en los últimos 6 meses
    Client.aggregate([
      { $match: { owner: userObjectId, createdAt: { $gte: sixMonthsAgo, $lte: endMonth } } },
      {
        $group: {
          _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
          count: { $sum: 1 } // Sumamos 1 por cada cliente encontrado
        }
      }
    ])
  ]);

  let monthlyIncome = 0;
  let monthlyExpenses = 0;
  financeAgg.forEach((mov) => {
    if (mov._id === "ingreso") monthlyIncome = mov.total;
    if (mov._id === "gasto") monthlyExpenses = mov.total;
  });

  const netProfit = monthlyIncome - monthlyExpenses;

  let moneyAtStake = 0;
  if(moneyAtStakeAgg.length > 0) {
    moneyAtStake = moneyAtStakeAgg[0].totalBudget - moneyAtStakeAgg[0].totalCost;
  }

  // Construimos el esqueleto vacío de los 6 meses
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  let chartData = [];
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    chartData.push({
      name: monthNames[d.getMonth()], 
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      ingresos: 0,
      gastos: 0,
      nuevosClientes: 0 // ⚡ Añadimos la variable de clientes al esqueleto
    });
  }

  // Rellenamos con dinero real
  chartAgg.forEach(item => {
    const dataPoint = chartData.find(d => d.month === item._id.month && d.year === item._id.year);
    if (dataPoint) {
      if (item._id.type === "ingreso") dataPoint.ingresos += item.total;
      if (item._id.type === "gasto") dataPoint.gastos += item.total;
    }
  });

  // ⚡ NUEVO: Rellenamos con clientes reales
  clientsAgg.forEach(item => {
    const dataPoint = chartData.find(d => d.month === item._id.month && d.year === item._id.year);
    if (dataPoint) {
      dataPoint.nuevosClientes += item.count;
    }
  });

  return {
    kpis: {
      netProfit, monthlyIncome, monthlyExpenses, moneyAtStake,
      activeClients, totalClients, pendingTasks, completedTasks,
    },
    chartData
  };
};