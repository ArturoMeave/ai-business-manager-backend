const Task = require("../models/Task");

//obtener tareas del usuario
exports.getTasks = async (req, res) => {
  try{
    const {status, priority, clientId} = req.query;

    //construyo el filtro
    const filter = {owner: req.user.id};
    if(status) filter.status = status;
    if(priority) filter.priority = priority;
    if(clientId) filter.client = clientId;

    //configuro la paginacion
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    //busco las tareas con skip y limit 
    const tasks = await Task.find(filter)
    .populate("client", "name companyName")
    .sort({dueDate: 1})
    .skip(skip)
    .limit(limit);

    //cuento el total 
    const total = await Task.countDocuments(filter);
    
    res.json({
      data: tasks,
      pagination: {
        totalRegistros: total,
        paginaActual: page,
        totalPaginas: Math.ceil(total / limit)
      }
    });
  }catch(error){
    console.error(error);
    res.status(500).json({message: 'Error al obtener las tareas'});
  }
};

//funcion para crear una tarea
exports.createTask = async (req, res) => {
  try {
    const taskData = {
      ...req.body,
      owner: req.user.id,
    };

    // 👈 EL SECRETO ANTI-ERRORES: 
    // Si el cliente viene vacío, borramos el campo para que Mongoose no intente buscar un ID fantasma
    if (!taskData.client || taskData.client.trim() === '') {
        delete taskData.client;
    }

    const task = await Task.create(taskData);
    res.status(201).json(task);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "Error al crear la tarea..." });
  }
};

//funcion para actualizar una tarea
exports.updateTask = async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ message: "Tarea no encontrada" });

    if (task.owner.toString() !== req.user.id) {
      return res.status(401).json({ message: "No autorizado" });
    }

    const updateData = { ...req.body };

    // 👈 PROTECCIÓN AL ACTUALIZAR: 
    // Si el usuario edita la tarea y quita al cliente, lo pasamos a "null" para que la DB lo desvincule
    if (updateData.client === '') {
        updateData.client = null;
    } else if (!updateData.client && updateData.client !== null) {
        delete updateData.client;
    }

    task = await Task.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json(task);
  } catch (error) {
    res.status(400).json({ message: "Error al actualizar" });
  }
};

//eliminar la tarea
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Tarea no encontrada" });
    if (task.owner.toString() !== req.user.id) {
      return res.status(401).json({ message: "No estas autorizado..." });
    }
    await task.deleteOne();
    res.json({ message: "Tarea eliminada correctamente " });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar la tarea..." });
  }
};

//obtener una tarea por su id
exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate(
      "client",
      "name email",
    );

    if (!task) return res.status(404).json({ message: "Tarea no encontrada" });

    if (task.owner.toString() !== req.user.id) {
      return res.status(401).json({ message: "No autorizado" });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener tarea" });
  }
};