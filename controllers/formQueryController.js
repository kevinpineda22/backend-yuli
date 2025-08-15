import supabase from '../supabaseCliente.js';

// Mapeo de nombres de campos del frontend a columnas de la base de datos
// (Es importante que este mapeo exista para poder hacer la conversión inversa)
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
    seguridad: 'seguridad',
    area: 'area',
    isConstruahorro: 'isConstruahorro',
    competenciasCulturales: 'competencias_culturales',
    competenciasCargo: 'competencias_cargo',
    responsabilidades: 'responsabilidades',
};

// Mapeo inverso para traducir de los nombres de la base de datos a los del frontend
const inverseFieldMapping = Object.fromEntries(
    Object.entries(fieldMapping).map(([key, value]) => [value, key])
);

// Función auxiliar para procesar los datos
const processData = (data) => {
    return data.map(item => {
        const newItem = {};
        for (const [dbKey, value] of Object.entries(item)) {
            const frontEndKey = inverseFieldMapping[dbKey] || dbKey;
            
            // Convertir los strings JSON a objetos de JavaScript
            if (dbKey === 'competencias_culturales' || dbKey === 'competencias_cargo' || dbKey === 'responsabilidades') {
                try {
                    // Si el valor existe, se parsea. Si no, se devuelve un array vacío.
                    newItem[frontEndKey] = value ? JSON.parse(value) : [];
                } catch (e) {
                    console.error(`Error al parsear JSONb para ${dbKey}:`, e);
                    newItem[frontEndKey] = [];
                }
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