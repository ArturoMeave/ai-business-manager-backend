const Finance = require("../models/Finance");
const User = require("../models/User"); 
const mongoose = require("mongoose");
const catchAsync = require('../utils/catchAsync'); 
const { generateInvoice } = require("../utils/pdfGenerator"); 

exports.getFinances = catchAsync(async (req, res) => {
  const { startDate, endDate, type } = req.query;
  let filter = { owner: req.user.id };

  if (type) filter.type = type;

  if (startDate && endDate) {
    filter.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  // Forzamos un máximo de 500 registros por seguridad
  const finances = await Finance.find(filter).sort({ date: -1 }).limit(500);
  res.json(finances);
});

exports.createFinance = catchAsync(async (req, res) => {
  const finance = await Finance.create({ ...req.body, owner: req.user.id });
  res.status(201).json(finance);
});

exports.updateFinance = catchAsync(async(req, res) => {
  let finance = await Finance.findById(req.params.id);

  if (!finance) return res.status(404).json({message: 'Movimiento no encontrado'});
  if (finance.owner.toString() !== req.user.id) return res.status(401).json({message: 'No autorizado'});

  finance = await Finance.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.json(finance);
});

exports.deleteFinance = catchAsync(async (req, res) => {
  const finance = await Finance.findById(req.params.id);
  
  if (!finance) return res.status(404).json({ message: "No encontrado" });
  if (finance.owner.toString() !== req.user.id) return res.status(401).json({ message: "No autorizado" });

  await finance.deleteOne();
  res.json({ message: "Movimiento eliminado" });
});

exports.getSummary = catchAsync(async (req, res) => {
  // Agregaciones nativas de MongoDB
  const result = await Finance.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(req.user.id) } },
    { 
      $group: {
        _id: "$type", 
        total: { $sum: "$amount" } 
      } 
    }
  ]);

  let totalIncome = 0;
  let totalExpenses = 0;

  result.forEach((item) => {
    if (item._id === "ingreso") totalIncome = item.total;
    if (item._id === "gasto") totalExpenses = item.total;
  });

  res.json({
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
  });
});

// Controlador del PDF
exports.downloadInvoice = catchAsync(async (req, res) => {
  // 1. Buscamos el movimiento
  const finance = await Finance.findById(req.params.id);
  if (!finance) return res.status(404).json({ message: "Movimiento no encontrado" });
  if (finance.owner.toString() !== req.user.id) return res.status(401).json({ message: "No autorizado" });

  // 2. Buscamos al usuario (para saber sus datos fiscales y moneda)
  const user = await User.findById(req.user.id);
  
  // 3. Preparamos los datos estructurados para el PDF
  const invoiceData = {
    company: {
      name: user.preferences?.companyName || user.name,
      taxId: user.preferences?.taxId,
      address: user.preferences?.address,
      currency: user.preferences?.currency,
      city: user.preferences?.city,
      zipCode: user.preferences?.zipCode,
      country: user.preferences?.country,
      phone: user.preferences?.phone,
      iban: user.preferences?.iban,
    },
    client: {
      name: finance.category || 'Cliente', 
      email: '' 
    },
    finance: {
      description: finance.description,
      amount: finance.amount,
      date: finance.date
    }
  };

  // 4. Configuramos la respuesta HTTP para que el navegador sepa que es un archivo descargable
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=Factura_${finance._id}.pdf`);

  // 5. Dibujamos y enviamos el PDF
  generateInvoice(res, invoiceData);
});