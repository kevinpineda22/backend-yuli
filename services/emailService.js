import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import ExcelJS from 'exceljs';

dotenv.config();

// Configuración del transporte de correo
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    ciphers: 'TLSv1.2',
  },
});

// Función para generar el archivo Excel
const generateExcelAttachment = async (formData) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Solicitud');

  // Definir columnas
  worksheet.columns = [
    { header: 'Campo', key: 'field', width: 30 },
    { header: 'Valor', key: 'value', width: 50 },
  ];

  // Agregar datos
  const fields = [
    { field: 'ID de la solicitud', value: formData.workflow_id || 'No definido' },
    { field: 'Fecha', value: formData.fecha || 'No definido' },
    { field: 'Nombre del cargo', value: formData.nombreCargo || 'No definido' },
    { field: 'Área', value: formData.areaGeneral || 'No definido' },
    { field: 'Encargado de área', value: formData.area || 'No definido' },
    { field: 'Director de área', value: formData.director || 'No definido' },
    { field: 'Gerencia general', value: formData.gerencia || 'No definido' },
    { field: 'Seguridad y Salud', value: formData.seguridad || 'No definido' },
    { field: 'Departamento', value: formData.departamento || 'No definido' },
    { field: 'Proceso al que pertenece', value: formData.proceso || 'No definido' },
    { field: 'Estructura organizacional', value: formData.estructuraOrganizacional || 'No definido' },
    { field: 'Población focalizada', value: formData.poblacionFocalizada || 'No definido' },
    { field: 'Escolaridad', value: formData.escolaridad || 'No definido' },
    { field: 'Área de formación', value: formData.areaFormacion || 'No definido' },
    { field: 'Estudios complementarios', value: formData.estudiosComplementarios || 'No definido' },
    { field: 'Experiencia necesaria', value: formData.experiencia || 'No definido' },
    { field: 'Jefe inmediato', value: formData.jefeInmediato || 'No definido' },
    { field: 'Supervisa a', value: formData.supervisaA || 'No definido' },
    { field: 'Número de personas a cargo', value: formData.numeroPersonasCargo || 'No definido' },
    { field: 'Tipo de contrato', value: formData.tipoContrato || 'No definido' },
    { field: 'Misión del cargo', value: formData.misionCargo || 'No definido' },
    { field: 'Descripción', value: formData.descripcion || 'No definido' },
    { field: 'Cursos o certificaciones', value: formData.cursosCertificaciones || 'No definido' },
    { field: '¿Requiere vehículo?', value: formData.requiereVehiculo || 'No definido' },
    { field: 'Tipo de licencia', value: formData.tipoLicencia || 'No definido' },
    { field: 'Idiomas', value: formData.idiomas || 'No definido' },
    { field: '¿Requiere viajar?', value: formData.requiereViajar || 'No definido' },
    { field: 'Áreas relacionadas (internas)', value: formData.areasRelacionadas || 'No definido' },
    { field: 'Relacionamiento externo', value: formData.relacionamientoExterno || 'No definido' },
    { field: 'Documento', value: formData.documento || 'No adjuntado' },
    { field: 'Estado', value: formData.estado || 'No definido' },
    { field: 'Observación área', value: formData.observacion_area || 'No definida' },
    { field: 'Observación director', value: formData.observacion_director || 'No definida' },
    { field: 'Observación gerencia', value: formData.observacion_gerencia || 'No definida' },
    { field: 'Observación seguridad', value: formData.observacion_seguridad || 'No definida' },
    { field: 'Es Construahorro', value: formData.isConstruahorro ? 'Sí' : 'No' },
  ];

  worksheet.addRows(fields);

  // Estilizar la cabecera
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '210D65' },
  };

  // Generar el archivo en un buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return {
    filename: `Solicitud_${formData.workflow_id || 'sin_id'}.xlsx`,
    content: buffer,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
};

// Función para enviar correos
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
    console.error('❌ Error al enviar el correo:', error);
    throw error;
  }
};

// Plantilla para el correo al área
export const generarHtmlCorreoArea = async (formData) => {
  const excelAttachment = await generateExcelAttachment(formData);
  return {
    html: `
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
                      <p style="margin:0 0 10px 0;"><strong>Fecha:</strong> ${formData.fecha || 'No definido'}</p>
                      <p style="margin:0 0 10px 0;"><strong>Nombre del cargo:</strong> ${formData.nombreCargo || 'No definido'}</p>
                      <p style="margin:0 0 10px 0;"><strong>Área:</strong> ${formData.areaGeneral || 'No definido'}</p>
                      <p style="margin:0 0 10px 0;"><strong>Descripción:</strong> ${formData.descripcion || 'No definido'}</p>
                      <p style="margin:0 0 10px 0;"><strong>Documento:</strong> ${formData.documento ? `<a href="${formData.documento}" target="_blank" style="color:#210D65; text-decoration:none;">Ver Documento</a>` : 'No adjuntado'}</p>
                      <p style="margin:0 0 10px 0;"><strong>Estructura organizacional:</strong> ${formData.estructuraOrganizacional ? `<a href="${formData.estructuraOrganizacional}" target="_blank" style="color:#210D65; text-decoration:none;">Ver Archivo</a>` : 'No adjuntado'}</p>
                      <p style="margin:0 0 20px 0;">Por favor, revisa los detalles completos de la solicitud en el archivo Excel adjunto y toma una decisión:</p>
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
    `,
    attachments: [excelAttachment],
  };
};

