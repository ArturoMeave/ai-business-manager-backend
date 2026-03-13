require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 3000;

connectDB();

const server = app.listen(PORT, () => {
    console.log(`\n Servidor corriendo en el puerto ${PORT}`);
});

process.on('unhandledRejection', (err) => {
    console.log(`Error no controlado: Apagando el servidor...`);
    console.log(err.name, err.message);
    server.close(() => process.exit(1));
});