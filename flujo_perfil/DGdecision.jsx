import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import "./DGdecision.css";
import { getAssetUrl } from "../../config/storage";

// Material UI
import {
    Box,
    Typography,
    Button,
    Paper,
    Grid,
    Stack
} from '@mui/material';

// --- Funciones y Componentes de Visualización (Tomados de HistorialComponent) ---

const ensureArray = (val) => {
    if (Array.isArray(val)) return val.filter(Boolean);
    if (typeof val === 'string' && val.trim() !== '') {
        try {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed) ? parsed.filter(Boolean) : [parsed].filter(Boolean);
        } catch {
            return val.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        }
    }
    return [];
};

const parseJsonSafe = (data) => {
    try {
        if (data === null || data === undefined || data === '' || data === 'No aplica') return [];
        if (Array.isArray(data)) return data.filter(Boolean);
        if (typeof data === 'object') return [data].filter(Boolean);
        return ensureArray(data);
    } catch {
        return ensureArray(data);
    }
};

const CompetencyTable = ({ data }) => {
    const rows = ensureArray(data);
    if (rows.length === 0) {
        return <Typography variant="body1" className="no-aplica">No aplica</Typography>;
    }
    return (
        <table className="competency-table">
            <thead>
                <tr>
                    <th className="competency-table-cell">Competencia</th>
                    <th className="competency-table-cell level-col">Alto (A)</th>
                    <th className="competency-table-cell level-col">Bueno (B)</th>
                    <th className="competency-table-cell level-col">Mín. Necesario (C)</th>
                    <th className="competency-table-cell definition-col">Definición</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((row, index) => {
                    const nivelLower = (row.nivel || '').toLowerCase();
                    return (
                        <tr key={index}>
                            <td className="competency-table-cell">{row.competencia || ''}</td>
                            <td className="competency-table-cell level-col">{nivelLower.includes('alto') || nivelLower.includes('(a)') ? 'X' : ''}</td>
                            <td className="competency-table-cell level-col">{nivelLower.includes('bueno') || nivelLower.includes('(b)') ? 'X' : ''}</td>
                            <td className="competency-table-cell level-col">{nivelLower.includes('mínimo') || nivelLower.includes('(c)') ? 'X' : ''}</td>
                            <td className="competency-table-cell definition-col">{row.definicion || ''}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};

const ResponsabilidadesCards = ({ data, renderInfo }) => {
    const responsabilidades = ensureArray(data);
    if (responsabilidades.length === 0) {
        return renderInfo('Responsabilidades', []);
    }
    return (
        <Box>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>Responsabilidades</Typography>
            <div className="responsibilities-container">
                {responsabilidades.map((item, index) => (
                    <Paper key={index} component="div" className="responsibility-card">
                        <Typography variant="body2">
                            <strong>{typeof item === 'object' ? item.value || item.titulo || item.title || item.responsabilidad || item.nombre || item : item}</strong>
                            {typeof item === 'object' && (item.funcion || item.detalle || item.descripcion || item.description) && (
                                <>
                                    <br />
                                    <span style={{ color: '#555' }}>Función: {item.funcion || item.detalle || item.descripcion || item.description}</span>
                                </>
                            )}
                        </Typography>
                    </Paper>
                ))}
            </div>
        </Box>
    );
};

const renderInfo = (label, value) => {
    if (!value || (Array.isArray(value) && value.length === 0) || (typeof value === 'object' && Object.keys(value).length === 0)) {
        return (
            <Box sx={{ border: '1px solid #eee', p: 2, mb: 2, borderRadius: 1 }}>
                <Typography variant="body1"><strong>{label}:</strong> <span className="no-aplica">No aplica</span></Typography>
            </Box>
        );
    }
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && 'competencia' in value[0]) {
        return (
            <Box sx={{ border: '1px solid #eee', p: 2, mb: 2, borderRadius: 1 }}>
                <Typography variant="h6" sx={{ mb: 1 }}><strong>{label}</strong></Typography>
                <ul className="list-competencias">{value.map((item, index) => (<li key={index}>{`${item.competencia || ''} (${item.nivel || ''}) - ${item.definicion || ''}`}</li>))}</ul>
            </Box>
        );
    }
    if (Array.isArray(value) && value.length > 0) {
        return (
            <Box sx={{ border: '1px solid #eee', p: 2, mb: 2, borderRadius: 1 }}>
                <Typography variant="h6" sx={{ mb: 1 }}><strong>{label}</strong></Typography>
                <ul>{value.map((item, index) => (<li key={index}>{typeof item === 'object' ? JSON.stringify(item) : item}</li>))}</ul>
            </Box>
        );
    }
    return (
        <Box sx={{ border: '1px solid #eee', p: 2, mb: 2, borderRadius: 1 }}>
            <Typography variant="body1"><strong>{label}:</strong> {value}</Typography>
        </Box>
    );
};

// --- Componente principal DGdecision ---
const BACKEND_URL = "https://backend-yuli.vercel.app/api";

const DGdecision = () => {
    const { workflow_id, role } = useParams();
    const [formDetails, setFormDetails] = useState(null);
    const [message, setMessage] = useState("");
    const [messageClass, setMessageClass] = useState("");
    const [observacion, setObservacion] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [hasResponded, setHasResponded] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const response = await axios.get(`${BACKEND_URL}/yuli/${workflow_id}`);
                setFormDetails(response.data.historial[0]);

                // Verificar si la solicitud ya fue aprobada o rechazada por este rol
                const estadoLower = (response.data.historial[0].estado || "").toLowerCase();
                const hasBeenProcessed = estadoLower.includes('rechazado por') || estadoLower.includes('aprobado por todos') || (estadoLower.includes('aprobado por') && estadoLower.includes(role));
                setHasResponded(hasBeenProcessed);
                
            } catch (error) {
                console.error("Error al obtener detalles del formulario:", error);
                setMessage("Error al cargar los detalles de la solicitud.");
                setMessageClass("mensaje-rechazado");
            }
        };
        fetchDetails();
    }, [workflow_id, role]);

    const handleDecision = useCallback(async (decision) => {
        if (isLoading || hasResponded) return;
        if (decision === "rechazado" && !observacion.trim()) {
            setMessage("Por favor, ingrese una observación para rechazar la solicitud.");
            setMessageClass("mensaje-rechazado");
            return;
        }

        const estadoLower = (formDetails.estado || "").toLowerCase();
        const validStates = {
            area: ["pendiente por area"],
            director: ["pendiente por director", "aprobado por area"],
            gerencia: ["aprobado por director"],
            calidad: ["aprobado por gerencia"],
            seguridad: ["pendiente por seguridad"],
        };

        if (!validStates[role]?.some((state) => estadoLower.includes(state))) {
            setMessage(`No puedes realizar esta acción. La solicitud no está pendiente por ${roleTitle[role]}. Estado actual: ${formDetails.estado}`);
            setMessageClass("mensaje-rechazado");
            return;
        }

        setIsLoading(true);
        setMessage("");

        try {
            const endpoint = `${BACKEND_URL}/dgdecision/${workflow_id}/${role}`;
            const response = await axios.post(endpoint, { decision, observacion }, {
                headers: { 'Content-Type': 'application/json' }
            });

            // Usar la respuesta del backend para el mensaje final
            const serverMessage = response.data.message;
            setMessage(serverMessage || (decision === "aprobado" ? "Solicitud aprobada correctamente" : "Solicitud rechazada correctamente"));
            setMessageClass(decision === "aprobado" ? "mensaje-aprobado" : "mensaje-rechazado");
            setHasResponded(true); // Se ha procesado, deshabilitar botones
        } catch (error) {
            console.error("Error al enviar la decisión:", error);
            setMessage(error.response?.data?.error || "Error al procesar la decisión. Inténtalo de nuevo.");
            setMessageClass("mensaje-rechazado");
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, hasResponded, observacion, formDetails, workflow_id, role]);

    const roleTitle = React.useMemo(() => ({
        area: "Área",
        director: "Director de Área",
        gerencia: "Gerencia General",
        calidad: "Calidad",
        seguridad: "Seguridad y Salud en el Trabajo",
    }), []);
    
    const renderAllDetails = useCallback((solicitud) => {
        const competenciasCulturales = parseJsonSafe(solicitud.competenciasCulturales);
        const competenciasCargo = parseJsonSafe(solicitud.competenciasCargo);
        const responsabilidades = parseJsonSafe(solicitud.responsabilidades);
        const planEntrenamiento = parseJsonSafe(solicitud.planEntrenamiento);
        const planCapacitacionContinua = parseJsonSafe(solicitud.planCapacitacionContinua);
        const poblacionFocalizada = parseJsonSafe(solicitud.poblacionFocalizada);
        
        return (
            <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                    <Paper elevation={2} sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>INFORMACIÓN GENERAL</Typography>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>{renderInfo('Fecha', solicitud.fecha)}</Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>{renderInfo('Nombre del Cargo', solicitud.nombreCargo)}</Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>{renderInfo('Área', solicitud.areaGeneral)}</Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>{renderInfo('Departamento', solicitud.departamento)}</Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>{renderInfo('Proceso', solicitud.proceso)}</Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>{renderInfo('Población Focalizada', poblacionFocalizada)}</Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>{renderInfo('Escolaridad', solicitud.escolaridad)}</Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>{renderInfo('Área de Formación', solicitud.area_formacion)}</Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>{renderInfo('Estudios Complementarios', solicitud.estudiosComplementarios)}</Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>{renderInfo('Experiencia Necesaria', solicitud.experiencia)}</Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>{renderInfo('Jefe Inmediato', solicitud.jefeInmediato)}</Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>{renderInfo('Supervisa a', solicitud.supervisaA)}</Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>{renderInfo('Nº Personas a Cargo', solicitud.numeroPersonasCargo)}</Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>{renderInfo('Tipo de Contrato', solicitud.tipoContrato)}</Grid>
                        </Grid>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <Paper elevation={2} sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>DOCUMENTOS</Typography>
                        {solicitud.estructuraOrganizacional ? (
                            <Box sx={{ border: '1px solid #eee', p: 2, borderRadius: 1 }}>
                                <Typography variant="body1"><strong>Estructura Organizacional:</strong></Typography>
                                <Box sx={{ mt: 2 }}>
                                    <img src={solicitud.estructuraOrganizacional} alt="Estructura Organizacional" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} />
                                </Box>
                                <Box sx={{ mt: 1 }}>
                                    <a href={solicitud.estructuraOrganizacional} target="_blank" rel="noopener noreferrer">Ver Archivo</a>
                                </Box>
                            </Box>
                        ) : (
                            <Box sx={{ border: '1px solid #eee', p: 2, borderRadius: 1 }}>
                                <Typography variant="body1"><strong>Estructura Organizacional:</strong> <span className="no-aplica">No aplica</span></Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <Paper elevation={2} sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>DESCRIPCIÓN DEL CARGO</Typography>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12 }}>{renderInfo('Misión del Cargo', solicitud.misionCargo)}</Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>{renderInfo('Cursos o Certificaciones', solicitud.cursosCertificaciones)}</Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>{renderInfo('Requiere Vehículo', solicitud.requiereVehiculo)}</Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>{renderInfo('Tipo de Licencia', solicitud.tipoLicencia)}</Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>{renderInfo('Idiomas', solicitud.idiomas)}</Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>{renderInfo('Requiere Viajar', solicitud.requiereViajar)}</Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>{renderInfo('Áreas de Relacionamiento (Internas)', solicitud.areasRelacionadas)}</Grid>
                            <Grid size={{ xs: 12 }}>{renderInfo('Relacionamiento Externo', solicitud.relacionamientoExterno)}</Grid>
                        </Grid>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <Paper elevation={2} sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>COMPETENCIAS Y RESPONSABILIDADES</Typography>
                        <Box mb={2}>
                            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>Competencias Culturales</Typography>
                            <CompetencyTable data={competenciasCulturales} />
                        </Box>
                        <Box mb={2}>
                            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>Competencias del Cargo</Typography>
                            <CompetencyTable data={competenciasCargo} />
                        </Box>
                        
                        <Box mb={2}>
                            <ResponsabilidadesCards data={responsabilidades} renderInfo={renderInfo} />
                        </Box>

                        <Box mb={2}>
                            {renderInfo('Indicadores de Gestión', solicitud.indicadores_gestion)}
                        </Box>
                        <Box mb={2}>
                            {renderInfo('Requisitos Físicos', solicitud.requisitos_fisicos)}
                        </Box>
                        <Box mb={2}>
                            {renderInfo('Riesgos y Obligaciones SST Organizacionales', solicitud.riesgos_obligaciones_sst_organizacionales)}
                        </Box>
                        <Box mb={2}>
                            {renderInfo('Riesgos y Obligaciones SST Específicos', solicitud.riesgos_obligaciones_sst_especificos)}
                        </Box>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <Paper elevation={2} sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>COMPLEMENTARIO</Typography>
                        
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                {renderInfo('Plan de Entrenamiento (Inducción y Acompañamiento)', planEntrenamiento)}
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                {renderInfo('Plan de Capacitación Continua', planCapacitacionContinua)}
                            </Grid>
                        </Grid>
                        
                        {renderInfo('Plan de Carrera', solicitud.planCarrera)}
                        {renderInfo('Competencias para Desarrollar en el Ingreso', solicitud.competenciasDesarrolloIngreso)}
                    </Paper>
                </Grid>

                
            </Grid>
        );
    }, []);

    if (!formDetails) return <p className="cargando">Cargando información...</p>;

    const isButtonDisabled = isLoading || hasResponded;
 
    return (
        <div className="aprobar-rechazar-container">
            <div className="logo-container-aprobar">
                <a href="/">
                    <img src={getAssetUrl("logoMK.webp")} alt="Logo Merkahorro" />
                </a>
                <a href="/">
                    <img src={getAssetUrl("logoConstruahorro.webp")} alt="Logo Construahorro" />
                </a>
                <a href="/">
                    <img src={getAssetUrl("logoMegamayoristas.webp")} alt="Logo Megamayoristas" />
                </a>
            </div>

            <div className="form-card">
                <h1 className="form-header">Revisión de Solicitud</h1>
                <h2 className="form-subtitle">Rol: {roleTitle[role] || "Rol no válido"}</h2>
                
                {renderAllDetails(formDetails)}

                <div className="form-group">
                    <label htmlFor="observacion" className="form-label">Observación:</label>
                    <textarea
                        id="observacion"
                        name="observacion"
                        value={observacion}
                        onChange={(e) => setObservacion(e.target.value)}
                        className="observacion-input"
                        placeholder={`Ingrese la observación (${roleTitle[role] || "Rol"})...`}
                        disabled={isButtonDisabled}
                    ></textarea>
                </div>

                <div className="decision-buttons">
                    <button
                        className={`btn-approve ${isButtonDisabled ? "btn-disabled" : ""}`}
                        onClick={() => handleDecision("aprobado")}
                        disabled={isButtonDisabled}
                    >
                        {isLoading ? "Procesando..." : "✅ Necesario"}
                    </button>
                    <button
                        className={`btn-reject ${isButtonDisabled ? "btn-disabled" : ""}`}
                        onClick={() => handleDecision("rechazado")}
                        disabled={isButtonDisabled}
                    >
                        {isLoading ? "Procesando..." : "❌ No necesario"}
                    </button>
                </div>

                {message && (
                    <div className={`alerta-estado ${messageClass}`}>
                        <p>{message}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export { DGdecision };