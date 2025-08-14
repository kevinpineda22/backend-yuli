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

  // ----- Configuración de colores / estilos -----
  const colorTitle = 'FF210D65';      // azul título
  const colorSection = 'FF89DC00';    // verde secciones
  const headerGray = 'FFDCDCDC';      // header of small tables
  const leftGray = 'FFEFEFEF';        // left label background
  const rowLight = 'FFF7F7F7';        // light row background for content
  const thinBorder = {
    top: { style: 'thin' }, left: { style: 'thin' },
    bottom: { style: 'thin' }, right: { style: 'thin' }
  };

  // Column widths: A (label/competencia) | B | C | D | E (definición / valor)
  worksheet.columns = [
    { width: 36 }, // A
    { width: 10 }, // B (A Alto)
    { width: 10 }, // C (B Bueno)
    { width: 12 }, // D (C Min)
    { width: 72 }  // E (Definición / contenido)
  ];

  // ----- Helpers -----
  const normalizeText = (s) => {
    if (s === null || s === undefined) return '';
    return String(s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Devuelve la columna (1-based) para marcar: 2 => columna B (A Alto), 3 => C (Bueno), 4 => D (Min)
  const nivelToCol = (nivel) => {
    if (nivel === null || nivel === undefined) return null;
    const s = normalizeText(nivel);
    if (/^\d+$/.test(s)) {
      if (s === '1') return 2;
      if (s === '2') return 3;
      if (s === '3') return 4;
    }
    if (s === 'a' || s === 'alto' || s.includes('alto')) return 2;
    if (s === 'b' || s === 'bueno' || s.includes('bueno') || s.includes('casi')) return 3;
    if (s === 'c' || s.includes('min') || s.includes('minimo') || s.includes('ocasiones') || s.includes('en ocasiones')) return 4;
    return null;
  };

  // Parse a array: acepta array, JSON string, or newline-separated string
  const parseToArray = (raw) => {
    if (raw === null || raw === undefined) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === 'string') {
      const s = raw.trim();
      if (!s) return [];
      // JSON possible
      if (s.startsWith('[') || s.startsWith('{')) {
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) return parsed.filter(Boolean);
          return [parsed];
        } catch (e) {
          // fallback to split by lines
        }
      }
      return s.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    }
    // other values -> single-element array
    return [raw];
  };

  // encabezado principal
  worksheet.mergeCells('A1:E1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'DETALLES - SOLICITUD PERFIL DE CARGO';
  titleCell.font = { name: 'Arial', bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorTitle } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border = thinBorder;
  worksheet.addRow([]);

  const addSectionTitle = (text) => {
    const r = worksheet.addRow([]);
    worksheet.mergeCells(`A${r.number}:E${r.number}`);
    const c = worksheet.getCell(`A${r.number}`);
    c.value = text;
    c.font = { name: 'Arial', bold: true, color: { argb: colorTitle } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorSection } };
    c.alignment = { horizontal: 'left', vertical: 'middle' };
    c.border = thinBorder;
    worksheet.addRow([]); // small separation
  };

  const addField = (label, value) => {
    const safe = (value === undefined || value === null || value === '') ? 'N/A' : value;
    const row = worksheet.addRow([label, '', '', '', safe]);
    const labelCell = row.getCell(1);
    const valueCell = row.getCell(5);
    labelCell.font = { bold: true };
    [labelCell, valueCell].forEach(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowLight } };
      cell.border = thinBorder;
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
    row.height = 18;
  };

  const addHyperlink = (label, url) => {
    if (!url) {
      addField(label, 'N/A');
      return;
    }
    const row = worksheet.addRow([label, '', '', '', 'Ver documento']);
    row.getCell(5).value = { text: 'Ver documento', hyperlink: String(url) };
    row.getCell(5).font = { name: 'Arial', color: { argb: 'FF0563C1' }, underline: true };
    [row.getCell(1), row.getCell(5)].forEach(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowLight } };
      cell.border = thinBorder;
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
    row.height = 18;
  };

  // ---------------- Sección: Información General ----------------
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

  // ---------------- Sección: Requisitos del Perfil ----------------
  addSectionTitle('Requisitos del Perfil');
  addField('Escolaridad', formData.escolaridad);
  addField('Área de Formación', formData.area_formacion || formData.areaFormacion);
  addField('Estudios Complementarios', formData.estudioscomplementarios || formData.estudiosComplementarios);
  addField('Experiencia Necesaria', formData.experiencia);
  addField('Población Focalizada', formData.poblacionfocalizada || formData.poblacionFocalizada);
  worksheet.addRow([]);

