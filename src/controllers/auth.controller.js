const User = require('../models/User');
const Task = require('../models/Task'); 
const Client = require('../models/Client'); 
const Finance = require('../models/Finance'); 
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/email');
const crypto = require('crypto'); 
const catchAsync = require('../utils/catchAsync');
const speakeasy = require('speakeasy'); 
const qrcode = require('qrcode');

const generateToken = (id) => {
    return jwt.sign({id}, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

exports.register = catchAsync(async (req, res) => {
    const {name, email, password} = req.body;
    
    const userExists = await User.findOne({email});
    if(userExists){
        return res.status(400).json({message: 'Este correo ya esta registrado'});
    }
    
    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);
    
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
        user:{ 
            id: user._id, 
            name: user.name, 
            email: user.email, 
            preferences: user.preferences,
            isTwoFactorEnabled: user.isTwoFactorEnabled 
        }
    });
});

exports.login = catchAsync(async (req, res) => {
    const {email, password} = req.body;

    const user = await User.findOne({email}).select('+password');
    
    if(user && (await user.matchPassword(password))){
        if (user.isTwoFactorEnabled) {
            return res.status(200).json({
                requires2FA: true,
                email: user.email
            });
        }

        res.json({
            token: generateToken(user._id),
            user:{ 
                id: user._id, 
                name: user.name, 
                email:user.email, 
                preferences: user.preferences,
                isTwoFactorEnabled: user.isTwoFactorEnabled
            }
        });
    } else {
        res.status(401).json({message: 'Credenciales invalidas...(Email o contraseña incorrectos)'});
    }
});

exports.googleLogin = catchAsync(async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ message: "No se proporcionó el token de Google" });
    }

    let email, name;

    try {
        const googleResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!googleResponse.ok) throw new Error("Token de Google inválido");
        
        const data = await googleResponse.json();
        email = data.email;
        name = data.name;
    } catch (error) {
        return res.status(401).json({ message: "Fallo al verificar la cuenta con Google" });
    }

    let user = await User.findOne({ email });

    if (!user) {
        const randomPassword = crypto.randomBytes(20).toString('hex');
        user = await User.create({
            name,
            email,
            password: randomPassword
        });
    }

    if (user.isTwoFactorEnabled) {
        return res.status(200).json({
            requires2FA: true,
            email: user.email
        });
    }

    res.status(200).json({
        token: generateToken(user._id),
        user: { 
            id: user._id, 
            name: user.name, 
            email: user.email, 
            preferences: user.preferences,
            isTwoFactorEnabled: user.isTwoFactorEnabled
        }
    });
});

exports.getMe = catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id);
    res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        preferences: user.preferences,
        isTwoFactorEnabled: user.isTwoFactorEnabled 
    });
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

exports.generate2FA = catchAsync(async(req, res) =>{
    const user = await User.findById(req.user.id);
    const secret = speakeasy.generateSecret({
        name: `AI Business Manager (${user.email})`
    });
    user.twoFactorSecret = secret.base32;
    await user.save();
    qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
        if(err){
            return res.status(500).json({message: 'Error al generar el codigo QR'});
        }
        res.status(200).json({
            qrCodeUrl: data_url,
            secret: secret.base32
        });
    });
});

// ⚡ ACTUALIZADO: Fabricamos los códigos de recuperación si el 2FA es correcto
exports.verifyAndEnable2FA = catchAsync(async (req, res) => {
    const { token } = req.body; 

    if (!token) {
        return res.status(400).json({ message: "Por favor, introduce el código de 6 dígitos" });
    }

    const user = await User.findById(req.user.id).select('+twoFactorSecret');

    if (!user.twoFactorSecret) {
        return res.status(400).json({ message: "Primero debes generar el código QR" });
    }

    const isVerified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token,
        window: 1 
    });

    if (!isVerified) {
        return res.status(400).json({ message: "El código es incorrecto o ha caducado" });
    }

    // ⚡ LA FÁBRICA DE PARACAÍDAS
    const recoveryCodes = [];
    for (let i = 0; i < 5; i++) {
        // Inventamos códigos de 8 letras/números
        const code = crypto.randomBytes(4).toString('hex');
        recoveryCodes.push(code);
    }

    // Guardamos los códigos y activamos el candado
    user.recoveryCodes = recoveryCodes;
    user.isTwoFactorEnabled = true;
    await user.save();

    // Enviamos los códigos al Frontend para que el usuario los vea
    res.status(200).json({ 
        message: "Autenticación de dos pasos activada con éxito",
        isTwoFactorEnabled: true,
        recoveryCodes: recoveryCodes
    });
});

// ⚡ ACTUALIZADO: Comprobar el código de 6 números O el código de recuperación
exports.verify2FALogin = catchAsync(async (req, res) => {
    const { email, token } = req.body; 

    if (!token) {
        return res.status(400).json({ message: "Por favor, introduce tu código de seguridad" });
    }

    // Pedimos al usuario trayendo también su lista secreta de códigos de recuperación
    const user = await User.findOne({ email }).select('+twoFactorSecret +recoveryCodes');
    
    if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // 1. ¿Es lo que ha escrito un código de emergencia?
    // Verificamos si existe la lista y si el código que nos manda está dentro de ella
    const isRecoveryCode = user.recoveryCodes && user.recoveryCodes.includes(token);

    if (isRecoveryCode) {
        // ⚡ ¡ACERTÓ EL CÓDIGO DE EMERGENCIA!
        // Le borramos este código de la lista para que NUNCA MÁS se pueda volver a usar
        user.recoveryCodes = user.recoveryCodes.filter(code => code !== token);
        await user.save();
        
    } else {
        // 2. Si no es de emergencia, comprobamos si son los 6 números normales de la app
        const isVerified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: token,
            window: 1
        });

        // Si falla las dos cosas, le damos error
        if (!isVerified) {
            return res.status(400).json({ message: "El código es incorrecto o ha caducado" });
        }
    }

    // Si ha pasado con éxito cualquiera de los dos (emergencia o app), le damos su pase VIP
    res.status(200).json({
        token: generateToken(user._id),
        user: { 
            id: user._id, 
            name: user.name, 
            email: user.email, 
            preferences: user.preferences,
            isTwoFactorEnabled: true 
        }
    });
});