// Plantilla para el correo al director
export const generarHtmlCorreoDirector = async (formData) => {
  const excelAttachment = await generateExcelAttachment(formData);
  return {
    html: `
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
                      <p style="margin:0 0 10px 0;"><strong>Fecha:</strong> ${formData.fecha || 'No definido'}</p>
                      <p style="margin:0 0 10px 0;"><strong>Nombre del cargo:</strong> ${formData.nombreCargo || 'No definido'}</p>
                      <p style="margin:0 0 10px 0;"><strong>Área:</strong> ${formData.areaGeneral || 'No definido'}</p>
                      <p style="margin:0 0 10px 0;"><strong>Descripción:</strong> ${formData.descripcion || 'No definido'}</p>
                      <p style="margin:0 0 10px 0;"><strong>Documento:</strong> ${formData.documento ? `<a href="${formData.documento}" target="_blank" style="color:#210D65; text-decoration:none;">Ver Documento</a>` : 'No adjuntado'}</p>
                      <p style="margin:0 0 10px 0;"><strong>Estructura organizacional:</strong> ${formData.estructuraOrganizacional ? `<a href="${formData.estructuraOrganizacional}" target="_blank" style="color:#210D65; text-decoration:none;">Ver Archivo</a>` : 'No adjuntado'}</p>
                      <p style="margin:0 0 20px 0;">Esta solicitud ha sido aprobada por el área. Por favor, revisa los detalles completos en el archivo Excel adjunto y toma una decisión:</p>
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
    `,
    attachments: [excelAttachment],
  };
};

// Plantilla para el correo a gerencia
export const generarHtmlCorreoGerencia = async (formData) => {
  const excelAttachment = await generateExcelAttachment(formData);
  return {
    html: `
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
                      <p style="margin:0 0 10px 0;"><strong>Fecha:</strong> ${formData.fecha || 'No definido'}</p>
                      <p style="margin:0 0 10px 0;"><strong>Nombre del cargo:</strong> ${formData.nombreCargo || 'No definido'}</p>
                      <p style="margin:0 0 10px 0;"><strong>Área:</strong> ${formData.areaGeneral || 'No definido'}</p>
                      <p style="margin:0 0 10px 0;"><strong>Descripción:</strong> ${formData.descripcion || 'No definido'}</p>
                      <p style="margin:0 0 10px 0;"><strong>Documento:</strong> ${formData.documento ? `<a href="${formData.documento}" target="_blank" style="color:#210D65; text-decoration:none;">Ver Documento</a>` : 'No adjuntado'}</p>
                      <p style="margin:0 0 10px 0;"><strong>Estructura organizacional:</strong> ${formData.estructuraOrganizacional ? `<a href="${formData.estructuraOrganizacional}" target="_blank" style="color:#210D65; text-decoration:none;">Ver Archivo</a>` : 'No adjuntado'}</p>
                      <p style="margin:0 0 20px 0;">Esta solicitud ha sido aprobada por el área y el director. Por favor, revisa los detalles completos en el archivo Excel adjunto y toma una decisión:</p>
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
    `,
    attachments: [excelAttachment],
  };
};

// Plantilla para el correo a seguridad
export const generarHtmlCorreoSeguridad = async (formData) => {
  const excelAttachment = await generateExcelAttachment(formData);
  return {
    html: `
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
                      <p style="margin:0 0 10px 0;"><strong>Fecha:</strong> ${formData.fecha || 'No definido'}</p>
                      <p style="margin:0 0 10px 0;"><strong>Nombre del cargo:</strong> ${formData.nombreCargo || 'No definido'}</p>
                      <p style="margin:0 0 10px 0;"><strong>Área:</strong> ${formData.areaGeneral || 'No definido'}</p>
                      <p style="margin:0 0 10px 0;"><strong>Descripción:</strong> ${formData.descripcion || 'No definido'}</p>
                      <p style="margin:0 0 10px 0;"><strong>Documento:</strong> ${formData.documento ? `<a href="${formData.documento}" target="_blank" style="color:#210D65; text-decoration:none;">Ver Documento</a>` : 'No adjuntado'}</p>
                      <p style="margin:0 0 10px 0;"><strong>Estructura organizacional:</strong> ${formData.estructuraOrganizacional ? `<a href="${formData.estructuraOrganizacional}" target="_blank" style="color:#210D65; text-decoration:none;">Ver Archivo</a>` : 'No adjuntado'}</p>
                      <p style="margin:0 0 20px 0;">Esta solicitud ha sido aprobada por el área, el director y la gerencia. Por favor, revisa los detalles completos en el archivo Excel adjunto y toma una decisión:</p>
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
    `,
    attachments: [excelAttachment],
  };
};