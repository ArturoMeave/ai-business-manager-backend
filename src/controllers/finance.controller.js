const Finance = require("../models/Finance");
const mongoose = require("mongoose"); // 👈 IMPORTANTE para las agregaciones

exports.getFinances = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    let filter = { owner: req.user.id };

    if (type) filter.type = type;

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // ⚡ SOLUCIÓN CUELLO DE BOTELLA 7: Límite de seguridad
    // Forzamos un máximo de 500 registros para evitar que el navegador del usuario se congele
    const finances = await Finance.find(filter).sort({ date: -1 }).limit(500);
    res.json(finances);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener finanzas" });
  }
};

exports.createFinance = async (req, res) => {
  try {
    const finance = await Finance.create({ ...req.body, owner: req.user.id });
    res.status(201).json(finance);
  } catch (error) {
    res.status(400).json({ message: "Error al crear movimiento" });
  }
};

exports.deleteFinance = async (req, res) => {
  try {
    const finance = await Finance.findById(req.params.id);
    if (!finance) return res.status(404).json({ message: "No encontrado" });
    if (finance.owner.toString() !== req.user.id) return res.status(401).json({ message: "No autorizado" });

    await finance.deleteOne();
    res.json({ message: "Movimiento eliminado" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar" });
  }
};

exports.getSummary = async (req, res) => {
  try {
    // ⚡ SOLUCIÓN CUELLO DE BOTELLA 5: Agregaciones nativas de MongoDB
    // En lugar de descargar todo a la RAM, le pedimos a Mongo que sume por nosotros.
    const result = await Finance.aggregate([
      { $match: { owner: new mongoose.Types.ObjectId(req.user.id) } },
      { 
        $group: {
          _id: "$type", // Agrupa por "ingreso" o "gasto"
          total: { $sum: "$amount" } // Suma las cantidades
        } 
      }
    ]);

    let totalIncome = 0;
    let totalExpenses = 0;

    // Procesamos el pequeño resultado (solo 2 líneas de array en lugar de miles)
    result.forEach((item) => {
      if (item._id === "ingreso") totalIncome = item.total;
      if (item._id === "gasto") totalExpenses = item.total;
    });

    res.json({
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al calcular resumen" });
  }
};