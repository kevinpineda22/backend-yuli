import multer from 'multer';
import { sendEmail, generarHtmlCorreoArea, generarHtmlCorreoDirector, generarHtmlCorreoGerencia, generarHtmlCorreoSeguridad, generarHtmlCorreoCalidad } from '../services/emailService.js';
import supabase from '../supabaseCliente.js';

export const upload = multer({ storage: multer.memoryStorage() });

// Mapeo de nombres de campos del frontend a columnas de la base de datos
const fieldMapping = {
    nombreCargo: 'nombrecargo',
    areaGeneral: 'areageneral',
    departamento: 'departamento',
    proceso: 'proceso',
    estructuraOrganizacional: 'estructuraorganizacional',
    poblacionFocalizada: 'poblacionfocalizada',
    escolaridad: 'escolaridad',
    area_formacion: 'area_formacion',
    estudiosComplementarios: 'estudioscomplementarios',
    experiencia: 'experiencia',
    jefeInmediato: 'jefeinmediato',
    supervisaA: 'supervisaa',
    numeroPersonasCargo: 'numeropersonascargo',
    tipoContrato: 'tipocontrato',
    misionCargo: 'misioncargo',
    cursosCertificaciones: 'cursoscertificaciones',
    requiereVehiculo: 'requierevehiculo',
    tipoLicencia: 'tipolicencia',
    idiomas: 'idiomas',
    requiereViajar: 'requiereviajar',
    areasRelacionadas: 'areasrelacionadas',
    relacionamientoExterno: 'relacionamientoexterno',
    fecha: 'fecha',
    director: 'director',
    gerencia: 'gerencia',
    calidad: 'calidad',
    seguridad: 'seguridad',
    area: 'area',
    isConstruahorro: 'isConstruahorro',
    isMegamayoristas: 'isMegamayoristas', // NUEVO
    competenciasCulturales: 'competencias_culturales',
    competenciasCargo: 'competencias_cargo',
    responsabilidades: 'responsabilidades',
    indicadores_gestion: 'indicadores_gestion',
    requisitos_fisicos: 'requisitos_fisicos',
    riesgos_obligaciones_sst_organizacionales: 'riesgos_obligaciones_sst_organizacionales',
    riesgos_obligaciones_sst_especificos: 'riesgos_obligaciones_sst_especificos',
    planEntrenamiento: 'plan_entrenamiento',
    planCapacitacionContinua: 'plan_capacitacion_continua',
    planCarrera: 'plan_carrera',
    competenciasDesarrolloIngreso: 'competencias_desarrollo_ingreso',
};

// Mapeo de correos a nombres para personalizar los correos
const correoANombre = {
    "sistemas@merkahorrosas.com": "Yonatan Valencia (Coordinador Sistemas)",
    "gestionhumanamerkahorro@gmail.com": "Yuliana Garcia (Gestion Humana)",
    "compras@merkahorrosas.com": "Julian Hurtado (Coordinador Estrategico de Compras)",
    "logistica@merkahorrosas.com": "Dorancy (Coordinadora Logistica)",
    "desarrollo@merkahorrosas.com": "Kevin Pineda (Analista Especializado en Desarrollo de Software)",
    "operaciones@merkahorrosas.com": "Ramiro Hincapie",
    "contabilidad1@merkahorrosas.com": "Ana Herrera",
    "gestionhumana@merkahorrosas.com": "Yuliana Garcia",
    "gerencia@merkahorrosas.com": "Diego Salazar",
    "gerencia1@merkahorrosas.com": "Stiven Salazar",
    "gerencia@megamayoristas.com": "Adrian Hoyos",
    "gerencia@construahorrosas.com": "William Salazar",
    "Comercialconstruahorro@merkahorrosas.com": "Jaiber (Director Comercial Construahorro)",
    "juanmerkahorro@gmail.com": "Juan (Director Comercial Construahorro)",
    "johanmerkahorro777@gmail.com": "Johan (Gerencia Construahorro)",
    "catherinem.asisge@gmail.com": "Catherine (Seguridad y Salud en el Trabajo)",
    "analista@merkahorrosas.com": "Anny Solarte (Calidad)",
};

// Función auxiliar para parsear los campos JSON del body a objetos de JS
const parseJSONFields = (data) => {
    const newData = { ...data };
    const jsonFields = [
        'poblacionFocalizada', 'competenciasCulturales', 'competenciasCargo',
        'responsabilidades', 'planEntrenamiento', 'planCapacitacionContinua'
    ];
    try {
        jsonFields.forEach(field => {
            if (newData[field] && typeof newData[field] === 'string') {
                newData[field] = JSON.parse(newData[field]);
            }
        });
    } catch (e) {
        console.error("Error al parsear JSON en el controlador:", e);
        jsonFields.forEach(field => {
            newData[field] = [];
        });
    }
    return newData;
};

// Función auxiliar para crear un objeto de datos consolidado para el email
const createEmailData = (body, data) => {
    const parsedData = parseJSONFields(body);
    return {
        ...data,
        ...parsedData,
        poblacionfocalizada: parsedData.poblacionFocalizada,
        competencias_culturales: parsedData.competenciasCulturales,
        competencias_cargo: parsedData.competenciasCargo,
        responsabilidades: parsedData.responsabilidades,
        indicadores_gestion: body.indicadoresGestion,
        requisitos_fisicos: body.requisitosFisicos,
        riesgos_obligaciones_sst_organizacionales: body.riesgosObligacionesOrg,
        riesgos_obligaciones_sst_especificos: body.riesgosObligacionesEsp,
        plan_entrenamiento: parsedData.planEntrenamiento,
        plan_capacitacion_continua: parsedData.planCapacitacionContinua,
        plan_carrera: body.planCarrera,
        competencias_desarrollo_ingreso: body.competenciasDesarrolloIngreso,
    };
};

