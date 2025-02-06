import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configuración del transporter para Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  secure: true, // SSL
  port: 465,    // Puerto para SSL
});


  // Función para enviar correos
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

// Definición de las funciones de generación de HTML
export const generarHtmlCorreoDirector = (formData) => {
  // Validar que workflow_id está definido
  if (!formData.workflow_id) {
    console.error("El workflow_id está indefinido.");
    return `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>Solicitud de Aprobación - Director de Área</h2>
          <p>Hubo un error al generar el enlace para aprobar o rechazar la solicitud.</p>
        </body>
      </html>
    `;
  }
  
  return `
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
};


export const generarHtmlCorreoGerencia = (formData) => `
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
