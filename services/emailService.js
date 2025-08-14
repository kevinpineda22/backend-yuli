import nodemailer from 'nodemailer';
import ExcelJS from 'exceljs';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
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
    console.error('❌ Error al enviar el correo:', error);
    throw error;
  }
};

const formatValueForExcel = (value) => {
  if (Array.isArray(value)) {
    // Si es un array de objetos (competencias)
    if (typeof value[0] === 'object' && value[0].hasOwnProperty('competencia')) {
      return value.map(c => `${c.competencia} (${c.nivel}) - ${c.definicion}`).join('\n');
    }
    // Si es un array simple (responsabilidades)
    return value.join('\n');
  }
  return value || 'N/A';
};

const generateExcelAttachment = async (formData, workflow_id) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Solicitud');

  worksheet.columns = [
    { header: 'Campo', key: 'field', width: 35 },
    { header: 'Valor', key: 'value', width: 60, style: { alignment: { wrapText: true } } },
  ];

  const fields = [
    { field: 'Fecha', value: formData.fecha },
    { field: 'Área', value: formData.area || 'N/A' },
    { field: 'Descripción', value: formData.descripcion },
    { field: 'Nombre del cargo', value: formData.nombrecargo },
    { field: 'Área General', value: formData.areageneral },
    { field: 'Departamento', value: formData.departamento },
    { field: 'Proceso', value: formData.proceso },
    { field: 'Población Focalizada', value: formData.poblacionfocalizada || 'N/A' },
    { field: 'Escolaridad', value: formData.escolaridad },
    { field: 'Área de Formación', value: formData.area_formacion || 'N/A' },
    { field: 'Estudios Complementarios', value: formData.estudioscomplementarios || 'N/A' },
    { field: 'Experiencia', value: formData.experiencia },
    { field: 'Jefe Inmediato', value: formData.jefeinmediato },
    { field: 'Supervisa a', value: formData.supervisaa || 'N/A' },
    { field: 'Número de Personas a Cargo', value: formData.numeropersonascargo || 'N/A' },
    { field: 'Tipo de Contrato', value: formData.tipocontrato },
    { field: 'Misión del Cargo', value: formData.misioncargo },
    { field: 'Competencias Culturales', value: formatValueForExcel(formData.competencias_culturales) },
    { field: 'Competencias del Cargo', value: formatValueForExcel(formData.competencias_cargo) },
    { field: 'Responsabilidades', value: formatValueForExcel(formData.responsabilidades) },
    { field: 'Cursos/Certificaciones', value: formData.cursoscertificaciones || 'N/A' },
    { field: 'Requiere Vehículo', value: formData.requierevehiculo || 'N/A' },
    { field: 'Tipo de Licencia', value: formData.tipolicencia || 'N/A' },
    { field: 'Idiomas', value: formData.idiomas || 'N/A' },
    { field: 'Requiere Viajar', value: formData.requiereviajar || 'N/A' },
    { field: 'Áreas Relacionadas', value: formData.areasrelacionadas || 'N/A' },
    { field: 'Relacionamiento Externo', value: formData.relacionamientoexterno || 'N/A' },
    // Manejo especial para links de documentos
    { field: 'Documento', value: formData.documento ? { text: 'Ver Documento', hyperlink: formData.documento } : 'N/A' },
    { field: 'Estructura Organizacional', value: formData.estructuraorganizacional ? { text: 'Ver Archivo', hyperlink: formData.estructuraorganizacional } : 'N/A' },
  ];

  fields.forEach(({ field, value }) => {
    const row = worksheet.addRow({ field, value });
    if (typeof value === 'object' && value.text) {
      row.getCell(2).value = value;
      row.getCell(2).font = { color: { argb: 'FF0000FF' }, underline: true };
    }
  });

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF89DC00' } }; // Verde Merkahorro
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      if (rowNumber % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F2F5' } };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    filename: `Solicitud_${workflow_id}.xlsx`,
    content: buffer,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
};

