const mongoose = require ('mongoose');

const ClientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "El nombre del cliente es obligatorio"],
        trim: true,
    },
    companyName: {type: String, trim: true},
    email: {type: String, trim: true, lowercase: true, match: [/\S+@\S+\.\S+/, "El email no es válido"]},
    phone: {type: String, trim: true},
    //ventas
    category: {
        type: String,
        enum: ["Prospect", "Active", "VIP", "Inactive", "Potencial", "General"],
        default: "General"
    },
    totalValue: {
        type: Number,
        default: 0
    },
    active: {type: Boolean, default: true},
    //relacion con el usuario este cliente pertenece a un usuario concreto
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    }
},{timestamps: true});

module.exports = mongoose.model('Client', ClientSchema);