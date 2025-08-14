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

export const generateExcelAttachment = async (formData, workflow_id) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Solicitud de Perfil de Cargo');
  const primaryColor = 'FF210D65'; // Azul oscuro (hex)
  const secondaryColor = 'FF89DC00'; // Verde Merkahorro (hex)
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Definir anchos de columnas
  worksheet.columns = [{ width: 35 }, { width: 60 }];

  // Título principal
  worksheet.mergeCells('A1:B1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'Detalles de la Solicitud de Perfil de Cargo';
  titleCell.style = {
    font: { ...headerFont, size: 16 },
    alignment: { horizontal: 'center', vertical: 'middle' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } },
    border: {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    },
  };

  // Sección: Información General
  let rowCount = 3;
  worksheet.mergeCells(`A${rowCount}:B${rowCount}`);
  const genTitleCell = worksheet.getCell(`A${rowCount}`);
  genTitleCell.value = 'Información General';
  genTitleCell.style = {
    font: { bold: true, color: { argb: 'FF210D65' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: secondaryColor } },
    alignment: { horizontal: 'left', vertical: 'middle' },
    border: {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    },
  };
  rowCount++;
  const generalData = [
    { field: 'Fecha', value: formData.fecha },
    { field: 'Nombre del Cargo', value: formData.nombrecargo },
    { field: 'Área General', value: formData.areageneral },
    { field: 'Departamento', value: formData.departamento },
    { field: 'Proceso', value: formData.proceso },
    { field: 'Misión del Cargo', value: formData.misioncargo },
    { field: 'Jefe Inmediato', value: formData.jefeinmediato },
    { field: 'Supervisa a', value: formData.supervisaa },
    { field: 'Número de Personas a Cargo', value: formData.numeropersonascargo },
    { field: 'Tipo de Contrato', value: formData.tipocontrato },
  ];
  generalData.forEach(item => addRowWithStyle(worksheet, item.field, item.value));
  rowCount += generalData.length;

  // Sección: Requisitos del Perfil
  rowCount++;
  worksheet.mergeCells(`A${rowCount}:B${rowCount}`);
  const reqTitleCell = worksheet.getCell(`A${rowCount}`);
  reqTitleCell.value = 'Requisitos del Perfil';
  reqTitleCell.style = genTitleCell.style;
  rowCount++;
  const reqData = [
    { field: 'Escolaridad', value: formData.escolaridad },
    { field: 'Área de Formación', value: formData.area_formacion },
    { field: 'Estudios Complementarios', value: formData.estudioscomplementarios },
    { field: 'Experiencia Necesaria', value: formData.experiencia },
    { field: 'Población Focalizada', value: formData.poblacionfocalizada },
  ];
  reqData.forEach(item => addRowWithStyle(worksheet, item.field, item.value));
  rowCount += reqData.length;

  // Sección: Competencias y Responsabilidades
  rowCount++;
  worksheet.mergeCells(`A${rowCount}:B${rowCount}`);
  const compTitleCell = worksheet.getCell(`A${rowCount}`);
  compTitleCell.value = 'Competencias y Responsabilidades';
  compTitleCell.style = genTitleCell.style;
  rowCount++;
  const compData = [
    { field: 'Competencias Culturales', value: formatValueForExcel(formData.competencias_culturales) },
    { field: 'Competencias del Cargo', value: formatValueForExcel(formData.competencias_cargo) },
    { field: 'Responsabilidades', value: formatValueForExcel(formData.responsabilidades) },
  ];
  compData.forEach(item => addRowWithStyle(worksheet, item.field, item.value));
  rowCount += compData.length;

  // Sección: Otros Datos
  rowCount++;
  worksheet.mergeCells(`A${rowCount}:B${rowCount}`);
  const otherTitleCell = worksheet.getCell(`A${rowCount}`);
  otherTitleCell.value = 'Otros Datos';
  otherTitleCell.style = genTitleCell.style;
  rowCount++;
  const otherData = [
    { field: 'Cursos/Certificaciones', value: formData.cursoscertificaciones },
    { field: 'Requiere Vehículo', value: formData.requierevehiculo },
    { field: 'Tipo de Licencia', value: formData.tipolicencia },
    { field: 'Idiomas', value: formData.idiomas },
    { field: 'Requiere Viajar', value: formData.requiereviajar },
    { field: 'Áreas Relacionadas', value: formData.areasrelacionadas },
    { field: 'Relacionamiento Externo', value: formData.relacionamientoexterno },
  ];
  otherData.forEach(item => addRowWithStyle(worksheet, item.field, item.value));
  rowCount += otherData.length;

  // Sección: Aprobaciones
  rowCount++;
  worksheet.mergeCells(`A${rowCount}:B${rowCount}`);
  const aprTitleCell = worksheet.getCell(`A${rowCount}`);
  aprTitleCell.value = 'Estado y Observaciones';
  aprTitleCell.style = genTitleCell.style;
  rowCount++;
  const aprData = [
    { field: 'Estado', value: formData.estado },
    { field: 'Observación Área', value: formData.observacion_area },
    { field: 'Observación Director', value: formData.observacion_director },
    { field: 'Observación Gerencia', value: formData.observacion_gerencia },
    { field: 'Observación Seguridad', value: formData.observacion_seguridad },
  ];
  aprData.forEach(item => addRowWithStyle(worksheet, item.field, item.value));
  rowCount += aprData.length;

  // Sección: Documentos Adjuntos
  rowCount++;
  worksheet.mergeCells(`A${rowCount}:B${rowCount}`);
  const docTitleCell = worksheet.getCell(`A${rowCount}`);
  docTitleCell.value = 'Documentos Adjuntos';
  docTitleCell.style = genTitleCell.style;
  rowCount++;
  
  // Hipervínculos
  const addHyperlinkRow = (field, url) => {
    const row = worksheet.addRow([field]);
    const [fieldCell, valueCell] = [row.getCell(1), row.getCell(2)];
    fieldCell.font = { bold: true };
    valueCell.value = { text: 'Ver documento', hyperlink: url };
    valueCell.font = { color: { argb: 'FF0000FF' }, underline: true };
    [fieldCell, valueCell].forEach(cell => {
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F2F5' } };
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
  };
  
  if (formData.documento) {
    addHyperlinkRow('Documento', formData.documento);
  } else {
    addRowWithStyle(worksheet, 'Documento', 'N/A');
  }

  if (formData.estructuraorganizacional) {
    addHyperlinkRow('Estructura Organizacional', formData.estructuraorganizacional);
  } else {
    addRowWithStyle(worksheet, 'Estructura Organizacional', 'N/A');
  }
  
  // Asegurarse de que el resto del código de exportación se mantiene
  const buffer = await workbook.xlsx.writeBuffer();
  return {
    filename: `Solicitud_${workflow_id}.xlsx`,
    content: buffer,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
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