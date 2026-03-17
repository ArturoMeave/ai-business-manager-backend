const aiService = require("../services/ai.services");
const catchAsync = require('../utils/catchAsync'); 
const Client = require('../models/Client');
const Task = require('../models/Task');
const Finance = require('../models/Finance');

exports.chatWithAI = catchAsync(async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ message: "Por favor escriba una pregunta." });
  }
  
  // Contexto del usuario para la IA
  const userContext = {
    name: req.user.name,
    preferences: req.user.preferences,
  };

  const userId = req.user.id;

  // Fetch client data
  const clients = await Client.find({owner: userId})
  .select('name companyName category totalValue')
  .lean();

  // Fetch pending and in-progress tasks
  const tasks = await Task.find({owner: userId, status: {$ne: 'completed'}})
  .select('title status priority dueDate client')
  .populate('client', 'name')
  .lean();

  // Fetch financial records
  const finances = await Finance.find({owner: userId, isArchived: false})
  .sort({date: -1})
  .limit(20)
  .select('type amount description category date status')
  .lean();

  // Aggregate data
  const businessData = {clients, tasks, finances}
  
  // Request AI advice
  const response = await aiService.generateBusinessAdvice(
    userContext,
    businessData,
    message,
  );
  
  res.json({ response });
});