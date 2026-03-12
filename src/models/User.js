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
        
        // 👇 AQUÍ ESTÁ LA SOLUCIÓN: Agregamos la barrita y el texto secreto al esquema
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

// Middleware para encriptar las contraseñas antes de guardarla
UserSchema.pre('save', async function() { 
    // 1. Si la contraseña no ha sido modificada, salimos de la función sin hacer nada
    if (!this.isModified('password')) {
        return; 
    }

    // 2. Si ha sido modificada, generamos el salt y la encriptamos
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    
    // Al ser una función 'async', ya no necesitamos llamar a next(), 
    // Mongoose sabe automáticamente que hemos terminado.
});

// Metodo para comparar las contraseña que entra con la que ya esta
UserSchema.methods.matchPassword = async function(enteredPassword){
    return await bcrypt.compare(enteredPassword, this.password);
};

// Llave temporal para recuperar la contraseña nueva
UserSchema.methods.getResetPasswordToken = function() {
    // Genero codigo aleatorio
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Lo encripto y lo guardo en la base de datos 
    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Pongo fecha de caducidad de 10min
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    // Devuelvo el codigo original para enviarlo por email
    return resetToken;
};

module.exports = mongoose.model('User', UserSchema);