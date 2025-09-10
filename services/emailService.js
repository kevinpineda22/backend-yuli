import nodemailer from 'nodemailer';
import ExcelJS from 'exceljs';
import axios from 'axios';

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
        if (typeof value[0] === 'object' && value[0].hasOwnProperty('competencia')) {
            return value.map(c => `${c.competencia} (${c.nivel}) - ${c.definicion}`).join('\n');
        }
        return value.join('\n');
    }
    return value || 'N/A';
};

export const generateExcelAttachment = async (formData, workflow_id) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Solicitud de Perfil de Cargo');

    const COLOR_TITLE = 'FF210D65';
    const COLOR_SECTION = 'FF89DC00';
    const COLOR_HEADER_GRAY = 'FFDCDCDC';
    const COLOR_LEFT_GRAY = 'FFEFEFEF';
    const COLOR_ROW_LIGHT = 'FFF7F7F7';
    const THIN_BORDER = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
    };

    worksheet.columns = [
        { width: 18 }, { width: 3 }, { width: 3 }, { width: 3 },
        { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
    ];

    const MAX_ITEM_COL_WIDTH = 18;
    const CHAR_PER_COL_UNIT = 1.1;
    const LINE_HEIGHT = 14;
    const COMPACT_ROW_HEIGHT = 14;
    const HEADER_ROW_HEIGHT = 34;
    const SMALL_HEADER_FONT_SIZE = 9;
    const IMAGE_HEIGHT = 200;
    const IMAGE_WIDTH = 300;

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
        const charsPerLine = Math.max(12, Math.floor((colWidth || 28) * CHAR_PER_COL_UNIT));
        const len = String(text).length;
        return Math.max(1, Math.ceil(len / charsPerLine));
    };

    const addSectionTitle = (text) => {
        const r = worksheet.addRow([]);
        worksheet.mergeCells(`A${r.number}:H${r.number}`);
        const c = worksheet.getCell(`A${r.number}`);
        c.value = text;
        c.font = { name: 'Arial', bold: true, color: { argb: 'FF000000' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SECTION } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = THIN_BORDER;
        worksheet.getRow(r.number).height = 18;
    };

    const addField = (label, value) => {
        const safe = (value === undefined || value === null || value === '') ? 'N/A' : value;
        const r = worksheet.addRow([label, '', '', '', safe, '', '', '']);
        worksheet.mergeCells(`E${r.number}:H${r.number}`);
        const labelCell = r.getCell(1);
        const valueCell = r.getCell(5);
        labelCell.font = { bold: true };
        [labelCell, valueCell].forEach(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
            cell.border = THIN_BORDER;
            cell.alignment = { wrapText: true, vertical: 'top' };
        });
        r.height = COMPACT_ROW_HEIGHT;
    };

    const addHyperlink = async (label, url) => {
        const r = worksheet.addRow([label, '', '', '', 'Ver documento', '', '', '']);
        worksheet.mergeCells(`E${r.number}:H${r.number}`);
        const labelCell = r.getCell(1);
        const valueCell = r.getCell(5);

        if (url) {
            valueCell.value = { text: 'Ver documento', hyperlink: String(url) };
            valueCell.font = { name: 'Arial', color: { argb: 'FF0563C1' }, underline: true };
        } else {
            valueCell.value = 'N/A';
        }

        if (url) {
            try {
                const extension = url.split('.').pop().toLowerCase();
                const supportedExtensions = ['png', 'jpg', 'jpeg'];
                if (!supportedExtensions.includes(extension)) {
                    throw new Error('Formato de imagen no soportado (solo PNG o JPG/JPEG)');
                }

                const response = await axios.get(url, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(response.data);

                const imageId = workbook.addImage({
                    buffer: buffer,
                    extension: extension === 'jpg' || extension === 'jpeg' ? 'jpeg' : 'png',
                });

                worksheet.addImage(imageId, {
                    tl: { col: 4, row: r.number - 1 },
                    ext: { width: IMAGE_WIDTH, height: IMAGE_HEIGHT },
                });

                worksheet.getRow(r.number).height = IMAGE_HEIGHT;
            } catch (error) {
                console.error('Error al descargar o insertar la imagen:', error.message);
                valueCell.value = url ? 'Error al cargar la imagen (Ver documento)' : 'N/A';
            }
        }

        [labelCell, valueCell].forEach(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
            cell.border = THIN_BORDER;
            cell.alignment = { wrapText: true, vertical: 'top' };
        });
    };

    const writeLabelRow = (labelText) => {
        const r = worksheet.addRow([]);
        const rn = r.number;
        worksheet.mergeCells(`A${rn}:D${rn}`);
        const left = worksheet.getCell(`A${rn}`);
        left.value = labelText;
        left.font = { name: 'Arial', bold: true };
        left.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
        left.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
        for (let cc = 1; cc <= 4; cc++) {
            const cell = worksheet.getCell(rn, cc);
            cell.border = THIN_BORDER;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
            cell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
        }
        return rn;
    };

    const writeItemsHorizontal = (startRow, items) => {
        const maxCols = 4;
        let idx = 0;
        let currentRow = startRow;
        while (idx < items.length) {
            let maxLinesThisRow = 1;
            for (let cOff = 0; cOff < maxCols && idx < items.length; cOff++, idx++) {
                const colIndex = 5 + cOff;
                const text = String(items[idx]);
                const cell = worksheet.getCell(currentRow, colIndex);
                cell.value = `${idx + 1}. ${text}`;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
                cell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
                cell.border = THIN_BORDER;
                const lines = estimateLinesForText(text, worksheet.getColumn(colIndex).width);
                if (lines > maxLinesThisRow) maxLinesThisRow = lines;
            }
            worksheet.getRow(currentRow).height = Math.max(20, maxLinesThisRow * LINE_HEIGHT);
            if (idx < items.length) {
                const nextR = worksheet.addRow([]);
                const nextRN = nextR.number;
                worksheet.mergeCells(`A${nextRN}:D${nextRN}`);
                for (let cc = 1; cc <= 4; cc++) {
                    const cell = worksheet.getCell(nextRN, cc);
                    cell.value = '';
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
                    cell.border = THIN_BORDER;
                    cell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
                }
                currentRow = nextRN;
            }
        }
    };

    const writeSingleBox = (rowNum, text) => {
        worksheet.mergeCells(`E${rowNum}:H${rowNum}`);
        const boxCell = worksheet.getCell(`E${rowNum}`);
        boxCell.value = text === undefined || text === null ? '' : String(text);
        boxCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
        boxCell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
        for (let cc = 5; cc <= 8; cc++) {
            const cell = worksheet.getCell(rowNum, cc);
            cell.border = THIN_BORDER;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
            cell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
        }
        const effectiveWidth = Math.min(MAX_ITEM_COL_WIDTH, worksheet.getColumn(5).width || 28) * 4;
        const lines = estimateLinesForText(boxCell.value, effectiveWidth);
        worksheet.getRow(rowNum).height = Math.max(20, lines * LINE_HEIGHT);
    };

    worksheet.mergeCells('A1:H1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'INFORMACIÓN DEL PERFIL - SOLICITUD';
    titleCell.font = { name: 'Arial', bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TITLE } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.border = THIN_BORDER;
    worksheet.getRow(1).height = 18;

    worksheet.addRow([]).height = 4;

    addSectionTitle('INFORMACIÓN GENERAL');

    addField('Nombre del cargo', formData.nombrecargo || formData.nombreCargo);
    addField('Área', formData.areageneral || formData.area || formData.areaGeneral);
    addField('Departamento', formData.departamento);
    addField('Proceso al que pertenece', formData.proceso);
    await addHyperlink('Estructura organizacional', formData.estructuraorganizacional || formData.estructuraOrganizacional);

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

    const compTitleRow = worksheet.addRow([]);
    worksheet.mergeCells(`A${compTitleRow.number}:H${compTitleRow.number}`);
    const compTitleCell = worksheet.getCell(`A${compTitleRow.number}`);
    compTitleCell.value = 'COMPETENCIAS REQUERIDAS';
    compTitleCell.font = { name: 'Arial', bold: true, color: { argb: 'FF000000' } };
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
            'Definición',
            '',
            '',
            ''
        ]);
        worksheet.mergeCells(`E${headerRow.number}:H${headerRow.number}`);
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
            const r = worksheet.addRow(['', '', '', '', '', '', '', '']);
            worksheet.mergeCells(`E${r.number}:H${r.number}`);
            r.eachCell(c => { c.border = THIN_BORDER; c.alignment = { wrapText: true, vertical: 'top' }; });
            r.height = COMPACT_ROW_HEIGHT;
            return;
        }

        normalized.forEach(c => {
            const nivelRaw = c.nivel !== undefined && c.nivel !== null ? String(c.nivel) : '';
            const colIndex = nivelToCol(nivelRaw);
            const rowArr = [c.competencia || '', '', '', '', c.definicion || '', '', '', ''];
            if (colIndex === 2) rowArr[1] = 'X';
            else if (colIndex === 3) rowArr[2] = 'X';
            else if (colIndex === 4) rowArr[3] = 'X';
            const r = worksheet.addRow(rowArr);
            worksheet.mergeCells(`E${r.number}:H${r.number}`);
            r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
            r.getCell(1).alignment = { wrapText: true, vertical: 'top' };
            [2, 3, 4].forEach(ci => r.getCell(ci).alignment = { horizontal: 'center', vertical: 'top' });
            r.getCell(5).alignment = { wrapText: true, vertical: 'top' };
            r.eachCell({ includeEmpty: true }, cell => { cell.border = THIN_BORDER; });
            r.height = COMPACT_ROW_HEIGHT;
        });

        worksheet.addRow([]).height = 6;
    };

    writeCompetencyBlockHeader('COMPETENCIAS\nCULTURALES');
    writeCompetencyRows(formData.competencias_culturales || formData.competenciasCulturales || []);
    writeCompetencyBlockHeader('COMPETENCIAS\nCARGO');
    writeCompetencyRows(formData.competencias_cargo || formData.competenciasCargo || formData.competencias || []);

    worksheet.addRow([]).height = 6;

    const rawResp = formData.responsabilidades || formData.responsabilidadesList || formData.responsabilidadesArray || [];
    const parsedResp = parseToArray(rawResp);
    const normResp = parsedResp.map(r => {
        if (typeof r === 'string') {
            const parts = r.split(' - ');
            return { value: parts[0].trim(), funcion: parts.slice(1).join(' - ').trim() };
        }
        if (typeof r === 'object') {
            return {
                value: r.value || r.titulo || r.title || r.responsabilidad || r.nombre || '',
                funcion: r.funcion || r.detalle || r.descripcion || r.description || ''
            };
        }
        return { value: String(r), funcion: '' };
    }).filter(Boolean);

    if (normResp.length === 0) {
        const r = worksheet.addRow(['No aplica', '', '', '', 'No hay responsabilidades definidas', '', '', '']);
        worksheet.mergeCells(`A${r.number}:D${r.number}`);
        worksheet.mergeCells(`E${r.number}:H${r.number}`);
        r.eachCell(c => {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
            c.border = THIN_BORDER;
            c.alignment = { wrapText: true, vertical: 'top' };
        });
        r.height = COMPACT_ROW_HEIGHT;
    } else {
        normResp.forEach((rp, idx) => {
            const headerRow = worksheet.addRow([]);
            worksheet.mergeCells(`A${headerRow.number}:H${headerRow.number}`);
            const headerCell = worksheet.getCell(`A${headerRow.number}`);
            headerCell.value = `RESPONSABILIDAD ${idx + 1}`;
            headerCell.font = { name: 'Arial', bold: true, color: { argb: 'FF000000' } };
            headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SECTION } };
            headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
            headerCell.border = THIN_BORDER;
            worksheet.getRow(headerRow.number).height = 18;

            const respRow = worksheet.addRow([]);
            worksheet.mergeCells(`A${respRow.number}:H${respRow.number}`);
            const respCell = worksheet.getCell(`A${respRow.number}`);
            respCell.value = rp.value || 'N/A';
            respCell.font = { name: 'Arial', bold: false };
            respCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
            respCell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
            for (let c = 1; c <= 8; c++) {
                const cell = worksheet.getCell(respRow.number, c);
                cell.border = THIN_BORDER;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
            }
            const totalColsWidth = (worksheet.getColumn(1).width || 18)
                                 + (worksheet.getColumn(2).width || 3)
                                 + (worksheet.getColumn(3).width || 3)
                                 + (worksheet.getColumn(4).width || 3)
                                 + (worksheet.getColumn(5).width || 14)
                                 + (worksheet.getColumn(6).width || 14)
                                 + (worksheet.getColumn(7).width || 14)
                                 + (worksheet.getColumn(8).width || 14);
            const respLines = estimateLinesForText(respCell.value, totalColsWidth);
            worksheet.getRow(respRow.number).height = Math.max(20, respLines * LINE_HEIGHT);

            const funcRow = worksheet.addRow([]);
            worksheet.mergeCells(`A${funcRow.number}:H${funcRow.number}`);
            const funcCell = worksheet.getCell(`A${funcRow.number}`);
            funcCell.value = rp.funcion || 'N/A';
            funcCell.font = { name: 'Arial', italic: false };
            funcCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
            funcCell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
            for (let c = 1; c <= 8; c++) {
                const cell = worksheet.getCell(funcRow.number, c);
                cell.border = THIN_BORDER;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_LIGHT } };
            }
            const funcLines = estimateLinesForText(funcCell.value, totalColsWidth);
            worksheet.getRow(funcRow.number).height = Math.max(20, funcLines * LINE_HEIGHT);

            worksheet.addRow([]).height = 2;
        });
    }

    worksheet.addRow([]).height = 6;

    addSectionTitle('ANÁLISIS DE SEGURIDAD Y SALUD EN EL TRABAJO');

    const rn_indicadores = writeLabelRow('Indicadores de Gestión');
    writeSingleBox(rn_indicadores, formData.indicadores_gestion || formData.indicadoresGestion);

    const rn_requisitos = writeLabelRow('Requisitos Físicos');
    writeSingleBox(rn_requisitos, formData.requisitos_fisicos || formData.requisitosFisicos);

    const rn_riesgos_org = writeLabelRow('Riesgos y Obligaciones SST Organizacionales');
    writeSingleBox(rn_riesgos_org, formData.riesgos_obligaciones_sst_organizacionales || formData.riesgosObligacionesOrg);

    const rn_riesgos_esp = writeLabelRow('Riesgos y Obligaciones SST Específicos');
    writeSingleBox(rn_riesgos_esp, formData.riesgos_obligaciones_sst_especificos || formData.riesgosObligacionesEsp);

    worksheet.addRow([]).height = 6;

    const compHeaderRow = worksheet.addRow([]);
    worksheet.mergeCells(`A${compHeaderRow.number}:H${compHeaderRow.number}`);
    const compHdrCell = worksheet.getCell(`A${compHeaderRow.number}`);
    compHdrCell.value = 'COMPLEMENTARIO';
    compHdrCell.font = { name: 'Arial', bold: true, color: { argb: 'FF000000' } };
    compHdrCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SECTION } };
    compHdrCell.alignment = { horizontal: 'center', vertical: 'middle' };
    compHdrCell.border = THIN_BORDER;
    worksheet.getRow(compHeaderRow.number).height = 18;

    const entrenamientoItems = parseToArray(formData.plan_entrenamiento || formData.planEntrenamiento || []);
    const rn_ent = writeLabelRow('Plan de Entrenamiento (Inducción y Acompañamiento - Primeros 90 días)');
    if (entrenamientoItems.length > 0) writeItemsHorizontal(rn_ent, entrenamientoItems);
    else writeSingleBox(rn_ent, 'N/A');

    const capacitacionItems = parseToArray(formData.plan_capacitacion_continua || formData.planCapacitacionContinua || []);
    const rn_cap = writeLabelRow('Plan de Capacitación Continua');
    if (capacitacionItems.length > 0) writeItemsHorizontal(rn_cap, capacitacionItems);
    else writeSingleBox(rn_cap, 'N/A');

    const carreraItems = parseToArray(formData.plan_carrera || formData.planCarrera || []);
    const rn_car = writeLabelRow('Plan Carrera');
    if (carreraItems.length > 0) writeSingleBox(rn_car, carreraItems.map((item, index) => `${index + 1}. ${item}`).join('\n'));
    else writeSingleBox(rn_car, 'N/A');

    const compIngresoItems = parseToArray(formData.competencias_desarrollo_ingreso || formData.competenciasDesarrolloIngreso || []);
    const rn_comp = writeLabelRow('Competencias para desarrollar en el ingreso');
    if (compIngresoItems.length > 0) writeSingleBox(rn_comp, compIngresoItems.map((item, index) => `${index + 1}. ${item}`).join('\n'));
    else writeSingleBox(rn_comp, 'N/A');

    worksheet.addRow([]).height = 6;

    worksheet.eachRow(row => {
        row.eachCell({ includeEmpty: true }, cell => {
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
                        <p style="margin:0 0 10px 0;"><strong>Descripción:</strong> ${formData.misioncargo || 'No definido'}</p>
                        <p style="margin:0 0 10px 0;"><strong>Documento de Excel:</strong> Revise el archivo adjunto.</p>
                        <p style="margin:0 0 20px 0;">Por favor, revisa los detalles completos de la solicitud y toma una decisión:</p>
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

export const generarHtmlCorreoCalidad = async (formData) => {
    const html = generateHtmlCorreo(formData, formData.approvalLink, formData.rejectionLink, 'Solicitud de Aprobación - Calidad');
    const excelAttachment = await generateExcelAttachment(formData, formData.workflow_id);
    return { html, attachments: [excelAttachment] };
};

export const generarHtmlCorreoSeguridad = async (formData) => {
    const html = generateHtmlCorreo(formData, formData.approvalLink, formData.rejectionLink, 'Solicitud de Aprobación - Seguridad y Salud en el Trabajo');
    const excelAttachment = await generateExcelAttachment(formData, formData.workflow_id);
    return { html, attachments: [excelAttachment] };
};  