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
    areaFormacion: 'area_formacion', // Corregido de area_formacion a areaFormacion
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
    isMegamayoristas: 'isMegamayoristas', // Agregado el mapeo de Megamayoristas
    competenciasCulturales: 'competencias_culturales',
    competenciasCargo: 'competencias_cargo',
    responsabilidades: 'responsabilidades',
    indicadoresGestion: 'indicadores_gestion',
    requisitosFisicos: 'requisitos_fisicos',
    riesgosObligacionesOrg: 'riesgos_obligaciones_sst_organizacionales',
    riesgosObligacionesEsp: 'riesgos_obligaciones_sst_especificos',
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
    "Comercialconstruahorro@merkahorrosas.com": "Jaiber (Director Comercial Construahorro)",
    "gerencia@construahorrosas.com": "William Salazar",
    "juanmerkahorro@gmail.com": "Juan (Director Comercial Construahorro)",
    "johanmerkahorro777@gmail.com": "Johan (Gerencia Construahorro)",
    "catherinem.asisge@gmail.com": "Catherine (Seguridad y Salud en el Trabajo)",
    "analista@merkahorrosas.com": "Anny Solarte (Calidad)",
    "director@megamayoristas.com": "Director Megamayoristas",
    "comercial@megamayoristas.com": "Comercial Megamayoristas",
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

export const crearFormulario = async (req, res) => {
    try {
        const parsedBody = parseJSONFields(req.body);
        const {
            fecha, director, gerencia, calidad, seguridad, area, isConstruahorro, isMegamayoristas,
            nombreCargo, areaGeneral, departamento, proceso, poblacionFocalizada, escolaridad,
            areaFormacion, estudiosComplementarios, experiencia, jefeInmediato, supervisaA,
            numeroPersonasCargo, tipoContrato, misionCargo, cursosCertificaciones,
            requiereVehiculo, tipoLicencia, idiomas, requiereViajar, areasRelacionadas,
            relacionamientoExterno, competenciasCulturales, competenciasCargo, responsabilidades,
            indicadoresGestion, requisitosFisicos, riesgosObligacionesOrg, riesgosObligacionesEsp,
            planEntrenamiento, planCapacitacionContinua, planCarrera, competenciasDesarrolloIngreso,
        } = parsedBody;

        const { estructuraOrganizacional } = req.files || {};

        const isConstruahorroForm = isConstruahorro === 'true';
        const isMegamayoristasForm = isMegamayoristas === 'true';

        // Validar campos obligatorios
        const requiredFields = {
            fecha, gerencia, nombreCargo, areaGeneral, departamento, proceso,
            escolaridad, areaFormacion, experiencia, jefeInmediato, tipoContrato, misionCargo,
            competenciasCulturales, competenciasCargo, responsabilidades,
        };

        if (isMegamayoristasForm) {
            requiredFields.area = area;
            requiredFields.director = director;
        } else if (isConstruahorroForm) {
            requiredFields.director = director;
            requiredFields.calidad = calidad;
            requiredFields.seguridad = seguridad;
        } else {
            requiredFields.area = area;
            requiredFields.director = director;
            requiredFields.calidad = calidad;
            requiredFields.seguridad = seguridad;
        }

        if (estructuraOrganizacional && estructuraOrganizacional[0]) {
            requiredFields.estructuraOrganizacional = estructuraOrganizacional[0];
        }

        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value || (Array.isArray(value) && value.length === 0)) {
                return res.status(400).json({ error: `El campo ${key} es obligatorio` });
            }
        }

        if (requiereVehiculo === 'Sí' && !tipoLicencia) {
            return res.status(400).json({ error: 'El campo tipo de licencia es obligatorio si se requiere vehículo' });
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
            [fieldMapping.director]: director || null,
            [fieldMapping.gerencia]: gerencia,
            [fieldMapping.calidad]: calidad || null,
            [fieldMapping.seguridad]: seguridad || null,
            [fieldMapping.area]: isConstruahorroForm ? null : area || null,
            [fieldMapping.isConstruahorro]: isConstruahorroForm,
            [fieldMapping.isMegamayoristas]: isMegamayoristasForm,
            [fieldMapping.nombreCargo]: nombreCargo,
            [fieldMapping.areaGeneral]: areaGeneral,
            [fieldMapping.departamento]: departamento,
            [fieldMapping.proceso]: proceso,
            [fieldMapping.estructuraOrganizacional]: estructuraOrganizacionalUrl,
            [fieldMapping.poblacionFocalizada]: poblacionFocalizada || [],
            [fieldMapping.escolaridad]: escolaridad,
            [fieldMapping.areaFormacion]: areaFormacion,
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
            [fieldMapping.competenciasCulturales]: competenciasCulturales,
            [fieldMapping.competenciasCargo]: competenciasCargo,
            [fieldMapping.responsabilidades]: responsabilidades,
            [fieldMapping.indicadoresGestion]: indicadoresGestion || 'No aplica',
            [fieldMapping.requisitosFisicos]: requisitosFisicos || 'No aplica',
            [fieldMapping.riesgosObligacionesOrg]: riesgosObligacionesOrg || 'No aplica',
            [fieldMapping.riesgosObligacionesEsp]: riesgosObligacionesEsp || 'No aplica',
            [fieldMapping.planEntrenamiento]: planEntrenamiento,
            [fieldMapping.planCapacitacionContinua]: planCapacitacionContinua,
            [fieldMapping.planCarrera]: planCarrera || 'No aplica',
            [fieldMapping.competenciasDesarrolloIngreso]: competenciasDesarrolloIngreso || 'No aplica',
            estado: isConstruahorroForm ? 'pendiente por director' : 'pendiente por area',
            observacion_area: null,
            observacion_director: null,
            observacion_gerencia: null,
            observacion_calidad: null,
            observacion_seguridad: null,
            role: 'creador',
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
        const emailData = createEmailData(req.body, data);
        const emailRecipient = isConstruahorroForm ? director : area;
        const emailSubject = isConstruahorroForm ? "Nueva Solicitud de Aprobación - Director" : "Nueva Solicitud de Aprobación - Área";

        // Validar destinatario
        const validation = validateEmailRecipient(emailRecipient, isConstruahorroForm ? 'director' : 'area');
        if (!validation.valid) {
            console.error('Destinatario no válido:', emailRecipient, 'Solicitud:', data);
            return res.status(400).json({ error: validation.error });
        }

        const emailHtml = await (isConstruahorroForm
            ? generarHtmlCorreoDirector({ ...emailData, workflow_id, approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/director`, rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/director` })
            : generarHtmlCorreoArea({ ...emailData, workflow_id, approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/area`, rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/area` }));

        // Enviar correo
        console.log('Enviando correo a:', emailRecipient, 'Asunto:', emailSubject);
        await sendEmail(emailRecipient, emailSubject, emailHtml.html, emailHtml.attachments);

        res.status(201).json({ message: `Formulario creado y correo enviado a ${isConstruahorroForm ? 'director' : 'área'}`, workflow_id });
    } catch (err) {
        console.error("Error en crearFormulario:", err);
        res.status(500).json({ error: err.message || "Error interno del servidor" });
    }
};

