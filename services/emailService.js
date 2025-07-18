// services/emailService.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Creamos el transporter usando host/port/secure de Outlook
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,               // smtp.office365.com
  port: Number(process.env.SMTP_PORT),       // 587
  secure: process.env.SMTP_SECURE === "true",// false → STARTTLS
  auth: {
    user: process.env.SMTP_USER,             // notificacion@merkahorro.com
    pass: process.env.SMTP_PASSWORD,         // tu contraseña de app de Outlook
  },
  tls: {
    ciphers: "TLSv1.2",                      // fuerza TLS ≥ 1.2
  },
});



export const sendEmail = async (to, subject, htmlContent, attachments = []) => {
  try {
    await transporter.sendMail({
      from: `"Merkahorro" <${process.env.SMTP_FROM}>`,
      to,
      subject,
      html: htmlContent,
      attachments,
    });
    console.log(`📨 Correo enviado a ${to}`);
  } catch (error) {
    console.error("❌ Error al enviar el correo:", error);
    throw error;
  }
};

// Nueva plantilla para el correo al área
export const generarHtmlCorreoArea = (formData) => `
<html>
  <head>
    <meta charset="utf-8">
    <title>Solicitud de Aprobación - Área</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f2f2f2;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f2f2f2;">
      <tr>
        <td align="center">
          <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff; margin:20px auto; border:1px solid #dddddd;">
            <tr>
              <td align="center" style="padding:20px; background-color:#210D65;">
                <h2 style="margin:0; font-size:24px; color:#ffffff; font-family:Arial, sans-serif;">Solicitud de Aprobación - Área</h2>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:15px; background-color:#FFD700;">
                <p style="margin:0; font-size:18px; color:#000000; font-family:Arial, sans-serif; font-weight:bold; line-height:1.4; word-wrap:break-word; max-width:600px;">
                  Recordar ser muy específico con el cambio que se sugiere generar, ubicación del perfil. Ejemplo: si es de responsabilidades, ¿qué función requiere el cambio?, entre otros.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px; font-family:Arial, sans-serif; font-size:16px; color:#333333;">
                <p style="margin:0 0 10px 0;"><strong>Fecha:</strong> ${formData.fecha}</p>
                <p style="margin:0 0 10px 0;"><strong>Descripción:</strong> ${formData.descripcion || "Sin descripción"}</p>
                <p style="margin:0 0 10px 0;"><strong>Documento:</strong> <a href="${formData.documento}" target="_blank" style="color:#210D65; text-decoration:none;">Ver Documento</a></p>
                <p style="margin:0 0 10px 0;"><strong>Director:</strong> ${formData.director}</p>
                <p style="margin:0 0 10px 0;"><strong>Gerencia:</strong> ${formData.gerencia}</p>
                <p style="margin:0 0 10px 0;"><strong>Seguridad:</strong> ${formData.seguridad || "No definida"}</p>
                <p style="margin:0 0 20px 0;">Por favor, revisa la solicitud y toma una decisión:</p>
                <div style="text-align:center;">
                  <a href="${formData.approvalLink}" target="_blank" style="display:inline-block; padding:10px 20px; background-color:#28a745; color:#ffffff; text-decoration:none; border-radius:4px; margin-right:10px;">Aprobar</a>
                  <a href="${formData.rejectionLink}" target="_blank" style="display:inline-block; padding:10px 20px; background-color:#dc3545; color:#ffffff; text-decoration:none; border-radius:4px;">Rechazar</a>
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:10px; background-color:#eeeeee; font-family:Arial, sans-serif; font-size:12px; color:#888888;">
                © ${new Date().getFullYear()} Merkahorro. Todos los derechos reservados.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

export const generarHtmlCorreoDirector = (formData) => `
<html>
  <head>
    <meta charset="utf-8">
    <title>Solicitud de Aprobación - Director de Área</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f2f2f2;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f2f2f2;">
      <tr>
        <td align="center">
          <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff; margin:20px auto; border:1px solid #dddddd;">
            <tr>
              <td align="center" style="padding:20px; background-color:#210D65;">
                <h2 style="margin:0; font-size:24px; color:#ffffff; font-family:Arial, sans-serif;">Solicitud de Aprobación - Director de Área</h2>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:15px; background-color:#FFD700;">
                <p style="margin:0; font-size:18px; color:#000000; font-family:Arial, sans-serif; font-weight:bold; line-height:1.4; word-wrap:break-word; max-width:600px;">
                  Recordar ser muy específico con el cambio que se sugiere generar, ubicación del perfil. Ejemplo: si es de responsabilidades, ¿qué función requiere el cambio?, entre otros.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px; font-family:Arial, sans-serif; font-size:16px; color:#333333;">
                <p style="margin:0 0 10px 0;"><strong>Fecha:</strong> ${formData.fecha}</p>
                <p style="margin:0 0 10px 0;"><strong>Descripción:</strong> ${formData.descripcion || "Sin descripción"}</p>
                <p style="margin:0 0 10px 0;"><strong>Documento:</strong> <a href="${formData.documento}" target="_blank" style="color:#210D65; text-decoration:none;">Ver Documento</a></p>
                <p style="margin:0 0 10px 0;"><strong>Área:</strong> ${formData.area || "No definida"}</p>
                <p style="margin:0 0 10px 0;"><strong>Gerencia:</strong> ${formData.gerencia}</p>
                <p style="margin:0 0 10px 0;"><strong>Seguridad:</strong> ${formData.seguridad || "No definida"}</p>
                <p style="margin:0 0 20px 0;">Esta solicitud ha sido aprobada por el área. Por favor, revisa y toma una decisión:</p>
                <div style="text-align:center;">
                  <a href="${formData.approvalLink}" target="_blank" style="display:inline-block; padding:10px 20px; background-color:#28a745; color:#ffffff; text-decoration:none; border-radius:4px; margin-right:10px;">Aprobar</a>
                  <a href="${formData.rejectionLink}" target="_blank" style="display:inline-block; padding:10px 20px; background-color:#dc3545; color:#ffffff; text-decoration:none; border-radius:4px;">Rechazar</a>
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:10px; background-color:#eeeeee; font-family:Arial, sans-serif; font-size:12px; color:#888888;">
                © ${new Date().getFullYear()} Merkahorro. Todos los derechos reservados.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

