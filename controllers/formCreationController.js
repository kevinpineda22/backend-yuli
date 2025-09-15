import multer from 'multer';
import { sendEmail, generarHtmlCorreoArea, generarHtmlCorreoDirector, generarHtmlCorreoGerencia, generarHtmlCorreoSeguridad, generarHtmlCorreoCalidad } from '../services/emailService.js';
import supabase from '../supabaseCliente.js';
import WebSocket from 'ws';

// Mapeo de nombres de campos del frontend a columnas de la base de datos
const fieldMapping = {
    nombreCargo: 'nombrecargo',
    areaGeneral: 'areageneral',
    departamento: 'departamento',
    proceso: 'proceso',
    estructuraOrganizacional: 'estructuraorganizacional',
    poblacionFocalizada: 'poblacionfocalizada',
    escolaridad: 'escolaridad',
    areaFormacion: 'area_formacion',
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
    company: 'company', // Nuevo campo
    isConstruahorro: 'isConstruahorro',
    isMegamayoristas: 'isMegamayoristas', // Nuevo campo
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

export const upload = multer({ storage: multer.memoryStorage() });

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
        const { company } = req.body;
        const { estructuraOrganizacional } = req.files || {};

        // Log del payload recibido
        console.log('Payload recibido en crearFormulario:', req.body);

        // Validar campos obligatorios
        const requiredFields = {
            fecha: req.body.fecha,
            director: req.body.director,
            gerencia: req.body.gerencia,
            calidad: req.body.calidad,
            seguridad: req.body.seguridad,
            nombreCargo: req.body.nombreCargo,
            areaGeneral: req.body.areaGeneral,
            departamento: req.body.departamento,
            proceso: req.body.proceso,
            estructuraOrganizacional: estructuraOrganizacional ? estructuraOrganizacional[0] : null,
            escolaridad: req.body.escolaridad,
            area_formacion: req.body.areaFormacion,
            experiencia: req.body.experiencia,
            jefeInmediato: req.body.jefeInmediato,
            tipoContrato: req.body.tipoContrato,
            misionCargo: req.body.misionCargo,
            competenciasCulturales: req.body.competenciasCulturales,
            competenciasCargo: req.body.competenciasCargo,
            responsabilidades: req.body.responsabilidades,
        };

        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value) {
                console.error(`Campo obligatorio faltante: ${key}`);
                return res.status(400).json({ error: `El campo ${key} es obligatorio` });
            }
        }

        if (company !== 'construahorro' && (!req.body.area || !correoANombre[req.body.area])) {
            console.error('Área no válida para Merkahorro/Megamayoristas:', req.body.area);
            return res.status(400).json({ error: 'El campo área debe ser un correo electrónico válido' });
        }

        if (req.body.requiereVehiculo === 'Sí' && !req.body.tipoLicencia) {
            console.error('Falta el campo tipoLicencia cuando requiereVehiculo es Sí');
            return res.status(400).json({ error: 'El campo tipo de licencia es obligatorio si requiere vehículo' });
        }

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

        const formData = {
            [fieldMapping.fecha]: req.body.fecha,
            [fieldMapping.director]: req.body.director,
            [fieldMapping.gerencia]: req.body.gerencia,
            [fieldMapping.calidad]: req.body.calidad,
            [fieldMapping.seguridad]: req.body.seguridad,
            [fieldMapping.area]: company === 'construahorro' ? null : req.body.area,
            [fieldMapping.nombreCargo]: req.body.nombreCargo,
            [fieldMapping.areaGeneral]: req.body.areaGeneral,
            [fieldMapping.departamento]: req.body.departamento,
            [fieldMapping.proceso]: req.body.proceso,
            [fieldMapping.estructuraOrganizacional]: estructuraOrganizacionalUrl,
            [fieldMapping.poblacionFocalizada]: req.body.poblacionFocalizada || 'No aplica',
            [fieldMapping.escolaridad]: req.body.escolaridad,
            [fieldMapping.areaFormacion]: req.body.areaFormacion,
            [fieldMapping.estudiosComplementarios]: req.body.estudiosComplementarios || 'No aplica',
            [fieldMapping.experiencia]: req.body.experiencia,
            [fieldMapping.jefeInmediato]: req.body.jefeInmediato,
            [fieldMapping.supervisaA]: req.body.supervisaA || 'No aplica',
            [fieldMapping.numeroPersonasCargo]: req.body.numeroPersonasCargo ? parseInt(req.body.numeroPersonasCargo) : null,
            [fieldMapping.tipoContrato]: req.body.tipoContrato,
            [fieldMapping.misionCargo]: req.body.misionCargo,
            [fieldMapping.cursosCertificaciones]: req.body.cursosCertificaciones || 'No aplica',
            [fieldMapping.requiereVehiculo]: req.body.requiereVehiculo || 'No aplica',
            [fieldMapping.tipoLicencia]: req.body.tipoLicencia || 'No aplica',
            [fieldMapping.idiomas]: req.body.idiomas || 'No aplica',
            [fieldMapping.requiereViajar]: req.body.requiereViajar || 'No aplica',
            [fieldMapping.areasRelacionadas]: req.body.areasRelacionadas || 'No aplica',
            [fieldMapping.relacionamientoExterno]: req.body.relacionamientoExterno || 'No aplica',
            [fieldMapping.competenciasCulturales]: req.body.competenciasCulturales,
            [fieldMapping.competenciasCargo]: req.body.competenciasCargo,
            [fieldMapping.responsabilidades]: req.body.responsabilidades,
            [fieldMapping.indicadores_gestion]: req.body.indicadoresGestion || 'No aplica',
            [fieldMapping.requisitos_fisicos]: req.body.requisitosFisicos || 'No aplica',
            [fieldMapping.riesgos_obligaciones_sst_organizacionales]: req.body.riesgosObligacionesOrg || 'No aplica',
            [fieldMapping.riesgos_obligaciones_sst_especificos]: req.body.riesgosObligacionesEsp || 'No aplica',
            [fieldMapping.planEntrenamiento]: req.body.planEntrenamiento || JSON.stringify([]),
            [fieldMapping.planCapacitacionContinua]: req.body.planCapacitacionContinua || JSON.stringify([]),
            [fieldMapping.planCarrera]: req.body.planCarrera || 'No aplica',
            [fieldMapping.competenciasDesarrolloIngreso]: req.body.competenciasDesarrolloIngreso || 'No aplica',
            estado: company === 'construahorro' ? 'pendiente por director' : 'pendiente por area',
            observacion_area: null,
            observacion_director: null,
            observacion_gerencia: null,
            observacion_calidad: null,
            observacion_seguridad: null,
            role: 'creador',
            [fieldMapping.company]: company,
            [fieldMapping.isConstruahorro]: company === 'construahorro',
            [fieldMapping.isMegamayoristas]: company === 'megamayoristas',
            etapas_aprobadas: [],
        };

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

        const emailFormData = createEmailData(req.body, data);
        const emailRecipient = company === 'construahorro' ? req.body.director : req.body.area;
        const emailSubject = `Nueva Solicitud de Aprobación - ${company.charAt(0).toUpperCase() + company.slice(1)}`;

        const validation = validateEmailRecipient(emailRecipient, company);
        if (!validation.valid) {
            console.error('Destinatario no válido:', emailRecipient, 'Solicitud:', data);
            return res.status(400).json({ error: validation.error });
        }

        let emailHtml;
        if (company === 'construahorro' || company === 'megamayoristas') {
            emailHtml = await generarHtmlCorreoDirector({ ...emailFormData, workflow_id, approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/director`, rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/director` });
        } else {
            emailHtml = await generarHtmlCorreoArea({ ...emailFormData, workflow_id, approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/area`, rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/area` });
        }

        await sendEmail(emailRecipient, emailSubject, emailHtml.html, emailHtml.attachments);

        res.status(201).json({ message: `Formulario creado y correo enviado a ${company}`, workflow_id });
    } catch (err) {
        console.error("Error en crearFormulario:", err);
        res.status(500).json({ error: err.message || "Error interno del servidor" });
    }
};

