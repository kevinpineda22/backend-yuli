import multer from 'multer';
import { sendEmail, generarHtmlCorreoArea } from '../services/emailService.js';
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
    isMegamayoristas: 'isMegamayoristas',
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

const getAprobadorById = async (id) => {
    if (!id) return null;
    const { data, error } = await supabase.from('aprobadores').select('*').eq('id', id).single();
    if (error) {
        console.error("Error al obtener aprobador por ID:", error);
        return null;
    }
    return data;
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

export const crearFormulario = async (req, res) => {
    try {
        const {
            isConstruahorro,
            isMegamayoristas,
            poblacionFocalizada,
            competenciasCulturales,
            competenciasCargo,
            responsabilidades,
            planEntrenamiento,
            planCapacitacionContinua,
            ...formDataFromClient 
        } = req.body;
        
        const { estructuraOrganizacional } = req.files || {};
        
        const isConstruahorroForm = isConstruahorro === 'true';
        const isMegamayoristasForm = isMegamayoristas === 'true';

        const requiredFields = {
            ...formDataFromClient,
            poblacionFocalizada,
            competenciasCulturales,
            competenciasCargo,
            responsabilidades,
        };
        
        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value) {
                return res.status(400).json({ error: `El campo ${key} es obligatorio` });
            }
        }
        if (formDataFromClient.requiereVehiculo === 'Sí' && !formDataFromClient.tipoLicencia) {
            return res.status(400).json({ error: 'El campo tipo de licencia es obligatorio si requiere vehículo' });
        }

        let estructuraOrganizacionalUrl = null;
        if (estructuraOrganizacional && estructuraOrganizacional[0]) {
            const fileName = `${Date.now()}_${estructuraOrganizacional[0].originalname}`;
            const { error: uploadError } = await supabase
                .storage.from('pdfs-yuli')
                .upload(fileName, estructuraOrganizacional[0].buffer, { contentType: estructuraOrganizacional[0].mimetype });
            if (uploadError) {
                return res.status(500).json({ error: 'Error al subir archivo de estructura organizacional' });
            }
            const { data: publicUrlData } = supabase.storage.from('pdfs-yuli').getPublicUrl(fileName);
            estructuraOrganizacionalUrl = publicUrlData.publicUrl;
        } else {
            return res.status(400).json({ error: 'El archivo de estructura organizacional es obligatorio' });
        }

        const dataToInsert = {
            ...formDataFromClient,
            [fieldMapping.area]: parseInt(formDataFromClient.area),
            [fieldMapping.director]: parseInt(formDataFromClient.director),
            [fieldMapping.gerencia]: parseInt(formDataFromClient.gerencia),
            [fieldMapping.calidad]: parseInt(formDataFromClient.calidad),
            [fieldMapping.seguridad]: parseInt(formDataFromClient.seguridad),
            [fieldMapping.poblacionFocalizada]: parseOrArray(poblacionFocalizada),
            [fieldMapping.competenciasCulturales]: parseOrArray(competenciasCulturales),
            [fieldMapping.competenciasCargo]: parseOrArray(competenciasCargo),
            [fieldMapping.responsabilidades]: parseOrArray(responsabilidades),
            [fieldMapping.planEntrenamiento]: parseOrArray(planEntrenamiento),
            [fieldMapping.planCapacitacionContinua]: parseOrArray(planCapacitacionContinua),
            [fieldMapping.estructuraOrganizacional]: estructuraOrganizacionalUrl,
            estado: 'pendiente por area',
            observacion_area: null,
            observacion_director: null,
            observacion_gerencia: null,
            observacion_calidad: null,
            observacion_seguridad: null,
            role: 'creador',
            isConstruahorro: isConstruahorroForm,
            isMegamayoristas: isMegamayoristasForm,
            etapas_aprobadas: [],
        };
        
        const { data, error } = await supabase.from('yuli').insert(dataToInsert).select().single();
        if (error) {
            console.error("Error al insertar en Supabase:", error);
            return res.status(500).json({ error: error.message });
        }

        const workflow_id = data.id;
        await supabase.from('yuli').update({ workflow_id }).eq('id', workflow_id);

        const aprobadorArea = await getAprobadorById(dataToInsert.area);
        const emailData = await generarHtmlCorreoArea({
            ...data,
            aprobador: aprobadorArea,
            approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/area`,
            rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/area`,
        });

        await sendEmail(aprobadorArea.correo, `Nueva Solicitud de Aprobación - Área`, emailData.html, emailData.attachments);
        
        res.status(201).json({ message: `Formulario creado y correo enviado a área`, workflow_id });
    } catch (err) {
        console.error("Error en crearFormulario:", err);
        res.status(500).json({ error: err.message || "Error interno del servidor" });
    }
};

