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

  // Columnas (ajustadas para que headers A/B/C entren)
  worksheet.columns = [
    { width: 36 }, // A: etiqueta/competencia
    { width: 14 }, // B (A Alto)
    { width: 14 }, // C (B Bueno)
    { width: 16 }, // D (C Min)
    { width: 80 }  // E (Definición / contenido)
  ];

  const COMPACT_ROW_HEIGHT = 14;
  const HEADER_ROW_HEIGHT = 34; // alto del header para que se vean las líneas
  const SMALL_HEADER_FONT_SIZE = 9;

  // ---------------- Helpers ----------------
  const normalizeText = (s) => {
    if (s === null || s === undefined) return '';
    return String(s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // quita acentos
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Detección robusta del nivel -> devuelve 2|3|4 (columnas B,C,D) o null
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
    if (/\bmin\b/.test(s) || /\bminimo\b/.test(s) || /\bminimo necesario\b/.test(s) || /\bmin necesario\b/.test(s) || /\bocasiones\b/.test(s) || /\ben ocasiones\b/.test(s) || s === 'c') return 4;

    return null;
  };

  // parse array / JSON-string / newline separated
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
        } catch (e) {
          // fallback
        }
      }
      return s.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    }
    return [raw];
  };

  // compact helpers
  const addSectionTitle = (text) => {
    const r = worksheet.addRow([]);
    worksheet.mergeCells(`A${r.number}:E${r.number}`);
    const c = worksheet.getCell(`A${r.number}`);
    c.value = text;
    c.font = { name: 'Arial', bold: true, color: { argb: COLOR_TITLE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SECTION } };
    c.alignment = { horizontal: 'left', vertical: 'middle' };
    c.border = THIN_BORDER;
    worksheet.getRow(r.number).height = 18;
  };

  const addField = (label, value) => {
    const safe = (value === undefined || value === null || value === '') ? 'N/A' : value;
    const r = worksheet.addRow([label, '', '', '', safe]);
    r.getCell(1).font = { bold: true };
    [r.getCell(1), r.getCell(5)].forEach(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
      cell.border = THIN_BORDER;
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
    r.height = COMPACT_ROW_HEIGHT;
  };

  const addHyperlink = (label, url) => {
    if (!url) { addField(label, 'N/A'); return; }
    const r = worksheet.addRow([label, '', '', '', 'Ver documento']);
    r.getCell(5).value = { text: 'Ver documento', hyperlink: String(url) };
    r.getCell(5).font = { name: 'Arial', color: { argb: 'FF0563C1' }, underline: true };
    [r.getCell(1), r.getCell(5)].forEach(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
      cell.border = THIN_BORDER;
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
    r.height = COMPACT_ROW_HEIGHT;
  };

  // ---------------- TÍTULO PRINCIPAL ----------------
  worksheet.mergeCells('A1:E1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'INFORMACIÓN DEL PERFIL - SOLICITUD';
  titleCell.font = { name: 'Arial', bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TITLE } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border = THIN_BORDER;
  worksheet.getRow(1).height = 18;

  worksheet.addRow([]).height = 4;

  // ---------------- INFORMACIÓN GENERAL ----------------
  addSectionTitle('INFORMACIÓN GENERAL');

  addField('Nombre del cargo', formData.nombrecargo || formData.nombreCargo);
  addField('Área', formData.areageneral || formData.area || formData.areaGeneral);
  addField('Departamento', formData.departamento);
  addField('Proceso al que pertenece', formData.proceso);
  addHyperlink('Estructura organizacional', formData.estructuraorganizacional || formData.estructuraOrganizacional);

  // POBLACIÓN FOCALIZADA: mostrar en la misma fila solo las opciones seleccionadas o 'Ninguna'
  const poblacionOptions = ['Discapacidad', 'Victimas del conflicto', 'Migrantes venezolanos'];
  const poblacionRaw = formData.poblacionfocalizada || formData.poblacionFocalizada || formData.poblacion || [];
  const poblacionArr = parseToArray(poblacionRaw).map(x => normalizeText(x));
  const noneSelected = poblacionArr.length === 0 || poblacionArr.some(v => /^(ninguna|no|n\/a|na)$/i.test(v));
  const selectedOptions = noneSelected ? [] : poblacionOptions.filter(opt => poblacionArr.includes(normalizeText(opt)));
  const displayPoblacion = selectedOptions.length > 0 ? selectedOptions.join(', ') : 'Ninguna';
  addField('Población focalizada', displayPoblacion);

  addField('Escolaridad', formData.escolaridad || formData.escolaridadActual);
  addField('Área de formación', formData.area_formacion || formData.areaFormacion);
  addField('Estudios complementarios (Cursos, ...)', formData.estudioscomplementarios || formData.estudiosComplementarios);
  addField('Experiencia necesaria', formData.experiencia || formData.experienciaNecesaria);
  addField('Jefe Inmediato', formData.jefeinmediato || formData.jefeInmediato);
  addField('Supervisa a', formData.supervisaa || formData.supervisaa);
  addField('Número de personas a cargo', formData.numeropersonascargo || formData.numeroPersonasCargo);
  addField('Tipo de contrato', formData.tipocontrato || formData.tipoContrato);

  worksheet.addRow([]).height = 6;

  // ---------------- DESCRIPCIÓN DEL CARGO ----------------
  addSectionTitle('DESCRIPCIÓN DEL CARGO');

  addField('Misión del cargo (Necesidad real del cargo)', formData.misioncargo || formData.misionDelCargo || formData.mision);
  addField('Conocimientos técnicos o específicos', formData.conocimientos || formData.conocimientosTecnicos || formData.conocimientosTecnicosEspecificos);
  addField('Cursos o certificaciones', formData.cursoscertificaciones || formData.cursosCertificaciones || 'N/A');
  addField('¿Requiere vehículo?', formData.requierevehiculo || formData.requiereVehiculo || 'N/A');
  addField('Tipo de licencia', formData.tipolicencia || formData.tipoLicencia || 'N/A');
  addField('Idiomas ¿cuál?', formData.idiomas || 'N/A');
  addField('Requiere viajar o entre sedes', formData.requiereviajar || formData.requiereViajar || 'N/A');
  addField('Áreas con las cuales se relaciona el cargo (internas)', formData.areasRelacionadas || formData.areasrelacionadas || formData.relacionInterna || 'N/A');
  addField('Relacionamiento externo (proveedores, clientes, entidades)', formData.relacionamientoexterno || formData.relacionamientoExterno || 'N/A');

  worksheet.addRow([]).height = 6;

  // ---------------- COMPETENCIAS REQUERIDAS ----------------
  const compTitleRow = worksheet.addRow([]);
  worksheet.mergeCells(`A${compTitleRow.number}:E${compTitleRow.number}`);
  const compTitleCell = worksheet.getCell(`A${compTitleRow.number}`);
  compTitleCell.value = 'COMPETENCIAS REQUERIDAS';
  compTitleCell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
  compTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SECTION } };
  compTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  compTitleCell.border = THIN_BORDER;
  worksheet.getRow(compTitleRow.number).height = 18;

  const writeCompetencyBlockHeader = (leftLabel) => {
    const topRow = worksheet.addRow([]);
    const headerRow = worksheet.addRow([
      '',
      'A\n(Alto)\n(1)\n(Siempre)',
      'B\n(Bueno)\n(2)\n(Casi siempre)',
      'C\n(Mín necesario)\n(3)\n(En ocasiones)',
      'Definición'
    ]);

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

  // escribe filas de competencias y marca X en la columna correcta
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
      const r = worksheet.addRow(['', '', '', '', '']);
      r.eachCell(c => { c.border = THIN_BORDER; c.alignment = { wrapText: true, vertical: 'top' }; });
      r.height = COMPACT_ROW_HEIGHT;
      return;
    }

    normalized.forEach(c => {
      const nivelRaw = c.nivel !== undefined && c.nivel !== null ? String(c.nivel) : '';
      const colIndex = nivelToCol(nivelRaw); // 2|3|4 o null
      const rowArr = [c.competencia || '', '', '', '', c.definicion || ''];
      if (colIndex === 2) rowArr[1] = 'X';
      else if (colIndex === 3) rowArr[2] = 'X';
      else if (colIndex === 4) rowArr[3] = 'X';
      const r = worksheet.addRow(rowArr);
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
      r.getCell(1).alignment = { wrapText: true, vertical: 'top' };
      [2, 3, 4].forEach(ci => r.getCell(ci).alignment = { horizontal: 'center', vertical: 'top' });
      r.getCell(5).alignment = { wrapText: true, vertical: 'top' };
      r.eachCell({ includeEmpty: true }, cell => { cell.border = THIN_BORDER; });
      r.height = COMPACT_ROW_HEIGHT;
    });

    worksheet.addRow([]).height = 6;
  };

  // Competencias culturales
  writeCompetencyBlockHeader('COMPETENCIAS\nCULTURALES');
  writeCompetencyRows(formData.competencias_culturales || formData.competenciasCulturales || []);

  // Competencias del cargo
  writeCompetencyBlockHeader('COMPETENCIAS\nCARGO');
  writeCompetencyRows(formData.competencias_cargo || formData.competenciasCargo || formData.competencias || []);

  worksheet.addRow([]).height = 6;

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
    const r = worksheet.addRow(['No aplica', '', '', '', 'No hay responsabilidades definidas']);
    r.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } }; c.border = THIN_BORDER; c.alignment = { wrapText: true, vertical: 'top' }; });
    r.height = COMPACT_ROW_HEIGHT;
  } else {
    normResp.forEach((rp, idx) => {
      const hr = worksheet.addRow([]);
      worksheet.mergeCells(`A${hr.number}:E${hr.number}`);
      const hc = worksheet.getCell(`A${hr.number}`);
      hc.value = `RESPONSABILIDAD ${idx + 1}`;
      hc.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      hc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E8B22' } };
      hc.alignment = { horizontal: 'center', vertical: 'middle' };
      hc.border = THIN_BORDER;
      worksheet.getRow(hr.number).height = 16;

      const dr = worksheet.addRow([rp.titulo || '', '', '', '', rp.detalle || '']);
      worksheet.mergeCells(`A${dr.number}:D${dr.number}`);
      const titleCellRow = worksheet.getCell(`A${dr.number}`);
      const detailCellRow = worksheet.getCell(`E${dr.number}`);
      titleCellRow.font = { bold: true };
      [titleCellRow, detailCellRow].forEach(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
        c.border = THIN_BORDER;
        c.alignment = { wrapText: true, vertical: 'top' };
      });
      worksheet.getRow(dr.number).height = COMPACT_ROW_HEIGHT + 4;
    });
  }

  worksheet.addRow([]).height = 6;


   // ---------------- COMPLEMENTARIO (layout especifico para imagen) ----------------
  addSectionTitle('COMPLEMENTARIO');

  // Helper específico para fila: izquierda A:C (etiqueta), D columna separadora, E contenido/detalle
  const addComplementSplitRow = (leftLabel, rightValue, opts = {}) => {
    const r = worksheet.addRow([]);
    const rn = r.number;

    // Merges
    worksheet.mergeCells(`A${rn}:C${rn}`); // etiqueta grande
    worksheet.mergeCells(`D${rn}:D${rn}`); // columna separadora (visual)
    worksheet.mergeCells(`E${rn}:E${rn}`); // contenido / detalle

    const leftCell = worksheet.getCell(`A${rn}`);
    const midCell = worksheet.getCell(`D${rn}`);
    const rightCell = worksheet.getCell(`E${rn}`);

    // Values
    leftCell.value = leftLabel || '';
    rightCell.value = (rightValue === undefined || rightValue === null || rightValue === '') ? (opts.emptyPlaceholder || 'N/A') : rightValue;

    // Styles
    leftCell.font = { name: 'Arial', bold: true };
    leftCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
    rightCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    midCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_GRAY } };

    [leftCell, midCell, rightCell].forEach(cell => {
      cell.border = THIN_BORDER;
      cell.alignment = { wrapText: true, vertical: 'top' };
      cell.font = cell.font || { name: 'Arial' };
    });

    // Ajuste de alto para mejor legibilidad
    worksheet.getRow(rn).height = opts.height || 30;
  };

  // Helper para fila con subtítulo a la derecha: etiqueta pequeña (A:B) y subtítulo centrado (C:E)
  const addComplementSubtitleRow = (leftLabel, subtitleText, opts = {}) => {
    const r = worksheet.addRow([]);
    const rn = r.number;

    worksheet.mergeCells(`A${rn}:B${rn}`); // etiqueta pequeña
    worksheet.mergeCells(`C${rn}:E${rn}`); // subtítulo o texto grande

    const leftCell = worksheet.getCell(`A${rn}`);
    const rightCell = worksheet.getCell(`C${rn}`);

    leftCell.value = leftLabel || '';
    rightCell.value = (subtitleText === undefined || subtitleText === null || subtitleText === '') ? (opts.emptyPlaceholder || '') : subtitleText;

    leftCell.font = { name: 'Arial', bold: true };
    leftCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
    rightCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };

    [leftCell, rightCell].forEach(cell => {
      cell.border = THIN_BORDER;
      cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
    });

    worksheet.getRow(rn).height = opts.height || 20;
  };

  // Helper para fila ancha (A:D) + columna E separada (si quieres que el texto ocupe todo el ancho)
  const addComplementWideRow = (leftLabel, wideText, opts = {}) => {
    const r = worksheet.addRow([]);
    const rn = r.number;

    worksheet.mergeCells(`A${rn}:D${rn}`); // etiqueta + espacio grande
    worksheet.mergeCells(`E${rn}:E${rn}`); // columna lateral para notas/observaciones

    const leftCell = worksheet.getCell(`A${rn}`);
    const rightCell = worksheet.getCell(`E${rn}`);

    leftCell.value = leftLabel || '';
    rightCell.value = (wideText === undefined || wideText === null || wideText === '') ? (opts.emptyPlaceholder || 'N/A') : wideText;

    leftCell.font = { name: 'Arial', bold: true };
    leftCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
    rightCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };

    [leftCell, rightCell].forEach(cell => {
      cell.border = THIN_BORDER;
      cell.alignment = { wrapText: true, vertical: 'top' };
    });

    worksheet.getRow(rn).height = opts.height || 28;
  };

  // Ahora añadimos las filas con los datos (usa campos del formData si existen)
  addComplementSplitRow(
    'Plan de Entrenamiento (Inducción y Acompañamiento - Primeros 90 días)',
    formData.plan_entrenamiento || formData.planEntrenamiento || ''
  );

  // Fila con subtítulo centrado tipo imagen: Plan de Capacitación Continua + subtítulo a la derecha
  addComplementSubtitleRow(
    'Plan de Capacitación Continua',
    formData.plan_capacitacion_continua_subtitulo ||
      formData.planCapacitacionContinuaSubtitulo ||
      'Desarrollo y Actualización – Semestral/Anual'
  );

  // Plan Carrera con "Ruta de Crecimiento Interno" como subtítulo/columna derecha
  addComplementSplitRow(
    'Plan Carrera',
    formData.plan_carrera_detalle || formData.planCarreraDetalle || 'Ruta de Crecimiento Interno'
  );

  // Competencias para desarrollar en el ingreso -> fila ancha para texto largo
  addComplementWideRow(
    'Competencias para desarrollar en el ingreso',
    formData.competencias_desarrollo_ingreso || formData.competenciasDesarrolloIngreso || ''
  );

  // espacio final
  worksheet.addRow([]).height = 6;


  // asegurar wrapText/alineación global
  worksheet.eachRow(row => {
    row.eachCell({ includeEmpty: true }, cell => {
      if (!cell.alignment) cell.alignment = { wrapText: true, vertical: 'top' };
    });
  });

  // generar buffer y devolver attachment
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