export const reenviarFormulario = async (req, res) => {
    try {
        const { id } = req.params;
        const { company } = req.body;
        const { estructuraOrganizacional } = req.files || {};
        const { data: solicitud, error: fetchError } = await supabase.from('yuli').select('*').eq('id', id).single();

        if (fetchError || !solicitud) {
            console.error('Error al obtener solicitud:', fetchError);
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        const requiredFields = {
            fecha: req.body.fecha,
            director: req.body.director,
            gerencia: req.body.gerencia,
            calidad: req.body.calidad,
            seguridad: req.body.seguridad,
            nombreCargo: req.body.nombreCargo,
            areaGeneral: req.body.areaGeneral,
            departamento: req.body.departamento,
            proceso: req.body.proceso,
            estructuraOrganizacional: estructuraOrganizacional ? estructuraOrganizacional[0] : null,
            escolaridad: req.body.escolaridad,
            area_formacion: req.body.areaFormacion,
            experiencia: req.body.experiencia,
            jefeInmediato: req.body.jefeInmediato,
            tipoContrato: req.body.tipoContrato,
            misionCargo: req.body.misionCargo,
            competenciasCulturales: req.body.competenciasCulturales,
            competenciasCargo: req.body.competenciasCargo,
            responsabilidades: req.body.responsabilidades,
        };

        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value) {
                console.error(`Campo obligatorio faltante: ${key}`);
                return res.status(400).json({ error: `El campo ${key} es obligatorio` });
            }
        }
        
        if (company !== 'construahorro' && (!req.body.area || !correoANombre[req.body.area])) {
            console.error('Área no válida para Merkahorro/Megamayoristas:', req.body.area);
            return res.status(400).json({ error: 'El campo área debe ser un correo electrónico válido' });
        }

        if (req.body.requiereVehiculo === 'Sí' && !req.body.tipoLicencia) {
            console.error('Falta el campo tipoLicencia cuando requiereVehiculo es Sí');
            return res.status(400).json({ error: 'El campo tipo de licencia es obligatorio si requiere vehículo' });
        }

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

        const updates = {
            [fieldMapping.fecha]: req.body.fecha,
            [fieldMapping.director]: req.body.director,
            [fieldMapping.gerencia]: req.body.gerencia,
            [fieldMapping.calidad]: req.body.calidad,
            [fieldMapping.seguridad]: req.body.seguridad,
            [fieldMapping.area]: company === 'construahorro' ? null : req.body.area,
            [fieldMapping.nombreCargo]: req.body.nombreCargo,
            [fieldMapping.areaGeneral]: req.body.areaGeneral,
            [fieldMapping.departamento]: req.body.departamento,
            [fieldMapping.proceso]: req.body.proceso,
            [fieldMapping.estructuraOrganizacional]: estructuraOrganizacionalUrl,
            [fieldMapping.poblacionFocalizada]: req.body.poblacionFocalizada || 'No aplica',
            [fieldMapping.escolaridad]: req.body.escolaridad,
            [fieldMapping.areaFormacion]: req.body.areaFormacion,
            [fieldMapping.estudiosComplementarios]: req.body.estudiosComplementarios || 'No aplica',
            [fieldMapping.experiencia]: req.body.experiencia,
            [fieldMapping.jefeInmediato]: req.body.jefeInmediato,
            [fieldMapping.supervisaA]: req.body.supervisaA || 'No aplica',
            [fieldMapping.numeroPersonasCargo]: req.body.numeroPersonasCargo ? parseInt(req.body.numeroPersonasCargo) : null,
            [fieldMapping.tipoContrato]: req.body.tipoContrato,
            [fieldMapping.misionCargo]: req.body.misionCargo,
            [fieldMapping.cursosCertificaciones]: req.body.cursosCertificaciones || 'No aplica',
            [fieldMapping.requiereVehiculo]: req.body.requiereVehiculo || 'No aplica',
            [fieldMapping.tipoLicencia]: req.body.tipoLicencia || 'No aplica',
            [fieldMapping.idiomas]: req.body.idiomas || 'No aplica',
            [fieldMapping.requiereViajar]: req.body.requiereViajar || 'No aplica',
            [fieldMapping.areasRelacionadas]: req.body.areasRelacionadas || 'No aplica',
            [fieldMapping.relacionamientoExterno]: req.body.relacionamientoExterno || 'No aplica',
            [fieldMapping.competenciasCulturales]: req.body.competenciasCulturales,
            [fieldMapping.competenciasCargo]: req.body.competenciasCargo,
            [fieldMapping.responsabilidades]: req.body.responsabilidades,
            [fieldMapping.indicadores_gestion]: req.body.indicadoresGestion || 'No aplica',
            [fieldMapping.requisitos_fisicos]: req.body.requisitosFisicos || 'No aplica',
            [fieldMapping.riesgos_obligaciones_sst_organizacionales]: req.body.riesgosObligacionesOrg || 'No aplica',
            [fieldMapping.riesgos_obligaciones_sst_especificos]: req.body.riesgosObligacionesEsp || 'No aplica',
            [fieldMapping.planEntrenamiento]: req.body.planEntrenamiento || JSON.stringify([]),
            [fieldMapping.planCapacitacionContinua]: req.body.planCapacitacionContinua || JSON.stringify([]),
            [fieldMapping.planCarrera]: req.body.planCarrera || 'No aplica',
            [fieldMapping.competenciasDesarrolloIngreso]: req.body.competenciasDesarrolloIngreso || 'No aplica',
            estado: company === 'construahorro' ? 'pendiente por director' : 'pendiente por area',
            observacion_area: null,
            observacion_director: null,
            observacion_gerencia: null,
            observacion_calidad: null,
            observacion_seguridad: null,
            etapas_aprobadas: [],
            [fieldMapping.company]: company,
            [fieldMapping.isConstruahorro]: company === 'construahorro',
            [fieldMapping.isMegamayoristas]: company === 'megamayoristas',
        };

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

        const emailRecipient = company === 'construahorro' ? updated[fieldMapping.director] : updated[fieldMapping.area];
        const validation = validateEmailRecipient(emailRecipient, company);
        if (!validation.valid) {
            console.error('Destinatario no válido:', emailRecipient, 'Solicitud:', updated);
            return res.status(400).json({ error: validation.error });
        }

        const emailSubject = `Reenvío de Solicitud Editada - ${company.charAt(0).toUpperCase() + company.slice(1)}`;
        let emailHtml;
        if (company === 'construahorro' || company === 'megamayoristas') {
            emailHtml = await generarHtmlCorreoDirector({ ...updated, workflow_id: updated.id, approvalLink: `https://www.merkahorro.com/dgdecision/${updated.id}/director`, rejectionLink: `https://www.merkahorro.com/dgdecision/${updated.id}/director` });
        } else {
            emailHtml = await generarHtmlCorreoArea({ ...updated, workflow_id: updated.id, approvalLink: `https://www.merkahorro.com/dgdecision/${updated.id}/area`, rejectionLink: `https://www.merkahorro.com/dgdecision/${updated.id}/area` });
        }

        await sendEmail(emailRecipient, emailSubject, emailHtml.html, emailHtml.attachments);

        res.json({ message: `Solicitud reenviada, flujo reiniciado y correo enviado a ${company}` });
    } catch (err) {
        console.error("Error en reenviarFormulario:", err);
        res.status(500).json({ error: err.message || "Error interno al reenviar solicitud" });
    }
};