export const reenviarFormulario = async (req, res) => {
    try {
        const { id } = req.params;
        const { keepExistingFile, existingFileUrl, ...updatesData } = req.body;
        const { estructuraOrganizacional } = req.files || {};
        
        // Obtener la solicitud original para asegurar la consistencia
        const { data: solicitud, error: fetchError } = await supabase.from('yuli').select('*').eq('id', id).single();
        
        if (fetchError || !solicitud) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }
        
        // Manejar la carga o conservación del archivo de estructura organizacional
        let estructuraOrganizacionalUrl = null;
        if (estructuraOrganizacional && estructuraOrganizacional[0]) {
            const fileName = `${Date.now()}_${estructuraOrganizacional[0].originalname}`;
            await supabase.storage.from('pdfs-yuli').upload(fileName, estructuraOrganizacional[0].buffer, { contentType: estructuraOrganizacional[0].mimetype });
            const { data: publicUrlData } = supabase.storage.from('pdfs-yuli').getPublicUrl(fileName);
            estructuraOrganizacionalUrl = publicUrlData.publicUrl;
        } else if (keepExistingFile === 'true' && existingFileUrl) {
            estructuraOrganizacionalUrl = existingFileUrl;
        } else {
            return res.status(400).json({ error: 'El archivo estructura organizacional es obligatorio' });
        }

        // Mapeo y conversión explícita de datos para evitar errores de tipo
        const updates = {
            [fieldMapping.nombreCargo]: updatesData.nombreCargo,
            [fieldMapping.areaGeneral]: updatesData.areaGeneral,
            [fieldMapping.departamento]: updatesData.departamento,
            [fieldMapping.proceso]: updatesData.proceso,
            [fieldMapping.estructuraOrganizacional]: estructuraOrganizacionalUrl,
            [fieldMapping.poblacionFocalizada]: parseOrArray(updatesData.poblacionFocalizada),
            [fieldMapping.escolaridad]: updatesData.escolaridad,
            [fieldMapping.area_formacion]: updatesData.area_formacion,
            [fieldMapping.estudiosComplementarios]: updatesData.estudiosComplementarios || null,
            [fieldMapping.experiencia]: updatesData.experiencia,
            [fieldMapping.jefeInmediato]: updatesData.jefeInmediato,
            [fieldMapping.supervisaA]: updatesData.supervisaA || null,
            [fieldMapping.numeroPersonasCargo]: updatesData.numeroPersonasCargo ? parseInt(updatesData.numeroPersonasCargo) : null,
            [fieldMapping.tipoContrato]: updatesData.tipoContrato,
            [fieldMapping.misionCargo]: updatesData.misionCargo,
            [fieldMapping.cursosCertificaciones]: updatesData.cursosCertificaciones || null,
            [fieldMapping.requiereVehiculo]: updatesData.requiereVehiculo || null,
            [fieldMapping.tipoLicencia]: updatesData.tipoLicencia || null,
            [fieldMapping.idiomas]: updatesData.idiomas || null,
            [fieldMapping.requiereViajar]: updatesData.requiereViajar || null,
            [fieldMapping.areasRelacionadas]: updatesData.areasRelacionadas || null,
            [fieldMapping.relacionamientoExterno]: updatesData.relacionamientoExterno || null,
            [fieldMapping.competenciasCulturales]: parseOrArray(updatesData.competenciasCulturales),
            [fieldMapping.competenciasCargo]: parseOrArray(updatesData.competenciasCargo),
            [fieldMapping.responsabilidades]: parseOrArray(updatesData.responsabilidades),
            [fieldMapping.indicadores_gestion]: updatesData.indicadoresGestion || null,
            [fieldMapping.requisitos_fisicos]: updatesData.requisitosFisicos || null,
            [fieldMapping.riesgos_obligaciones_sst_organizacionales]: updatesData.riesgosObligacionesOrg || null,
            [fieldMapping.riesgos_obligaciones_sst_especificos]: updatesData.riesgosObligacionesEsp || null,
            [fieldMapping.planEntrenamiento]: parseOrArray(updatesData.planEntrenamiento),
            [fieldMapping.planCapacitacionContinua]: parseOrArray(updatesData.planCapacitacionContinua),
            [fieldMapping.planCarrera]: updatesData.planCarrera || null,
            [fieldMapping.competenciasDesarrolloIngreso]: updatesData.competenciasDesarrolloIngreso || null,
            [fieldMapping.isConstruahorro]: updatesData.isConstruahorro === 'true',
            [fieldMapping.isMegamayoristas]: updatesData.isMegamayoristas === 'true',
            
            // Convertir a enteros para los IDs de los aprobadores
            [fieldMapping.area]: parseInt(updatesData.area),
            [fieldMapping.director]: parseInt(updatesData.director),
            [fieldMapping.gerencia]: parseInt(updatesData.gerencia),
            [fieldMapping.calidad]: parseInt(updatesData.calidad),
            [fieldMapping.seguridad]: parseInt(updatesData.seguridad),

            // Reiniciar el flujo de aprobación
            estado: 'pendiente por area',
            observacion_area: null,
            observacion_director: null,
            observacion_gerencia: null,
            observacion_calidad: null,
            observacion_seguridad: null,
            etapas_aprobadas: [],
        };
        
        // **Validar que los IDs sean números válidos**
        if (isNaN(updates.area)) {
             return res.status(400).json({ error: 'El ID del aprobador de área no es válido.' });
        }
        if (isNaN(updates.director)) {
             return res.status(400).json({ error: 'El ID del aprobador del director no es válido.' });
        }
        if (isNaN(updates.gerencia)) {
             return res.status(400).json({ error: 'El ID del aprobador de gerencia no es válido.' });
        }
        if (isNaN(updates.calidad)) {
             return res.status(400).json({ error: 'El ID del aprobador de calidad no es válido.' });
        }
        if (isNaN(updates.seguridad)) {
             return res.status(400).json({ error: 'El ID del aprobador de seguridad no es válido.' });
        }

        const { data: updated, error: updateError } = await supabase.from('yuli').update(updates).eq('id', id).select().single();
        if (updateError) {
            console.error("Error al actualizar en reenviarFormulario:", updateError);
            return res.status(500).json({ error: updateError.message });
        }
        
        const aprobadorArea = await getAprobadorById(updated.area);
        if (!aprobadorArea) {
            return res.status(400).json({ error: 'El aprobador de área no es válido o no se encontró.' });
        }
        
        const emailData = await generarHtmlCorreoArea({
            ...updated,
            aprobador: aprobadorArea,
            approvalLink: `https://www.merkahorro.com/dgdecision/${updated.id}/area`,
            rejectionLink: `https://www.merkahorro.com/dgdecision/${updated.id}/area`,
        });

        await sendEmail(aprobadorArea.correo, `Reenvío de Solicitud Editada - Área`, emailData.html, emailData.attachments);

        res.json({ message: `Solicitud reenviada, flujo reiniciado y correo enviado a área` });
    } catch (err) {
        console.error("Error en reenviarFormulario:", err);
        res.status(500).json({ error: err.message || "Error interno al reenviar solicitud" });
    }
};