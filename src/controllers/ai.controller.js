const aiService = require("../services/ai.services");
const catchAsync = require('../utils/catchAsync'); // ⚡ Importamos el Atrapador

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
  
  // Pido respuesta a la IA
  const response = await aiService.generateBusinessAdvice(
    userContext,
    message,
  );
  
  res.json({ response });
});