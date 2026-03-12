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
const UAParser = require('ua-parser-js'); 

const generateToken = (id) => {
    return jwt.sign({id}, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

// FUNCIÓN MÁGICA: Anota el dispositivo y navegador del usuario
const addSessionToUser = async (user, token, req) => {
    const parser = new UAParser(req.headers['user-agent']);
    const ua = parser.getResult();
    
    if (!user.sessions) user.sessions = [];
    if (user.sessions.length >= 8) user.sessions.shift(); 

    user.sessions.push({
        token,
        deviceType: (ua.device.type === 'mobile' || ua.device.type === 'tablet') ? 'mobile' : 'desktop',
        os: ua.os.name || 'Desconocido',
        browser: ua.browser.name || 'Desconocido',
        location: req.ip === '::1' || req.ip === '127.0.0.1' ? 'Conexión Local' : req.ip
    });
    await user.save();
};

exports.register = catchAsync(async (req, res) => {
    const {name, email, password} = req.body;
    
    const userExists = await User.findOne({email});
    if(userExists){
        return res.status(400).json({message: 'Este correo ya esta registrado'});
    }
    
    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);
    
    await addSessionToUser(user, token, req);
    
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

    const user = await User.findOne({email}).select('+password +sessions');
    
    if(user && (await user.matchPassword(password))){
        if (user.isTwoFactorEnabled) {
            return res.status(200).json({
                requires2FA: true,
                email: user.email
            });
        }

        const token = generateToken(user._id);
        
        await addSessionToUser(user, token, req);

        res.json({
            token,
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

    let user = await User.findOne({ email }).select('+sessions');

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

    const authToken = generateToken(user._id);
    await addSessionToUser(user, authToken, req);

    res.status(200).json({
        token: authToken,
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
    const user = await User.findById(req.user.id).select('+sessions');
    
    let currentToken = req.headers.authorization?.split(' ')[1];

    const formattedSessions = (user.sessions || []).map(s => ({
        id: s._id,
        type: s.deviceType,
        os: s.os,
        browser: s.browser,
        location: s.location,
        time: s.lastActive,
        current: s.token === currentToken
    }));

    res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        preferences: user.preferences,
        isTwoFactorEnabled: user.isTwoFactorEnabled,
        sessions: formattedSessions.reverse() 
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

// 👇 FUNCIÓN DE RECUPERAR CONTRASEÑA LIMPIA 👇
exports.forgotPassword = catchAsync(async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });
    
    if (!user) {
        return res.status(404).json({ message: 'No hay usuario con ese correo' });
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });
    
    try {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        await sendEmail({
            email: user.email,
            subject: 'Recuperación de contraseña en AI Business Manager',
            message: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2>Recuperación de contraseña</h2>
                    <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para crear una nueva:</p>
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 10px 20px; margin: 20px 0; font-size: 16px; color: #fff; background-color: #059669; text-decoration: none; border-radius: 5px;">Restablecer Contraseña</a>
                    <p style="font-size: 14px; color: #666;">Si no solicitaste esto, puedes ignorar este correo.</p>
                </div>
            `
        });
        
        res.status(200).json({ message: 'Correo enviado correctamente' });
    } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });
        
        return res.status(500).json({ message: 'Hubo un error al enviar el correo. Inténtalo de nuevo.' });
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
    await Client.deleteMany({ owner: userId});
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

    const recoveryCodes = [];
    for (let i = 0; i < 5; i++) {
        const code = crypto.randomBytes(4).toString('hex');
        recoveryCodes.push(code);
    }

    user.recoveryCodes = recoveryCodes;
    user.isTwoFactorEnabled = true;
    await user.save();

    res.status(200).json({ 
        message: "Autenticación de dos pasos activada con éxito",
        isTwoFactorEnabled: true,
        recoveryCodes: recoveryCodes
    });
});

exports.verify2FALogin = catchAsync(async (req, res) => {
    const { email, token } = req.body; 

    if (!token) {
        return res.status(400).json({ message: "Por favor, introduce tu código de seguridad" });
    }

    const user = await User.findOne({ email }).select('+twoFactorSecret +recoveryCodes +sessions');
    
    if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const isRecoveryCode = user.recoveryCodes && user.recoveryCodes.includes(token);

    if (isRecoveryCode) {
        user.recoveryCodes = user.recoveryCodes.filter(code => code !== token);
        await user.save();
    } else {
        const isVerified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: token,
            window: 1
        });

        if (!isVerified) {
            return res.status(400).json({ message: "El código es incorrecto o ha caducado" });
        }
    }

    const authToken = generateToken(user._id);
    await addSessionToUser(user, authToken, req);

    res.status(200).json({
        token: authToken,
        user: { 
            id: user._id, 
            name: user.name, 
            email: user.email, 
            preferences: user.preferences,
            isTwoFactorEnabled: true 
        }
    });
});

exports.logoutDevice = catchAsync(async (req, res) => {
    const { sessionId } = req.params;
    const user = await User.findById(req.user.id).select('+sessions');
    
    user.sessions = user.sessions.filter(s => s._id.toString() !== sessionId);
    await user.save();
    
    res.status(200).json({ message: 'Sesión cerrada correctamente en ese dispositivo' });
});

exports.logout = catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id).select('+sessions');
    
    let currentToken;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        currentToken = req.headers.authorization.split(" ")[1];
    }

    if (user.sessions) {
        user.sessions = user.sessions.filter(session => session.token !== currentToken);
        await user.save(); 
    }

    res.status(200).json({ message: 'Sesión cerrada correctamente en el servidor' });
});