const renderList = (label, items) => {
  if (!items || items.length === 0) {
    return '';
  }
  const listItems = items.map(item => {
    if (typeof item === 'object') {
      return `<li>${item.competencia} (${item.nivel}) - ${item.definicion}</li>`;
    }
    return `<li>${item}</li>`;
  }).join('');

  return `
        <h3 style="margin:20px 0 10px 0; font-size:18px; color:#210D65; font-family:Arial, sans-serif;">${label}</h3>
        <ul style="margin:0; padding:0 0 0 25px; list-style-type:disc; color:#333333; font-family:Arial, sans-serif; font-size:16px;">
            ${listItems}
        </ul>
    `;
};


const generateHtmlCorreo = (formData, approvalLink, rejectionLink, title) => {
  return `
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
        </head>
        <body style="margin:0; padding:0; background-color:#f2f2f2;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f2f2f2;">
            <tr>
              <td align="center">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff; margin:20px auto; border:1px solid #dddddd;">
                  <tr>
                    <td align="center" style="padding:20px; background-color:#210D65;">
                      <h2 style="margin:0; font-size:24px; color:#ffffff; font-family:Arial, sans-serif;">${title}</h2>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px; font-family:Arial, sans-serif; font-size:16px; color:#333333;">
                      <p style="margin:0 0 10px 0;"><strong>Fecha:</strong> ${formData.fecha || 'No definido'}</p>
                      <p style="margin:0 0 10px 0;"><strong>Nombre del cargo:</strong> ${formData.nombrecargo || 'No definido'}</p>
                      <p style="margin:0 0 10px 0;"><strong>Área:</strong> ${formData.areageneral || 'No definido'}</p>
                      <p style="margin:0 0 10px 0;"><strong>Descripción:</strong> ${formData.descripcion || 'No definido'}</p>
                      <p style="margin:0 0 10px 0;"><strong>Documento:</strong> ${formData.documento ? `<a href="${formData.documento}" target="_blank" style="color:#210D65; text-decoration:none;">Ver Documento</a>` : 'No adjuntado'}</p>
                      <p style="margin:0 0 10px 0;"><strong>Estructura organizacional:</strong> ${formData.estructuraorganizacional ? `<a href="${formData.estructuraorganizacional}" target="_blank" style="color:#210D65; text-decoration:none;">Ver Archivo</a>` : 'No adjuntado'}</p>
                      <p style="margin:0 0 20px 0;">Por favor, revisa los detalles completos de la solicitud en el archivo Excel adjunto y toma una decisión:</p>
                      <div style="text-align:center;">
                        <a href="${approvalLink}" target="_blank" style="display:inline-block; padding:10px 20px; background-color:#28a745; color:#ffffff; text-decoration:none; border-radius:4px; margin-right:10px;">Aprobar</a>
                        <a href="${rejectionLink}" target="_blank" style="display:inline-block; padding:10px 20px; background-color:#dc3545; color:#ffffff; text-decoration:none; border-radius:4px;">Rechazar</a>
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
};

// Exportar todas las funciones necesarias
export const generarHtmlCorreoArea = async (formData) => {
  const html = generateHtmlCorreo(formData, formData.approvalLink, formData.rejectionLink, 'Solicitud de Aprobación - Área');
  const excelAttachment = await generateExcelAttachment(formData, formData.workflow_id);
  return { html, attachments: [excelAttachment] };
};

export const generarHtmlCorreoDirector = async (formData) => {
  const html = generateHtmlCorreo(formData, formData.approvalLink, formData.rejectionLink, 'Solicitud de Aprobación - Director');
  const excelAttachment = await generateExcelAttachment(formData, formData.workflow_id);
  return { html, attachments: [excelAttachment] };
};

export const generarHtmlCorreoGerencia = async (formData) => {
  const html = generateHtmlCorreo(formData, formData.approvalLink, formData.rejectionLink, 'Solicitud de Aprobación - Gerencia');
  const excelAttachment = await generateExcelAttachment(formData, formData.workflow_id);
  return { html, attachments: [excelAttachment] };
};

export const generarHtmlCorreoSeguridad = async (formData) => {
  const html = generateHtmlCorreo(formData, formData.approvalLink, formData.rejectionLink, 'Solicitud de Aprobación - Seguridad y Salud en el Trabajo');
  const excelAttachment = await generateExcelAttachment(formData, formData.workflow_id);
  return { html, attachments: [excelAttachment] };
};