export const reenviarFormulario = async (req, res) => {
    try {
        const { id } = req.params;
        const parsedBody = parseJSONFields(req.body);
        const {
            fecha, director, gerencia, calidad, seguridad, area, isConstruahorro, isMegamayoristas,
            nombreCargo, areaGeneral, departamento, proceso, poblacionFocalizada, escolaridad,
            areaFormacion, estudiosComplementarios, experiencia, jefeInmediato, supervisaA,
            numeroPersonasCargo, tipoContrato, misionCargo, cursosCertificaciones,
            requiereVehiculo, tipoLicencia, idiomas, requiereViajar, areasRelacionadas,
            relacionamientoExterno, competenciasCulturales, competenciasCargo, responsabilidades,
            indicadoresGestion, requisitosFisicos, riesgosObligacionesOrg, riesgosObligacionesEsp,
            planEntrenamiento, planCapacitacionContinua, planCarrera, competenciasDesarrolloIngreso,
        } = parsedBody;

        const { estructuraOrganizacional } = req.files || {};

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

        const isConstruahorroForm = solicitud.isConstruahorro;
        const isMegamayoristasForm = solicitud.isMegamayoristas;

        // Validar campos obligatorios
        const requiredFields = {
            fecha, gerencia, nombreCargo, areaGeneral, departamento, proceso,
            escolaridad, areaFormacion, experiencia, jefeInmediato, tipoContrato, misionCargo,
            competenciasCulturales, competenciasCargo, responsabilidades,
        };

        if (isMegamayoristasForm) {
            requiredFields.area = area;
            requiredFields.director = director;
        } else if (isConstruahorroForm) {
            requiredFields.director = director;
            requiredFields.calidad = calidad;
            requiredFields.seguridad = seguridad;
        } else {
            requiredFields.area = area;
            requiredFields.director = director;
            requiredFields.calidad = calidad;
            requiredFields.seguridad = seguridad;
        }

        if (estructuraOrganizacional && estructuraOrganizacional[0]) {
            requiredFields.estructuraOrganizacional = estructuraOrganizacional[0];
        }

        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value || (Array.isArray(value) && value.length === 0)) {
                return res.status(400).json({ error: `El campo ${key} es obligatorio` });
            }
        }

        if (requiereVehiculo === 'Sí' && !tipoLicencia) {
            return res.status(400).json({ error: 'El campo tipo de licencia es obligatorio si se requiere vehículo' });
        }

        // Subir estructura organizacional
        let estructuraOrganizacionalUrl = solicitud.estructuraorganizacional;
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
        }

        // Mapear datos
        const updates = {
            [fieldMapping.fecha]: fecha,
            [fieldMapping.director]: director || null,
            [fieldMapping.gerencia]: gerencia,
            [fieldMapping.calidad]: calidad || null,
            [fieldMapping.seguridad]: seguridad || null,
            [fieldMapping.area]: isConstruahorroForm ? null : area || null,
            [fieldMapping.isConstruahorro]: isConstruahorroForm,
            [fieldMapping.isMegamayoristas]: isMegamayoristasForm,
            [fieldMapping.nombreCargo]: nombreCargo,
            [fieldMapping.areaGeneral]: areaGeneral,
            [fieldMapping.departamento]: departamento,
            [fieldMapping.proceso]: proceso,
            [fieldMapping.estructuraOrganizacional]: estructuraOrganizacionalUrl,
            [fieldMapping.poblacionFocalizada]: poblacionFocalizada || [],
            [fieldMapping.escolaridad]: escolaridad,
            [fieldMapping.areaFormacion]: areaFormacion,
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
            [fieldMapping.competenciasCulturales]: competenciasCulturales,
            [fieldMapping.competenciasCargo]: competenciasCargo,
            [fieldMapping.responsabilidades]: responsabilidades,
            [fieldMapping.indicadoresGestion]: indicadoresGestion || 'No aplica',
            [fieldMapping.requisitosFisicos]: requisitosFisicos || 'No aplica',
            [fieldMapping.riesgosObligacionesOrg]: riesgosObligacionesOrg || 'No aplica',
            [fieldMapping.riesgosObligacionesEsp]: riesgosObligacionesEsp || 'No aplica',
            [fieldMapping.planEntrenamiento]: planEntrenamiento,
            [fieldMapping.planCapacitacionContinua]: planCapacitacionContinua,
            [fieldMapping.planCarrera]: planCarrera || 'No aplica',
            [fieldMapping.competenciasDesarrolloIngreso]: competenciasDesarrolloIngreso || 'No aplica',
            estado: isConstruahorroForm ? 'pendiente por director' : 'pendiente por area',
            observacion_area: null,
            observacion_director: null,
            observacion_gerencia: null,
            observacion_calidad: null,
            observacion_seguridad: null,
            etapas_aprobadas: [],
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

        // Determinar el destinatario del correo
        const emailRecipient = isConstruahorroForm ? updated[fieldMapping.director] : updated[fieldMapping.area];

        // Validar destinatario
        const validation = validateEmailRecipient(emailRecipient, isConstruahorroForm ? 'director' : 'area');
        if (!validation.valid) {
            console.error('Destinatario no válido:', emailRecipient, 'Solicitud:', updated);
            return res.status(400).json({ error: validation.error });
        }

        const emailSubject = isConstruahorroForm ? "Reenvío de Solicitud Editada - Director" : "Reenvío de Solicitud Editada - Área";

        const emailHtml = await (isConstruahorroForm
            ? generarHtmlCorreoDirector({ ...updated, workflow_id: updated.id, approvalLink: `https://www.merkahorro.com/dgdecision/${updated.id}/director`, rejectionLink: `https://www.merkahorro.com/dgdecision/${updated.id}/director` })
            : generarHtmlCorreoArea({ ...updated, workflow_id: updated.id, approvalLink: `https://www.merkahorro.com/dgdecision/${updated.id}/area`, rejectionLink: `https://www.merkahorro.com/dgdecision/${updated.id}/area` }));

        // Enviar el correo
        console.log('Enviando correo a:', emailRecipient, 'Asunto:', emailSubject);
        await sendEmail(emailRecipient, emailSubject, emailHtml.html, emailHtml.attachments);

        res.json({ message: `Solicitud reenviada, flujo reiniciado y correo enviado a ${isConstruahorroForm ? 'director' : 'área'}` });
    } catch (err) {
        console.error("Error en reenviarFormulario:", err);
        res.status(500).json({ error: err.message || "Error interno al reenviar solicitud" });
    }
};

