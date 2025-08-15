import multer from 'multer';
import { sendEmail, generarHtmlCorreoArea, generarHtmlCorreoDirector, generarHtmlCorreoGerencia, generarHtmlCorreoSeguridad } from '../services/emailService.js';
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
    seguridad: 'seguridad',
    area: 'area',
    isConstruahorro: 'isConstruahorro',
    competenciasCulturales: 'competencias_culturales',
    competenciasCargo: 'competencias_cargo',
    responsabilidades: 'responsabilidades',
    planEntrenamiento: 'plan_entrenamiento',
    planCapacitacionContinua: 'plan_capacitacion_continua',
    planCarrera: 'plan_carrera',
    competenciasDesarrolloIngreso: 'competencias_desarrollo_ingreso'
};

// Función auxiliar para parsear los campos JSON del body a objetos de JS
const parseJSONFields = (data) => {
    const newData = { ...data };
    const jsonFields = ['competenciasCulturales', 'competenciasCargo', 'responsabilidades', 'planEntrenamiento', 'planCapacitacionContinua'];
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
        // Usar los nombres de las columnas del backend para las funciones de correo
        competencias_culturales: parsedData.competenciasCulturales,
        competencias_cargo: parsedData.competenciasCargo,
        responsabilidades: parsedData.responsabilidades,
        plan_entrenamiento: parsedData.planEntrenamiento,
        plan_capacitacion_continua: parsedData.planCapacitacionContinua,
        plan_carrera: parsedData.planCarrera,
        competencias_desarrollo_ingreso: parsedData.competenciasDesarrolloIngreso
    };
};

export const crearFormulario = async (req, res) => {
    try {
        const {
            fecha, director, gerencia, area, isConstruahorro, seguridad, nombreCargo,
            areaGeneral, departamento, proceso, poblacionFocalizada, escolaridad, area_formacion,
            estudiosComplementarios, experiencia, jefeInmediato, supervisaA, numeroPersonasCargo,
            tipoContrato, misionCargo, cursosCertificaciones, requiereVehiculo, tipoLicencia,
            idiomas, requiereViajar, areasRelacionadas, relacionamientoExterno,
            competenciasCulturales, competenciasCargo, responsabilidades,
            planEntrenamiento, planCapacitacionContinua, planCarrera, competenciasDesarrolloIngreso
        } = req.body;

        const { estructuraOrganizacional } = req.files || {};

        // Validar campos obligatorios
        const requiredFields = {
            fecha, director, gerencia, nombreCargo, areaGeneral, departamento, proceso,
            estructuraOrganizacional: estructuraOrganizacional ? estructuraOrganizacional[0] : null,
            escolaridad, area_formacion, experiencia, jefeInmediato, tipoContrato, misionCargo,
            competenciasCulturales, competenciasCargo, responsabilidades
            // No se incluyen planEntrenamiento, planCapacitacionContinua, planCarrera, competenciasDesarrolloIngreso como obligatorios
        };

        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value) {
                return res.status(400).json({ error: `El campo ${key} es obligatorio` });
            }
        }

        // Validar que los campos JSON sean arrays válidos
        try {
            const jsonFields = [competenciasCulturales, competenciasCargo, responsabilidades, planEntrenamiento, planCapacitacionContinua];
            jsonFields.forEach((field, index) => {
                if (field && !Array.isArray(JSON.parse(field))) {
                    const fieldNames = ['competenciasCulturales', 'competenciasCargo', 'responsabilidades', 'planEntrenamiento', 'planCapacitacionContinua'];
                    throw new Error(`El campo ${fieldNames[index]} debe ser un array`);
                }
            });
        } catch (e) {
            return res.status(400).json({ error: `Formato inválido: ${e.message}` });
        }

        if (!isConstruahorro && !area) {
            return res.status(400).json({ error: 'El campo área es obligatorio para solicitudes de Merkahorro' });
        }

        if (requiereVehiculo === 'Sí' && !tipoLicencia) {
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
            [fieldMapping.seguridad]: isConstruahorro === 'true' ? null : seguridad,
            [fieldMapping.area]: isConstruahorro === 'true' ? null : area,
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
            [fieldMapping.competenciasCulturales]: competenciasCulturales,
            [fieldMapping.competenciasCargo]: competenciasCargo,
            [fieldMapping.responsabilidades]: responsabilidades,
            [fieldMapping.planEntrenamiento]: planEntrenamiento || JSON.stringify([]),
            [fieldMapping.planCapacitacionContinua]: planCapacitacionContinua || JSON.stringify([]),
            [fieldMapping.planCarrera]: planCarrera || 'No aplica',
            [fieldMapping.competenciasDesarrolloIngreso]: competenciasDesarrolloIngreso || 'No aplica',
            estado: isConstruahorro === 'true' ? 'pendiente por director' : 'pendiente por area',
            observacion_area: null,
            observacion_director: null,
            observacion_gerencia: null,
            observacion_seguridad: null,
            role: 'creador',
            [fieldMapping.isConstruahorro]: isConstruahorro === 'true'
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

        // CREAR OBJETO CONSOLIDADO Y PARSEADO PARA EL EMAIL
        const emailFormData = createEmailData(req.body, data);

        const emailRecipient = isConstruahorro === 'true' ? director : area;
        const emailSubject = isConstruahorro === 'true' ? "Nueva Solicitud de Aprobación - Director" : "Nueva Solicitud de Aprobación - Área";
        
        const emailData = await (isConstruahorro === 'true'
            ? generarHtmlCorreoDirector({ ...emailFormData, workflow_id, approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/director`, rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/director` })
            : generarHtmlCorreoArea({ ...emailFormData, workflow_id, approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/area`, rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/area` }));

        await sendEmail(emailRecipient, emailSubject, emailData.html, emailData.attachments);

        res.status(201).json({ message: `Formulario creado y correo enviado a ${isConstruahorro === 'true' ? 'director' : 'área'}`, workflow_id });
    } catch (err) {
        console.error("Error en crearFormulario:", err);
        res.status(500).json({ error: err.message || "Error interno del servidor" });
    }
};

