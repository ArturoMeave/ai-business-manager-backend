const mongoose = require('mongoose');

const FinanceSchema = new mongoose.Schema({
    type:{
        type: String,
        required: true,
        enum: ['ingreso', 'gasto']
    },
    amount: {
        type: Number,
        required: [true, 'La cantidad es obligatoria']
    },
    description: {
        type: String,
        required: [true, 'La descripciòn es obligatoria'],
        trim: true
    },
    category: {
        type: String,
        default : 'General'
    },
    date: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['estimado', 'completado'],
        default: 'estimado'
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    }
}, {timestamps: true});

module.exports = mongoose.model('Finance', FinanceSchema);