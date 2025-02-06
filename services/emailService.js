// services/emailService.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  secure: true, // Usa SSL
  port: 465,
});

export const sendEmail = async (to, subject, htmlContent, attachments = []) => {
  try {
    await transporter.sendMail({
      from: `"Merkahorro" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
      attachments,
    });
    console.log(`📨 Correo enviado a ${to}`);
  } catch (error) {
    console.error('❌ Error al enviar el correo:', error);
    throw error;
  }
};

export const generarHtmlCorreoDirector = (formData) => `
  <html>
    <body style="font-family: Arial, sans-serif;">
      <h2>Solicitud de Aprobación - Director de Área</h2>
      <p><strong>Fecha:</strong> ${formData.fecha}</p>
      <p><strong>Documento:</strong> <a href="${formData.documento}" target="_blank">Ver Documento</a></p>
      <p><strong>Gerencia:</strong> ${formData.gerencia}</p>
      <p>Por favor, revisa la solicitud y toma una decisión:</p>
      <a href="http://localhost:5173/aprobar-rechazar/${formData.workflow_id}/director" target="_blank">Aprobar o Rechazar Solicitud</a>
    </body>
  </html>
`;

export const generarHtmlCorreoGerencia = (formData) => `
  <html>
    <body style="font-family: Arial, sans-serif;">
      <h2>Solicitud de Aprobación - Gerencia</h2>
      <p><strong>Fecha:</strong> ${formData.fecha}</p>
      <p><strong>Documento:</strong> <a href="${formData.documento}" target="_blank">Ver Documento</a></p>
      <p><strong>Director:</strong> ${formData.director}</p>
      <p>Por favor, revisa la solicitud y toma una decisión:</p>
      <a href="http://localhost:5173/aprobar-rechazar/${formData.workflow_id}/gerencia" target="_blank">Aprobar o Rechazar Solicitud</a>
    </body>
  </html>
`;
