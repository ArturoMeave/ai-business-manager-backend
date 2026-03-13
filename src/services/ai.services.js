const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

exports.generateBusinessAdvice = async (userContext, businessData, question) => {
  try {
    // Configuración del usuario
    const prefs = userContext.preferences || {};
    
    // Convertimos la barrita (0 a 100) a la "temperatura" que entiende la IA (0.0 a 1.0)
    const aiCreativity = prefs.aiCreativity !== undefined ? prefs.aiCreativity : 50;
    const temperatureValue = aiCreativity / 100; 

    // Extraemos los datos de negocio
    const currency = prefs.currency || '€';
    const monthlyGoal = prefs.monthlyGoal || 0;
    const companyName = prefs.companyName || 'tu negocio';
    const role = prefs.role || 'Profesional';
    
    // Le enseñamos a la IA cómo comportarse según el Tono elegido
    let toneInstruction = '';
    if(prefs.aiTone === 'strategic') toneInstruction = 'Responde de forma concisa, directa y estratégica. Ve al grano, sin rodeos, y da pasos de acción claros.';
    if(prefs.aiTone === 'analytical') toneInstruction = 'Céntrate en los números, métricas y análisis profundo. Desglosa los datos financieros de forma lógica.';
    if(prefs.aiTone === 'motivational') toneInstruction = 'Actúa como un mentor y coach de negocios. Usa un tono inspirador, cercano, motivador y enfocado en superar las metas.';

    // Las instrucciones secretas del usuario
    const secretContext = prefs.aiContext 
        ? `\n\nInstrucciones extra:\n"${prefs.aiContext}"` 
        : '';

    // Formateamos los datos de la base de datos
    const clientsText = businessData.clients.length > 0 
      ? businessData.clients.map(c => `- ${c.name} (${c.companyName || 'Sin empresa'}): Categoría ${c.category}, Ingresos: ${c.totalValue || 0}${currency}`).join('\n')
      : 'No hay clientes registrados.';

    const tasksText = businessData.tasks.length > 0
      ? businessData.tasks.map(t => `- [${t.priority.toUpperCase()}] ${t.title} (Estado: ${t.status}) | Vence: ${t.dueDate || 'Sin fecha'} ${t.client ? `| Cliente: ${t.client.name}` : ''}`).join('\n')
      : 'No hay tareas pendientes.';

    const financesText = businessData.finances.length > 0
      ? businessData.finances.map(f => `- Fecha: ${new Date(f.date).toISOString().split('T')[0]} | Tipo: ${f.type.toUpperCase()} | Monto: ${f.amount}${currency} | Concepto: ${f.description} (${f.category}) - ${f.status}`).join('\n')
      : 'No hay movimientos financieros recientes.';

    // System Prompt
    const systemPrompt = `Eres "AI Business Manager", la Inteligencia Artificial integrada en el software de gestión de ${userContext.name}.
            
            DATOS VITALES DEL NEGOCIO:
            - Nombre del usuario: ${userContext.name}
            - Nombre de la empresa: ${companyName}
            - Modelo de negocio: ${role}
            - Moneda principal: ${currency}
            - Meta de facturación mensual: ${monthlyGoal > 0 ? monthlyGoal + currency : 'No definida'}
            
            PERSONALIDAD EXIGIDA:
            ${toneInstruction} ${secretContext}
            
            === CONTEXTO EN TIEMPO REAL DE SU BASE DE DATOS ===
            Úsalo para responder a sus preguntas con total precisión matemática.

            [SUS CLIENTES]
            ${clientsText}

            [SUS TAREAS ACTIVAS]
            ${tasksText}

            [ÚLTIMOS MOVIMIENTOS FINANCIEROS]
            ${financesText}

            TU REGLA DE ORO:
            Actúa como si estuvieras dentro de su pantalla. Calcula los datos reales que tienes arriba si te pide resúmenes. Nunca inventes clientes, tareas o finanzas que no estén en la lista. Si no sabes algo, dile que no tienes esos datos en su sistema.
            `;
            
    // Llamada al motor
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      model: "llama-3.3-70b-versatile", 
      temperature: temperatureValue, // Aquí inyectamos el valor de su barrita (0.0 a 1.0)
    });
    
    return (
      chatCompletion.choices[0]?.message?.content ||
      "Lo siento, mis circuitos están saturados y no pude generar una respuesta."
    );
  } catch (error) {
    console.error("Error en groq AI:", error);
    throw new Error("Error al conectar con la IA de Groq");
  }
};