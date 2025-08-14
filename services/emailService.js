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
  const primaryColor = 'FF210D65';      // Azul título
  const sectionGreen = 'FF89DC00';      // Verde secciones
  const headerGray = 'FFD9D9D9';        // fondo encabezado tablas
  const leftGray = 'FFE6E6E6';          // fondo celda "COMPETENCIAS CARGO"
  const leftPurple = 'FFF2D9E6';        // fondo columna A en filas de competencia (opcional)
  const thinBorder = {
    top: { style: 'thin' }, left: { style: 'thin' },
    bottom: { style: 'thin' }, right: { style: 'thin' }
  };

  // Columnas globales: A (competencia / etiqueta) | B | C | D | E definicion
  worksheet.columns = [
    { width: 36 }, // A: Competencia
    { width: 10 }, // B: A (Alto)
    { width: 10 }, // C: B (Bueno)
    { width: 12 }, // D: C (Min necesario)
    { width: 72 }  // E: Definición
  ];

  // Util: parsea arrays / JSON / string con saltos de linea
  const parseToArray = (raw) => {
    if (raw === null || raw === undefined) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === 'string') {
      const s = raw.trim();
      if (!s) return [];
      // intenta parsear JSON
      if (s.startsWith('[') || s.startsWith('{')) {
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) return parsed.filter(Boolean);
          return [parsed];
        } catch (e) { /* no JSON */ }
      }
      // split por saltos de línea
      return s.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    }
    return [String(raw)];
  };

  const nivelToCol = (nivel) => {
    if (nivel === null || nivel === undefined) return null;
    const s = String(nivel).toLowerCase().trim();
    if (['1','a','alto','siempre'].includes(s)) return 2; // columna B
    if (['2','b','bueno','casi siempre'].includes(s)) return 3; // columna C
    if (['3','c','min','min necesario','en ocasiones'].includes(s)) return 4; // columna D
    if (s === 'a') return 2;
    if (s === 'b') return 3;
    if (s === 'c') return 4;
    return null;
  };

  // Helpers para secciones y campos simples
  const addSectionTitle = (text) => {
    const row = worksheet.addRow([]);
    worksheet.mergeCells(`A${row.number}:E${row.number}`);
    const cell = worksheet.getCell(`A${row.number}`);
    cell.value = text;
    cell.font = { name: 'Arial', bold: true, color: { argb: primaryColor } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sectionGreen } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    cell.border = thinBorder;
    worksheet.addRow([]); // una única separación
  };

  const addField = (label, value) => {
    const safe = (value === undefined || value === null || value === '') ? 'N/A' : value;
    const row = worksheet.addRow([label, '', '', '', safe]);
    const labelCell = row.getCell(1);
    const valCell = row.getCell(5);
    labelCell.font = { name: 'Arial', bold: true };
    [labelCell, valCell].forEach(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: leftGray } };
      cell.border = thinBorder;
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
    row.height = 18;
  };

  const addHyperlinkField = (label, url) => {
    if (!url) { addField(label, 'N/A'); return; }
    const row = worksheet.addRow([label, '', '', '', 'Ver documento']);
    row.getCell(5).value = { text: 'Ver documento', hyperlink: String(url) };
    row.getCell(5).font = { name: 'Arial', color: { argb: 'FF0563C1' }, underline: true };
    row.getCell(1).font = { name: 'Arial', bold: true };
    [row.getCell(1), row.getCell(5)].forEach(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: leftGray } };
      cell.border = thinBorder;
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
    row.height = 18;
  };

  // Título principal
  worksheet.mergeCells('A1:E1');
  const tcell = worksheet.getCell('A1');
  tcell.value = 'Detalles de la Solicitud de Perfil de Cargo';
  tcell.font = { name: 'Arial', bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  tcell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
  tcell.alignment = { horizontal: 'center', vertical: 'middle' };
  tcell.border = thinBorder;
  worksheet.addRow([]);

  // --- Información General (ejemplo) ---
  addSectionTitle('Información General');
  addField('Fecha', formData.fecha);
  addField('Nombre del Cargo', formData.nombrecargo || formData.nombreCargo);
  addField('Área General', formData.areageneral || formData.area || formData.areaGeneral);
  addField('Departamento', formData.departamento);
  addField('Proceso', formData.proceso);
  addField('Misión del Cargo', formData.misioncargo || formData.misionCargo);
  addField('Jefe Inmediato', formData.jefeinmediato || formData.jefeInmediato);
  addField('Supervisa a', formData.supervisaa || formData.supervisaa);
  addField('Número de Personas a Cargo', formData.numeropersonascargo || formData.numeroPersonasCargo);
  addField('Tipo de Contrato', formData.tipocontrato || formData.tipoContrato);

  worksheet.addRow([]);

  // --- Requisitos del Perfil ---
  addSectionTitle('Requisitos del Perfil');
  addField('Escolaridad', formData.escolaridad);
  addField('Área de Formación', formData.area_formacion || formData.areaFormacion);
  addField('Estudios Complementarios', formData.estudioscomplementarios || formData.estudiosComplementarios);
  addField('Experiencia Necesaria', formData.experiencia);
  addField('Población Focalizada', formData.poblacionfocalizada || formData.poblacionFocalizada);

  worksheet.addRow([]);

  // --- COMPETENCIAS: encabezado estilo de la plantilla con "COMPETENCIAS CARGO" a la izquierda (merge vertical) ---
  // Creamos primera fila vacía que será la izquierda mergeada y contendrá el rótulo
  const leftHeaderRow = worksheet.addRow([]);
  const leftHeaderRowNum = leftHeaderRow.number;
  // Segunda fila: títulos de columnas B..E
  const headerRow = worksheet.addRow(['', 'A (Alto)\n(1)\n(Siempre)', 'B (Bueno)\n(2)\n(Casi siempre)', 'C (Min necesario)\n(3)\n(En ocasiones)', 'Definición']);
  // Merge A of the two header rows to create tall left label
  worksheet.mergeCells(`A${leftHeaderRowNum}:A${headerRow.number}`);
  const leftCell = worksheet.getCell(`A${leftHeaderRowNum}`);
  leftCell.value = 'COMPETENCIAS\nCARGO';
  leftCell.font = { name: 'Arial', bold: true };
  leftCell.alignment = { horizontal: 'center', vertical: 'middle' }; // si deseas rotación: textRotation: 90
  leftCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: leftGray } };
  leftCell.border = thinBorder;
  // Estilo para los encabezados B..E
  headerRow.eachCell((cell, colNumber) => {
    if (colNumber === 1) return; // A ya tratada
    cell.font = { name: 'Arial', bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerGray } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });

  // Obtener competencias (soporta distintos nombres de propiedad)
  const rawComps = formData.competencias_cargo || formData.competenciasCargo || formData.competencias || [];
  const parsedComps = parseToArray(rawComps);

  // Normalizar cada item a { competencia, nivel, definicion }
  const normalizedComps = parsedComps.map(item => {
    if (!item) return null;
    if (typeof item === 'string') {
      // intentar "Nombre - Definición" o "Nombre|nivel|def"
      const byPipe = item.split('|').map(p => p.trim());
      if (byPipe.length >= 3) {
        return { competencia: byPipe[0], nivel: byPipe[1], definicion: byPipe.slice(2).join(' | ') };
      }
      const byDash = item.split(' - ');
      if (byDash.length >= 2) {
        return { competencia: byDash[0].trim(), nivel: null, definicion: byDash.slice(1).join(' - ').trim() };
      }
      return { competencia: item.trim(), nivel: null, definicion: '' };
    }
    if (typeof item === 'object') {
      return {
        competencia: item.competencia || item.nombre || item.label || item.title || '',
        nivel: item.nivel || item.level || item.valor || item.value || null,
        definicion: item.definicion || item.descripcion || item.description || item.def || ''
      };
    }
    return { competencia: String(item), nivel: null, definicion: '' };
  }).filter(Boolean);

  // Escribir filas de competencias: [competencia, '', '', '', definicion] y marcar con 'X' la columna correspondiente
  normalizedComps.forEach(c => {
    const colIdx = nivelToCol(c.nivel); // 2|3|4
    const rowArr = [c.competencia || '', '', '', '', c.definicion || ''];
    if (colIdx) rowArr[colIdx - 1] = 'X'; // marcar con 'X'
    const row = worksheet.addRow(rowArr);
    // Estilo: columna A con ligero color a la izquierda (opcional)
    const aCell = row.getCell(1);
    aCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: leftPurple } };
    aCell.alignment = { wrapText: true, vertical: 'top' };
    [2,3,4].forEach(ci => {
      const ccell = row.getCell(ci);
      ccell.alignment = { horizontal: 'center', vertical: 'top' };
    });
    const defCell = row.getCell(5);
    defCell.alignment = { wrapText: true, vertical: 'top' };
    // bordes y fondo ligero para toda la fila
    row.eachCell({ includeEmpty: true }, cell => {
      cell.border = thinBorder;
      // no rellenar todas las celdas para mantener look similar a la imagen (solo A tiene color)
    });
    row.height = 18;
  });

  // Si no hay competencias, mostrar fila "No aplica"
  if (normalizedComps.length === 0) {
    const nr = worksheet.addRow(['No aplica', '', '', '', 'No hay competencias definidas']);
    nr.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: leftGray } }; c.border = thinBorder; c.alignment = { wrapText: true, vertical: 'top' }; });
    worksheet.addRow([]);
  } else {
    worksheet.addRow([]); // pequeña separación al final de la sección
  }


  const responsibilitiesList = parseToArray(formData.responsabilidades || formData.responsabilidadesList || formData.responsabilidadesArray || []);
  const normalizedResponsibilities = responsibilitiesList.map((r) => {
    if (!r) return null;
    if (typeof r === 'string') {
      // separar "Titulo - Detalle"
      const parts = r.split(' - ');
      return { titulo: parts[0].trim(), detalle: parts.slice(1).join(' - ').trim() };
    }
    if (typeof r === 'object') {
      return { titulo: r.titulo || r.title || r.responsabilidad || '', detalle: r.detalle || r.descripcion || r.description || '' };
    }
    return { titulo: String(r), detalle: '' };
  }).filter(Boolean);

  if (normalizedResponsibilities.length === 0) {
    const nr = worksheet.addRow(['No aplica', '', '', '', 'No hay responsabilidades definidas']);
    nr.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: leftGray } }; c.border = thinBorder; c.alignment = { wrapText: true, vertical: 'top' }; });
    worksheet.addRow([]);
  } else {
    normalizedResponsibilities.forEach((rp, idx) => {
      // encabezado verde RESPONSABILIDAD N (merge A:E)
      const hrow = worksheet.addRow([]);
      worksheet.mergeCells(`A${hrow.number}:E${hrow.number}`);
      const hcell = worksheet.getCell(`A${hrow.number}`);
      hcell.value = `RESPONSABILIDAD ${idx + 1}`;
      hcell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
      hcell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E8B22' } };
      hcell.alignment = { horizontal: 'center', vertical: 'middle' };
      hcell.border = thinBorder;
      hrow.height = 18;

      // descripción: una fila compacta con titulo en A:D y detalle en E
      const drow = worksheet.addRow([rp.titulo || '', '', '', '', rp.detalle || '']);
      worksheet.mergeCells(`A${drow.number}:D${drow.number}`); // titulo en A:D
      const titleCell = worksheet.getCell(`A${drow.number}`);
      const detailCell = worksheet.getCell(`E${drow.number}`);
      titleCell.font = { bold: true };
      [titleCell, detailCell].forEach(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: leftGray } };
        c.border = thinBorder;
        c.alignment = { wrapText: true, vertical: 'top' };
      });
      drow.height = 18;
    });
    worksheet.addRow([]);
  }

  // --- OTROS DATOS ---
  addSectionTitle('OTROS DATOS');
  addField('Cursos/Certificaciones', formData.cursoscertificaciones || formData.cursosCertificaciones);
  addField('Requiere Vehículo', formData.requierevehiculo || formData.requiereVehiculo);
  addField('Tipo de Licencia', formData.tipolicencia || formData.tipoLicencia);
  addField('Idiomas', formData.idiomas);
  addField('Requiere Viajar', formData.requiereviajar || formData.requiereViajar);
  addField('Áreas Relacionadas', formData.areasrelacionadas || formData.areasRelacionadas);
  addField('Relacionamiento Externo', formData.relacionamientoexterno || formData.relacionamientoExterno);

  worksheet.addRow([]);

  // --- DOCUMENTOS ADJUNTOS ---
  addSectionTitle('DOCUMENTOS ADJUNTOS');
  addHyperlinkField('Documento', formData.documento);
  addHyperlinkField('Estructura Organizacional', formData.estructuraorganizacional || formData.estructuraOrganizacional);

  // Asegurar wrapText para todo
  worksheet.eachRow(row => {
    row.eachCell({ includeEmpty: true }, cell => {
      if (!cell.alignment) cell.alignment = { wrapText: true, vertical: 'top' };
    });
  });

  // Generar buffer y devolver attachment
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