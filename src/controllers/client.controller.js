const Client = require('../models/Client');
const Task = require('../models/Task');
const catchAsync = require('../utils/catchAsync'); // ⚡ Importamos el Atrapador

exports.getClients = catchAsync(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const clients = await Client.find({owner: req.user.id})
    .sort({createdAt: -1})
    .skip(skip)
    .limit(limit);

    const total = await Client.countDocuments({owner: req.user.id});

    res.json({
        data: clients,
        pagination: {
            totalRegistros: total,
            paginaActual: page,
            totalPaginas: Math.ceil(total / limit)
        }
    });
});

exports.getClientById = catchAsync(async(req, res) => {
    const client = await Client.findById(req.params.id);
    
    if(!client) return res.status(404).json({message: 'Cliente no encontrado'});
    
    if(client.owner.toString() !== req.user.id) {
        return res.status(401).json({message: 'No estas autorizado...'});
    }
    
    res.json(client);
});

exports.createClient = catchAsync(async (req, res) => {
    const clientData = { ...req.body, owner: req.user.id };
    const client = await Client.create(clientData);
    res.status(201).json(client);
});

exports.updateClient = catchAsync(async (req, res) => {
    let client = await Client.findById(req.params.id);
    
    if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });
    if (client.owner.toString() !== req.user.id) return res.status(401).json({ message: 'No autorizado' });

    client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json(client);
});

exports.deleteClient = catchAsync(async (req, res) => {
    const client = await Client.findById(req.params.id);

    if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });
    if (client.owner.toString() !== req.user.id) return res.status(401).json({ message: 'No autorizado' });

    // Desvinculamos el cliente de las tareas para no borrar el dinero asociado
    await Task.updateMany(
        { client: req.params.id }, 
        { $unset: { client: 1 } } 
    );

    await client.deleteOne();
    res.json({ message: 'Cliente eliminado y tareas desvinculadas correctamente' });
});