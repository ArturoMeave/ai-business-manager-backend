const User = require ('../models/User');
const Task = require('../models/Task'); 
const Client = require('../models/Client'); 
const Finance = require('../models/Finance'); 
const jwt = require ('jsonwebtoken');
const sendEmail = require ('../utils/email');
const crypto = require('crypto'); 
const catchAsync = require('../utils/catchAsync'); // ⚡ 1. IMPORTAMOS LA RED DE SEGURIDAD

const generateToken = (id) => {
    return jwt.sign ({id}, process.env.JWT_SECRET,{
        expiresIn: '30d'
    });
};

// ⚡ 2. ENVOLVEMOS LAS FUNCIONES CON catchAsync() Y BORRAMOS LOS TRY/CATCH
exports.register = catchAsync(async (req, res) => {
    const {name, email, password} = req.body;
    
    const userExists = await User.findOne({email});
    if(userExists){
        return res.status(400).json({message: 'Este correo ya esta registrado'});
    }
    
    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);
    
    // Este try/catch se queda porque si falla el email, no queremos que salte un error global,
    // simplemente lo ignoramos y dejamos que el usuario se registre.
    try {
        await sendEmail({
            email:user.email,
            subject: 'Bienvenido a AI Business Manager',
            message: `<h1>¡Hola ${user.name}!</h1><p>Tu cuenta ha sido creada exitosamente.</p>`
        });
    } catch(emailError) {
        console.error('Error al enviar el correo silencioso...', emailError.message);
    }

    res.status(201).json({
        token,
        user:{ id: user._id, name: user.name, email: user.email, preferences: user.preferences }
    });
});

exports.login = catchAsync(async (req, res) => {
    const {email, password} = req.body;

    const user = await User.findOne({email}).select('+password');
    if(user && (await user.matchPassword(password))){
        res.json({
            token: generateToken(user._id),
            user:{ id: user._id, name: user.name, email:user.email, preferences: user.preferences }
        });
    }else{
        res.status(401).json({message: 'Credenciales invalidas...(Email o contraseña incorrectos)'});
    }
});

exports.getMe = catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id);
    res.json(user);
});

exports.updateDetails = catchAsync(async (req, res) => {
    const fieldToUpdate =  {
        name: req.body.name,
        email: req.body.email, 
        preferences: req.body.preferences
    };
    const user = await User.findByIdAndUpdate(req.user.id, fieldToUpdate, {
        new: true,
        runValidators: true
    });
    res.json(user);
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
    const user = await User.findOne({email: req.body.email});

    if(!user){
        return res.status(404).json({message: 'No hay ningun usuario con ese correo '});
    }
    const resetToken = user.getResetPasswordToken();
    await user.save({validateBeforeSave: false});
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    try{
        await sendEmail({
            email: user.email,
            subject: 'Recuperacion de contraseña - AI Business Manager',
            html:`<h1>Has solicitado restablecer tu contraseña</h1><a href="${resetUrl}">Restablecer Contraseña</a>`
        });
        res.status(200).json({message: 'Correo enviado con exito'});
    }catch(error){
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({validateBeforeSave: false});
        // Aquí si falla el email enviamos el error al atrapador global manualmente
        return next(new Error('No se pudo enviar el email')); 
    }
});

exports.resetPassword = catchAsync(async (req, res) => {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');
    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: {$gt: Date.now()}
    });
    
    if(!user){
        return res.status(400).json({message: 'El enlace no es valido o ha caducado'});
    }
    
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    
    res.json({
        token: generateToken(user._id),
        message: 'Contraseña actualizada con exito'
    });
});

exports.updatePreferences = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const newPreferences = req.body; 

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { preferences: newPreferences },
        { new: true, runValidators: true } 
    ).select('-password'); 

    if (!updatedUser) {
        return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json({
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        preferences: updatedUser.preferences
    });
});

exports.updatePassword = catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id).select('+password');

    const isMatch = await user.matchPassword(req.body.currentPassword);
    if (!isMatch) {
        return res.status(401).json({ message: 'La contraseña actual es incorrecta' });
    }

    user.password = req.body.newPassword;
    await user.save(); 

    res.status(200).json({
        message: 'Contraseña actualizada correctamente'
    });
});

exports.deleteAccount = catchAsync(async (req, res) => {
    const userId = req.user.id;

    await Task.deleteMany({ owner: userId });
    await Client.deleteMany({ owner: userId });
    await Finance.deleteMany({ owner: userId });
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: 'Cuenta y todos los datos eliminados permanentemente' });
});