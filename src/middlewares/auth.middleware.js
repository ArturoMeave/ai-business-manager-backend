const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    
    if (!token) {
      return res.status(401).json({ message: "No estas autorizado..." });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Traemos también las sesiones
    const user = await User.findById(decoded.id).select("-password +sessions");
    if (!user) {
      return res.status(401).json({ message: "No estas autorizado..." });
    }

    // Comprobamos sesión activa
    const sessionExists = user.sessions && user.sessions.some(s => s.token === token);
    if (!sessionExists) {
      return res.status(401).json({ message: "Tu sesión ha sido cerrada desde otro dispositivo. Vuelve a iniciar sesión." });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Error en la autenticacion:", error);
    res
      .status(401)
      .json({ message: "No estas autorizado o tu sesión caducó..." });
  }
};

module.exports = auth;