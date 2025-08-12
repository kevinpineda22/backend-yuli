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

const generateExcelAttachment = async (formData, workflow_id) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Solicitud');

  worksheet.columns = [
    { header: 'Campo', key: 'field', width: 30 },
    { header: 'Valor', key: 'value', width: 50 },
  ];

  const fields = [
    { field: 'ID de la solicitud', value: workflow_id },
    { field: 'Fecha', value: formData.fecha },
    { field: 'Director', value: formData.director },
    { field: 'Gerencia', value: formData.gerencia },
    { field: 'Seguridad', value: formData.seguridad || 'N/A' },
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
    { field: 'Cursos/Certificaciones', value: formData.cursoscertificaciones || 'N/A' },
    { field: 'Requiere Vehículo', value: formData.requierevehiculo || 'N/A' },
    { field: 'Tipo de Licencia', value: formData.tipolicencia || 'N/A' },
    { field: 'Idiomas', value: formData.idiomas || 'N/A' },
    { field: 'Requiere Viajar', value: formData.requiereviajar || 'N/A' },
    { field: 'Áreas Relacionadas', value: formData.areasrelacionadas || 'N/A' },
    { field: 'Relacionamiento Externo', value: formData.relacionamientoexterno || 'N/A' },
    { field: 'Documento', value: formData.documento || 'N/A' },
    { field: 'Estructura Organizacional', value: formData.estructuraorganizacional },
    { field: 'Estado', value: formData.estado },
    { field: 'Observación Área', value: formData.observacion_area || 'N/A' },
    { field: 'Observación Director', value: formData.observacion_director || 'N/A' },
    { field: 'Observación Gerencia', value: formData.observacion_gerencia || 'N/A' },
    { field: 'Observación Seguridad', value: formData.observacion_seguridad || 'N/A' },
    { field: 'Es Construahorro', value: formData.isConstruahorro ? 'Sí' : 'No' },
  ];

  fields.forEach(({ field, value }) => worksheet.addRow({ field, value }));

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD700' } };
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      if (rowNumber % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F5F5F5' } };
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

const generateHtmlCorreo = (formData, workflow_id, approvalLink, rejectionLink, title) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd;">
      <h2 style="color: #210D65; text-align: center;">${title}</h2>
      <p><strong>Fecha:</strong> ${formData.fecha}</p>
      <p><strong>Nombre del cargo:</strong> ${formData.nombrecargo}</p>
      <p><strong>Área:</strong> ${formData.areageneral}</p>
      <p><strong>Descripción:</strong> ${formData.descripcion}</p>
      ${formData.documento ? `<p><strong>Documento:</strong> <a href="${formData.documento}" style="color: #FFD700;">Ver Documento</a></p>` : ''}
      <p><strong>Estructura organizacional:</strong> <a href="${formData.estructuraorganizacional}" style="color: #FFD700;">Ver Archivo</a></p>
      <p>Por favor, revisa los detalles completos de la solicitud en el archivo Excel adjunto y toma una decisión:</p>
      <div style="text-align: center; margin-top: 20px;">
        <a href="${approvalLink}" style="background-color: #210D65; color: #FFD700; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Aprobar</a>
        <a href="${rejectionLink}" style="background-color: #FFD700; color: #210D65; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Rechazar</a>
      </div>
    </div>
  `;
};

export const generarHtmlCorreoArea = async (formData) => {
  const html = generateHtmlCorreo(formData, formData.workflow_id, formData.approvalLink, formData.rejectionLink, 'Solicitud de Aprobación - Área');
  const excelAttachment = await generateExcelAttachment(formData, formData.workflow_id);
  return { html, attachments: [excelAttachment] };
};

export const generarHtmlCorreoDirector = async (formData) => {
  const html = generateHtmlCorreo(formData, formData.workflow_id, formData.approvalLink, formData.rejectionLink, 'Solicitud de Aprobación - Director');
  const excelAttachment = await generateExcelAttachment(formData, formData.workflow_id);
  return { html, attachments: [excelAttachment] };
};

export const generarHtmlCorreoGerencia = async (formData) => {
  const html = generateHtmlCorreo(formData, formData.workflow_id, formData.approvalLink, formData.rejectionLink, 'Solicitud de Aprobación - Gerencia');
  const excelAttachment = await generateExcelAttachment(formData, formData.workflow_id);
  return { html, attachments: [excelAttachment] };
};

export const generarHtmlCorreoSeguridad = async (formData) => {
  const html = generateHtmlCorreo(formData, formData.workflow_id, formData.approvalLink, formData.rejectionLink, 'Solicitud de Aprobación - Seguridad y Salud en el Trabajo');
  const excelAttachment = await generateExcelAttachment(formData, formData.workflow_id);
  return { html, attachments: [excelAttachment] };
};