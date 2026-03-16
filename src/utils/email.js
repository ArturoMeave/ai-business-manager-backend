const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // Usa SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false, // Ayuda a evitar bloqueos de red en Render
    },
    connectionTimeout: 15000, // 15 segundos de margen para conectar
    greetingTimeout: 15000,
    socketTimeout: 15000,
  });

  const mailOptions = {
    from: `AI Business Manager <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;