// Validar destinatario del correo
const validateEmailRecipient = (recipient, formType) => {
    if (!recipient || !correoANombre[recipient]) {
        console.error(`Destinatario no válido para ${formType}:`, recipient);
        return { valid: false, error: `El campo ${formType} debe ser un correo electrónico válido` };
    }
    return { valid: true };
};

function ensureJsonString(value) {
    if (typeof value === 'string') return value;
    try {
        return JSON.stringify(value ?? []);
    } catch {
        return '[]';
    }
}

export const crearFormulario = async (req, res) => {
    try {
        const {
            fecha, director, gerencia, calidad, seguridad, area, isConstruahorro, nombreCargo,
            areaGeneral, departamento, proceso, poblacionFocalizada, escolaridad, area_formacion,
            estudiosComplementarios, experiencia, jefeInmediato, supervisaA, numeroPersonasCargo,
            tipoContrato, misionCargo, cursosCertificaciones, requiereVehiculo, tipoLicencia,
            idiomas, requiereViajar, areasRelacionadas, relacionamientoExterno,
            competenciasCulturales, competenciasCargo, responsabilidades,
            indicadoresGestion, requisitosFisicos, riesgosObligacionesOrg, riesgosObligacionesEsp,
            planEntrenamiento, planCapacitacionContinua, planCarrera, competenciasDesarrolloIngreso,
        } = req.body;
        const { estructuraOrganizacional } = req.files || {};
        const { isMegamayoristas } = req.body; // NUEVO

        // Log del payload recibido
        console.log('Payload recibido en crearFormulario:', { isConstruahorro, director, area });

        // Validar campos obligatorios
        const requiredFields = {
            fecha, director, gerencia, calidad, seguridad, nombreCargo, areaGeneral, departamento, proceso,
            estructuraOrganizacional: estructuraOrganizacional ? estructuraOrganizacional[0] : null,
            escolaridad, area_formacion, experiencia, jefeInmediato, tipoContrato, misionCargo,
            competenciasCulturales, competenciasCargo, responsabilidades,
        };

        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value) {
                console.error(`Campo obligatorio faltante: ${key}`);
                return res.status(400).json({ error: `El campo ${key} es obligatorio` });
            }
        }

        // Validar área solo para Merkahorro y Megamayoristas
        const isConstruahorroForm = isConstruahorro === 'true' || isConstruahorro === true;
        const isMegamayoristasForm = isMegamayoristas === 'true' || isMegamayoristas === true;

        if (!isConstruahorroForm && !isMegamayoristasForm && (!area || !correoANombre[area])) {
            // Merkahorro: área es obligatoria
            console.error('Área no válida para Merkahorro:', area);
            return res.status(400).json({ error: 'El campo área debe ser un correo electrónico válido' });
        }
        if (isMegamayoristasForm && (!director || !correoANombre[director])) {
            // Megamayoristas: director es obligatorio
            console.error('Director no válido para Megamayoristas:', director);
            return res.status(400).json({ error: 'El campo director debe ser un correo electrónico válido' });
        }
        if (isConstruahorroForm && (!director || !correoANombre[director])) {
            // Construahorro: director es obligatorio
            console.error('Director no válido para Construahorro:', director);
            return res.status(400).json({ error: 'El campo director debe ser un correo electrónico válido' });
        }

        if (requiereVehiculo === 'Sí' && !tipoLicencia) {
            console.error('Falta el campo tipoLicencia cuando requiereVehiculo es Sí');
            return res.status(400).json({ error: 'El campo tipo de licencia es obligatorio si requiere vehículo' });
        }

        // Subir estructura organizacional
        let estructuraOrganizacionalUrl = null;
        if (estructuraOrganizacional && estructuraOrganizacional[0]) {
            const fileName = `${Date.now()}_${estructuraOrganizacional[0].originalname}`;
            const { error: uploadError } = await supabase
                .storage.from('pdfs-yuli')
                .upload(fileName, estructuraOrganizacional[0].buffer, { contentType: estructuraOrganizacional[0].mimetype });

            if (uploadError) {
                console.error("Error al subir archivo estructuraOrganizacional:", uploadError);
                return res.status(500).json({ error: 'Error al subir archivo estructuraOrganizacional' });
            }

            const { data: publicUrlData } = supabase.storage.from('pdfs-yuli').getPublicUrl(fileName);
            estructuraOrganizacionalUrl = publicUrlData.publicUrl;
        } else {
            return res.status(400).json({ error: 'El archivo estructura organizacional es obligatorio' });
        }

        // Mapear datos
        const formData = {
            [fieldMapping.fecha]: fecha,
            [fieldMapping.director]: director,
            [fieldMapping.gerencia]: gerencia,
            [fieldMapping.calidad]: calidad,
            [fieldMapping.seguridad]: seguridad,
            [fieldMapping.area]: isConstruahorroForm ? null : area,
            [fieldMapping.nombreCargo]: nombreCargo,
            [fieldMapping.areaGeneral]: areaGeneral,
            [fieldMapping.departamento]: departamento,
            [fieldMapping.proceso]: proceso,
            [fieldMapping.estructuraOrganizacional]: estructuraOrganizacionalUrl,
            [fieldMapping.poblacionFocalizada]: poblacionFocalizada || 'No aplica',
            [fieldMapping.escolaridad]: escolaridad,
            [fieldMapping.area_formacion]: area_formacion,
            [fieldMapping.estudiosComplementarios]: estudiosComplementarios || 'No aplica',
            [fieldMapping.experiencia]: experiencia,
            [fieldMapping.jefeInmediato]: jefeInmediato,
            [fieldMapping.supervisaA]: supervisaA || 'No aplica',
            [fieldMapping.numeroPersonasCargo]: numeroPersonasCargo ? parseInt(numeroPersonasCargo) : null,
            [fieldMapping.tipoContrato]: tipoContrato,
            [fieldMapping.misionCargo]: misionCargo,
            [fieldMapping.cursosCertificaciones]: cursosCertificaciones || 'No aplica',
            [fieldMapping.requiereVehiculo]: requiereVehiculo || 'No aplica',
            [fieldMapping.tipoLicencia]: tipoLicencia || 'No aplica',
            [fieldMapping.idiomas]: idiomas || 'No aplica',
            [fieldMapping.requiereViajar]: requiereViajar || 'No aplica',
            [fieldMapping.areasRelacionadas]: areasRelacionadas || 'No aplica',
            [fieldMapping.relacionamientoExterno]: relacionamientoExterno || 'No aplica',
            [fieldMapping.competenciasCulturales]: ensureJsonString(competenciasCulturales),
            [fieldMapping.competenciasCargo]: ensureJsonString(competenciasCargo),
            [fieldMapping.responsabilidades]: ensureJsonString(responsabilidades),
            [fieldMapping.indicadores_gestion]: indicadoresGestion || 'No aplica',
            [fieldMapping.requisitos_fisicos]: requisitosFisicos || 'No aplica',
            [fieldMapping.riesgos_obligaciones_sst_organizacionales]: riesgosObligacionesOrg || 'No aplica',
            [fieldMapping.riesgos_obligaciones_sst_especificos]: riesgosObligacionesEsp || 'No aplica',
            [fieldMapping.planEntrenamiento]: ensureJsonString(planEntrenamiento),
            [fieldMapping.planCapacitacionContinua]: ensureJsonString(planCapacitacionContinua),
            [fieldMapping.planCarrera]: planCarrera || 'No aplica',
            [fieldMapping.competenciasDesarrolloIngreso]: competenciasDesarrolloIngreso || 'No aplica',
            estado: isConstruahorroForm ? 'pendiente por director' : 'pendiente por area',
            observacion_area: null,
            observacion_director: null,
            observacion_gerencia: null,
            observacion_calidad: null,
            observacion_seguridad: null,
            role: 'creador',
            [fieldMapping.isConstruahorro]: isConstruahorroForm,
            [fieldMapping.isMegamayoristas]: isMegamayoristasForm, // NUEVO
            etapas_aprobadas: [], // Agregar etapas_aprobadas como un array vacío
        };

        // Insertar en Supabase
        const { data, error } = await supabase
            .from('yuli')
            .insert(formData)
            .select()
            .single();

        if (error) {
            console.error("Error al insertar en Supabase:", error);
            return res.status(500).json({ error: error.message });
        }

        const workflow_id = data.id;
        await supabase.from('yuli').update({ workflow_id }).eq('id', workflow_id);

        // Preparar datos para el correo
        const emailFormData = createEmailData(req.body, data);

        // Determinar destinatario y asunto según tipo de formulario
        let emailRecipient, emailSubject, emailData;
        if (isConstruahorroForm) {
            emailRecipient = director;
            emailSubject = "Nueva Solicitud de Aprobación - Director";
            emailData = await generarHtmlCorreoDirector({
                ...emailFormData,
                workflow_id,
                approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/director`,
                rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/director`
            });
        } else {
            // CORRECCIÓN: Tanto Merkahorro como Megamayoristas inician con área
            emailRecipient = area;
            emailSubject = isMegamayoristasForm
                ? "Nueva Solicitud de Aprobación - Área (Megamayoristas)"
                : "Nueva Solicitud de Aprobación - Área";
            emailData = await generarHtmlCorreoArea({
                ...emailFormData,
                workflow_id,
                approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/area`,
                rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/area`
            });
        }

        // Validar destinatario
        const validation = validateEmailRecipient(emailRecipient, isConstruahorroForm ? 'director' : 'area');
        if (!validation.valid) {
            console.error('Destinatario no válido:', emailRecipient, 'Solicitud:', data);
            return res.status(400).json({ error: validation.error });
        }

        // Enviar correo
        console.log('Enviando correo a:', emailRecipient, 'Asunto:', emailSubject);
        await sendEmail(emailRecipient, emailSubject, emailData.html, emailData.attachments);

        res.status(201).json({ message: `Formulario creado y correo enviado a ${isConstruahorroForm ? 'director' : 'área'}`, workflow_id });
    } catch (err) {
        console.error("Error en crearFormulario:", err);
        res.status(500).json({ error: err.message || "Error interno del servidor" });
    }
};

