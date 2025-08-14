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
  const colorTitle = 'FF210D65';
  const colorSection = 'FF89DC00';
  const headerGray = 'FFDCDCDC';
  const leftGray = 'FFEFEFEF';
  const rowLight = 'FFF7F7F7';
  const thinBorder = {
    top: { style: 'thin' }, left: { style: 'thin' },
    bottom: { style: 'thin' }, right: { style: 'thin' }
  };

  // Columnas: A | B | C | D | E
  worksheet.columns = [
    { width: 36 }, // A: Etiqueta de Campo
    { width: 10 }, // B: Nivel (Alto)
    { width: 10 }, // C: Nivel (Bueno)
    { width: 12 }, // D: Nivel (Mínimo)
    { width: 72 }  // E: Valor / Definición
  ];

  const HEADER_ROW_HEIGHT = 16;
  const COMPACT_ROW_HEIGHT = 14;

  const nivelToCol = (nivel) => {
    if (!nivel) return null;
    const s = nivel.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (s.includes('alto')) return 2;
    if (s.includes('bueno')) return 3;
    if (s.includes('minimo')) return 4;
    return null;
  };

  // Helper para crear una fila de datos estándar
  const addFieldRow = (label, value) => {
    const safeValue = (value === undefined || value === null || value === '') ? 'N/A' : value;
    const r = worksheet.addRow([label, '', '', '', safeValue]);
    worksheet.mergeCells(`B${r.number}:E${r.number}`);
    r.getCell(1).font = { bold: true };
    r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: leftGray } };
    r.getCell(1).border = thinBorder;
    r.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowLight } };
    r.getCell(5).border = thinBorder;
    r.getCell(1).alignment = { wrapText: true, vertical: 'top' };
    r.getCell(5).alignment = { wrapText: true, vertical: 'top' };
    r.height = COMPACT_ROW_HEIGHT;
  };

  // Título principal
  worksheet.mergeCells('A1:E1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'DETALLES - SOLICITUD PERFIL DE CARGO';
  titleCell.font = { name: 'Arial', bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorTitle } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border = thinBorder;
  worksheet.getRow(1).height = HEADER_ROW_HEIGHT;

  // Espacio entre secciones
  worksheet.addRow([]).height = 8;

  // Sección: Información General
  const addSectionTitle = (text, startRow) => {
    worksheet.mergeCells(`A${startRow}:E${startRow}`);
    const cell = worksheet.getCell(`A${startRow}`);
    cell.value = text;
    cell.font = { name: 'Arial', bold: true, color: { argb: colorTitle } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorSection } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    cell.border = thinBorder;
    worksheet.getRow(startRow).height = HEADER_ROW_HEIGHT;
  };

  let currentRow = 3;
  addSectionTitle('INFORMACIÓN GENERAL', currentRow);
  currentRow++;
  addFieldRow('Fecha', formData.fecha);
  addFieldRow('Nombre del Cargo', formData.nombrecargo);
  addFieldRow('Área General', formData.areageneral);
  addFieldRow('Departamento', formData.departamento);
  addFieldRow('Proceso', formData.proceso);
  addFieldRow('Misión del Cargo', formData.misioncargo);
  addFieldRow('Jefe Inmediato', formData.jefeinmediato);
  addFieldRow('Supervisa a', formData.supervisaa);
  addFieldRow('Número de Personas a Cargo', formData.numeropersonascargo);
  addFieldRow('Tipo de Contrato', formData.tipocontrato);

  // Espacio entre secciones
  worksheet.addRow([]).height = 8;

  // Sección: Requisitos del Perfil
  addSectionTitle('REQUISITOS DEL PERFIL', worksheet.lastRow.number + 2);
  addFieldRow('Escolaridad', formData.escolaridad);
  addFieldRow('Área de Formación', formData.area_formacion);
  addFieldRow('Estudios Complementarios', formData.estudioscomplementarios);
  addFieldRow('Experiencia Necesaria', formData.experiencia);
  addFieldRow('Población Focalizada', formData.poblacionfocalizada);

  // Espacio entre secciones
  worksheet.addRow([]).height = 8;

  // Sección: Competencias
  const compHeaderRow = worksheet.lastRow.number + 2;
  addSectionTitle('COMPETENCIAS REQUERIDAS', compHeaderRow);
  const subHeaderRow = compHeaderRow + 1;
  worksheet.addRow([]);
  worksheet.getRow(subHeaderRow).height = HEADER_ROW_HEIGHT;

  // Cabecera de tabla de competencias
  const header = worksheet.getRow(subHeaderRow);
  header.getCell(1).value = 'Competencia';
  header.getCell(2).value = 'Alto (Siempre)';
  header.getCell(3).value = 'Bueno (Casi siempre)';
  header.getCell(4).value = 'Mínimo necesario (En ocasiones)';
  header.getCell(5).value = 'Definición';
  header.eachCell((cell, colNumber) => {
    if (colNumber === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: leftGray } };
    else cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerGray } };
    cell.font = { bold: true, name: 'Arial', size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });

  // Competencias Culturales
  const renderCompetencies = (competencias, isCultural = true) => {
    const sectionTitle = worksheet.addRow([]);
    worksheet.mergeCells(`A${sectionTitle.number}:E${sectionTitle.number}`);
    sectionTitle.getCell(1).value = isCultural ? 'Competencias Culturales' : 'Competencias del Cargo';
    sectionTitle.getCell(1).font = { bold: true };
    sectionTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowLight } };
    sectionTitle.getCell(1).border = thinBorder;
    sectionTitle.height = COMPACT_ROW_HEIGHT;

    if (competencias && competencias.length > 0) {
      competencias.forEach(c => {
        const row = worksheet.addRow([]);
        row.getCell(1).value = c.competencia;
        const colIndex = nivelToCol(c.nivel);
        if (colIndex) {
          row.getCell(colIndex).value = 'X';
          row.getCell(colIndex).alignment = { horizontal: 'center' };
        }
        row.getCell(5).value = c.definicion;
        row.eachCell(cell => {
          cell.border = thinBorder;
          cell.alignment = { vertical: 'top', wrapText: true };
        });
        row.height = COMPACT_ROW_HEIGHT;
      });
    } else {
      const row = worksheet.addRow(['N/A']);
      worksheet.mergeCells(`A${row.number}:E${row.number}`);
      row.eachCell(cell => { cell.border = thinBorder; cell.alignment = { vertical: 'top', wrapText: true }; });
      row.height = COMPACT_ROW_HEIGHT;
    }
  };
  renderCompetencies(formData.competencias_culturales, true);
  renderCompetencies(formData.competencias_cargo, false);

  // Responsabilidades
  const respTitleRow = worksheet.addRow([]);
  worksheet.mergeCells(`A${respTitleRow.number}:E${respTitleRow.number}`);
  respTitleRow.getCell(1).value = 'Responsabilidades';
  respTitleRow.getCell(1).font = { bold: true };
  respTitleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowLight } };
  respTitleRow.getCell(1).border = thinBorder;
  respTitleRow.height = COMPACT_ROW_HEIGHT;

  if (formData.responsabilidades && formData.responsabilidades.length > 0) {
    formData.responsabilidades.forEach(resp => {
      const row = worksheet.addRow([`• ${resp}`]);
      worksheet.mergeCells(`A${row.number}:E${row.number}`);
      row.getCell(1).alignment = { wrapText: true, vertical: 'top' };
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowLight } };
      row.getCell(1).border = thinBorder;
      row.height = COMPACT_ROW_HEIGHT;
    });
  } else {
    const row = worksheet.addRow(['N/A']);
    worksheet.mergeCells(`A${row.number}:E${row.number}`);
    row.eachCell(cell => { cell.border = thinBorder; cell.alignment = { vertical: 'top', wrapText: true }; });
    row.height = COMPACT_ROW_HEIGHT;
  }

  // Espacio entre secciones
  worksheet.addRow([]).height = 8;

  // Sección: Otros Datos
  addSectionTitle('OTROS DATOS', worksheet.lastRow.number + 2);
  addFieldRow('Cursos/Certificaciones', formData.cursoscertificaciones);
  addFieldRow('Requiere Vehículo', formData.requierevehiculo);
  addFieldRow('Tipo de Licencia', formData.tipolicencia);
  addFieldRow('Idiomas', formData.idiomas);
  addFieldRow('Requiere Viajar', formData.requiereviajar);
  addFieldRow('Áreas Relacionadas', formData.areasrelacionadas);
  addFieldRow('Relacionamiento Externo', formData.relacionamientoexterno);

  // Espacio entre secciones
  worksheet.addRow([]).height = 8;

  // Sección: Aprobaciones
  addSectionTitle('ESTADO Y OBSERVACIONES', worksheet.lastRow.number + 2);
  addFieldRow('Estado', formData.estado);
  addFieldRow('Observación Área', formData.observacion_area);
  addFieldRow('Observación Director', formData.observacion_director);
  addFieldRow('Observación Gerencia', formData.observacion_gerencia);
  addFieldRow('Observación Seguridad', formData.observacion_seguridad);

  // Espacio entre secciones
  worksheet.addRow([]).height = 8;

  // Sección: Documentos Adjuntos
  addSectionTitle('DOCUMENTOS ADJUNTOS', worksheet.lastRow.number + 2);

  const addHyperlinkRow = (label, url) => {
    const r = worksheet.addRow([]);
    r.getCell(1).value = label;
    r.getCell(1).font = { bold: true };
    r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: leftGray } };
    r.getCell(1).border = thinBorder;

    if (url) {
      worksheet.mergeCells(`B${r.number}:E${r.number}`);
      const linkCell = r.getCell(2);
      linkCell.value = { text: 'Ver documento', hyperlink: url };
      linkCell.font = { color: { argb: 'FF0563C1' }, underline: true };
      linkCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowLight } };
      linkCell.border = thinBorder;
      linkCell.alignment = { vertical: 'top', wrapText: true };
    } else {
      worksheet.mergeCells(`B${r.number}:E${r.number}`);
      const noLinkCell = r.getCell(2);
      noLinkCell.value = 'N/A';
      noLinkCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowLight } };
      noLinkCell.border = thinBorder;
      noLinkCell.alignment = { vertical: 'top', wrapText: true };
    }
    r.height = COMPACT_ROW_HEIGHT;
  };

  addHyperlinkRow('Documento', formData.documento);
  addHyperlinkRow('Estructura Organizacional', formData.estructuraorganizacional);

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