export const reenviarFormulario = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            fecha, director, gerencia, area, isConstruahorro, seguridad, nombreCargo,
            areaGeneral, departamento, proceso, poblacionFocalizada, escolaridad, area_formacion,
            estudiosComplementarios, experiencia, jefeInmediato, supervisaA, numeroPersonasCargo,
            tipoContrato, misionCargo, cursosCertificaciones, requiereVehiculo, tipoLicencia,
            idiomas, requiereViajar, areasRelacionadas, relacionamientoExterno,
            competenciasCulturales, competenciasCargo, responsabilidades,
            planEntrenamiento, planCapacitacionContinua, planCarrera, competenciasDesarrolloIngreso
        } = req.body;
        const { estructuraOrganizacional } = req.files || {};

        // Validar campos obligatorios
        const requiredFields = {
            fecha, director, gerencia, nombreCargo, areaGeneral, departamento, proceso,
            estructuraOrganizacional: estructuraOrganizacional ? estructuraOrganizacional[0] : null,
            escolaridad, area_formacion, experiencia, jefeInmediato, tipoContrato, misionCargo,
            competenciasCulturales, competenciasCargo, responsabilidades
            // No se incluyen planEntrenamiento, planCapacitacionContinua, planCarrera, competenciasDesarrolloIngreso como obligatorios
        };

        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value) {
                return res.status(400).json({ error: `El campo ${key} es obligatorio` });
            }
        }

        // Validar que los campos JSON sean arrays válidos
        try {
            const jsonFields = [competenciasCulturales, competenciasCargo, responsabilidades, planEntrenamiento, planCapacitacionContinua];
            jsonFields.forEach((field, index) => {
                if (field && !Array.isArray(JSON.parse(field))) {
                    const fieldNames = ['competenciasCulturales', 'competenciasCargo', 'responsabilidades', 'planEntrenamiento', 'planCapacitacionContinua'];
                    throw new Error(`El campo ${fieldNames[index]} debe ser un array`);
                }
            });
        } catch (e) {
            return res.status(400).json({ error: `Formato inválido: ${e.message}` });
        }

        if (!isConstruahorro && !area) {
            return res.status(400).json({ error: 'El campo área es obligatorio para solicitudes de Merkahorro' });
        }

        if (requiereVehiculo === 'Sí' && !tipoLicencia) {
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
            [fieldMapping.area]: isConstruahorro === 'true' ? null : area,
            [fieldMapping.seguridad]: isConstruahorro === 'true' ? null : seguridad,
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
            [fieldMapping.competenciasCulturales]: competenciasCulturales,
            [fieldMapping.competenciasCargo]: competenciasCargo,
            [fieldMapping.responsabilidades]: responsabilidades,
            [fieldMapping.planEntrenamiento]: planEntrenamiento || JSON.stringify([]),
            [fieldMapping.planCapacitacionContinua]: planCapacitacionContinua || JSON.stringify([]),
            [fieldMapping.planCarrera]: planCarrera || 'No aplica',
            [fieldMapping.competenciasDesarrolloIngreso]: competenciasDesarrolloIngreso || 'No aplica',
            estado: isConstruahorro === 'true' ? 'pendiente por director' : 'pendiente por area',
            observacion_area: null,
            observacion_director: null,
            observacion_gerencia: null,
            observacion_seguridad: null,
            [fieldMapping.isConstruahorro]: isConstruahorro === 'true'
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

        const workflow_id = updated.workflow_id;
        
        // CREAR OBJETO CONSOLIDADO Y PARSEADO PARA EL EMAIL
        const emailFormData = createEmailData(req.body, updated);

        const emailRecipient = isConstruahorro === 'true' ? updated[fieldMapping.director] : updated[fieldMapping.area];
        const emailSubject = isConstruahorro === 'true' ? "Reenvío de Solicitud Editada - Director" : "Reenvío de Solicitud Editada - Área";
        
        const emailData = await (isConstruahorro === 'true'
            ? generarHtmlCorreoDirector({ ...emailFormData, approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/director`, rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/director` })
            : generarHtmlCorreoArea({ ...emailFormData, approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/area`, rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/area` }));

        await sendEmail(emailRecipient, emailSubject, emailData.html, emailData.attachments);

        res.json({ message: "Solicitud reenviada, flujo reiniciado y correo enviado a " + (isConstruahorro === 'true' ? 'director' : 'área') });
    } catch (err) {
        console.error("Error en reenviarFormulario:", err);
        res.status(500).json({ error: err.message || "Error interno al reenviar solicitud" });
    }
};