function parseOrArray(val) {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try {
            return JSON.parse(val);
        } catch {
            return [];
        }
    }
    return [];
}

export const reenviarFormulario = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            fecha, director, gerencia, calidad, seguridad, area, isConstruahorro, nombreCargo,
            areaGeneral, departamento, proceso, poblacionFocalizada, escolaridad, area_formacion,
            estudiosComplementarios, experiencia, jefeInmediato, supervisaA, numeroPersonasCargo,
            tipoContrato, misionCargo, cursosCertificaciones, requiereVehiculo, tipoLicencia,
            idiomas, requiereViajar, areasRelacionadas, relacionamientoExterno,
            competenciasCulturales, competenciasCargo, responsabilidades,
            indicadoresGestion, requisitosFisicos, riesgosObligacionesOrg, riesgosObligacionesEsp,
            planEntrenamiento, planCapacitacionContinua, planCarrera, competenciasDesarrolloIngreso,
        } = req.body;
        const { estructuraOrganizacional } = req.files || {};
        const { isMegamayoristas } = req.body; // NUEVO

        // Log del payload recibido
        console.log('Payload recibido en reenviarFormulario:', { id, isConstruahorro, director, area });

        // Obtener la solicitud actual desde Supabase
        const { data: solicitud, error: fetchError } = await supabase
            .from('yuli')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !solicitud) {
            console.error('Error al obtener solicitud:', fetchError);
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        // Asegura que los campos dinámicos sean arrays y luego string JSON
        const competenciasCulturalesArr = parseOrArray(req.body.competenciasCulturales);
        const competenciasCargoArr = parseOrArray(req.body.competenciasCargo);
        const responsabilidadesArr = parseOrArray(req.body.responsabilidades);
        const planEntrenamientoArr = parseOrArray(req.body.planEntrenamiento);
        const planCapacitacionContinuaArr = parseOrArray(req.body.planCapacitacionContinua);

        // CORRECCIÓN: Asegura que isMegamayoristasForm sea booleano
        const isConstruahorroForm = solicitud[fieldMapping.isConstruahorro] === true || solicitud[fieldMapping.isConstruahorro] === 'true';
        const isMegamayoristasForm = solicitud[fieldMapping.isMegamayoristas] === true || solicitud[fieldMapping.isMegamayoristas] === 'true';

        // Validar campos obligatorios
        const requiredFields = {
            fecha, director, gerencia, calidad, seguridad, nombreCargo, areaGeneral, departamento, proceso,
            estructuraOrganizacional: estructuraOrganizacional ? estructuraOrganizacional[0] : null,
            escolaridad, area_formacion, experiencia, jefeInmediato, tipoContrato, misionCargo,
            competenciasCulturales, competenciasCargo, responsabilidades,
        };

        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value) {
                console.error(`Campo obligatorio faltante: ${key}`);
                return res.status(400).json({ error: `El campo ${key} es obligatorio` });
            }
        }

        // Validar área solo para Merkahorro y Megamayoristas
        if (!isConstruahorroForm && !isMegamayoristasForm && (!area || !correoANombre[area])) {
            console.error('Área no válida para Merkahorro:', area);
            return res.status(400).json({ error: 'El campo área debe ser un correo electrónico válido' });
        }
        if (isMegamayoristasForm && (!director || !correoANombre[director])) {
            console.error('Director no válido para Megamayoristas:', director);
            return res.status(400).json({ error: 'El campo director debe ser un correo electrónico válido' });
        }
        if (isConstruahorroForm && (!director || !correoANombre[director])) {
            console.error('Director no válido para Construahorro:', director);
            return res.status(400).json({ error: 'El campo director debe ser un correo electrónico válido' });
        }

        if (requiereVehiculo === 'Sí' && !tipoLicencia) {
            console.error('Falta el campo tipoLicencia cuando requiereVehiculo es Sí');
            return res.status(400).json({ error: 'El campo tipo de licencia es obligatorio si requiere vehículo' });
        }

        // Subir estructura organizacional
        let estructuraOrganizacionalUrl = null;
        if (estructuraOrganizacional && estructuraOrganizacional[0]) {
            const fileName = `${Date.now()}_${estructuraOrganizacional[0].originalname}`;
            const { error: uploadError } = await supabase
                .storage.from('pdfs-yuli')
                .upload(fileName, estructuraOrganizacional[0].buffer, { contentType: estructuraOrganizacional[0].mimetype });

            if (uploadError) {
                console.error("Error al subir archivo estructuraOrganizacional:", uploadError);
                return res.status(500).json({ error: 'Error al subir archivo estructuraOrganizacional' });
            }

            const { data: publicUrlData } = supabase.storage.from('pdfs-yuli').getPublicUrl(fileName);
            estructuraOrganizacionalUrl = publicUrlData.publicUrl;
        } else {
            return res.status(400).json({ error: 'El archivo estructura organizacional es obligatorio' });
        }

        // Mapear datos
        const updates = {
            [fieldMapping.fecha]: fecha,
            [fieldMapping.director]: director,
            [fieldMapping.gerencia]: gerencia,
            [fieldMapping.calidad]: calidad,
            [fieldMapping.seguridad]: seguridad,
            [fieldMapping.area]: isConstruahorroForm ? null : area,
            [fieldMapping.nombreCargo]: nombreCargo,
            [fieldMapping.areaGeneral]: areaGeneral,
            [fieldMapping.departamento]: departamento,
            [fieldMapping.proceso]: proceso,
            [fieldMapping.estructuraOrganizacional]: estructuraOrganizacionalUrl,
            [fieldMapping.poblacionFocalizada]: poblacionFocalizada || 'No aplica',
            [fieldMapping.escolaridad]: escolaridad,
            [fieldMapping.area_formacion]: area_formacion,
            [fieldMapping.estudiosComplementarios]: estudiosComplementarios || 'No aplica',
            [fieldMapping.experiencia]: experiencia,
            [fieldMapping.jefeInmediato]: jefeInmediato,
            [fieldMapping.supervisaA]: supervisaA || 'No aplica',
            [fieldMapping.numeroPersonasCargo]: numeroPersonasCargo ? parseInt(numeroPersonasCargo) : null,
            [fieldMapping.tipoContrato]: tipoContrato,
            [fieldMapping.misionCargo]: misionCargo,
            [fieldMapping.cursosCertificaciones]: cursosCertificaciones || 'No aplica',
            [fieldMapping.requiereVehiculo]: requiereVehiculo || 'No aplica',
            [fieldMapping.tipoLicencia]: tipoLicencia || 'No aplica',
            [fieldMapping.idiomas]: idiomas || 'No aplica',
            [fieldMapping.requiereViajar]: requiereViajar || 'No aplica',
            [fieldMapping.areasRelacionadas]: areasRelacionadas || 'No aplica',
            [fieldMapping.relacionamientoExterno]: relacionamientoExterno || 'No aplica',
            [fieldMapping.competenciasCulturales]: JSON.stringify(competenciasCulturalesArr),
            [fieldMapping.competenciasCargo]: JSON.stringify(competenciasCargoArr),
            [fieldMapping.responsabilidades]: JSON.stringify(responsabilidadesArr),
            [fieldMapping.indicadores_gestion]: indicadoresGestion || 'No aplica',
            [fieldMapping.requisitos_fisicos]: requisitosFisicos || 'No aplica',
            [fieldMapping.riesgos_obligaciones_sst_organizacionales]: riesgosObligacionesOrg || 'No aplica',
            [fieldMapping.riesgos_obligaciones_sst_especificos]: riesgosObligacionesEsp || 'No aplica',
            [fieldMapping.planEntrenamiento]: JSON.stringify(planEntrenamientoArr),
            [fieldMapping.planCapacitacionContinua]: JSON.stringify(planCapacitacionContinuaArr),
            [fieldMapping.planCarrera]: planCarrera || 'No aplica',
            [fieldMapping.competenciasDesarrolloIngreso]: competenciasDesarrolloIngreso || 'No aplica',
            estado: isConstruahorroForm ? 'pendiente por director' : 'pendiente por area',
            observacion_area: null,
            observacion_director: null,
            observacion_gerencia: null,
            observacion_calidad: null,
            observacion_seguridad: null,
            role: 'creador',
            [fieldMapping.isConstruahorro]: isConstruahorroForm,
            [fieldMapping.isMegamayoristas]: isMegamayoristasForm, // NUEVO
            etapas_aprobadas: [], // Agregar etapas_aprobadas como un array vacío
        };

        // Actualizar la solicitud en Supabase
        const { data: updated, error: updateError } = await supabase
            .from('yuli')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error("Error al actualizar en reenviarFormulario:", updateError);
            return res.status(500).json({ error: updateError.message });
        }

        // CORRECCIÓN: Definir emailFormData antes de usarlo
        const emailFormData = createEmailData(req.body, updated);

        // Determinar destinatario y asunto según tipo de formulario
        let emailRecipient, emailSubject, emailData;
        if (isConstruahorroForm) {
            emailRecipient = updated[fieldMapping.director];
            emailSubject = "Reenvío de Solicitud Editada - Director";
            emailData = await generarHtmlCorreoDirector({
                ...emailFormData,
                workflow_id: updated.id,
                approvalLink: `https://www.merkahorro.com/dgdecision/${updated.id}/director`,
                rejectionLink: `https://www.merkahorro.com/dgdecision/${updated.id}/director`
            });
        } else {
            // CORRECCIÓN: Tanto Merkahorro como Megamayoristas reenvían primero al área
            emailRecipient = updated[fieldMapping.area];
            emailSubject = isMegamayoristasForm
                ? "Reenvío de Solicitud Editada - Área (Megamayoristas)"
                : "Reenvío de Solicitud Editada - Área";
            emailData = await generarHtmlCorreoArea({
                ...emailFormData,
                workflow_id: updated.id,
                approvalLink: `https://www.merkahorro.com/dgdecision/${updated.id}/area`,
                rejectionLink: `https://www.merkahorro.com/dgdecision/${updated.id}/area`
            });
        }

        // Validar destinatario
        const validation = validateEmailRecipient(emailRecipient, isConstruahorroForm ? 'director' : 'area');
        if (!validation.valid) {
            console.error('Destinatario no válido:', emailRecipient, 'Solicitud:', updated);
            return res.status(400).json({ error: validation.error });
        }

        // Enviar el correo
        console.log('Enviando correo a:', emailRecipient, 'Asunto:', emailSubject);
        await sendEmail(emailRecipient, emailSubject, emailData.html, emailData.attachments);

        res.json({ message: `Solicitud reenviada, flujo reiniciado y correo enviado a ${isConstruahorroForm ? 'director' : 'área'}` });
    } catch (err) {
        console.error("Error en reenviarFormulario:", err);
        res.status(500).json({ error: err.message || "Error interno al reenviar solicitud" });
    }
};

