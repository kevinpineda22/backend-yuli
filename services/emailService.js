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

  // Estilos y colores
  const primaryColor = 'FF210D65';
  const secondaryColor = 'FF89DC00';
  const lightGray = 'FFF7F8FA';
  const headerFont = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
  const labelFont = { name: 'Arial', bold: true, color: { argb: 'FF000000' } };
  const valueFont = { name: 'Arial', color: { argb: 'FF000000' } };

  worksheet.columns = [
    { width: 40 }, // A: Competencia (nombre)
    { width: 10 }, // B: A (Alto)
    { width: 10 }, // C: B (Bueno)
    { width: 12 }, // D: C (Min necesario)
    { width: 60 }  // E: Definición
  ];

  const thinBorder = {
    top: { style: 'thin' }, left: { style: 'thin' },
    bottom: { style: 'thin' }, right: { style: 'thin' }
  };

  const writeSectionTitle = (text) => {
    const row = worksheet.addRow([]);
    worksheet.mergeCells(`A${row.number}:E${row.number}`);
    const cell = worksheet.getCell(`A${row.number}`);
    cell.value = text;
    cell.font = { name: 'Arial', bold: true, size: 12, color: { argb: primaryColor } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: secondaryColor } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    cell.border = thinBorder;
    worksheet.addRow([]); // espacio
  };

  const safe = v => (v === null || v === undefined || v === '') ? null : v;

  // Helper para parsear competencias desde distintos formatos
  const parseCompetencias = (raw) => {
    if (!raw) return [];
    // Si ya es array
    if (Array.isArray(raw)) return raw.map(item => {
      if (typeof item === 'string') {
        // intentar separar por " - " si viene como "competencia (nivel) - definicion"
        return { competencia: item, nivel: null, definicion: '' };
      }
      return item;
    });
    // Si es string que contiene JSON
    if (typeof raw === 'string' && (raw.trim().startsWith('[') || raw.trim().startsWith('{'))) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
        return [parsed];
      } catch (e) {
        // si no es JSON, intentar separar por saltos de linea
        return raw.split('\n').map(r => ({ competencia: r, nivel: null, definicion: '' }));
      }
    }
    // fallback: string simple
    return [{ competencia: String(raw), nivel: null, definicion: '' }];
  };

  // --- Título general (puedes ajustar el texto) ---
  worksheet.mergeCells('A1:E1');
  const tcell = worksheet.getCell('A1');
  tcell.value = 'DETALLES - SOLICITUD PERFIL DE CARGO';
  tcell.font = { name: 'Arial', bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  tcell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
  tcell.alignment = { horizontal: 'center', vertical: 'middle' };
  tcell.border = thinBorder;
  worksheet.addRow([]);

  // ... (aquí irían otras secciones: info general, requisitos, etc.) ...
  // Para no duplicar todo el código anterior, asumo que ya agregaste las secciones previas.
  // Si quieres que incluya todo el resto tal cual, indícamelo y lo incluyo completo.

  // --- Ahora: tabla de COMPETENCIAS EXACTA al formato solicitado ---
  writeSectionTitle('COMPETENCIAS REQUERIDAS');

  // Encabezados de la tabla (fila con títulos para cada columna)
  const headerRow = worksheet.addRow([
    'COMPETENCIA',
    'A (Alto) (1) (Siempre)',
    'B (Bueno) (2) (Casi siempre)',
    'C (Min necesario) (3) (En ocasiones)',
    'Definición'
  ]);

  // Estilo encabezado
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', bold: true, color: { argb: 'FF000000' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCDCDC' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });

  // Obtener competencias del formData (buscamos con distintos nombres posibles)
  const rawComps = formData.competencias_cargo || formData.competenciasCargo || formData.competencias || formData.competenciasCargo;
  const competencias = parseCompetencias(rawComps);

  // Normalizar nivel: aceptar 1/2/3, 'Alto','Bueno','Min','A','B','C', etc.
  const nivelToColIndex = (nivel) => {
    if (nivel == null) return null;
    const s = String(nivel).toLowerCase().trim();
    if (['1','a','alto','siempre'].includes(s)) return 2; // columna B index 2 (1-based Excel columns: A=1,B=2,... but addRow uses array)
    if (['2','b','bueno','casi siempre'].includes(s)) return 3;
    if (['3','c','min','min necesario','en ocasiones'].includes(s)) return 4;
    // si viene en formato "A" "B" "C" o número en string, handled above
    return null;
  };

  // Si los objetos tienen la forma {competencia, nivel, definicion}
  competencias.forEach((cObj) => {
    // soporte diferentes shapes
    const competenciaName = cObj.competencia || cObj.nombre || cObj.name || String(cObj).slice ? (cObj.competencia || cObj.nombre || cObj.name || '') : String(cObj);
    const definicion = cObj.definicion || cObj.descripcion || cObj.definition || '';
    const nivel = cObj.nivel || cObj.level || cObj.value || null;

    // fila: [competencia, colA, colB, colC, definicion]
    const rowArr = [safe(competenciaName), null, null, null, safe(definicion)];
    const colIndex = nivelToColIndex(nivel);
    if (colIndex) {
      // marcamos con un "1" (puedes cambiar por "X" si prefieres)
      rowArr[colIndex - 1] = 1; // porque rowArr is zero-based
    }

    const row = worksheet.addRow(rowArr);

    // formato celdas
    row.getCell(1).font = { name: 'Arial', bold: false };
    row.getCell(1).alignment = { wrapText: true, vertical: 'top' };

    // marcar centro para las columnas A/B/C (num)
    [2,3,4].forEach(ci => {
      const cell = row.getCell(ci);
      cell.alignment = { horizontal: 'center', vertical: 'top' };
      cell.font = { name: 'Arial' };
      cell.border = thinBorder;
    });

    const defCell = row.getCell(5);
    defCell.alignment = { wrapText: true, vertical: 'top' };
    defCell.font = { name: 'Arial' };
    defCell.border = thinBorder;

    // borde y fondo ligero para toda fila (opcional)
    row.eachCell({ includeEmpty: true }, (cell) => {
      if (!cell.fill) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightGray } };
      }
      cell.border = thinBorder;
    });
  });

  // Si no hay competencias, escribir una fila que diga "No aplica"
  if (competencias.length === 0) {
    const r = worksheet.addRow(['No aplica', null, null, null, 'No hay competencias definidas']);
    r.eachCell(c => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightGray } };
      c.border = thinBorder;
      c.alignment = { wrapText: true, vertical: 'top' };
    });
  }

  // Ajustes finales: wrapText en todo el sheet
  worksheet.eachRow((row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      if (!cell.alignment) cell.alignment = { wrapText: true, vertical: 'top' };
    });
  });

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