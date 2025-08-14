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
        <style>
          body { font-family: Arial, sans-serif; background-color: #f0f2f5; margin: 0; padding: 0; }
          .container { width: 100%; max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background-color: #210D65; padding: 30px; text-align: center; }
          .header h2 { margin: 0; font-size: 28px; color: #ffffff; }
          .content { padding: 30px; color: #333333; line-height: 1.6; }
          .content h3 { border-left: 4px solid #89DC00; padding-left: 10px; margin: 30px 0 15px 0; color: #210D65; }
          .content p strong { color: #210D65; }
          .list { margin: 0; padding: 0 0 0 25px; list-style-type: disc; }
          .list li { margin-bottom: 8px; }
          .document-link { color: #210D65; text-decoration: none; font-weight: bold; }
          .document-link:hover { text-decoration: underline; }
          .button-container { text-align: center; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 25px; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; margin: 0 10px; transition: background-color 0.3s ease; }
          .approve-button { background-color: #28a745; }
          .reject-button { background-color: #dc3545; }
          .footer { background-color: #e9ecef; text-align: center; padding: 20px; font-size: 12px; color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${title}</h2>
          </div>
          <div class="content">
            <p><strong>Hola,</strong></p>
            <p>Se ha creado una nueva solicitud de descripción de perfil de cargo para tu revisión. Por favor, revisa los detalles a continuación:</p>

            <h3>Información General</h3>
            <p><strong>Nombre del cargo:</strong> ${formData.nombrecargo || 'N/A'}</p>
            <p><strong>Área:</strong> ${formData.areageneral || 'N/A'}</p>
            <p><strong>Departamento:</strong> ${formData.departamento || 'N/A'}</p>
            <p><strong>Proceso:</strong> ${formData.proceso || 'N/A'}</p>
            <p><strong>Misión del cargo:</strong> ${formData.misioncargo || 'N/A'}</p>

            ${renderList('Competencias Culturales', formData.competencias_culturales)}
            ${renderList('Competencias del Cargo', formData.competencias_cargo)}
            ${renderList('Responsabilidades', formData.responsabilidades)}

            <p>Por favor, revisa los detalles completos de la solicitud en el archivo Excel adjunto y toma una decisión:</p>
            
            <div class="button-container">
              <a href="${approvalLink}" class="button approve-button">Aprobar</a>
              <a href="${rejectionLink}" class="button reject-button">Rechazar</a>
            </div>

            <p><strong>Documentos Adjuntos:</strong></p>
            <p>
              ${formData.documento ? `<strong>• Documento:</strong> <a href="${formData.documento}" class="document-link">Ver Documento</a>` : 'No se adjuntó un documento.'}
              <br/>
              ${formData.estructuraorganizacional ? `<strong>• Estructura Organizacional:</strong> <a href="${formData.estructuraorganizacional}" class="document-link">Ver Archivo</a>` : 'No se adjuntó la estructura organizacional.'}
            </p>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} Merkahorro. Todos los derechos reservados.
          </div>
        </div>
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