export const actualizarFormulario = async (req, res) => {
    try {
        const { id } = req.params;
        const { company } = req.body;
        const { estructuraOrganizacional } = req.files || {};
        const { data: solicitud, error: fetchError } = await supabase.from('yuli').select('*').eq('id', id).single();

        if (fetchError || !solicitud) {
            console.error('Error al obtener solicitud:', fetchError);
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        const requiredFields = {
            fecha: req.body.fecha,
            director: req.body.director,
            gerencia: req.body.gerencia,
            calidad: req.body.calidad,
            seguridad: req.body.seguridad,
            nombreCargo: req.body.nombreCargo,
            areaGeneral: req.body.areaGeneral,
            departamento: req.body.departamento,
            proceso: req.body.proceso,
            estructuraOrganizacional: estructuraOrganizacional ? estructuraOrganizacional[0] : null,
            escolaridad: req.body.escolaridad,
            area_formacion: req.body.areaFormacion,
            experiencia: req.body.experiencia,
            jefeInmediato: req.body.jefeInmediato,
            tipoContrato: req.body.tipoContrato,
            misionCargo: req.body.misionCargo,
            competenciasCulturales: req.body.competenciasCulturales,
            competenciasCargo: req.body.competenciasCargo,
            responsabilidades: req.body.responsabilidades,
        };

        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value && !solicitud[fieldMapping[key]]) {
                console.error(`Campo obligatorio faltante: ${key}`);
                return res.status(400).json({ error: `El campo ${key} es obligatorio` });
            }
        }
        
        if (company !== 'construahorro' && (!req.body.area || !correoANombre[req.body.area])) {
            console.error('Área no válida para Merkahorro/Megamayoristas:', req.body.area);
            return res.status(400).json({ error: 'El campo área debe ser un correo electrónico válido' });
        }

        if (req.body.requiereVehiculo === 'Sí' && !req.body.tipoLicencia) {
            console.error('Falta el campo tipoLicencia cuando requiereVehiculo es Sí');
            return res.status(400).json({ error: 'El campo tipo de licencia es obligatorio si requiere vehículo' });
        }

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

        const updateFields = {
            [fieldMapping.fecha]: req.body.fecha,
            [fieldMapping.director]: req.body.director,
            [fieldMapping.gerencia]: req.body.gerencia,
            [fieldMapping.calidad]: req.body.calidad,
            [fieldMapping.seguridad]: req.body.seguridad,
            [fieldMapping.area]: company === 'construahorro' ? null : req.body.area,
            [fieldMapping.nombreCargo]: req.body.nombreCargo,
            [fieldMapping.areaGeneral]: req.body.areaGeneral,
            [fieldMapping.departamento]: req.body.departamento,
            [fieldMapping.proceso]: req.body.proceso,
            [fieldMapping.estructuraOrganizacional]: estructuraOrganizacionalUrl,
            [fieldMapping.poblacionFocalizada]: req.body.poblacionFocalizada || 'No aplica',
            [fieldMapping.escolaridad]: req.body.escolaridad,
            [fieldMapping.areaFormacion]: req.body.areaFormacion,
            [fieldMapping.estudiosComplementarios]: req.body.estudiosComplementarios || 'No aplica',
            [fieldMapping.experiencia]: req.body.experiencia,
            [fieldMapping.jefeInmediato]: req.body.jefeInmediato,
            [fieldMapping.supervisaA]: req.body.supervisaA || 'No aplica',
            [fieldMapping.numeroPersonasCargo]: req.body.numeroPersonasCargo ? parseInt(req.body.numeroPersonasCargo) : null,
            [fieldMapping.tipoContrato]: req.body.tipoContrato,
            [fieldMapping.misionCargo]: req.body.misionCargo,
            [fieldMapping.cursosCertificaciones]: req.body.cursosCertificaciones || 'No aplica',
            [fieldMapping.requiereVehiculo]: req.body.requiereVehiculo || 'No aplica',
            [fieldMapping.tipoLicencia]: req.body.tipoLicencia || 'No aplica',
            [fieldMapping.idiomas]: req.body.idiomas || 'No aplica',
            [fieldMapping.requiereViajar]: req.body.requiereViajar || 'No aplica',
            [fieldMapping.areasRelacionadas]: req.body.areasRelacionadas || 'No aplica',
            [fieldMapping.relacionamientoExterno]: req.body.relacionamientoExterno || 'No aplica',
            [fieldMapping.competenciasCulturales]: req.body.competenciasCulturales,
            [fieldMapping.competenciasCargo]: req.body.competenciasCargo,
            [fieldMapping.responsabilidades]: req.body.responsabilidades,
            [fieldMapping.indicadores_gestion]: req.body.indicadoresGestion || 'No aplica',
            [fieldMapping.requisitos_fisicos]: req.body.requisitosFisicos || 'No aplica',
            [fieldMapping.riesgos_obligaciones_sst_organizacionales]: req.body.riesgosObligacionesOrg || 'No aplica',
            [fieldMapping.riesgos_obligaciones_sst_especificos]: req.body.riesgosObligacionesEsp || 'No aplica',
            [fieldMapping.planEntrenamiento]: req.body.planEntrenamiento || JSON.stringify([]),
            [fieldMapping.planCapacitacionContinua]: req.body.planCapacitacionContinua || JSON.stringify([]),
            [fieldMapping.planCarrera]: req.body.planCarrera || 'No aplica',
            [fieldMapping.competenciasDesarrolloIngreso]: req.body.competenciasDesarrolloIngreso || 'No aplica',
            [fieldMapping.company]: company,
            [fieldMapping.isConstruahorro]: company === 'construahorro',
            [fieldMapping.isMegamayoristas]: company === 'megamayoristas',
        };

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

        console.log('Procesando decisión:', { id, role, decision, observacion });

        if (!['area', 'director', 'gerencia', 'calidad', 'seguridad'].includes(role)) {
            console.error('Rol no válido:', role);
            return res.status(400).json({ error: 'Rol no válido' });
        }

        if (!['aprobar', 'rechazar'].includes(decision)) {
            console.error('Decisión no válida:', decision);
            return res.status(400).json({ error: 'Decisión no válida' });
        }

        const { data: solicitud, error } = await supabase
            .from('yuli')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !solicitud) {
            console.error("Error al obtener solicitud:", error);
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        console.log('Solicitud obtenida:', { id: solicitud.id, estado: solicitud.estado, company: solicitud[fieldMapping.company] });

        const company = solicitud[fieldMapping.company];
        let updateFields = {};
        let nextEmailRecipient = null;
        let emailSubject = '';
        let emailData = null;
        let etapasAprobadas = solicitud.etapas_aprobadas || [];

        const isMerkahorro = company === 'merkahorro';
        const isConstruahorro = company === 'construahorro';
        const isMegamayoristas = company === 'megamayoristas';

        if (role === 'area' && (isMerkahorro || isMegamayoristas)) {
            if (solicitud.estado !== 'pendiente por area') {
                console.error('Estado no válido para área:', solicitud.estado);
                return res.status(400).json({ error: 'Estado no válido para aprobación/rechazo por área' });
            }
            updateFields = {
                observacion_area: observacion || null,
                estado: decision === 'aprobar' ? 'pendiente por director' : `rechazado por area (${solicitud.area})`,
                etapas_aprobadas: decision === 'aprobar' ? [...etapasAprobadas, 'area'] : etapasAprobadas,
            };
            if (decision === 'aprobar') {
                nextEmailRecipient = solicitud[fieldMapping.director];
                emailSubject = `Nueva Solicitud de Aprobación - Director de ${company}`;
                emailData = await generarHtmlCorreoDirector({
                    ...solicitud,
                    workflow_id: solicitud.id,
                    approvalLink: `https://www.merkahorro.com/dgdecision/${solicitud.id}/director`,
                    rejectionLink: `https://www.merkahorro.com/dgdecision/${solicitud.id}/director`,
                });
            }
        } else if (role === 'director' && (isMerkahorro || isConstruahorro || isMegamayoristas)) {
            if (solicitud.estado !== 'pendiente por director') {
                console.error('Estado no válido para director:', solicitud.estado);
                return res.status(400).json({ error: 'Estado no válido para aprobación/rechazo por director' });
            }
            updateFields = {
                observacion_director: observacion || null,
                estado: decision === 'aprobar' ? 'pendiente por gerencia' : `rechazado por director (${solicitud.director})`,
                etapas_aprobadas: decision === 'aprobar' ? [...etapasAprobadas, 'director'] : etapasAprobadas,
            };
            if (decision === 'aprobar') {
                nextEmailRecipient = solicitud[fieldMapping.gerencia];
                emailSubject = `Nueva Solicitud de Aprobación - Gerencia de ${company}`;
                emailData = await generarHtmlCorreoGerencia({
                    ...solicitud,
                    workflow_id: solicitud.id,
                    approvalLink: `https://www.merkahorro.com/dgdecision/${solicitud.id}/gerencia`,
                    rejectionLink: `https://www.merkahorro.com/dgdecision/${solicitud.id}/gerencia`,
                });
            }
        } else if (role === 'gerencia' && (isMerkahorro || isConstruahorro || isMegamayoristas)) {
            if (solicitud.estado !== 'pendiente por gerencia') {
                console.error('Estado no válido para gerencia:', solicitud.estado);
                return res.status(400).json({ error: 'Estado no válido para aprobación/rechazo por gerencia' });
            }
            updateFields = {
                observacion_gerencia: observacion || null,
                estado: decision === 'aprobar' ? 'pendiente por calidad' : `rechazado por gerencia (${solicitud.gerencia})`,
                etapas_aprobadas: decision === 'aprobar' ? [...etapasAprobadas, 'gerencia'] : etapasAprobadas,
            };
            if (decision === 'aprobar') {
                nextEmailRecipient = solicitud[fieldMapping.calidad];
                emailSubject = `Nueva Solicitud de Aprobación - Calidad de ${company}`;
                emailData = await generarHtmlCorreoCalidad({
                    ...solicitud,
                    workflow_id: solicitud.id,
                    approvalLink: `https://www.merkahorro.com/dgdecision/${solicitud.id}/calidad`,
                    rejectionLink: `https://www.merkahorro.com/dgdecision/${solicitud.id}/calidad`,
                });
            }
        } else if (role === 'calidad' && (isMerkahorro || isConstruahorro || isMegamayoristas)) {
            if (solicitud.estado !== 'pendiente por calidad') {
                console.error('Estado no válido para calidad:', solicitud.estado);
                return res.status(400).json({ error: 'Estado no válido para aprobación/rechazo por calidad' });
            }
            updateFields = {
                observacion_calidad: observacion || null,
                estado: decision === 'aprobar' ? 'pendiente por seguridad' : `rechazado por calidad (${solicitud.calidad})`,
                etapas_aprobadas: decision === 'aprobar' ? [...etapasAprobadas, 'calidad'] : etapasAprobadas,
            };
            if (decision === 'aprobar') {
                nextEmailRecipient = solicitud[fieldMapping.seguridad];
                emailSubject = `Nueva Solicitud de Aprobación - Seguridad de ${company}`;
                emailData = await generarHtmlCorreoSeguridad({
                    ...solicitud,
                    workflow_id: solicitud.id,
                    approvalLink: `https://www.merkahorro.com/dgdecision/${solicitud.id}/seguridad`,
                    rejectionLink: `https://www.merkahorro.com/dgdecision/${solicitud.id}/seguridad`,
                });
            }
        } else if (role === 'seguridad' && (isMerkahorro || isConstruahorro || isMegamayoristas)) {
            if (solicitud.estado !== 'pendiente por seguridad') {
                console.error('Estado no válido para seguridad:', solicitud.estado);
                return res.status(400).json({ error: 'Estado no válido para aprobación/rechazo por seguridad' });
            }
            updateFields = {
                observacion_seguridad: observacion || null,
                estado: decision === 'aprobar' ? 'aprobado por todos' : `rechazado por seguridad (${solicitud.seguridad})`,
                etapas_aprobadas: decision === 'aprobar' ? [...etapasAprobadas, 'seguridad'] : etapasAprobadas,
            };
            if (decision === 'aprobar' || decision === 'rechazar') {
                const creatorEmail = (isConstruahorro || isMegamayoristas) ? solicitud[fieldMapping.director] : solicitud[fieldMapping.area];
                const creatorValidation = validateEmailRecipient(creatorEmail, `creador de ${company}`);
                if (creatorValidation.valid) {
                    const finalStatus = decision === 'aprobar' ? 'aprobado por todos' : `rechazado por seguridad (${solicitud.seguridad})`;
                    emailSubject = `Solicitud ${solicitud.id} ${finalStatus}`;
                    emailData = {
                        html: `
                            <h2>Solicitud de Perfil de Cargo #${solicitud.id}</h2>
                            <p>La solicitud para el cargo <strong>${solicitud[fieldMapping.nombreCargo]}</strong> de la empresa <strong>${company}</strong> ha sido ${finalStatus}.</p>
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
        } else {
            return res.status(400).json({ error: 'Rol o estado de la solicitud no válido para la acción' });
        }

        if (decision === 'aprobar' && nextEmailRecipient) {
            const validation = validateEmailRecipient(nextEmailRecipient, 'siguiente aprobador');
            if (!validation.valid) {
                console.error('Destinatario no válido para el siguiente paso:', nextEmailRecipient);
                return res.status(400).json({ error: validation.error });
            }
        }

        const { error: updateError } = await supabase
            .from('yuli')
            .update(updateFields)
            .eq('id', id);

        if (updateError) {
            console.error("Error al actualizar estado:", updateError);
            return res.status(500).json({ error: updateError.message });
        }

        if (decision === 'aprobar' && nextEmailRecipient && emailData) {
            console.log('Enviando correo a:', nextEmailRecipient, 'Asunto:', emailSubject);
            await sendEmail(nextEmailRecipient, emailSubject, emailData.html, emailData.attachments);
        }

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