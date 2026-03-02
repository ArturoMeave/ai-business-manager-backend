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
    // Preferencias de usuario ampliadas
    preferences: {
        aiTone: {
            type: String,
            enum: ["motivational", "analytical", "strategic"], // Corregido 'analytical'
            default: "strategic"
        },
        monthlyGoal: { type: Number, default: 0 },
        themeColor: { type: String, default: "blue" },
        // 👇 NUEVO: Rol Financiero (Trabajador, Autónomo, Empresa, Modo Dios)
        role: {
            type: String,
            enum: ["worker", "freelancer", "company", "god_mode"],
            default: "god_mode"
        }
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
}, {timestamps: true});

// Middleware para encriptar las contraseñas antes de guardarla
UserSchema.pre('save', async function(next) { // Añadido 'next'
    if (!this.isModified('password')) return next(); // Llamamos a next()

    // Genero un salt y encripto la contraseña
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next(); // Llamamos a next() al terminar
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