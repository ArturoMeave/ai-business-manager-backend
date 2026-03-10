const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

exports.generateBusinessAdvice = async (userContext, businessData, question) => {
  try {
    // ⚡ FORMATEAMOS LOS DATOS PARA QUE LA IA LOS LEA FÁCILMENTE
    const clientsText = businessData.clients.length > 0 
      ? businessData.clients.map(c => `- ${c.name} (${c.companyName || 'Sin empresa'}): Categoría ${c.category}, Ingresos generados: ${c.totalValue}€`).join('\n')
      : 'No hay clientes registrados.';

    const tasksText = businessData.tasks.length > 0
      ? businessData.tasks.map(t => `- [${t.priority.toUpperCase()}] ${t.title} (Estado: ${t.status}) | Vence: ${t.dueDate || 'Sin fecha'} ${t.client ? `| Cliente: ${t.client.name}` : ''}`).join('\n')
      : 'No hay tareas pendientes.';

    const financesText = businessData.finances.length > 0
      ? businessData.finances.map(f => `- Fecha: ${new Date(f.date).toISOString().split('T')[0]} | Tipo: ${f.type.toUpperCase()} | Monto: ${f.amount}€ | Concepto: ${f.description} (${f.category}) - ${f.status}`).join('\n')
      : 'No hay movimientos financieros recientes.';

    // 1. El guion de comportamiento para la IA (AHORA SÚPER POTENCIADO)
    const systemPrompt = `Eres el "AI Business Manager", un socio estratégico experto en finanzas, productividad y gestión de relaciones con clientes (CRM) integrado directamente en el software del usuario.
            
            DATOS DEL USUARIO:
            - Nombre: ${userContext.name}
            - Rol preferido: ${userContext.preferences.role || 'Profesional / Negocio'}
            - Tono de respuesta: ${userContext.preferences.aiTone || 'Directo y profesional'}
            
            🚨 CONTEXTO EN TIEMPO REAL DE SU NEGOCIO 🚨
            A continuación tienes los datos extraídos de su cuenta en este momento. Úsalos para responder a sus preguntas con total precisión. Si el usuario te pregunta "¿Cuánto he ganado?", "¿Qué tareas tengo?" o "¿Quién es X cliente?", DEBES responder leyendo esta información:

            === SUS CLIENTES ===
            ${clientsText}

            === SUS TAREAS ACTIVAS ===
            ${tasksText}

            === SUS ÚLTIMOS 20 MOVIMIENTOS FINANCIEROS ===
            ${financesText}

            TU OBJETIVO:
            Responder al usuario basándote en su información real. Actúa como si estuvieras viendo su pantalla. 
            - Si te pide un resumen financiero, suma los ingresos y réstale los gastos de la lista de arriba.
            - Si te pide qué hacer hoy, fíjate en las tareas urgentes y recomiéndale por dónde empezar.
            - Nunca inventes datos que no estén en el contexto de arriba. Si no ves a un cliente en la lista, dile "No encuentro a ese cliente en tu base de datos".
            `;
            
    // 2. La petición al servidor de Groq
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      model: "llama-3.3-70b-versatile", 
      temperature: 0.5, // Lo bajamos un poco a 0.5 para que sea más analítico y preciso con los números
    });
    
    return (
      chatCompletion.choices[0]?.message?.content ||
      "Lo siento, no pude generar una respuesta."
    );
  } catch (error) {
    console.error("Error en groq AI:", error);
    throw new Error("Error al conectar con la IA de Groq");
  }
};