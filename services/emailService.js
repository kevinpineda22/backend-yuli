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
  const secondaryColor = 'FF89DC00'; // Verde
  const lightGray = 'FFF7F8FA';
  const thinBorder = {
    top: { style: 'thin' }, left: { style: 'thin' },
    bottom: { style: 'thin' }, right: { style: 'thin' }
  };

  // Config columnas global (suficientes para tablas y filas A/B/C/D/E)
  worksheet.columns = [
    { width: 40 }, // A - etiqueta / competencia
    { width: 10 }, // B - A (Alto)
    { width: 10 }, // C - B (Bueno)
    { width: 12 }, // D - C (Min necesario)
    { width: 60 }, // E - Valor / Definición
  ];

  // Util: parsea competencias desde diferentes formatos (array, json string, newline string)
  const parseCompetencias = (raw) => {
    if (!raw && raw !== 0) return [];
    if (Array.isArray(raw)) {
      return raw.map(item => {
        if (typeof item === 'string') {
          // intentar si viene como "Competencia - Definición" o "Competencia|nivel|def"
          const parts = item.split(' - ');
          return {
            competencia: parts[0].trim(),
            nivel: null,
            definicion: parts[1] ? parts[1].trim() : ''
          };
        }
        // si es objeto ya con campos
        return item;
      });
    }
    if (typeof raw === 'string') {
      const s = raw.trim();
      // si parece JSON
      if (s.startsWith('[') || s.startsWith('{')) {
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) return parsed;
          return [parsed];
        } catch (e) {
          // no JSON: caerá a split por líneas
        }
      }
      // split por saltos de línea y mapear
      return s.split(/\r?\n/).map(line => {
        const trimmed = line.trim();
        if (trimmed === '') return null;
        // si incluye ' - ' separar definicion
        const parts = trimmed.split(' - ');
        return { competencia: parts[0].trim(), nivel: null, definicion: parts[1] ? parts[1].trim() : '' };
      }).filter(Boolean);
    }
    // fallback: envolver en array
    return [{ competencia: String(raw), nivel: null, definicion: '' }];
  };

  // Convierte niveles variados a columnas: devuelve 2|3|4 (índice de columna en 1-based)
  const nivelToCol = (nivel) => {
    if (nivel === null || nivel === undefined) return null;
    const s = String(nivel).toLowerCase().trim();
    if (['1','a','alto','siempre'].includes(s)) return 2; // columna B
    if (['2','b','bueno','casi siempre'].includes(s)) return 3; // columna C
    if (['3','c','min','min necesario','en ocasiones'].includes(s)) return 4; // columna D
    // soportar formatos como "A", "B", "C" o números
    if (s === 'a') return 2;
    if (s === 'b') return 3;
    if (s === 'c') return 4;
    // si viene como objeto nivel: { value: '1' } handled before
    return null;
  };

  // Helpers para filas estilo "campo: valor" (usa columnas A y E)
  const addRowField = (label, value) => {
    // Usamos fila con [label, null, null, null, value]
    const safeVal = (value === undefined || value === null || value === '') ? 'N/A' : value;
    const row = worksheet.addRow([label, null, null, null, safeVal]);
    const labelCell = row.getCell(1);
    const valCell = row.getCell(5);
    // Estilos
    labelCell.font = { bold: true };
    [labelCell, valCell].forEach(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightGray } };
      cell.border = thinBorder;
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
  };

  const addHyperlinkField = (label, url) => {
    if (!url) {
      addRowField(label, 'N/A');
      return;
    }
    const row = worksheet.addRow([label, null, null, null, 'Ver documento']);
    const labelCell = row.getCell(1);
    const valCell = row.getCell(5);
    labelCell.font = { bold: true };
    valCell.value = { text: 'Ver documento', hyperlink: String(url) };
    valCell.font = { color: { argb: 'FF0563C1' }, underline: true };
    [labelCell, valCell].forEach(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightGray } };
      cell.border = thinBorder;
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
  };

  const addSectionTitle = (text) => {
    const row = worksheet.addRow([]);
    worksheet.mergeCells(`A${row.number}:E${row.number}`);
    const cell = worksheet.getCell(`A${row.number}`);
    cell.value = text;
    cell.font = { bold: true, color: { argb: primaryColor } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: secondaryColor } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    cell.border = thinBorder;
    worksheet.addRow([]); // espacio
  };

  // --- Encabezado / título principal ---
  worksheet.mergeCells('A1:E1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'Detalles de la Solicitud de Perfil de Cargo';
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border = thinBorder;
  worksheet.addRow([]);

  // --- Sección: Información General (ejemplos de campos) ---
  addSectionTitle('Información General');
  addRowField('Fecha', formData.fecha);
  addRowField('Nombre del Cargo', formData.nombrecargo || formData.nombreCargo);
  addRowField('Área General', formData.areageneral || formData.area || formData.areaGeneral);
  addRowField('Departamento', formData.departamento);
  addRowField('Proceso', formData.proceso);
  addRowField('Misión del Cargo', formData.misioncargo || formData.misionCargo);
  addRowField('Jefe Inmediato', formData.jefeinmediato || formData.jefeInmediato);
  addRowField('Supervisa a', formData.supervisaa || formData.supervisaa);
  addRowField('Número de Personas a Cargo', formData.numeropersonascargo || formData.numeroPersonasCargo);
  addRowField('Tipo de Contrato', formData.tipocontrato || formData.tipoContrato);

  worksheet.addRow([]);

  // --- Requisitos del Perfil ---
  addSectionTitle('Requisitos del Perfil');
  addRowField('Escolaridad', formData.escolaridad);
  addRowField('Área de Formación', formData.area_formacion || formData.areaFormacion);
  addRowField('Estudios Complementarios', formData.estudioscomplementarios || formData.estudiosComplementarios);
  addRowField('Experiencia Necesaria', formData.experiencia);
  addRowField('Población Focalizada', formData.poblacionfocalizada || formData.poblacionFocalizada);

  worksheet.addRow([]);

  // --- Competencias requeridas (ahora: dos tablas con columnas A/B/C/Definición) ---
  addSectionTitle('COMPETENCIAS REQUERIDAS');

  const writeCompetencyTable = (title, rawList) => {
    // subtítulo de la tabla
    const sub = worksheet.addRow([]);
    worksheet.mergeCells(`A${sub.number}:E${sub.number}`);
    worksheet.getCell(`A${sub.number}`).value = title;
    worksheet.getCell(`A${sub.number}`).font = { bold: true };
    worksheet.getCell(`A${sub.number}`).alignment = { horizontal: 'left' };
    worksheet.addRow([]);

    // encabezado de la tabla
    const header = worksheet.addRow([
      'COMPETENCIA',
      'A (Alto) (1) (Siempre)',
      'B (Bueno) (2) (Casi siempre)',
      'C (Min necesario) (3) (En ocasiones)',
      'Definición'
    ]);
    header.eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCDCDC' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;
    });

    const parsed = parseCompetencias(rawList);

    if (parsed.length === 0) {
      const r = worksheet.addRow(['No aplica', '', '', '', 'No hay competencias definidas']);
      r.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightGray } }; c.border = thinBorder; c.alignment = { wrapText: true, vertical: 'top' }; });
      worksheet.addRow([]);
      return;
    }

    parsed.forEach(item => {
      // soporta objetos o strings
      const comp = item.competencia || item.nombre || String(item);
      const definicion = item.definicion || item.descripcion || item.definition || '';
      const nivel = item.nivel || item.level || item.valor || null;

      // construimos fila [competencia, '', '', '', definicion]
      const rowArr = [comp || '', '', '', '', definicion || ''];
      const colIndex = nivelToCol(nivel); // devuelve 2|3|4 o null
      if (colIndex) {
        // marcar con "X" la columna correspondiente
        // rowArr es 0-based; ExcelJS addRow recibe array -> cell 1 = index 0
        rowArr[colIndex - 1] = 'X';
      }
      const row = worksheet.addRow(rowArr);
      // estilo por celdas
      row.getCell(1).alignment = { wrapText: true, vertical: 'top' };
      [2,3,4].forEach(ci => {
        const c = row.getCell(ci);
        c.alignment = { horizontal: 'center', vertical: 'top' };
      });
      row.getCell(5).alignment = { wrapText: true, vertical: 'top' };

      // aplicar borde y fondo claro
      row.eachCell({ includeEmpty: true }, cell => {
        cell.border = thinBorder;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightGray } };
      });
    });

    worksheet.addRow([]); // espacio después de la tabla
  };

  // Escribir Competencias Culturales y Competencias del Cargo
  writeCompetencyTable('Competencias Culturales', formData.competencias_culturales || formData.competenciasCulturales || formData.competenciasCultural || []);
  writeCompetencyTable('Competencias del Cargo', formData.competencias_cargo || formData.competenciasCargo || formData.competencias || []);

  // --- Responsabilidades (si quieres mantener en formato anterior) ---
  addSectionTitle('Responsabilidades');
  // usar formato con salto de línea si viene array/JSON
  const formatMulti = (v) => {
    if (!v && v !== 0) return 'N/A';
    if (Array.isArray(v)) return v.join('\n');
    if (typeof v === 'string') {
      try {
        const p = JSON.parse(v);
        if (Array.isArray(p)) return p.join('\n');
      } catch (e) { /* no es JSON */ }
      return v;
    }
    return String(v);
  };
  addRowField('Responsabilidades', formatMulti(formData.responsabilidades));

  worksheet.addRow([]);

  // --- Otros Datos ---
  addSectionTitle('OTROS DATOS');
  addRowField('Cursos/Certificaciones', formData.cursoscertificaciones || formData.cursosCertificaciones);
  addRowField('Requiere Vehículo', formData.requierevehiculo || formData.requiereVehiculo);
  addRowField('Tipo de Licencia', formData.tipolicencia || formData.tipoLicencia);
  addRowField('Idiomas', formData.idiomas);
  addRowField('Requiere Viajar', formData.requiereviajar || formData.requiereViajar);
  addRowField('Áreas Relacionadas', formData.areasrelacionadas || formData.areasRelacionadas);
  addRowField('Relacionamiento Externo', formData.relacionamientoexterno || formData.relacionamientoExterno);

  worksheet.addRow([]);

  // --- Documentos Adjuntos ---
  addSectionTitle('DOCUMENTOS ADJUNTOS');
  addHyperlinkField('Documento', formData.documento);
  addHyperlinkField('Estructura Organizacional', formData.estructuraorganizacional || formData.estructuraOrganizacional);

  // Asegurar wrapText en todo
  worksheet.eachRow(row => {
    row.eachCell({ includeEmpty: true }, cell => {
      if (!cell.alignment) cell.alignment = { wrapText: true, vertical: 'top' };
    });
  });

  // Generar buffer y retornar attachment
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