const User = require ('../models/User');
const jwt = require ('jsonwebtoken');
const sendEmail = require ('../utils/email');
const crypto = require('crypto'); // Asegúrate de importar crypto aquí si no lo tenías

const generateToken = (id) => {
    return jwt.sign ({id}, process.env.JWT_SECRET,{
        expiresIn: '30d'//solo durara 30 dias
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d' // solo durara 30 dias
    });
};

//@desc Registrar un usuario nuevo
//@route POST/api/auth/register
//@access Publico
exports.register = async (req, res) => {
    try{
        const {name, email, password} = req.body;
        //veo si el usuario ya existe
        const userExists = await User.findOne({email});
        if(userExists){
            return res.status(400).json({message: 'Este correo ya esta registrado'});
        }
        //si no existe el usuario lo pueden crear  y se le asigna un token
        const user = await User.create({
            name,
            email,
            password
        });
        const token = generateToken(user._id);
        try{
            await sendEmail({
                email:user.email,
                subject: 'Bienvenido a AI Business Manager',
                message: `
                <h1>¡Hola ${user.name}!</h1>
                <p>Tu cuenta ha sido creada exitosamente.</p>
                <p>Ya puedes empezar a gestionar tus clientes y tu negocio con nuestra ayuda.</p>
                `
            });
        }catch(emailError){
            console.error('Error al enviar el correo...',emailError.message);
            //no dentengo el proceso de registro pero si se le notificara al usuario que lo hubo
            //no detengo el proceso de registro pero si se le notificara al usuario que lo hubo
        }

        res.status(201).json({
            token,
            user:{
                id: user._id,
                name: user.name,
                email: user.email,
                preferences: user.preferences
            }
        });
    }catch(error){
        console.error(error);
        res.status(500).json({message: 'Error en el servidor...'});
    }
};

exports.login = async (req, res) => {
    try{
        const {email, password} = req.body;

        //busco el usuario por su correo 
        const user = await User.findOne({email}).select('+password');
        if(user && (await user.matchPassword(password))){
            res.json({
                token: generateToken(user._id),
                user:{
                    id: user._id,
                    name: user.name,
                    email:user.email,
                    preferences: user.preferences
                }
            });
        }else{
            res.status(401).json({message: 'Credenciales invalidas...(Email o contraseña incorrectos)'});
        }
        }catch(error){
            console.error(error);
            res.status(500).json({message: 'Error en el servidor al entrar'});
        }
};

//gestion del perfil, obtengo los datos del us logueado asi recarga la web las paginas
exports.getMe = async (req, res) => {
    try{
        const user = await User.findById(req.user.id);
        res.json(user);
    }catch(error){
        res.status(500).json({message: 'Error al obtener los datos'});
    }
};

//actualizar el perfil
exports.updateDetails = async (req, res) => {
    try{
        const fieldToUpdate =  {
            name: req.body.name,
            preferences: req.body.preferences
        };
        const user = await User.findByIdAndUpdate(req.user.id, fieldToUpdate, {
            new: true,
            runValidators: true
        });
        res.json(user);
    }catch(error){
        res.status(500).json({message: 'Error al actualizar el perfil'});
    }
};

//recuperacion de contraseña
exports.forgotPassword = async (req, res) => {
    try{
        const user = await User.findOne({email: req.body.email});

        if(!user){
            return res.status(404).json({message: 'No hay ningun usuario con ese correo '});
        }
        //genero la llave de forma temporal
        const resetToken = user.getResetPasswordToken();
        //guardo en la base de datos que este usuario ha pedido una llav
        //guardo en la base de datos que este usuario ha pedido una llave
        await user.save({validateBeforeSave: false});
        //creo un link que el usaurio pulsara 
        //creo un link que el usuario pulsara 
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        //envio el emial de recuperacion
        //envio el email de recuperacion
        try{
            await sendEmail({
                email: user.email,
                subject: 'Recuperacion de contraseña - AI Business Manager',
                html:`
                <h1>Has solicitado restablecer tu contraseña</h1>
                <p>Haz clic en el siguiente enlace para crear una nueva contraseña. Este enlace caducará en 10 minutos.</p>
                <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Restablecer Contraseña</a>
                <p>Si no has solicitado esto, ignora este correo.</p>
                `
            });
            res.status(200).json({message: 'Correo enviado con exito'});
        }catch(error){
            //si fallo el correo borro la llave temporal de la base de datos asi no se acumulan tontamente
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({validateBeforeSave: false});

            console.error(error);
            return res.status(500).json({message: 'No se pudo enviar el email'});
        }
    }catch(error){
        res.status(500).json({message: 'Error al procesar la solicitud'});
    }
};

//el usuario actualiza su contraseña con el link del email 
exports.resetPassword = async (req, res) => {
    try{
        //encripto el token que viene por la URL para buscarlo en la base de datos
        const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');
        //busco un usuario que tenga esa misma llave y aun no haya caducado
        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: {$gt: Date.now()}
        });
        if(!user){
            return res.status(400).json({message: 'El enlace no es valido o ha caducado'});
        }
        //paso la nueva clave
        user.password = req.body.password;
        //borro la clave temporal
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        //se autoencripta la nueva clave creada por el usuario
        await user.save();
        //devuelvo un token nuevo para que asi entre directamente, osea un login automatico
        res.json({
            token: generateToken(user._id),
            message: 'Contraseña actualizada con exito'
        });
    }catch(error){
        res.status(500).json({message: 'Error al restablecer la contraseña'});
    }
};

// 👇 NUEVO: ACTUALIZAR PREFERENCIAS (IA, Metas y Rol Financiero)
exports.updatePreferences = async (req, res) => {
    try {
        const userId = req.user.id;
        const newPreferences = req.body; // Aquí llega { aiTone, monthlyGoal, role }

        // Buscamos al usuario y actualizamos sus preferencias
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { preferences: newPreferences },
            { new: true, runValidators: true } // new:true devuelve el objeto actualizado
        ).select('-password'); // Ocultamos el password en la respuesta

        if (!updatedUser) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        // Devolvemos el usuario completo actualizado
        res.json({
            id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            preferences: updatedUser.preferences
        });
        
    } catch (error) {
        console.error("Error en updatePreferences:", error);
        res.status(500).json({ message: "Error al actualizar las preferencias" });
    }
};