export const actualizarFormulario = async (req, res) => {
    try {
        const { id } = req.params;
        const parsedBody = parseJSONFields(req.body);
        const {
            fecha, director, gerencia, calidad, seguridad, area, isConstruahorro, isMegamayoristas,
            nombreCargo, areaGeneral, departamento, proceso, poblacionFocalizada, escolaridad,
            areaFormacion, estudiosComplementarios, experiencia, jefeInmediato, supervisaA,
            numeroPersonasCargo, tipoContrato, misionCargo, cursosCertificaciones,
            requiereVehiculo, tipoLicencia, idiomas, requiereViajar, areasRelacionadas,
            relacionamientoExterno, competenciasCulturales, competenciasCargo, responsabilidades,
            indicadoresGestion, requisitosFisicos, riesgosObligacionesOrg, riesgosObligacionesEsp,
            planEntrenamiento, planCapacitacionContinua, planCarrera, competenciasDesarrolloIngreso,
        } = parsedBody;

        const { estructuraOrganizacional } = req.files || {};

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

        const isConstruahorroForm = solicitud.isConstruahorro;
        const isMegamayoristasForm = solicitud.isMegamayoristas;

        // Validar campos obligatorios
        const requiredFields = {
            fecha, gerencia, nombreCargo, areaGeneral, departamento, proceso,
            escolaridad, areaFormacion, experiencia, jefeInmediato, tipoContrato, misionCargo,
            competenciasCulturales, competenciasCargo, responsabilidades,
        };

        if (isMegamayoristasForm) {
            requiredFields.area = area;
            requiredFields.director = director;
        } else if (isConstruahorroForm) {
            requiredFields.director = director;
            requiredFields.calidad = calidad;
            requiredFields.seguridad = seguridad;
        } else {
            requiredFields.area = area;
            requiredFields.director = director;
            requiredFields.calidad = calidad;
            requiredFields.seguridad = seguridad;
        }

        if (requiereVehiculo === 'Sí' && !tipoLicencia) {
            return res.status(400).json({ error: 'El campo tipo de licencia es obligatorio si se requiere vehículo' });
        }

        // Subir estructura organizacional (si se proporciona una nueva)
        let estructuraOrganizacionalUrl = solicitud.estructuraorganizacional;
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
        }


        // Mapear datos
        const updateFields = {
            [fieldMapping.fecha]: fecha,
            [fieldMapping.director]: director || null,
            [fieldMapping.gerencia]: gerencia,
            [fieldMapping.calidad]: calidad || null,
            [fieldMapping.seguridad]: seguridad || null,
            [fieldMapping.area]: isConstruahorroForm ? null : area || null,
            [fieldMapping.isConstruahorro]: isConstruahorroForm,
            [fieldMapping.isMegamayoristas]: isMegamayoristasForm,
            [fieldMapping.nombreCargo]: nombreCargo,
            [fieldMapping.areaGeneral]: areaGeneral,
            [fieldMapping.departamento]: departamento,
            [fieldMapping.proceso]: proceso,
            [fieldMapping.estructuraOrganizacional]: estructuraOrganizacionalUrl,
            [fieldMapping.poblacionFocalizada]: poblacionFocalizada || [],
            [fieldMapping.escolaridad]: escolaridad,
            [fieldMapping.areaFormacion]: areaFormacion,
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
            [fieldMapping.competenciasCulturales]: competenciasCulturales,
            [fieldMapping.competenciasCargo]: competenciasCargo,
            [fieldMapping.responsabilidades]: responsabilidades,
            [fieldMapping.indicadoresGestion]: indicadoresGestion || 'No aplica',
            [fieldMapping.requisitosFisicos]: requisitosFisicos || 'No aplica',
            [fieldMapping.riesgosObligacionesOrg]: riesgosObligacionesOrg || 'No aplica',
            [fieldMapping.riesgosObligacionesEsp]: riesgosObligacionesEsp || 'No aplica',
            [fieldMapping.planEntrenamiento]: planEntrenamiento,
            [fieldMapping.planCapacitacionContinua]: planCapacitacionContinua,
            [fieldMapping.planCarrera]: planCarrera || 'No aplica',
            [fieldMapping.competenciasDesarrolloIngreso]: competenciasDesarrolloIngreso || 'No aplica',
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
            isMegamayoristas: solicitud.isMegamayoristas,
            seguridad: solicitud[fieldMapping.seguridad],
            area: solicitud[fieldMapping.area],
            director: solicitud[fieldMapping.director],
        });

        const isConstruahorro = solicitud.isConstruahorro;
        const isMegamayoristas = solicitud.isMegamayoristas;
        const hasCalidad = !isMegamayoristas;
        const hasSeguridad = !isMegamayoristas;
        const hasArea = !isConstruahorro && !isMegamayoristas;

        let updateFields = {};
        let nextEmailRecipient = null;
        let emailSubject = '';
        let emailHtml = null;
        let finalStatus = '';

        if (decision === 'rechazar') {
            finalStatus = `rechazado por ${role}`;
            updateFields = {
                [`observacion_${role}`]: observacion || null,
                estado: finalStatus,
            };
            // No se envía correo de reenvío si es rechazado, se notifica al creador
            const creatorEmail = isConstruahorro ? solicitud.director : isMegamayoristas ? solicitud.director : solicitud.area;
            const creatorName = correoANombre[creatorEmail] || 'el creador';
            emailSubject = `Solicitud ${solicitud.id} ha sido rechazada`;
            emailHtml = `<h2>Solicitud de Perfil de Cargo #${solicitud.id}</h2><p>La solicitud para el cargo <strong>${solicitud.nombrecargo}</strong> ha sido rechazada por el rol de ${role}.</p>${observacion ? `<p><strong>Observación de ${role}:</strong> ${observacion}</p>` : ''}<p><a href="https://www.merkahorro.com/dgdecision/${solicitud.id}/view">Ver solicitud</a></p>`;
            await sendEmail(creatorEmail, emailSubject, emailHtml, []);

        } else if (decision === 'aprobar') {
            updateFields = {
                [`observacion_${role}`]: observacion || null,
                etapas_aprobadas: [...(solicitud.etapas_aprobadas || []), role],
            };
            const nextStep = getNextStep(role, isConstruahorro, isMegamayoristas, solicitud.etapas_aprobadas);
            if (nextStep) {
                updateFields.estado = `pendiente por ${nextStep.role}`;
                nextEmailRecipient = solicitud[fieldMapping[nextStep.role]];
                emailSubject = `Nueva Solicitud de Aprobación - ${nextStep.role}`;
                emailHtml = nextStep.htmlGenerator({
                    ...solicitud,
                    workflow_id: solicitud.id,
                    approvalLink: `https://www.merkahorro.com/dgdecision/${solicitud.id}/${nextStep.role}`,
                    rejectionLink: `https://www.merkahorro.com/dgdecision/${solicitud.id}/${nextStep.role}`,
                });
            } else {
                updateFields.estado = 'aprobado por todos';
                emailSubject = `Solicitud ${solicitud.id} ha sido aprobada completamente`;
                const creatorEmail = isConstruahorro ? solicitud.director : isMegamayoristas ? solicitud.director : solicitud.area;
                emailHtml = `<h2>Solicitud de Perfil de Cargo #${solicitud.id}</h2><p>La solicitud para el cargo <strong>${solicitud.nombrecargo}</strong> ha sido aprobada completamente.</p>${observacion ? `<p><strong>Observación de ${role}:</strong> ${observacion}</p>` : ''}<p><a href="https://www.merkahorro.com/dgdecision/${solicitud.id}/view">Ver solicitud</a></p>`;
                await sendEmail(creatorEmail, emailSubject, emailHtml, []);
            }
        } else {
             return res.status(400).json({ error: 'Decisión no válida' });
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
        
        // Enviar correo si no fue un rechazo final
        if (decision === 'aprobar' && nextEmailRecipient && emailHtml) {
            await sendEmail(nextEmailRecipient, emailSubject, emailHtml.html, emailHtml.attachments);
        }

        res.json({ message: `Solicitud ${decision === 'aprobar' ? 'aprobada' : 'rechazada'} por ${role}` });
    } catch (err) {
        console.error("Error en decision:", err);
        res.status(500).json({ error: err.message || "Error interno al procesar la decisión" });
    }
};

