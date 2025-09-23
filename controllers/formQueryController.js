import supabase from '../supabaseCliente.js';

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

// Mapeo inverso para traducir de los nombres de la base de datos a los del frontend
const inverseFieldMapping = Object.fromEntries(
    Object.entries(fieldMapping).map(([key, value]) => [value, key])
);

// **Función corregida**: Intenta parsear JSON, si falla, devuelve el valor como un array con un solo elemento.
function parseOrArray(val) {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
        try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) return parsed.filter(Boolean);
            if (typeof parsed === 'object') return [parsed];
        } catch {
            return [val];
        }
    }
    return val ? [val] : [];
}

const processData = (data) => {
    return data.map(item => {
        const newItem = {};
        for (const [dbKey, value] of Object.entries(item)) {
            const frontEndKey = inverseFieldMapping[dbKey] || dbKey;
            
            if (['poblacionfocalizada', 'competencias_culturales', 'competencias_cargo', 'responsabilidades', 'plan_entrenamiento', 'plan_capacitacion_continua'].includes(dbKey)) {
                newItem[frontEndKey] = parseOrArray(value);
            } else {
                newItem[frontEndKey] = value;
            }
        }
        return newItem;
    });
};

export const obtenerHistorial = async (req, res) => {
    try {
        const { workflow_id } = req.params;
        const { data, error } = await supabase
            .from('yuli')
            .select('*')
            .eq('workflow_id', workflow_id)
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Error en obtenerHistorial:", error);
            return res.status(500).json({ error: error.message });
        }
        
        const translatedData = processData(data);
        res.json({ historial: translatedData });
    } catch (err) {
        console.error("Error en obtenerHistorial:", err);
        res.status(500).json({ error: err.message || "Error interno del servidor" });
    }
};

export const obtenerTodasLasSolicitudes = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('yuli')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error en obtenerTodasLasSolicitudes:", error);
            return res.status(500).json({ error: error.message });
        }

        const translatedData = processData(data);
        res.json({ historial: translatedData });
    } catch (err) {
        console.error("Error en obtenerTodasLasSolicitudes:", err);
        res.status(500).json({ error: err.message || "Error interno del servidor" });
    }
};