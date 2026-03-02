const Client = require('../models/Client');
const Task = require('../models/Task'); // 👈 IMPORTANTE: Traemos el modelo de Tareas

//el logueado obtiene a sus clientes, no los de otros usuarios
exports.getClients = async (req, res) => {
    try{
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
    }catch(error){
        console.error(error);
        res.status(500).json({message: 'Error al obtener clientes'});
    }
};

exports.getClientById = async(req, res) => {
    try{
        const client = await Client.findById(req.params.id);
        if(!client) return res.status(404).json({message: 'Cliente no encontrado'});
        
        if(client.owner.toString() !== req.user.id) {
            return res.status(401).json({message: 'No estas autorizado...'});
        }
        res.json(client);
    }catch(error){
        res.status(500).json({message: 'Error al obtener el cliente...'});
    }
};

exports.createClient = async (req, res) => {
    try {
        const clientData = { ...req.body, owner: req.user.id };
        const client = await Client.create(clientData);
        res.status(201).json(client);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Error al crear cliente' });
    }
};

exports.updateClient = async (req, res) => {
    try {
        let client = await Client.findById(req.params.id);
        if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });
        if (client.owner.toString() !== req.user.id) return res.status(401).json({ message: 'No autorizado' });

        client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        res.json(client);
    } catch (error) {
        res.status(400).json({ message: 'Error al actualizar' });
    }
};

exports.deleteClient = async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);

        if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });
        if (client.owner.toString() !== req.user.id) return res.status(401).json({ message: 'No autorizado' });

        // ⚡ SOLUCIÓN BUG 3: BORRADO EN CASCADA / DESVINCULACIÓN
        // En lugar de borrar las tareas (y perder el dinero facturado), las desvinculamos del cliente.
        await Task.updateMany(
            { client: req.params.id }, 
            { $unset: { client: 1 } } // Quita el ID del cliente de las tareas
        );

        await client.deleteOne();
        res.json({ message: 'Cliente eliminado y tareas desvinculadas correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al eliminar' });
    }
};