export const actualizarFormulario = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            fecha, director, gerencia, calidad, seguridad, area, isConstruahorro, nombreCargo,
            areaGeneral, departamento, proceso, poblacionFocalizada, escolaridad, area_formacion,
            estudiosComplementarios, experiencia, jefeInmediato, supervisaA, numeroPersonasCargo,
            tipoContrato, misionCargo, cursosCertificaciones, requiereVehiculo, tipoLicencia,
            idiomas, requiereViajar, areasRelacionadas, relacionamientoExterno,
            competenciasCulturales, competenciasCargo, responsabilidades,
            indicadoresGestion, requisitosFisicos, riesgosObligacionesOrg, riesgosObligacionesEsp,
            planEntrenamiento, planCapacitacionContinua, planCarrera, competenciasDesarrolloIngreso,
        } = req.body;
        const { estructuraOrganizacional } = req.files || {};
        const { isMegamayoristas } = req.body; // NUEVO

        // Log del payload recibido
        console.log('Payload recibido en actualizarFormulario:', { id, isConstruahorro, director, area });

        // Obtener la solicitud actual desde Supabase
        const { data: solicitud, error: fetchError } = await supabase
            .from('yuli')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !solicitud) {
            console.error('Error al obtener solicitud:', fetchError);
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        // Asegura que los campos dinámicos sean arrays y luego string JSON
        const competenciasCulturalesArr = parseOrArray(competenciasCulturales);
        const competenciasCargoArr = parseOrArray(competenciasCargo);
        const responsabilidadesArr = parseOrArray(responsabilidades);
        const planEntrenamientoArr = parseOrArray(planEntrenamiento);
        const planCapacitacionContinuaArr = parseOrArray(planCapacitacionContinua);

        // Usar isConstruahorro y isMegamayoristas del registro en Supabase como fuente principal
        const isConstruahorroForm = solicitud[fieldMapping.isConstruahorro] === true;
        const isMegamayoristasForm = solicitud[fieldMapping.isMegamayoristas] === true; // NUEVO
        console.log('isConstruahorro desde Supabase:', solicitud[fieldMapping.isConstruahorro], 'isConstruahorro desde req.body:', isConstruahorro);

        // Validar campos obligatorios
        const requiredFields = {
            fecha, director, gerencia, calidad, seguridad, nombreCargo, areaGeneral, departamento, proceso,
            estructuraOrganizacional: estructuraOrganizacional ? estructuraOrganizacional[0] : null,
            escolaridad, area_formacion, experiencia, jefeInmediato, tipoContrato, misionCargo,
            competenciasCulturales, competenciasCargo, responsabilidades,
        };

        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value) {
                console.error(`Campo obligatorio faltante: ${key}`);
                return res.status(400).json({ error: `El campo ${key} es obligatorio` });
            }
        }

        // Validar área solo para Merkahorro y Megamayoristas
        if (!isConstruahorroForm && !isMegamayoristasForm && (!area || !correoANombre[area])) {
            console.error('Área no válida para Merkahorro:', area);
            return res.status(400).json({ error: 'El campo área debe ser un correo electrónico válido' });
        }
        if (isMegamayoristasForm && (!director || !correoANombre[director])) {
            console.error('Director no válido para Megamayoristas:', director);
            return res.status(400).json({ error: 'El campo director debe ser un correo electrónico válido' });
        }
        if (isConstruahorroForm && (!director || !correoANombre[director])) {
            console.error('Director no válido para Construahorro:', director);
            return res.status(400).json({ error: 'El campo director debe ser un correo electrónico válido' });
        }

        if (requiereVehiculo === 'Sí' && !tipoLicencia) {
            console.error('Falta el campo tipoLicencia cuando requiereVehiculo es Sí');
            return res.status(400).json({ error: 'El campo tipo de licencia es obligatorio si requiere vehículo' });
        }

        // Subir estructura organizacional
        let estructuraOrganizacionalUrl = null;
        if (estructuraOrganizacional && estructuraOrganizacional[0]) {
            const fileName = `${Date.now()}_${estructuraOrganizacional[0].originalname}`;
            const { error: uploadError } = await supabase
                .storage.from('pdfs-yuli')
                .upload(fileName, estructuraOrganizacional[0].buffer, { contentType: estructuraOrganizacional[0].mimetype });

            if (uploadError) {
                console.error("Error al subir archivo estructuraOrganizacional:", uploadError);
                return res.status(500).json({ error: 'Error al subir archivo estructuraOrganizacional' });
            }

            const { data: publicUrlData } = supabase.storage.from('pdfs-yuli').getPublicUrl(fileName);
            estructuraOrganizacionalUrl = publicUrlData.publicUrl;
        } else {
            return res.status(400).json({ error: 'El archivo estructura organizacional es obligatorio' });
        }

        // Mapear datos
        const updateFields = {
            [fieldMapping.fecha]: fecha,
            [fieldMapping.director]: director,
            [fieldMapping.gerencia]: gerencia,
            [fieldMapping.calidad]: calidad,
            [fieldMapping.seguridad]: seguridad,
            [fieldMapping.area]: isConstruahorroForm ? null : area,
            [fieldMapping.nombreCargo]: nombreCargo,
            [fieldMapping.areaGeneral]: areaGeneral,
            [fieldMapping.departamento]: departamento,
            [fieldMapping.proceso]: proceso,
            [fieldMapping.estructuraOrganizacional]: estructuraOrganizacionalUrl,
            [fieldMapping.poblacionFocalizada]: poblacionFocalizada || 'No aplica',
            [fieldMapping.escolaridad]: escolaridad,
            [fieldMapping.area_formacion]: area_formacion,
            [fieldMapping.estudiosComplementarios]: estudiosComplementarios || 'No aplica',
            [fieldMapping.experiencia]: experiencia,
            [fieldMapping.jefeInmediato]: jefeInmediato,
            [fieldMapping.supervisaA]: supervisaA || 'No aplica',
            [fieldMapping.numeroPersonasCargo]: numeroPersonasCargo ? parseInt(numeroPersonasCargo) : null,
            [fieldMapping.tipoContrato]: tipoContrato,
            [fieldMapping.misionCargo]: misionCargo,
            [fieldMapping.cursosCertificaciones]: cursosCertificaciones || 'No aplica',
            [fieldMapping.requiereVehiculo]: requiereVehiculo || 'No aplica',
            [fieldMapping.tipoLicencia]: tipoLicencia || 'No aplica',
            [fieldMapping.idiomas]: idiomas || 'No aplica',
            [fieldMapping.requiereViajar]: requiereViajar || 'No aplica',
            [fieldMapping.areasRelacionadas]: areasRelacionadas || 'No aplica',
            [fieldMapping.relacionamientoExterno]: relacionamientoExterno || 'No aplica',
            [fieldMapping.competenciasCulturales]: JSON.stringify(competenciasCulturalesArr),
            [fieldMapping.competenciasCargo]: JSON.stringify(competenciasCargoArr),
            [fieldMapping.responsabilidades]: JSON.stringify(responsabilidadesArr),
            [fieldMapping.indicadores_gestion]: indicadoresGestion || 'No aplica',
            [fieldMapping.requisitos_fisicos]: requisitosFisicos || 'No aplica',
            [fieldMapping.riesgos_obligaciones_sst_organizacionales]: riesgosObligacionesOrg || 'No aplica',
            [fieldMapping.riesgos_obligaciones_sst_especificos]: riesgosObligacionesEsp || 'No aplica',
            [fieldMapping.planEntrenamiento]: JSON.stringify(planEntrenamientoArr),
            [fieldMapping.planCapacitacionContinua]: JSON.stringify(planCapacitacionContinuaArr),
            [fieldMapping.planCarrera]: planCarrera || 'No aplica',
            [fieldMapping.competenciasDesarrolloIngreso]: competenciasDesarrolloIngreso || 'No aplica',
            [fieldMapping.isConstruahorro]: isConstruahorroForm,
            [fieldMapping.isMegamayoristas]: isMegamayoristasForm, // NUEVO
        };

        // Actualizar en Supabase
        const { data, error } = await supabase
            .from('yuli')
            .update(updateFields)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error("Error al actualizar en actualizarFormulario:", error);
            return res.status(500).json({ error: error.message });
        }

        res.json({ message: "✅ Solicitud actualizada correctamente", data });
    } catch (err) {
        console.error("Error en actualizarFormulario:", err);
        res.status(500).json({ error: err.message || "Error interno al actualizar solicitud" });
    }
};

