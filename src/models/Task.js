const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, "El título es obligatorio"] 
    },
    description: { 
        type: String 
    },
    status: { 
        type: String, 
        enum: ['pending', 'in progress', 'completed'], 
        default: 'pending' 
    },
    priority: { 
        type: String, 
        enum: ['low', 'medium', 'high'], 
        default: 'medium' 
    },
    category: { 
        type: String, 
        default: 'Llamada' 
    },
    budget: { 
        type: Number, 
        default: 0 
    },
    cost: {
        type: Number,
        default: 0
    },
    client: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Client', 
        required: false 
    },
    dueDate: { 
        type: String 
    },
    dueTime: { 
        type: String,
        default: ""
    },
    owner: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        index: true 
    }
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);