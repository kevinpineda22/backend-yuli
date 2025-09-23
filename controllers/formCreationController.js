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
        const { data: solicitud } = await supabase.from('yuli').select('*').eq('id', id).single();
        
        if (!solicitud) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }
        
        const isConstruahorroForm = solicitud.isConstruahorro;
        const isMegamayoristasForm = solicitud.isMegamayoristas;

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

        const updates = {
            ...updatesData,
            estructuraorganizacional: estructuraOrganizacionalUrl,
            estado: 'pendiente por area',
            observacion_area: null,
            observacion_director: null,
            observacion_gerencia: null,
            observacion_calidad: null,
            observacion_seguridad: null,
            etapas_aprobadas: [],
            area: parseInt(updatesData.area),
            director: parseInt(updatesData.director),
            gerencia: parseInt(updatesData.gerencia),
            calidad: parseInt(updatesData.calidad),
            seguridad: parseInt(updatesData.seguridad),
            poblacionfocalizada: parseOrArray(updatesData.poblacionFocalizada),
            competencias_culturales: parseOrArray(updatesData.competenciasCulturales),
            competencias_cargo: parseOrArray(updatesData.competenciasCargo),
            responsabilidades: parseOrArray(updatesData.responsabilidades),
            plan_entrenamiento: parseOrArray(updatesData.planEntrenamiento),
            plan_capacitacion_continua: parseOrArray(updatesData.planCapacitacionContinua),
        };

        const { data: updated, error: updateError } = await supabase.from('yuli').update(updates).eq('id', id).select().single();
        if (updateError) {
            return res.status(500).json({ error: updateError.message });
        }
        
        const aprobadorArea = await getAprobadorById(updated.area);
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