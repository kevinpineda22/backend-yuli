// services/emailService.js
require('dotenv').config();
const nodemailer = require('nodemailer');

// Función para generar un asunto dinámico agregando un sufijo aleatorio
const generateDynamicSubject = (baseSubject) => {
  // Genera un sufijo aleatorio de 6 caracteres (letras y dígitos)
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${baseSubject} - ${randomSuffix}`;
};

// Configuración del transporter para Gmail usando variables de entorno
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE, // true para SSL en Gmail
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  }
});

const sendEmail = async (to, subject, html) => {
  // Generamos un asunto dinámico a partir del subject base
  const finalSubject = generateDynamicSubject(subject);

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: finalSubject,
    html,
  };

  try {
    let info = await transporter.sendMail(mailOptions);
    console.log("Correo enviado:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error al enviar correo:", error);
    throw error;
  }
};

const generarHtmlCorreoDirector = (formData) => {
  return `
    <html>
      <body style="font-family: Arial, sans-serif;">
        <h2>Solicitud de Aprobación - Director de Área</h2>
        <p><strong>Fecha:</strong> ${formData.fecha}</p>
        <p><strong>Documento:</strong> ${formData.documento}</p>
        <p><strong>Gerencia:</strong> ${formData.gerencia}</p>
        <p>Por favor, ingresa a la plataforma para aprobar o rechazar la solicitud.</p>
      </body>
    </html>
  `;
};

const generarHtmlCorreoGerencia = (formData) => {
  return `
    <html>
      <body style="font-family: Arial, sans-serif;">
        <h2>Solicitud de Aprobación - Gerencia</h2>
        <p><strong>Fecha:</strong> ${formData.fecha}</p>
        <p><strong>Documento:</strong> ${formData.documento}</p>
        <p><strong>Director:</strong> ${formData.director}</p>
        <p>Por favor, ingresa a la plataforma para aprobar o rechazar la solicitud.</p>
      </body>
    </html>
  `;
};

module.exports = {
  sendEmail,
  generarHtmlCorreoDirector,
  generarHtmlCorreoGerencia
};
