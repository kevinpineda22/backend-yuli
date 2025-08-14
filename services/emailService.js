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
  const primaryColor = 'FF210D65'; // Azul oscuro (titulo)
  const secondaryColor = 'FF89DC00'; // Verde Merkahorro (secciones)
  const headerGreen = 'FF2E8B22'; // Verde oscuro para encabezado de responsabilidad (puedes ajustar)
  const lightGray = 'FFF7F8FA';
  const thinBorder = {
    top: { style: 'thin' }, left: { style: 'thin' },
    bottom: { style: 'thin' }, right: { style: 'thin' }
  };

  // Columnas: A=etiqueta/competencia, B= A, C= B, D= C, E= definicion / valor
  worksheet.columns = [
    { width: 40 }, // A
    { width: 10 }, // B
    { width: 10 }, // C
    { width: 12 }, // D
    { width: 80 }  // E
  ];

  // Utilities: parse competencias/responsabilidades
  const parseToArray = (raw) => {
    if (raw === null || raw === undefined) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === 'string') {
      const s = raw.trim();
      if (!s) return [];
      // si parece JSON
      if (s.startsWith('[') || s.startsWith('{')) {
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) return parsed.filter(Boolean);
          return [parsed];
        } catch (e) {
          // no JSON: caer al split por líneas
        }
      }
      // split por saltos de línea (mantener líneas no vacías)
      return s.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    }
    // fallback: devolver string del objeto
    return [String(raw)];
  };

  // convert nivel to column index for competencies (2,3,4)
  const nivelToCol = (nivel) => {
    if (nivel === null || nivel === undefined) return null;
    const s = String(nivel).toLowerCase().trim();
    if (['1','a','alto','siempre'].includes(s)) return 2;
    if (['2','b','bueno','casi siempre'].includes(s)) return 3;
    if (['3','c','min','min necesario','en ocasiones'].includes(s)) return 4;
    if (s === 'a') return 2;
    if (s === 'b') return 3;
    if (s === 'c') return 4;
    return null;
  };

  // pequeños helpers para escribir filas
  const addSectionTitle = (text) => {
    const row = worksheet.addRow([]);
    worksheet.mergeCells(`A${row.number}:E${row.number}`);
    const cell = worksheet.getCell(`A${row.number}`);
    cell.value = text;
    cell.font = { name: 'Arial', bold: true, color: { argb: primaryColor } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: secondaryColor } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    cell.border = thinBorder;
    // no más de 1 fila en blanco: solo una separación
    worksheet.addRow([]);
  };

  const addField = (label, value) => {
    const safe = (value === undefined || value === null || value === '') ? 'N/A' : value;
    const row = worksheet.addRow([label, '', '', '', safe]);
    const labelCell = row.getCell(1);
    const valCell = row.getCell(5);
    labelCell.font = { name: 'Arial', bold: true };
    [labelCell, valCell].forEach(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightGray } };
      cell.border = thinBorder;
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
    // ajustar altura si se detectan muchos saltos
    row.height = 18;
  };

  const addHyperlinkField = (label, url) => {
    if (!url) {
      addField(label, 'N/A');
      return;
    }
    const row = worksheet.addRow([label, '', '', '', 'Ver documento']);
    row.getCell(5).value = { text: 'Ver documento', hyperlink: String(url) };
    row.getCell(5).font = { name: 'Arial', color: { argb: 'FF0563C1' }, underline: true };
    row.getCell(1).font = { name: 'Arial', bold: true };
    [row.getCell(1), row.getCell(5)].forEach(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightGray } };
      cell.border = thinBorder;
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
    row.height = 18;
  };

  // Título principal
  worksheet.mergeCells('A1:E1');
  const title = worksheet.getCell('A1');
  title.value = 'Detalles de la Solicitud de Perfil de Cargo';
  title.font = { name: 'Arial', bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  title.border = thinBorder;
  // fila separadora pequeña
  worksheet.addRow([]);

  // --- Información General ---
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

  // una sola separación antes de la siguiente sección
  worksheet.addRow([]);

  // --- Requisitos del Perfil ---
  addSectionTitle('Requisitos del Perfil');
  addField('Escolaridad', formData.escolaridad);
  addField('Área de Formación', formData.area_formacion || formData.areaFormacion);
  addField('Estudios Complementarios', formData.estudioscomplementarios || formData.estudiosComplementarios);
  addField('Experiencia Necesaria', formData.experiencia);
  addField('Población Focalizada', formData.poblacionfocalizada || formData.poblacionFocalizada);

  worksheet.addRow([]);

  // --- Competencias Requeridas (estructura ya definida con A/B/C/Definición) ---
  addSectionTitle('COMPETENCIAS REQUERIDAS');

  const writeCompetencyTable = (titleText, raw) => {
    // Subtítulo
    const srow = worksheet.addRow([]);
    worksheet.mergeCells(`A${srow.number}:E${srow.number}`);
    const scell = worksheet.getCell(`A${srow.number}`);
    scell.value = titleText;
    scell.font = { bold: true };
    scell.alignment = { horizontal: 'left' };
    worksheet.addRow([]);

    // encabezado de tabla
    const header = worksheet.addRow([
      'COMPETENCIA',
      'A (Alto) (1) (Siempre)',
      'B (Bueno) (2) (Casi siempre)',
      'C (Min necesario) (3) (En ocasiones)',
      'Definición'
    ]);
    header.eachCell(c => {
      c.font = { bold: true };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCDCDC' } };
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      c.border = thinBorder;
    });

    const parsed = (Array.isArray(raw) ? raw : parseToArray(raw));

    if (parsed.length === 0) {
      const nr = worksheet.addRow(['No aplica', '', '', '', 'No hay competencias definidas']);
      nr.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightGray } }; c.border = thinBorder; c.alignment = { wrapText: true, vertical: 'top' }; });
      worksheet.addRow([]);
      return;
    }

    parsed.forEach(item => {
      // item puede ser string o objeto {competencia, nivel, definicion}
      let comp = '';
      let nivel = null;
      let definicion = '';

      if (typeof item === 'string') {
        // si viene "Nombre - Definición"
        const parts = item.split(' - ');
        comp = parts[0].trim();
        definicion = parts[1] ? parts[1].trim() : '';
        nivel = null;
      } else if (typeof item === 'object') {
        comp = item.competencia || item.nombre || item.label || '';
        nivel = item.nivel || item.level || item.valor || null;
        definicion = item.definicion || item.descripcion || item.definition || '';
      } else {
        comp = String(item);
      }

      const rowArr = [comp || '', '', '', '', definicion || ''];
      const colIndex = nivelToCol(nivel); // 2|3|4
      if (colIndex) {
        rowArr[colIndex - 1] = 'X'; // marca con X
      }
      const r = worksheet.addRow(rowArr);
      // estilos
      r.getCell(1).alignment = { wrapText: true, vertical: 'top' };
      [2,3,4].forEach(ci => { const c = r.getCell(ci); c.alignment = { horizontal: 'center', vertical: 'top' }; });
      r.getCell(5).alignment = { wrapText: true, vertical: 'top' };
      r.eachCell({ includeEmpty: true }, cell => {
        cell.border = thinBorder;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightGray } };
      });
      r.height = 18;
    });

    worksheet.addRow([]);
  };

  writeCompetencyTable('Competencias Culturales', formData.competencias_culturales || formData.competenciasCulturales || []);
  writeCompetencyTable('Competencias del Cargo', formData.competencias_cargo || formData.competenciasCargo || formData.competencias || []);

  // --- RESPONSABILIDADES: ahora compactas, encabezado verde por responsabilidad y descripción justo debajo ---
  addSectionTitle('RESPONSABILIDADES');

  const responsibilitiesList = parseToArray(formData.responsabilidades || formData.responsabilidadesList || formData.responsabilidadesArray || formData.responsabilidades || []);
  // Si viene como array de objetos con {titulo, detalle} manejarlo:
  const normalizedResponsibilities = responsibilitiesList.map((r) => {
    if (!r) return null;
    if (typeof r === 'string') {
      // si la línea tiene un separador '|' o ' - ' podemos intentar separar titulo y detalle
      const parts = r.split('|').map(p => p.trim());
      if (parts.length === 1) {
        // intentar por ' - ' (típico)
        const parts2 = r.split(' - ').map(p => p.trim());
        if (parts2.length > 1) return { titulo: parts2[0], detalle: parts2.slice(1).join(' - ') };
        return { titulo: r, detalle: '' };
      }
      return { titulo: parts[0], detalle: parts.slice(1).join(' | ') };
    }
    if (typeof r === 'object') {
      // si viene {titulo, detalle} o {responsabilidad, descripcion}
      return {
        titulo: r.titulo || r.title || r.responsabilidad || r.nombre || '',
        detalle: r.detalle || r.descripcion || r.description || r.detalleResponsabilidad || ''
      };
    }
    return { titulo: String(r), detalle: '' };
  }).filter(Boolean);

  if (normalizedResponsibilities.length === 0) {
    // fallback simple
    const nr = worksheet.addRow(['No aplica', '', '', '', 'No hay responsabilidades definidas']);
    nr.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightGray } }; c.border = thinBorder; c.alignment = { wrapText: true, vertical: 'top' }; });
    worksheet.addRow([]);
  } else {
    normalizedResponsibilities.forEach((rp, idx) => {
      const headerRow = worksheet.addRow([]);
      worksheet.mergeCells(`A${headerRow.number}:E${headerRow.number}`);
      const headerCell = worksheet.getCell(`A${headerRow.number}`);
      headerCell.value = `RESPONSABILIDAD ${idx + 1}`;
      headerCell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
      headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerGreen } };
      headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
      headerCell.border = thinBorder;
      headerRow.height = 18;

      // ahora la descripción: una fila fusionada A:E con el texto
      const descRow = worksheet.addRow([rp.titulo || '', '', '', '', rp.detalle || '']);
      worksheet.mergeCells(`A${descRow.number}:D${descRow.number}`); // título/encabezado de la responsabilidad en A:D
      // mover la descripción a la columna E (ya está)
      // aplicar estilo
      const titleCell = worksheet.getCell(`A${descRow.number}`);
      const descCell = worksheet.getCell(`E${descRow.number}`);
      titleCell.font = { bold: true };
      [titleCell, descCell].forEach(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightGray } };
        c.border = thinBorder;
        c.alignment = { wrapText: true, vertical: 'top' };
      });
      descRow.height = 20;
      // NO agregar filas en blanco entre responsabilidades — queda compacto
    });
    // una separación pequeña al final
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

  // wrapText y alignment por seguridad en todo el sheet
  worksheet.eachRow(row => {
    row.eachCell({ includeEmpty: true }, cell => {
      if (!cell.alignment) cell.alignment = { wrapText: true, vertical: 'top' };
    });
  });

  // Generar buffer
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