export const generarHtmlCorreoGerencia = (formData) => `
<html>
  <head>
    <meta charset="utf-8">
    <title>Solicitud de Aprobación - Gerencia General</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f2f2f2;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f2f2f2;">
      <tr>
        <td align="center">
          <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff; margin:20px auto; border:1px solid #dddddd;">
            <tr>
              <td align="center" style="padding:20px; background-color:#210D65;">
                <h2 style="margin:0; font-size:24px; color:#ffffff; font-family:Arial, sans-serif;">Solicitud de Aprobación - Gerencia General</h2>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:15px; background-color:#FFD700;">
                <p style="margin:0; font-size:18px; color:#000000; font-family:Arial, sans-serif; font-weight:bold; line-height:1.4; word-wrap:break-word; max-width:600px;">
                  Recordar ser muy específico con el cambio que se sugiere generar, ubicación del perfil. Ejemplo: si es de responsabilidades, ¿qué función requiere el cambio?, entre otros.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px; font-family:Arial, sans-serif; font-size:16px; color:#333333;">
                <p style="margin:0 0 10px 0;"><strong>Fecha:</strong> ${formData.fecha}</p>
                <p style="margin:0 0 10px 0;"><strong>Descripción:</strong> ${formData.descripcion || "Sin descripción"}</p>
                <p style="margin:0 0 10px 0;"><strong>Documento:</strong> <a href="${formData.documento}" target="_blank" style="color:#210D65; text-decoration:none;">Ver Documento</a></p>
                <p style="margin:0 0 10px 0;"><strong>Área:</strong> ${formData.area || "No definida"}</p>
                <p style="margin:0 0 10px 0;"><strong>Director:</strong> ${formData.director}</p>
                <p style="margin:0 0 10px 0;"><strong>Seguridad:</strong> ${formData.seguridad || "No definida"}</p>
                <p style="margin:0 0 20px 0;">Esta solicitud ha sido aprobada por el área y el director. Por favor, revisa y toma una decisión:</p>
                <div style="text-align:center;">
                  <a href="${formData.approvalLink}" target="_blank" style="display:inline-block; padding:10px 20px; background-color:#28a745; color:#ffffff; text-decoration:none; border-radius:4px; margin-right:10px;">Aprobar</a>
                  <a href="${formData.rejectionLink}" target="_blank" style="display:inline-block; padding:10px 20px; background-color:#dc3545; color:#ffffff; text-decoration:none; border-radius:4px;">Rechazar</a>
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:10px; background-color:#eeeeee; font-family:Arial, sans-serif; font-size:12px; color:#888888;">
                © ${new Date().getFullYear()} Merkahorro. Todos los derechos reservados.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

export const generarHtmlCorreoSeguridad = (formData) => `
<html>
  <head>
    <meta charset="utf-8">
    <title>Solicitud de Aprobación - Seguridad y Salud en el Trabajo</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f2f2f2;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f2f2f2;">
      <tr>
        <td align="center">
          <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff; margin:20px auto; border:1px solid #dddddd;">
            <tr>
              <td align="center" style="padding:20px; background-color:#210D65;">
                <h2 style="margin:0; font-size:24px; color:#ffffff; font-family:Arial, sans-serif;">Solicitud de Aprobación - Seguridad y Salud en el Trabajo</h2>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:15px; background-color:#FFD700;">
                <p style="margin:0; font-size:18px; color:#000000; font-family:Arial, sans-serif; font-weight:bold; line-height:1.4; word-wrap:break-word; max-width:600px;">
                  Recordar ser muy específico con el cambio que se sugiere generar, ubicación del perfil. Ejemplo: si es de responsabilidades, ¿qué función requiere el cambio?, entre otros.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px; font-family:Arial, sans-serif; font-size:16px; color:#333333;">
                <p style="margin:0 0 10px 0;"><strong>Fecha:</strong> ${formData.fecha}</p>
                <p style="margin:0 0 10px 0;"><strong>Descripción:</strong> ${formData.descripcion || "Sin descripción"}</p>
                <p style="margin:0 0 10px 0;"><strong>Documento:</strong> <a href="${formData.documento}" target="_blank" style="color:#210D65; text-decoration:none;">Ver Documento</a></p>
                <p style="margin:0 0 10px 0;"><strong>Área:</strong> ${formData.area || "No definida"}</p>
                <p style="margin:0 0 10px 0;"><strong>Director:</strong> ${formData.director}</p>
                <p style="margin:0 0 10px 0;"><strong>Gerencia:</strong> ${formData.gerencia}</p>
                <p style="margin:0 0 20px 0;">Esta solicitud ha sido aprobada por el área, el director y la gerencia. Por favor, revisa y toma una decisión:</p>
                <div style="text-align:center;">
                  <a href="${formData.approvalLink}" target="_blank" style="display:inline-block; padding:10px 20px; background-color:#28a745; color:#ffffff; text-decoration:none; border-radius:4px; margin-right:10px;">Aprobar</a>
                  <a href="${formData.rejectionLink}" target="_blank" style="display:inline-block; padding:10px 20px; background-color:#dc3545; color:#ffffff; text-decoration:none; border-radius:4px;">Rechazar</a>
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:10px; background-color:#eeeeee; font-family:Arial, sans-serif; font-size:12px; color:#888888;">
                © ${new Date().getFullYear()} Merkahorro. Todos los derechos reservados.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;