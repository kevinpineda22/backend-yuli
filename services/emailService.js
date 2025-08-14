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

  // Colores y estilos
  const primaryColor = 'FF210D65'; // Azul oscuro
  const secondaryColor = 'FF89DC00'; // Verde (puedes ajustar)
  const lightGray = 'FFF7F8FA';
  const headerFont = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
  const labelFont = { name: 'Arial', bold: true, color: { argb: 'FF000000' } };
  const valueFont = { name: 'Arial', color: { argb: 'FF000000' } };

  // Config columnas: A etiqueta, B separador, C valor (esto replica plantilla)
  worksheet.columns = [
    { width: 40 }, // A
    { width: 3  }, // B (espacio)
    { width: 80 }, // C (valores)
  ];

  const cellBorderThin = {
    top:    { style: 'thin' },
    left:   { style: 'thin' },
    bottom: { style: 'thin' },
    right:  { style: 'thin' },
  };

  const writeSectionTitle = (text) => {
    const row = worksheet.addRow([]);
    // usamos 1..3 columnas -> merge A#:C#
    worksheet.mergeCells(`A${row.number}:C${row.number}`);
    const cell = worksheet.getCell(`A${row.number}`);
    cell.value = text;
    cell.font = { name: 'Arial', bold: true, size: 12, color: { argb: primaryColor } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: secondaryColor } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    cell.border = cellBorderThin;
    // espacio visual debajo
    worksheet.addRow([]);
  };

  const writeLabelValue = (label, value) => {
    // Forzar texto "N/A" si no hay valor
    const safeVal = (value === null || value === undefined || value === '') ? 'N/A' : value;
    const row = worksheet.addRow([label, null, safeVal]);
    const labelCell = row.getCell(1);
    const valCell   = row.getCell(3);

    labelCell.font = labelFont;
    valCell.font = valueFont;

    // estilo
    [labelCell, valCell].forEach(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightGray } };
      cell.border = cellBorderThin;
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
  };

  const writeHyperlink = (label, url) => {
    if (!url) {
      writeLabelValue(label, 'N/A');
      return;
    }
    const row = worksheet.addRow([label, null, 'Ver documento']);
    const labelCell = row.getCell(1);
    const valCell   = row.getCell(3);

    labelCell.font = labelFont;
    valCell.font = { name: 'Arial', color: { argb: 'FF0563C1' }, underline: true };

    // asignar hipervínculo
    valCell.value = { text: 'Ver documento', hyperlink: String(url) };

    [labelCell, valCell].forEach(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightGray } };
      cell.border = cellBorderThin;
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
  };

  // Convierte arrays/competencias a texto con saltos de línea
  const formatValueForCell = (value) => {
    if (!value && value !== 0) return 'N/A';
    if (Array.isArray(value)) {
      // array de objetos competencia -> formatear líneas: "Competencia (Nivel) - Definición"
      if (value.length > 0 && typeof value[0] === 'object' && value[0].competencia) {
        return value.map(c => `${c.competencia}${c.nivel ? ` (${c.nivel})` : ''}${c.definicion ? ` - ${c.definicion}` : ''}`).join('\n');
      }
      // array simple
      return value.join('\n');
    }
    // si es string que contiene JSON -> parsear y formatear
    if (typeof value === 'string' && (value.trim().startsWith('[') || value.trim().startsWith('{'))) {
      try {
        const parsed = JSON.parse(value);
        return formatValueForCell(parsed);
      } catch (e) {
        // no JSON, retornar tal cual
        return value;
      }
    }
    return String(value);
  };

  // --- Título principal (simulando plantilla) ---
  worksheet.mergeCells('A1:C1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'INFORMACIÓN GENERAL';
  titleCell.font = { name: 'Arial', bold: true, size: 14, color: { argb: primaryColor } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  titleCell.border = cellBorderThin;
  // pequeña fila en blanco a continuación
  worksheet.addRow([]);

  // --- Información General (se escribe etiqueta en A y valor en C) ---
  writeLabelValue('Nombre del cargo', formatValueForCell(formData.nombrecargo || formData.nombreCargo));
  writeLabelValue('Área', formatValueForCell(formData.areageneral || formData.area || formData.areaGeneral));
  writeLabelValue('Departamento', formatValueForCell(formData.departamento));
  writeLabelValue('Proceso al que pertenece', formatValueForCell(formData.proceso));
  writeLabelValue('Estructura organizacional (enlace)', ''); // placeholder, añadiremos link debajo si existe
  if (formData.estructuraorganizacional) {
    writeHyperlink('Estructura organizacional', formData.estructuraorganizacional);
  } else {
    writeLabelValue('Estructura organizacional', 'N/A');
  }

  // separación visual
  worksheet.addRow([]);

  // Población focalizada: si viene como array o string con saltos, lo colocamos sobre varias filas (mimic plantilla)
  writeSectionTitle('Población focalizada');
  const poblacionVal = formatValueForCell(formData.poblacionfocalizada || formData.poblacionFocalizada);
  // si es múltiples líneas, escribir cada línea en su propia fila (col C)
  if (poblacionVal && poblacionVal !== 'N/A') {
    poblacionVal.split('\n').forEach(line => {
      writeLabelValue('', line); // etiqueta vacía para parezca plantilla
    });
  } else {
    writeLabelValue('', 'N/A');
  }
  worksheet.addRow([]);

  // --- Requisitos del Perfil ---
  writeSectionTitle('REQUISITOS DEL PERFIL');
  writeLabelValue('Escolaridad', formatValueForCell(formData.escolaridad));
  writeLabelValue('Área de formación', formatValueForCell(formData.area_formacion || formData.areaFormacion));
  writeLabelValue('Estudios complementarios', formatValueForCell(formData.estudioscomplementarios || formData.estudiosComplementarios));
  writeLabelValue('Experiencia necesaria', formatValueForCell(formData.experiencia));
  writeLabelValue('Población focalizada (detalle)', formatValueForCell(formData.poblacionfocalizada));

  worksheet.addRow([]);

  // --- Competencias y Responsabilidades ---
  writeSectionTitle('COMPETENCIAS REQUERIDAS');
  // Competencias culturales: si es array/obj
  writeLabelValue('Competencias culturales', formatValueForCell(formData.competencias_culturales || formData.competenciasCulturales));
  // Competencias del cargo
  writeLabelValue('Competencias del cargo', formatValueForCell(formData.competencias_cargo || formData.competenciasCargo));
  // Responsabilidades
  writeLabelValue('Responsabilidades', formatValueForCell(formData.responsabilidades));

  worksheet.addRow([]);

  // --- Otros datos ---
  writeSectionTitle('OTROS DATOS');
  writeLabelValue('Cursos / Certificaciones', formatValueForCell(formData.cursoscertificaciones || formData.cursosCertificaciones));
  writeLabelValue('¿Requiere vehículo?', formatValueForCell(formData.requierevehiculo || formData.requiereVehiculo));
  writeLabelValue('Tipo de licencia', formatValueForCell(formData.tipolicencia || formData.tipoLicencia));
  writeLabelValue('Idiomas', formatValueForCell(formData.idiomas));
  writeLabelValue('¿Requiere viajar?', formatValueForCell(formData.requiereviajar || formData.requiereViajar));
  writeLabelValue('Áreas con las cuales se relaciona (internas)', formatValueForCell(formData.areasrelacionadas || formData.areasRelacionadas));
  writeLabelValue('Relacionamiento externo', formatValueForCell(formData.relacionamientoexterno || formData.relacionamientoExterno));

  worksheet.addRow([]);

  // --- Documentos adjuntos (hipervínculos) ---
  writeSectionTitle('DOCUMENTOS ADJUNTOS');
  writeHyperlink('Documento', formData.documento);
  writeHyperlink('Estructura organizacional', formData.estructuraorganizacional);

  // Ajustes finales de apariencia: alinear todas las celdas con wrap text por si hay muchos saltos de línea
  worksheet.eachRow((row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      if (!cell.alignment) cell.alignment = { wrapText: true, vertical: 'top' };
    });
  });

  // Escribir buffer
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