export const decision = async (req, res) => {
    try {
        const { id, role } = req.params;
        const { decision, observacion } = req.body;

        // Log de la decisión recibida
        console.log('Procesando decisión:', { id, role, decision, observacion });

        if (!['area', 'director', 'gerencia', 'calidad', 'seguridad'].includes(role)) {
            console.error('Rol no válido:', role);
            return res.status(400).json({ error: 'Rol no válido' });
        }

        if (!['aprobar', 'rechazar'].includes(decision)) {
            console.error('Decisión no válida:', decision);
            return res.status(400).json({ error: 'Decisión no válida' });
        }

        // Obtener la solicitud actual desde Supabase
        const { data: solicitud, error } = await supabase
            .from('yuli')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !solicitud) {
            console.error("Error al obtener solicitud:", error);
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        // Log adicional para depurar el estado y el campo seguridad
        console.log('Solicitud obtenida:', {
            id: solicitud.id,
            estado: solicitud.estado,
            isConstruahorro: solicitud[fieldMapping.isConstruahorro],
            seguridad: solicitud[fieldMapping.seguridad],
            area: solicitud[fieldMapping.area],
            director: solicitud[fieldMapping.director],
        });

        const isConstruahorro = solicitud[fieldMapping.isConstruahorro] === true;
        const isMegamayoristas = solicitud[fieldMapping.isMegamayoristas] === true; // NUEVO
        let updateFields = {};
        let nextEmailRecipient = null;
        let emailSubject = '';
        let emailData = null;
        let etapasAprobadas = solicitud.etapas_aprobadas || []; // Obtener etapas aprobadas existentes

        if (role === 'area' && !(isConstruahorro || isMegamayoristas)) {
            if (solicitud.estado !== 'pendiente por area') {
                console.error('Estado no válido para área:', solicitud.estado);
                return res.status(400).json({ error: 'Estado no válido para aprobación/rechazo por área' });
            }
            updateFields = {
                observacion_area: observacion || null,
                estado: decision === 'aprobar' ? 'pendiente por director' : 'rechazado por area (area)',
                etapas_aprobadas: decision === 'aprobar' ? [...etapasAprobadas, 'area'] : etapasAprobadas,
            };
            if (decision === 'aprobar') {
                nextEmailRecipient = solicitud[fieldMapping.director];
                emailSubject = 'Nueva Solicitud de Aprobación - Director';
                emailData = await generarHtmlCorreoDirector({
                    ...solicitud,
                    workflow_id: solicitud.id,
                    approvalLink: `https://www.merkahorro.com/dgdecision/${solicitud.id}/director`,
                    rejectionLink: `https://www.merkahorro.com/dgdecision/${solicitud.id}/director`,
                });
            }
        } else if (role === 'director') {
            if (solicitud.estado !== 'pendiente por director') {
                console.error('Estado no válido para director:', solicitud.estado);
                return res.status(400).json({ error: 'Estado no válido para aprobación/rechazo por director' });
            }
            updateFields = {
                observacion_director: observacion || null,
                estado: decision === 'aprobar' ? 'pendiente por gerencia' : 'rechazado por director (director)',
                etapas_aprobadas: decision === 'aprobar' ? [...etapasAprobadas, 'director'] : etapasAprobadas,
            };
            if (decision === 'aprobar') {
                nextEmailRecipient = solicitud[fieldMapping.gerencia];
                emailSubject = 'Nueva Solicitud de Aprobación - Gerencia';
                emailData = await generarHtmlCorreoGerencia({
                    ...solicitud,
                    workflow_id: solicitud.id,
                    approvalLink: `https://www.merkahorro.com/dgdecision/${solicitud.id}/gerencia`,
                    rejectionLink: `https://www.merkahorro.com/dgdecision/${solicitud.id}/gerencia`,
                });
            }
        } else if (role === 'gerencia') {
            if (solicitud.estado !== 'pendiente por gerencia') {
                console.error('Estado no válido para gerencia:', solicitud.estado);
                return res.status(400).json({ error: 'Estado no válido para aprobación/rechazo por gerencia' });
            }
            updateFields = {
                observacion_gerencia: observacion || null,
                estado: decision === 'aprobar' ? 'pendiente por calidad' : 'rechazado por gerencia (gerencia)',
                etapas_aprobadas: decision === 'aprobar' ? [...etapasAprobadas, 'gerencia'] : etapasAprobadas,
            };
            if (decision === 'aprobar') {
                nextEmailRecipient = solicitud[fieldMapping.calidad];
                emailSubject = 'Nueva Solicitud de Aprobación - Calidad';
                emailData = await generarHtmlCorreoCalidad({
                    ...solicitud,
                    workflow_id: solicitud.id,
                    approvalLink: `https://www.merkahorro.com/dgdecision/${solicitud.id}/calidad`,
                    rejectionLink: `https://www.merkahorro.com/dgdecision/${solicitud.id}/calidad`,
                });
            }
        } else if (role === 'calidad') {
            if (solicitud.estado !== 'pendiente por calidad') {
                console.error('Estado no válido para calidad:', solicitud.estado);
                return res.status(400).json({ error: 'Estado no válido para aprobación/rechazo por calidad' });
            }
            updateFields = {
                observacion_calidad: observacion || null,
                estado: decision === 'aprobar' ? 'pendiente por seguridad' : 'rechazado por calidad (calidad)',
                etapas_aprobadas: decision === 'aprobar' ? [...etapasAprobadas, 'calidad'] : etapasAprobadas,
            };
            if (decision === 'aprobar') {
                nextEmailRecipient = solicitud[fieldMapping.seguridad];
                emailSubject = 'Nueva Solicitud de Aprobación - Seguridad';
                emailData = await generarHtmlCorreoSeguridad({
                    ...solicitud,
                    workflow_id: solicitud.id,
                    approvalLink: `https://www.merkahorro.com/dgdecision/${solicitud.id}/seguridad`,
                    rejectionLink: `https://www.merkahorro.com/dgdecision/${solicitud.id}/seguridad`,
                });
            }
        } else if (role === 'seguridad') {
            if (solicitud.estado !== 'pendiente por seguridad') {
                console.error('Estado no válido para seguridad:', solicitud.estado);
                return res.status(400).json({ error: 'Estado no válido para aprobación/rechazo por seguridad' });
            }
            updateFields = {
                observacion_seguridad: observacion || null,
                estado: decision === 'aprobar' ? 'aprobado por todos' : 'rechazado por seguridad (seguridad)',
                etapas_aprobadas: decision === 'aprobar' ? [...etapasAprobadas, 'seguridad'] : etapasAprobadas,
            };
            if (decision === 'aprobar' || decision === 'rechazar') {
                // Enviar correo al creador del formulario
                const creatorEmail = isConstruahorro ? solicitud[fieldMapping.director] : solicitud[fieldMapping.area];
                const creatorValidation = validateEmailRecipient(creatorEmail, isConstruahorro ? 'director' : 'area');
                if (creatorValidation.valid) {
                    const finalStatus = decision === 'aprobar' ? 'aprobado por todos' : 'rechazado por seguridad (seguridad)';
                    emailSubject = `Solicitud ${solicitud.id} ${finalStatus}`;
                    emailData = {
                        html: `
                            <h2>Solicitud de Perfil de Cargo #${solicitud.id}</h2>
                            <p>La solicitud para el cargo <strong>${solicitud[fieldMapping.nombreCargo]}</strong> ha sido ${finalStatus}.</p>
                            ${observacion ? `<p><strong>Observación de Seguridad:</strong> ${observacion}</p>` : ''}
                            <p><a href="https://www.merkahorro.com/dgdecision/${solicitud.id}/view">Ver solicitud</a></p>
                        `,
                        attachments: [],
                    };
                    console.log('Enviando correo de resultado final a:', creatorEmail, 'Asunto:', emailSubject);
                    await sendEmail(creatorEmail, emailSubject, emailData.html, emailData.attachments);
                } else {
                    console.warn('No se pudo enviar correo al creador debido a correo inválido:', creatorEmail);
                }
            }
        }

        // Validar destinatario del siguiente correo (si aplica)
        if (decision === 'aprobar' && nextEmailRecipient) {
            const validation = validateEmailRecipient(nextEmailRecipient, role === 'area' ? 'director' : role === 'director' ? 'gerencia' : role === 'gerencia' ? 'calidad' : 'seguridad');
            if (!validation.valid) {
                console.error('Destinatario no válido para el siguiente paso:', nextEmailRecipient);
                return res.status(400).json({ error: validation.error });
            }
        }

        // Actualizar en Supabase
        const { error: updateError } = await supabase
            .from('yuli')
            .update(updateFields)
            .eq('id', id);

        if (updateError) {
            console.error("Error al actualizar estado:", updateError);
            return res.status(500).json({ error: updateError.message });
        }

        // Enviar correo al siguiente aprobador (si aplica)
        if (decision === 'aprobar' && nextEmailRecipient && emailData) {
            console.log('Enviando correo a:', nextEmailRecipient, 'Asunto:', emailSubject);
            await sendEmail(nextEmailRecipient, emailSubject, emailData.html, emailData.attachments);
        }

        // Enviar actualización vía WebSocket (si está configurado)
        if (global.wss) {
            const wsMessage = {
                type: 'solicitudUpdate',
                solicitudId: id,
                newStatus: updateFields.estado,
                updatedData: {
                    [`observacion_${role}`]: observacion || null,
                    etapas_aprobadas: updateFields.etapas_aprobadas,
                },
            };
            global.wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(wsMessage));
                }
            });
        }

        res.json({ message: `Solicitud ${decision === 'aprobar' ? 'aprobada' : 'rechazada'} por ${role}` });
    } catch (err) {
        console.error("Error en decision:", err);
        res.status(500).json({ error: err.message || "Error interno al procesar la decisión" });
    }
};