export const actualizarFormulario = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            fecha, director, gerencia, area, isConstruahorro, seguridad, nombreCargo,
            areaGeneral, departamento, proceso, poblacionFocalizada, escolaridad, area_formacion,
            estudiosComplementarios, experiencia, jefeInmediato, supervisaA, numeroPersonasCargo,
            tipoContrato, misionCargo, cursosCertificaciones, requiereVehiculo, tipoLicencia,
            idiomas, requiereViajar, areasRelacionadas, relacionamientoExterno,
            competenciasCulturales, competenciasCargo, responsabilidades,
            planEntrenamiento, planCapacitacionContinua, planCarrera, competenciasDesarrolloIngreso
        } = req.body;
        const { estructuraOrganizacional } = req.files || {};

        // Validar campos obligatorios
        const requiredFields = {
            fecha, director, gerencia, nombreCargo, areaGeneral, departamento, proceso,
            estructuraOrganizacional: estructuraOrganizacional ? estructuraOrganizacional[0] : null,
            escolaridad, area_formacion, experiencia, jefeInmediato, tipoContrato, misionCargo,
            competenciasCulturales, competenciasCargo, responsabilidades
            // No se incluyen planEntrenamiento, planCapacitacionContinua, planCarrera, competenciasDesarrolloIngreso como obligatorios
        };

        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value) {
                return res.status(400).json({ error: `El campo ${key} es obligatorio` });
            }
        }

        // Validar que los campos JSON sean arrays válidos
        try {
            const jsonFields = [competenciasCulturales, competenciasCargo, responsabilidades, planEntrenamiento, planCapacitacionContinua];
            jsonFields.forEach((field, index) => {
                if (field && !Array.isArray(JSON.parse(field))) {
                    const fieldNames = ['competenciasCulturales', 'competenciasCargo', 'responsabilidades', 'planEntrenamiento', 'planCapacitacionContinua'];
                    throw new Error(`El campo ${fieldNames[index]} debe ser un array`);
                }
            });
        } catch (e) {
            return res.status(400).json({ error: `Formato inválido: ${e.message}` });
        }

        if (!isConstruahorro && !area) {
            return res.status(400).json({ error: 'El campo área es obligatorio para solicitudes de Merkahorro' });
        }

        if (requiereVehiculo === 'Sí' && !tipoLicencia) {
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
            [fieldMapping.area]: isConstruahorro === 'true' ? null : area,
            [fieldMapping.seguridad]: isConstruahorro === 'true' ? null : seguridad,
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
            [fieldMapping.competenciasCulturales]: competenciasCulturales,
            [fieldMapping.competenciasCargo]: competenciasCargo,
            [fieldMapping.responsabilidades]: responsabilidades,
            [fieldMapping.planEntrenamiento]: planEntrenamiento || JSON.stringify([]),
            [fieldMapping.planCapacitacionContinua]: planCapacitacionContinua || JSON.stringify([]),
            [fieldMapping.planCarrera]: planCarrera || 'No aplica',
            [fieldMapping.competenciasDesarrolloIngreso]: competenciasDesarrolloIngreso || 'No aplica',
            [fieldMapping.isConstruahorro]: isConstruahorro === 'true'
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