const getNextStep = (currentRole, isConstruahorro, isMegamayoristas, etapasAprobadas) => {
    const approvalOrder = isMegamayoristas
        ? ['area', 'director', 'gerencia']
        : isConstruahorro
            ? ['director', 'gerencia', 'calidad', 'seguridad']
            : ['area', 'director', 'gerencia', 'calidad', 'seguridad'];
            
    const currentIndex = approvalOrder.indexOf(currentRole);
    if (currentIndex === -1) return null;

    const nextIndex = currentIndex + 1;
    if (nextIndex < approvalOrder.length) {
        const nextRole = approvalOrder[nextIndex];
        const htmlGenerators = {
            'area': generarHtmlCorreoArea,
            'director': generarHtmlCorreoDirector,
            'gerencia': generarHtmlCorreoGerencia,
            'calidad': generarHtmlCorreoCalidad,
            'seguridad': generarHtmlCorreoSeguridad,
        };
        return {
            role: nextRole,
            htmlGenerator: htmlGenerators[nextRole],
        };
    }
    return null; // Última etapa, no hay siguiente paso
};

export const obtenerHistorial = async (req, res) => {
    try {
        const { data: historial, error } = await supabase
            .from('yuli')
            .select('*')
            .order('fecha', { ascending: false });

        if (error) {
            console.error("Error al obtener historial:", error);
            return res.status(500).json({ error: error.message });
        }

        const formattedHistorial = historial.map(item => {
            const isConstruahorro = item.isConstruahorro === true;
            const isMegamayoristas = item.isMegamayoristas === true;

            const baseEstado = item.estado.includes('pendiente') ? `pendiente por ${item.estado.split(' ')[2]}` : item.estado;
            const estadoDisplay = baseEstado;
            const approvalSteps = isMegamayoristas
                ? ['area', 'director', 'gerencia']
                : isConstruahorro
                    ? ['director', 'gerencia', 'calidad', 'seguridad']
                    : ['area', 'director', 'gerencia', 'calidad', 'seguridad'];

            const etapasAprobadas = approvalSteps.filter(step => {
                const stepEstado = item[`observacion_${step}`];
                const isStepApproved = stepEstado !== null && stepEstado !== undefined && !stepEstado.toLowerCase().includes('no');
                return isStepApproved || (item.etapas_aprobadas && item.etapas_aprobadas.includes(step));
            });

            return {
                ...item,
                id: item.id || item.workflow_id,
                estado: estadoDisplay,
                isConstruahorro: isConstruahorro,
                isMegamayoristas: isMegamayoristas,
                etapas_aprobadas: etapasAprobadas,
            };
        });

        res.json({ historial: formattedHistorial });
    } catch (err) {
        console.error("Error en obtenerHistorial:", err);
        res.status(500).json({ error: err.message || "Error interno del servidor" });
    }
};

export const obtenerDetalleFormulario = async (req, res) => {
    try {
        const { workflow_id } = req.params;
        const { data: historial, error } = await supabase
            .from('yuli')
            .select('*')
            .eq('id', workflow_id);

        if (error || historial.length === 0) {
            console.error("Error al obtener el detalle del formulario:", error);
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        const formattedHistorial = historial.map(item => {
            return {
                ...item,
                id: item.id || item.workflow_id,
            };
        });

        res.json({ historial: formattedHistorial });
    } catch (err) {
        console.error("Error en obtenerDetalleFormulario:", err);
        res.status(500).json({ error: err.message || "Error interno del servidor" });
    }
};