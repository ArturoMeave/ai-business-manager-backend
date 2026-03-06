const errorHandler = (err, req, res, next) =>{
    //imprimo error en la consola 
    console.error("Error detectado", err);

    //defino el codigo de estado
    const statusCode = err.statusCode || 500;

    //defino el mensaje que se mostrara
    const message = err.message || "Error interno del servidor";
    
    //el front da un formulario
    res.status(statusCode).json({
        success: false,
        message: message,
        //esto es por si estamos desarrollando asi vemos los detalles tecnicos
        stack: process.env.NODE_ENV === "developmnet" ? err.stack : undefined
    });
};

module.exports = errorHandler;