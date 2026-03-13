const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "El nombre es obligatorio"],
        trim: true,
    },
    email: {
        type: String,
        required:[true, "El email es obligatorio"],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/\S+@\S+\.\S+/, "El email no es válido"]
    },
    password: {
        type: String,
        required: [true, "La contraseña es obligatoria"],
        minlength: [6, "La contraseña debe tener al menos 6 caracteres"],
        select: false
    },

    twoFactorSecret:{
        type: String,
        select: false
    },
    isTwoFactorEnabled: {
        type: Boolean,
        default: false,
    },

    recoveryCodes: [{
        type: String
    }],

    // dispositivos conectados
    sessions: {
        type: [{
            token: String,
            deviceType: {type: String, default: 'desktop'},
            os: String,
            browser: String,
            location: String,
            lastActive: {type: Date, default: Date.now}
        }],
        select: false
    },

    // Preferencias de usuario ampliadas
    preferences: {
        aiTone: {
            type: String,
            enum: ["motivational", "analytical", "strategic"], 
            default: "strategic"
        },
        aiCreativity: { type: Number, default: 50 },
        aiContext: { type: String, default: "" },

        monthlyGoal: { type: Number, default: 0 },
        themeColor: { type: String, default: "blue" },
        role: {
            type: String,
            enum: ["worker", "freelancer", "company", "god_mode"],
            default: "god_mode"
        },
        // Datos Fiscales para Facturas
        companyName: { type: String, default: "" },
        taxId: { type: String, default: "" }, // NIF, CIF, DNI...
        address: { type: String, default: "" },
        currency: { type: String, enum: ["€", "$", "£"], default: "€" },
        city: {type: String, default: ''},
        zipCode: {type: String, default: ''},
        country: {type: String, default: ''},
        phone: {type: String, default: ''},
        iban: {type: String, default: ''},
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
}, {timestamps: true});

// Middleware para encriptar la contraseña antes de guardar
UserSchema.pre('save', async function() { 
    if (!this.isModified('password')) return; 

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compara la contraseña ingresada con la almacenada
UserSchema.methods.matchPassword = async function(enteredPassword){
    return await bcrypt.compare(enteredPassword, this.password);
};

// Genera un token temporal para recuperar contraseña
UserSchema.methods.getResetPasswordToken = function() {
    const resetToken = crypto.randomBytes(20).toString('hex');

    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutos

    return resetToken;
};

module.exports = mongoose.model('User', UserSchema);