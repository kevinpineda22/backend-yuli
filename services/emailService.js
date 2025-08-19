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

  // ---------------- Colores / estilos ----------------
  const COLOR_TITLE = 'FF210D65';
  const COLOR_SECTION = 'FF89DC00';
  const COLOR_HEADER_GRAY = 'FFDCDCDC';
  const COLOR_LEFT_GRAY = 'FFEFEFEF';
  const COLOR_ROW_LIGHT = 'FFF7F7F7';
  const THIN_BORDER = {
    top: { style: 'thin' }, left: { style: 'thin' },
    bottom: { style: 'thin' }, right: { style: 'thin' }
  };

  // Columnas (ultra compactas, solo 3 columnas)
  worksheet.columns = [
    { width: 20 }, // A: etiquetas (reducido de 25)
    { width: 15 }, // B: datos item 1 (reducido de 20)
    { width: 15 }, // C: datos item 2 (reducido de 20)
  ];

  const MAX_ITEM_COL_WIDTH = 20; // Reducido de 25
  const CHAR_PER_COL_UNIT = 2.0; // Aumentado para más texto por línea
  const LINE_HEIGHT = 10; // Reducido de 12
  const COMPACT_ROW_HEIGHT = 10; // Reducido de 12
  const HEADER_ROW_HEIGHT = 25; // Reducido de 30
  const SMALL_HEADER_FONT_SIZE = 7; // Reducido de 8

  // ---------------- Helpers ----------------
  const normalizeText = (s) => {
    if (s === null || s === undefined) return '';
    return String(s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const nivelToCol = (nivel) => {
    if (nivel === null || nivel === undefined) return null;
    const s = normalizeText(String(nivel));
    if (/^\d+$/.test(s)) {
      if (s === '1') return 2;
      if (s === '2') return 3;
      if (s === '3') return 4;
    }
    if (/\balto\b/.test(s) || s === 'a') return 2;
    if (/\bbueno\b/.test(s) || /\bcasi\b/.test(s) || s === 'b') return 3;
    if (/\bmin\b/.test(s) || /\bminimo\b/.test(s) || s === 'c') return 4;
    return null;
  };

  const parseToArray = (raw) => {
    if (raw === null || raw === undefined) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === 'string') {
      const s = raw.trim();
      if (!s) return [];
      if (s.startsWith('[') || s.startsWith('{')) {
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) return parsed.filter(Boolean);
          return [parsed];
        } catch (e) { }
      }
      return s.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    }
    return [raw];
  };

  const estimateLinesForText = (text, colWidth) => {
    if (!text) return 1;
    const charsPerLine = Math.max(8, Math.floor((colWidth || 15) * CHAR_PER_COL_UNIT));
    const len = String(text).length;
    return Math.max(1, Math.ceil(len / charsPerLine));
  };

  // ---------------- UI helpers ----------------
  const addSectionTitle = (text) => {
    const r = worksheet.addRow([]);
    worksheet.mergeCells(`A${r.number}:C${r.number}`);
    const c = worksheet.getCell(`A${r.number}`);
    c.value = text;
    c.font = { name: 'Arial', bold: true, color: { argb: COLOR_TITLE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SECTION } };
    c.alignment = { horizontal: 'left', vertical: 'middle' };
    c.border = THIN_BORDER;
    worksheet.getRow(r.number).height = 14; // Reducido de 16
  };

  const addField = (label, value) => {
    const safe = (value === undefined || value === null || value === '') ? 'N/A' : value;
    const r = worksheet.addRow([label, safe, '']);
    worksheet.mergeCells(`B${r.number}:C${r.number}`);
    const labelCell = r.getCell(1);
    const valueCell = r.getCell(2);
    labelCell.font = { bold: true };
    [labelCell, valueCell].forEach(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
      cell.border = THIN_BORDER;
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
    const lines = estimateLinesForText(safe, worksheet.getColumn(2).width);
    r.height = Math.max(COMPACT_ROW_HEIGHT, lines * LINE_HEIGHT);
  };

  const addHyperlink = (label, url) => {
    if (!url) { addField(label, 'N/A'); return; }
    const r = worksheet.addRow([label, 'Ver documento', '']);
    worksheet.mergeCells(`B${r.number}:C${r.number}`);
    r.getCell(2).value = { text: 'Ver documento', hyperlink: String(url) };
    r.getCell(2).font = { name: 'Arial', color: { argb: 'FF0563C1' }, underline: true };
    [r.getCell(1), r.getCell(2)].forEach(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
      cell.border = THIN_BORDER;
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
    r.height = COMPACT_ROW_HEIGHT;
  };

  const writeLabelRow = (labelText) => {
    const r = worksheet.addRow([]);
    const rn = r.number;
    const left = worksheet.getCell(`A${rn}`);
    left.value = labelText;
    left.font = { name: 'Arial', bold: true };
    left.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
    left.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
    left.border = THIN_BORDER;
    return rn;
  };

  const writeItemsHorizontal = (startRow, items) => {
    const maxCols = 2; // B,C
    let idx = 0;
    let currentRow = startRow;
    while (idx < items.length) {
      let maxLinesThisRow = 1;
      for (let cOff = 0; cOff < maxCols && idx < items.length; cOff++, idx++) {
        const colIndex = 2 + cOff; // B=2
        const text = String(items[idx]);
        const cell = worksheet.getCell(currentRow, colIndex);
        cell.value = text; // Sin numeración
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
        cell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
        cell.border = THIN_BORDER;
        const lines = estimateLinesForText(text, worksheet.getColumn(colIndex).width);
        if (lines > maxLinesThisRow) maxLinesThisRow = lines;
      }
      worksheet.getRow(currentRow).height = Math.max(15, maxLinesThisRow * LINE_HEIGHT);
      if (idx < items.length) {
        const nextR = worksheet.addRow([]);
        const nextRN = nextR.number;
        const cell = worksheet.getCell(nextRN, 1);
        cell.value = '';
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
        cell.border = THIN_BORDER;
        cell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
        currentRow = nextRN;
      }
    }
  };

  const writeSingleBox = (rowNum, text) => {
    worksheet.mergeCells(`B${rowNum}:C${rowNum}`);
    const boxCell = worksheet.getCell(`B${rowNum}`);
    boxCell.value = text === undefined || text === null ? '' : String(text);
    boxCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
    boxCell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
    for (let cc = 2; cc <= 3; cc++) {
      const c = worksheet.getCell(rowNum, cc);
      c.border = THIN_BORDER;
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
      c.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
    }
    const effectiveWidth = Math.min(MAX_ITEM_COL_WIDTH, worksheet.getColumn(2).width || 15) * 2;
    const lines = estimateLinesForText(boxCell.value, effectiveWidth);
    worksheet.getRow(rowNum).height = Math.max(15, lines * LINE_HEIGHT);
  };

  // ---------------- TÍTULO PRINCIPAL ----------------
  worksheet.mergeCells('A1:C1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'INFORMACIÓN DEL PERFIL';
  titleCell.font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TITLE } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border = THIN_BORDER;
  worksheet.getRow(1).height = 14;

  worksheet.addRow([]).height = 3;

  // ---------------- INFORMACIÓN GENERAL ----------------
  addSectionTitle('INFORMACIÓN GENERAL');
  addField('Nombre del cargo', formData.nombrecargo || formData.nombreCargo);
  addField('Área', formData.areageneral || formData.area || formData.areaGeneral);
  addField('Departamento', formData.departamento);
  addField('Proceso', formData.proceso);
  addHyperlink('Estructura organizacional', formData.estructuraorganizacional || formData.estructuraOrganizacional);

  const poblacionOptions = ['Discapacidad', 'Víctimas del conflicto', 'Migrantes venezolanos'];
  const poblacionRaw = formData.poblacionfocalizada || formData.poblacionFocalizada || formData.poblacion || [];
  const poblacionArr = parseToArray(poblacionRaw).map(x => normalizeText(x));
  const noneSelected = poblacionArr.length === 0 || poblacionArr.some(v => /^(ninguna|no|n\/a|na)$/i.test(v));
  const selectedOptions = noneSelected ? [] : poblacionOptions.filter(opt => poblacionArr.includes(normalizeText(opt)));
  const displayPoblacion = selectedOptions.length > 0 ? selectedOptions.join(', ') : 'Ninguna';
  addField('Población focalizada', displayPoblacion);

  addField('Escolaridad', formData.escolaridad || formData.escolaridadActual);
  addField('Área de formación', formData.area_formacion || formData.areaFormacion);
  addField('Estudios complementarios', formData.estudioscomplementarios || formData.estudiosComplementarios);
  addField('Experiencia', formData.experiencia || formData.experienciaNecesaria);
  addField('Jefe Inmediato', formData.jefeinmediato || formData.jefeInmediato);
  addField('Supervisa a', formData.supervisaa || formData.supervisaa);
  addField('Personas a cargo', formData.numeropersonascargo || formData.numeroPersonasCargo);
  addField('Tipo de contrato', formData.tipocontrato || formData.tipoContrato);

  worksheet.addRow([]).height = 3;

  // ---------------- DESCRIPCIÓN DEL CARGO ----------------
  addSectionTitle('DESCRIPCIÓN DEL CARGO');
  addField('Misión del cargo', formData.misioncargo || formData.misionDelCargo || formData.mision);
  addField('Conocimientos técnicos', formData.conocimientos || formData.conocimientosTecnicos);
  addField('Cursos/certificaciones', formData.cursoscertificaciones || formData.cursosCertificaciones || 'N/A');
  addField('¿Requiere vehículo?', formData.requierevehiculo || formData.requiereVehiculo || 'N/A');
  addField('Tipo de licencia', formData.tipolicencia || formData.tipoLicencia || 'N/A');
  addField('Idiomas', formData.idiomas || 'N/A');
  addField('Requiere viajar', formData.requiereviajar || formData.requiereViajar || 'N/A');
  addField('Áreas relacionadas', formData.areasRelacionadas || formData.areasrelacionadas || 'N/A');
  addField('Relacionamiento externo', formData.relacionamientoexterno || formData.relacionamientoExterno || 'N/A');

  worksheet.addRow([]).height = 3;

  // ---------------- COMPETENCIAS REQUERIDAS ----------------
  const compTitleRow = worksheet.addRow([]);
  worksheet.mergeCells(`A${compTitleRow.number}:C${compTitleRow.number}`);
  const compTitleCell = worksheet.getCell(`A${compTitleRow.number}`);
  compTitleCell.value = 'COMPETENCIAS REQUERIDAS';
  compTitleCell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
  compTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SECTION } };
  compTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  compTitleCell.border = THIN_BORDER;
  worksheet.getRow(compTitleRow.number).height = 14;

  const writeCompetencyBlockHeader = (leftLabel) => {
    const topRow = worksheet.addRow([]);
    const headerRow = worksheet.addRow(['', 'A (1)', 'B (2)', 'C (3)']);
    worksheet.mergeCells(`A${topRow.number}:A${headerRow.number}`);
    const leftCell = worksheet.getCell(`A${topRow.number}`);
    leftCell.value = leftLabel;
    leftCell.font = { name: 'Arial', bold: true };
    leftCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_LEFT_GRAY } };
    leftCell.alignment = { horizontal: 'center', vertical: 'middle' };
    leftCell.border = THIN_BORDER;

    headerRow.eachCell((cell, colNumber) => {
      if (colNumber === 1) return;
      cell.font = { bold: true, size: SMALL_HEADER_FONT_SIZE };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_GRAY } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = THIN_BORDER;
    });
    worksheet.getRow(topRow.number).height = HEADER_ROW_HEIGHT;
    worksheet.getRow(headerRow.number).height = HEADER_ROW_HEIGHT;
  };

  const writeCompetencyRows = (rawList) => {
    const parsed = parseToArray(rawList);
    const normalized = parsed.map(item => {
      if (typeof item === 'string') {
        const parts = item.split(' - ');
        return { competencia: parts[0].trim(), nivel: null, definicion: parts.slice(1).join(' - ').trim() };
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

    if (normalized.length === 0) {
      const r = worksheet.addRow(['', '', '', '']);
      r.eachCell(c => { c.border = THIN_BORDER; c.alignment = { wrapText: true, vertical: 'top' }; });
      r.height = COMPACT_ROW_HEIGHT;
      return;
    }

    normalized.forEach(c => {
      const nivelRaw = c.nivel !== undefined && c.nivel !== null ? String(c.nivel) : '';
      const colIndex = nivelToCol(nivelRaw);
      const rowArr = [c.competencia || '', '', '', c.definicion || ''];
      if (colIndex === 2) rowArr[1] = 'X';
      else if (colIndex === 3) rowArr[2] = 'X';
      else if (colIndex === 4) rowArr[3] = 'X';
      const r = worksheet.addRow(rowArr);
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
      r.getCell(1).alignment = { wrapText: true, vertical: 'top' };
      [2, 3].forEach(ci => r.getCell(ci).alignment = { horizontal: 'center', vertical: 'top' });
      r.getCell(4).alignment = { wrapText: true, vertical: 'top' };
      r.eachCell({ includeEmpty: true }, cell => { cell.border = THIN_BORDER; });
      r.height = COMPACT_ROW_HEIGHT;
    });

    worksheet.addRow([]).height = 3;
  };

  writeCompetencyBlockHeader('COMPETENCIAS CULTURALES');
  writeCompetencyRows(formData.competencias_culturales || formData.competenciasCulturales || []);
  writeCompetencyBlockHeader('COMPETENCIAS CARGO');
  writeCompetencyRows(formData.competencias_cargo || formData.competenciasCargo || formData.competencias || []);

  worksheet.addRow([]).height = 3;

  // ---------------- RESPONSABILIDADES ----------------
  const rawResp = formData.responsabilidades || formData.responsabilidadesList || formData.responsabilidadesArray || [];
  const parsedResp = parseToArray(rawResp);
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
    const r = worksheet.addRow(['No aplica', 'No hay responsabilidades definidas', '']);
    worksheet.mergeCells(`B${r.number}:C${r.number}`);
    r.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } }; c.border = THIN_BORDER; c.alignment = { wrapText: true, vertical: 'top' }; });
    r.height = COMPACT_ROW_HEIGHT;
  } else {
    normResp.forEach((rp, idx) => {
      const hr = worksheet.addRow([]);
      worksheet.mergeCells(`A${hr.number}:C${hr.number}`);
      const hc = worksheet.getCell(`A${hr.number}`);
      hc.value = `RESPONSABILIDAD ${idx + 1}`;
      hc.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      hc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E8B22' } };
      hc.alignment = { horizontal: 'center', vertical: 'middle' };
      hc.border = THIN_BORDER;
      worksheet.getRow(hr.number).height = 12;

      const dr = worksheet.addRow([rp.titulo || '', rp.detalle || '', '']);
      worksheet.mergeCells(`B${dr.number}:C${dr.number}`);
      const titleCellRow = worksheet.getCell(`A${dr.number}`);
      const detailCellRow = worksheet.getCell(`B${dr.number}`);
      titleCellRow.font = { bold: true };
      [titleCellRow, detailCellRow].forEach(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
        c.border = THIN_BORDER;
        c.alignment = { wrapText: true, vertical: 'top' };
      });
      const lines = estimateLinesForText(rp.detalle || '', worksheet.getColumn(2).width);
      worksheet.getRow(dr.number).height = Math.max(COMPACT_ROW_HEIGHT, lines * LINE_HEIGHT);
    });
  }

  worksheet.addRow([]).height = 3;

  // ---------------- COMPLEMENTARIO ----------------
  const compHeaderRow = worksheet.addRow([]);
  worksheet.mergeCells(`A${compHeaderRow.number}:C${compHeaderRow.number}`);
  const compHdrCell = worksheet.getCell(`A${compHeaderRow.number}`);
  compHdrCell.value = 'COMPLEMENTARIO';
  compHdrCell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
  compHdrCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SECTION } };
  compHdrCell.alignment = { horizontal: 'center', vertical: 'middle' };
  compHdrCell.border = THIN_BORDER;
  worksheet.getRow(compHeaderRow.number).height = 14;

  const entrenamientoItems = parseToArray(formData.plan_entrenamiento || formData.planEntrenamiento || []);
  const rn_ent = writeLabelRow('Plan de Entrenamiento');
  if (entrenamientoItems.length > 0) writeItemsHorizontal(rn_ent, entrenamientoItems);
  else writeSingleBox(rn_ent, 'N/A');

  const capacitacionItems = parseToArray(formData.plan_capacitacion_continua || formData.planCapacitacionContinua || []);
  const rn_cap = writeLabelRow('Plan de Capacitación');
  if (capacitacionItems.length > 0) writeItemsHorizontal(rn_cap, capacitacionItems);
  else writeSingleBox(rn_cap, 'N/A');

  const carreraItems = parseToArray(formData.plan_carrera || formData.planCarrera || []);
  const rn_car = writeLabelRow('Plan Carrera');
  if (carreraItems.length > 0) writeSingleBox(rn_car, carreraItems.join('\n'));
  else writeSingleBox(rn_car, 'N/A');

  const compIngresoItems = parseToArray(formData.competencias_desarrollo_ingreso || formData.competenciasDesarrolloIngreso || []);
  const rn_comp = writeLabelRow('Competencias de Ingreso');
  if (compIngresoItems.length > 0) writeSingleBox(rn_comp, compIngresoItems.join('\n'));
  else writeSingleBox(rn_comp, 'N/A');

  worksheet.addRow([]).height = 3;

  // Asegurar wrapText/alineación global
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
                      <p style="margin:0 0 10px 0;"><strong>Descripción:</strong> ${formData.misioncargo || 'No definido'}</p>
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