// ---------------- OTROS DATOS ----------------
  addSectionTitle('OTROS DATOS');
  addField('Cursos/Certificaciones', formData.cursoscertificaciones || formData.cursosCertificaciones);
  addField('Requiere Vehículo', formData.requierevehiculo || formData.requiereVehiculo);
  addField('Tipo de Licencia', formData.tipolicencia || formData.tipoLicencia);
  addField('Idiomas', formData.idiomas);
  addField('Requiere Viajar', formData.requiereviajar || formData.requiereViajar);
  addField('Áreas Relacionadas', formData.areasrelacionadas || formData.areasRelacionadas);
  addField('Relacionamiento Externo', formData.relacionamientoexterno || formData.relacionamientoExterno);
  worksheet.addRow([]);

  // ---------------- DOCUMENTOS ADJUNTOS ----------------
  addSectionTitle('DOCUMENTOS ADJUNTOS');
  addHyperlink('Documento', formData.documento);
  addHyperlink('Estructura Organizacional', formData.estructuraorganizacional || formData.estructuraOrganizacional);
  worksheet.addRow([]);

  // ---------------- Sección: COMPETENCIAS (diseño solicitado) ----------------
  // Título sección
  const compTitleRow = worksheet.addRow([]);
  worksheet.mergeCells(`A${compTitleRow.number}:E${compTitleRow.number}`);
  const compTitleCell = worksheet.getCell(`A${compTitleRow.number}`);
  compTitleCell.value = 'COMPETENCIAS REQUERIDAS';
  compTitleCell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
  compTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorSection } };
  compTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  compTitleCell.border = thinBorder;
  worksheet.addRow([]);

  // Function to write table header like in your image (with left merged label above later)
  const writeCompetencyBlockHeader = (leftLabel) => {
    // create a blank top row that will be merged on the left (to create tall label)
    const topRow = worksheet.addRow([]);
    const topRowNumber = topRow.number;
    // header for columns B..E in next row
    const header = worksheet.addRow(['', 'A\n(Alto)\n(1)\n(Siempre)', 'B\n(Bueno)\n(2)\n(Casi siempre)', 'C\n(Mín necesario)\n(3)\n(En ocasiones)', 'Definición']);
    // Merge left cell across both rows: A{topRow}:A{headerRow}
    worksheet.mergeCells(`A${topRowNumber}:A${header.number}`);
    const leftCell = worksheet.getCell(`A${topRowNumber}`);
    leftCell.value = leftLabel;
    leftCell.font = { name: 'Arial', bold: true };
    leftCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: leftGray } };
    leftCell.alignment = { horizontal: 'center', vertical: 'middle' };
    leftCell.border = thinBorder;

    // style header cells B..E
    header.eachCell((cell, colNumber) => {
      if (colNumber === 1) return;
      cell.font = { name: 'Arial', bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerGray } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;
    });

    return { topRowNumber, headerRowNumber: header.number };
  };

  // Writes a competency list under last header written (uses top header leftLabel already added)
  const writeCompetencyRows = (rawList) => {
    const parsed = parseToArray(rawList);
    // Accept array of objects {competencia, nivel, definicion} or strings like "Nombre - Definicion"
    const normalized = parsed.map(item => {
      if (typeof item === 'string') {
        // try "Nombre - Definición"
        const parts = item.split(' - ');
        return {
          competencia: parts[0].trim(),
          nivel: null,
          definicion: parts.slice(1).join(' - ').trim()
        };
      }
      if (typeof item === 'object') {
        return {
          competencia: item.competencia || item.nombre || item.label || '',
          nivel: item.nivel || item.level || item.valor || item.value || null,
          definicion: item.definicion || item.descripcion || item.description || item.def || ''
        };
      }
      return { competencia: String(item), nivel: null, definicion: '' };
    }).filter(Boolean);

    if (normalized.length === 0) {
      const r = worksheet.addRow(['', '', '', '', '']); // keep rows for visual (empty)
      r.eachCell(c => { c.border = thinBorder; c.alignment = { wrapText: true, vertical: 'top' }; });
      // add a couple of empty rows to keep formatting consistent
      worksheet.addRow([]);
      worksheet.addRow([]);
      return;
    }

    // For each competency write a row: [competencia, '', '', '', definicion], mark X in correct column
    normalized.forEach(c => {
      const colIndex = nivelToCol(c.nivel);
      const rowArr = [c.competencia || '', '', '', '', c.definicion || ''];
      if (colIndex) {
        rowArr[colIndex - 1] = 'X';
      }
      const r = worksheet.addRow(rowArr);
      // style left cell lightly and definition wrap
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowLight } };
      r.getCell(1).alignment = { wrapText: true, vertical: 'top' };
      [2,3,4].forEach(ci => {
        const cell = r.getCell(ci);
        cell.alignment = { horizontal: 'center', vertical: 'top' };
      });
      r.getCell(5).alignment = { wrapText: true, vertical: 'top' };
      r.eachCell({ includeEmpty: true }, cell => {
        cell.border = thinBorder;
      });
      r.height = 18;
    });
    // small separation after block
    worksheet.addRow([]);
  };

  // Competencias culturales block
  writeCompetencyBlockHeader('COMPETENCIAS\nCULTURALES');
  writeCompetencyRows(formData.competencias_culturales || formData.competenciasCulturales || []);

  // Competencias del cargo block
  writeCompetencyBlockHeader('COMPETENCIAS\nCARGO');
  writeCompetencyRows(formData.competencias_cargo || formData.competenciasCargo || formData.competencias || []);

  // ---------------- RESPONSABILIDADES (compacto, por responsabilidad) ----------------
  addSectionTitle('RESPONSABILIDADES');
  const rawResp = formData.responsabilidades || formData.responsabilidadesList || formData.responsabilidadesArray || formData.responsabilidades || [];
  const parsedResp = parseToArray(rawResp);

  // normalize resp: support "Titulo - Detalle" or objects {titulo, detalle}
  const normResp = parsedResp.map(r => {
    if (typeof r === 'string') {
      const parts = r.split(' - ');
      return { titulo: parts[0].trim(), detalle: parts.slice(1).join(' - ').trim() };
    }
    if (typeof r === 'object') {
      return { titulo: r.titulo || r.title || r.responsabilidad || r.nombre || '', detalle: r.detalle || r.descripcion || r.description || r.detalle || '' };
    }
    return { titulo: String(r), detalle: '' };
  }).filter(Boolean);

  if (normResp.length === 0) {
    const r = worksheet.addRow(['No aplica', '', '', '', 'No hay responsabilidades definidas']);
    r.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowLight } }; c.border = thinBorder; c.alignment = { wrapText: true, vertical: 'top' }; });
    worksheet.addRow([]);
  } else {
    normResp.forEach((rp, idx) => {
      // header green merged
      const hr = worksheet.addRow([]);
      worksheet.mergeCells(`A${hr.number}:E${hr.number}`);
      const hc = worksheet.getCell(`A${hr.number}`);
      hc.value = `RESPONSABILIDAD ${idx + 1}`;
      hc.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      hc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E8B22' } };
      hc.alignment = { horizontal: 'center', vertical: 'middle' };
      hc.border = thinBorder;
      hr.height = 18;

      // description row: merge A:D for title and E for detail
      const dr = worksheet.addRow([rp.titulo || '', '', '', '', rp.detalle || '']);
      worksheet.mergeCells(`A${dr.number}:D${dr.number}`);
      const titleCellRow = worksheet.getCell(`A${dr.number}`);
      const detailCellRow = worksheet.getCell(`E${dr.number}`);
      titleCellRow.font = { bold: true };
      [titleCellRow, detailCellRow].forEach(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowLight } };
        c.border = thinBorder;
        c.alignment = { wrapText: true, vertical: 'top' };
      });
      dr.height = 18;
    });
    worksheet.addRow([]);
  }

  // wrapText/align safety across all cells
  worksheet.eachRow(row => {
    row.eachCell({ includeEmpty: true }, cell => {
      if (!cell.alignment) cell.alignment = { wrapText: true, vertical: 'top' };
    });
  });

  // write buffer and return email attachment object
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