import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

// Generar un asunto dinámico
const generateDynamicSubject = (baseSubject) => {
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${baseSubject} - ${randomSuffix}`;
};

// Configuración del transporter para Gmail
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true', // Asegúrate que sea booleano
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  }
});

const sendEmail = async (to, subject, html) => {
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
        <p><strong>Documento:</strong> <a href="${formData.documento}" target="_blank">Ver Documento</a></p>
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
        <p><strong>Documento:</strong> <a href="${formData.documento}" target="_blank">Ver Documento</a></p>
        <p><strong>Director:</strong> ${formData.director}</p>
        <p>Por favor, ingresa a la plataforma para aprobar o rechazar la solicitud.</p>
      </body>
    </html>
  `;
};

export {
  sendEmail,
  generarHtmlCorreoDirector,
  generarHtmlCorreoGerencia
};
