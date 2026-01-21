import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import toast, { Toaster } from 'react-hot-toast';
import { Paper } from '@mui/material';
import { useAuth } from "../../hooks/useAuth";
import GeneralInfoParams from "./form_parts/GeneralInfoParams";
import JobDescription from "./form_parts/JobDescription";
import Competencies from "./form_parts/Competencies";
import Responsibilities from "./form_parts/Responsibilities";
import IndicatorsRisks from "./form_parts/IndicatorsRisks";
import ComplementaryInfo from "./form_parts/ComplementaryInfo";
import DocumentsApprovals from "./form_parts/DocumentsApprovals";

const BACKEND_URL = "https://backend-yuli.vercel.app/api";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const FormComponent = ({
    formData, setFormData,
    construahorroFormData, setConstruahorroFormData,
    megamayoristasFormData, setMegamayoristasFormData,
    isConstruahorroForm, isMegamayoristasForm,
    editingSolicitud, setEditingSolicitud,
    isSubmitting, setIsSubmitting,
    fileInputRef, formRef, fetchHistorial
}) => {
    const baseForm = {
        fecha: new Date().toISOString().split("T")[0],
        area: "", director: "", gerencia: "", calidad: "", seguridad: "",
        nombreCargo: "", areaGeneral: "", departamento: "", proceso: "",
        estructuraOrganizacional: null, poblacionFocalizada: [],
        escolaridad: "", areaFormacion: "", estudiosComplementarios: "", experiencia: "",
        jefeInmediato: "", supervisaA: "", numeroPersonasCargo: "", tipoContrato: "",
        misionCargo: "", cursosCertificaciones: "", requiereVehiculo: "", tipoLicencia: "",
        idiomas: "", requiereViajar: "", areasRelacionadas: "", relacionamientoExterno: "",
        competenciasCulturales: [{ competencia: "", nivel: "", definicion: "" }],
        competenciasCargo: [{ competencia: "", nivel: "", definicion: "" }],
        responsabilidades: [{ value: "", funcion: "" }],
        indicadoresGestion: "", requisitosFisicos: "", riesgosObligacionesOrg: "",
        riesgosObligacionesEsp: "", planEntrenamiento: [""], planCapacitacionContinua: [""],
        planCarrera: "", competenciasDesarrolloIngreso: ""
    };

    const getActiveFormFromProps = () => {
        if (editingSolicitud) return editingSolicitud;
        if (isMegamayoristasForm) return megamayoristasFormData || baseForm;
        if (isConstruahorroForm) return construahorroFormData || baseForm;
        return formData || baseForm;
    };

    const [localForm, setLocalForm] = useState(() => ({ ...baseForm, ...getActiveFormFromProps() }));

    // Actualizaciones directas para no perder teclas
    const [competenciasCulturales, setCompetenciasCulturales] = useState([{ competencia: "", nivel: "", definicion: "" }]);
    const [competenciasCargo, setCompetenciasCargo] = useState([{ competencia: "", nivel: "", definicion: "" }]);
    const [responsabilidades, setResponsabilidades] = useState([{ id: 1, value: "", funcion: "" }]);
    const [planEntrenamiento, setPlanEntrenamiento] = useState([{ id: 1, value: "" }]);
    const [planCapacitacionContinua, setPlanCapacitacionContinua] = useState([{ id: 1, value: "" }]);
    const [editingFile, setEditingFile] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [refreshAprobadores, setRefreshAprobadores] = useState(0);
    
    const { isAdmin, isLoading } = useAuth();

    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = () => {
        setIsModalOpen(false);
        // Forzar actualización de aprobadores
        setRefreshAprobadores(prev => prev + 1);
    };

    useEffect(() => {
        if (editingSolicitud) {
            const dataToLoad = {
                ...editingSolicitud,
                area: typeof editingSolicitud.area === 'number' ? editingSolicitud.area : '',
                director: typeof editingSolicitud.director === 'number' ? editingSolicitud.director : '',
                gerencia: typeof editingSolicitud.gerencia === 'number' ? editingSolicitud.gerencia : '',
                calidad: typeof editingSolicitud.calidad === 'number' ? editingSolicitud.calidad : '',
                seguridad: typeof editingSolicitud.seguridad === 'number' ? editingSolicitud.seguridad : '',
                
                estructuraOrganizacional: editingSolicitud.estructuraOrganizacional || editingSolicitud.estructura_organizacional || null,
                planCarrera: editingSolicitud.planCarrera || "",
                competenciasDesarrolloIngreso: editingSolicitud.competenciasDesarrolloIngreso || "",
                indicadoresGestion: editingSolicitud.indicadores_gestion || editingSolicitud.indicadoresGestion || "",
                requisitosFisicos: editingSolicitud.requisitos_fisicos || editingSolicitud.requisitosFisicos || "",
                riesgosObligacionesOrg: editingSolicitud.riesgos_obligaciones_sst_organizacionales || editingSolicitud.riesgosObligacionesOrg || "",
                riesgosObligacionesEsp: editingSolicitud.riesgos_obligaciones_sst_especificos || editingSolicitud.riesgosObligacionesEsp || "",
                // Normalizar valores con posibles inconsistencias de acento
                requiereVehiculo: editingSolicitud.requiereVehiculo === "Si" ? "Sí" : editingSolicitud.requiereVehiculo || "",
                requiereViajar: editingSolicitud.requiereViajar === "Si" ? "Sí" : editingSolicitud.requiereViajar || "",
            };

            if (editingSolicitud.isMegamayoristas) {
                setMegamayoristasFormData(dataToLoad);
            } else if (editingSolicitud.isConstruahorro) {
                setConstruahorroFormData(dataToLoad);
            } else {
                setFormData(dataToLoad);
            }

            setLocalForm(prev => ({ ...prev, ...dataToLoad }));

            setCompetenciasCulturales(
                typeof editingSolicitud.competenciasCulturales === "string"
                    ? JSON.parse(editingSolicitud.competenciasCulturales)
                    : (editingSolicitud.competenciasCulturales || [{ competencia: "", nivel: "", definicion: "" }])
            );
            setCompetenciasCargo(
                typeof editingSolicitud.competenciasCargo === "string"
                    ? JSON.parse(editingSolicitud.competenciasCargo)
                    : (editingSolicitud.competenciasCargo || [{ competencia: "", nivel: "", definicion: "" }])
            );
            setResponsabilidades(
                Array.isArray(editingSolicitud.responsabilidades)
                    ? editingSolicitud.responsabilidades.map((item, id) => ({
                        id: id + 1,
                        value: typeof item === "string" ? item : item.value || "",
                        funcion: typeof item === "object" && item.funcion ? item.funcion : "",
                    }))
                    : [{ id: 1, value: "", funcion: "" }]
            );
            
            // Corregir el parseo de planEntrenamiento
            setPlanEntrenamiento(
                Array.isArray(editingSolicitud.planEntrenamiento)
                    ? editingSolicitud.planEntrenamiento.map((value, id) => ({ 
                        id: id + 1, 
                        value: typeof value === 'string' ? value : (value?.value || value?.texto || String(value))
                    }))
                    : [{ id: 1, value: "" }]
            );
            
            // Corregir el parseo de planCapacitacionContinua
            setPlanCapacitacionContinua(
                Array.isArray(editingSolicitud.planCapacitacionContinua)
                    ? editingSolicitud.planCapacitacionContinua.map((value, id) => ({ 
                        id: id + 1, 
                        value: typeof value === 'string' ? value : (value?.value || value?.texto || String(value))
                    }))
                    : [{ id: 1, value: "" }]
            );
            
            setEditingFile(null);
        } else {
            resetFormState();
            setLocalForm({ ...baseForm });
        }
    }, [editingSolicitud]);

    // Sincronizar localForm cuando cambia la empresa activa
    useEffect(() => {
        setLocalForm({ ...baseForm, ...getActiveFormFromProps() });
    }, [isConstruahorroForm, isMegamayoristasForm]);

    const syncEditingSolicitudWithLocalArrays = () => {
        if (!editingSolicitud) return editingSolicitud;
        return {
            ...editingSolicitud,
            competenciasCulturales: competenciasCulturales.map(c => ({ ...c })),
            competenciasCargo: competenciasCargo.map(c => ({ ...c })),
            responsabilidades: responsabilidades.map(r => ({ value: r.value, funcion: r.funcion })),
            planEntrenamiento: planEntrenamiento.map(p => p.value),
            planCapacitacionContinua: planCapacitacionContinua.map(p => p.value),
        };
    };

    const resetFormState = () => {
        setCompetenciasCulturales([{ competencia: "", nivel: "", definicion: "" }]);
        setCompetenciasCargo([{ competencia: "", nivel: "", definicion: "" }]);
        setResponsabilidades([{ id: 1, value: "", funcion: "" }]);
        setPlanEntrenamiento([{ id: 1, value: "" }]);
        setPlanCapacitacionContinua([{ id: 1, value: "" }]);
    };

    const sanitizeFileName = (file) => file ? new File([file], file.name.replace(/[^a-zA-Z0-9.-]/g, "_"), { type: file.type }) : null;

    const validateFile = (file) => {
        if (!file) return "Por favor, seleccione un archivo.";
        if (!ALLOWED_FILE_TYPES.includes(file.type)) return "Tipo de archivo no permitido. Use JPG, PNG o WEBP.";
        if (file.size > MAX_FILE_SIZE) return `El archivo excede el tamaño máximo de ${MAX_FILE_SIZE / (1024 * 1024)}MB.`;
        return null;
    };

  const validateForm = (data) => {
    if (!data.fecha) return "La fecha es requerida.";
    if (!data.area) return "El encargado de área es requerido.";
    if (!data.director) return "El director de área es requerido.";
    if (!data.gerencia) return "La gerencia general es requerida.";
    if (!data.calidad) return "El aprobador de calidad es requerido.";
    if (!data.seguridad) return "Seguridad y Salud en el Trabajo es requerido.";
    if (!data.nombreCargo) return "El nombre del cargo es requerido.";
    if (!data.areaGeneral) return "El área es requerida.";
    if (!data.departamento) return "El departamento es requerido.";
    if (!data.proceso) return "El proceso al que pertenece es requerido.";
    if (!data.escolaridad) return "La escolaridad es requerida.";
    if (!data.areaFormacion && !data.area_formacion) return "El área de formación es requerida.";
    if (!data.experiencia) return "La experiencia necesaria es requerida.";
    if (!data.jefeInmediato) return "El jefe inmediato es requerido.";
    if (!data.tipoContrato) return "El tipo de contrato es requerido.";
    if (!data.misionCargo) return "La misión del cargo es requerida.";
    
    const existingFileUrl = editingSolicitud && (editingSolicitud.estructuraOrganizacional || editingSolicitud.estructura_organizacional || data.estructuraOrganizacional);
    const hasExistingFile = !!existingFileUrl;
    const hasNewFile = data.estructuraOrganizacional || editingFile;
    if (!editingSolicitud && !hasNewFile) {
        return "El archivo de estructura organizacional es requerido.";
    }
    
    // Validación ajustada para manejar "Sí" y "Si"
    const requiereVehiculo = data.requiereVehiculo === "Sí" || data.requiereVehiculo === "Si";
    if (requiereVehiculo && (!data.tipoLicencia || data.tipoLicencia.trim() === "")) {
        return "El tipo de licencia es requerido si se requiere vehículo.";
    }
    
    // Asegurar que tipoLicencia sea cadena vacía si no se requiere vehículo
    if (!requiereVehiculo) {
        data.tipoLicencia = "";
    }
    
    return null;
};

    const handleChange = useCallback((e) => {
    const { name, value, files } = e.target;
    let newValue = value;

    if (name === "estructuraOrganizacional" && files && files[0]) {
        const file = sanitizeFileName(files[0]);
        const validationError = validateFile(file);
        if (validationError) {
            toast.error(validationError);
            return;
        }
        newValue = file;
        if (editingSolicitud) {
            setEditingFile(file);
        }
    } else if (name === "areaGeneral") {
        newValue = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    } else if (name === "proceso") {
        newValue = value.toUpperCase();
    } else if (name === "requiereVehiculo") {
        // Normalizar "Si" a "Sí"
        newValue = value === "Si" ? "Sí" : value;
    }

    setLocalForm((prev) => { 
        let updated = { ...prev, [name]: newValue };
        if (name === "areaFormacion") {
            updated.area_formacion = newValue;
        }
        if (name === "requiereVehiculo" && newValue === "No") {
            updated.tipoLicencia = "";
        }
        return updated;
    });
}, []);

    const syncArrayWithEditingSolicitud = useCallback((key, value) => {
        if (editingSolicitud) {
            let syncValue = value;
            
            // Para planEntrenamiento y planCapacitacionContinua, extraer solo los valores string
            if (key === 'planEntrenamiento' || key === 'planCapacitacionContinua') {
                syncValue = value.map(item => 
                    typeof item === 'object' && item.value !== undefined ? item.value : item
                );
            }
            
            setEditingSolicitud(prev => ({
                ...prev,
                [key]: syncValue
            }));
        }
    }, [editingSolicitud]);

    const handleCompetenciaCulturalChange = useCallback((index, field, value) => {
        setCompetenciasCulturales(prev => {
            const next = prev.map((item, i) => i === index ? { ...item, [field]: value } : item);
            if (editingSolicitud) {
                syncArrayWithEditingSolicitud("competenciasCulturales", next);
            }
            return next;
        });
    }, [editingSolicitud, syncArrayWithEditingSolicitud]);

    const handleCompetenciaCargoChange = useCallback((index, field, value) => {
        setCompetenciasCargo(prev => {
            const next = prev.map((item, i) => i === index ? { ...item, [field]: value } : item);
            if (editingSolicitud) {
                syncArrayWithEditingSolicitud("competenciasCargo", next);
            }
            return next;
        });
    }, [editingSolicitud, syncArrayWithEditingSolicitud]);

    const handleResponsabilidadChange = useCallback((index, field, value) => {
        setResponsabilidades(prev => {
            const next = prev.map((item, i) => i === index ? { ...item, [field]: value } : item);
            if (editingSolicitud) {
                syncArrayWithEditingSolicitud("responsabilidades", next.map(r => ({ value: r.value, funcion: r.funcion })));
            }
            return next;
        });
    }, [editingSolicitud, syncArrayWithEditingSolicitud]);

    const handlePlanEntrenamientoChange = useCallback((index, value) => {
        setPlanEntrenamiento(prev => {
            const next = prev.map((item, i) => i === index ? { ...item, value } : item);
            if (editingSolicitud) {
                syncArrayWithEditingSolicitud("planEntrenamiento", next.map(p => p.value));
            }
            return next;
        });
    }, [editingSolicitud, syncArrayWithEditingSolicitud]);

    const handlePlanCapacitacionContinuaChange = useCallback((index, value) => {
        setPlanCapacitacionContinua(prev => {
            const next = prev.map((item, i) => i === index ? { ...item, value } : item);
            if (editingSolicitud) {
                syncArrayWithEditingSolicitud("planCapacitacionContinua", next.map(p => p.value));
            }
            return next;
        });
    }, [editingSolicitud, syncArrayWithEditingSolicitud]);

    const addCompetenciaCultural = useCallback(() => {
        const updated = [...competenciasCulturales, { competencia: "", nivel: "", definicion: "" }];
        setCompetenciasCulturales(updated);
        if (editingSolicitud) syncArrayWithEditingSolicitud("competenciasCulturales", updated);
    }, [competenciasCulturales, editingSolicitud, syncArrayWithEditingSolicitud]);

    const addCompetenciaCargo = useCallback(() => {
        const updated = [...competenciasCargo, { competencia: "", nivel: "", definicion: "" }];
        setCompetenciasCargo(updated);
        if (editingSolicitud) syncArrayWithEditingSolicitud("competenciasCargo", updated);
    }, [competenciasCargo, editingSolicitud, syncArrayWithEditingSolicitud]);

    const addResponsabilidad = useCallback(() => {
        const updated = [...responsabilidades, { id: responsabilidades.length + 1, value: "", funcion: "" }];
        setResponsabilidades(updated);
        if (editingSolicitud) syncArrayWithEditingSolicitud("responsabilidades", updated.map(r => ({ value: r.value, funcion: r.funcion })));
    }, [responsabilidades, editingSolicitud, syncArrayWithEditingSolicitud]);

    const addPlanEntrenamiento = useCallback(() => {
        const updated = [...planEntrenamiento, { id: planEntrenamiento.length + 1, value: "" }];
        setPlanEntrenamiento(updated);
        // Sincronizar solo los valores string
        if (editingSolicitud) syncArrayWithEditingSolicitud("planEntrenamiento", updated.map(p => p.value));
    }, [planEntrenamiento, editingSolicitud, syncArrayWithEditingSolicitud]);

    const addPlanCapacitacionContinua = useCallback(() => {
        const updated = [...planCapacitacionContinua, { id: planCapacitacionContinua.length + 1, value: "" }];
        setPlanCapacitacionContinua(updated);
        // Sincronizar solo los valores string
        if (editingSolicitud) syncArrayWithEditingSolicitud("planCapacitacionContinua", updated.map(p => p.value));
    }, [planCapacitacionContinua, editingSolicitud, syncArrayWithEditingSolicitud]);

    const removeCompetenciaCultural = useCallback((index) => {
        const updated = competenciasCulturales.filter((_, i) => i !== index);
        setCompetenciasCulturales(updated);
        if (editingSolicitud) syncArrayWithEditingSolicitud("competenciasCulturales", updated);
    }, [competenciasCulturales, editingSolicitud, syncArrayWithEditingSolicitud]);

    const removeCompetenciaCargo = useCallback((index) => {
        const updated = competenciasCargo.filter((_, i) => i !== index);
        setCompetenciasCargo(updated);
        if (editingSolicitud) syncArrayWithEditingSolicitud("competenciasCargo", updated);
    }, [competenciasCargo, editingSolicitud, syncArrayWithEditingSolicitud]);

    const removeResponsabilidad = useCallback((index) => {
        const updated = responsabilidades.filter((_, i) => i !== index);
        setResponsabilidades(updated);
        if (editingSolicitud) syncArrayWithEditingSolicitud("responsabilidades", updated.map(r => ({ value: r.value, funcion: r.funcion })));
    }, [responsabilidades, editingSolicitud, syncArrayWithEditingSolicitud]);

    const removePlanEntrenamiento = useCallback((index) => {
        const updated = planEntrenamiento.filter((_, i) => i !== index);
        setPlanEntrenamiento(updated);
        // Sincronizar solo los valores string
        if (editingSolicitud) syncArrayWithEditingSolicitud("planEntrenamiento", updated.map(p => p.value));
    }, [planEntrenamiento, editingSolicitud, syncArrayWithEditingSolicitud]);

    const removePlanCapacitacionContinua = useCallback((index) => {
        const updated = planCapacitacionContinua.filter((_, i) => i !== index);
        setPlanCapacitacionContinua(updated);
        // Sincronizar solo los valores string
        if (editingSolicitud) syncArrayWithEditingSolicitud("planCapacitacionContinua", updated.map(p => p.value));
    }, [planCapacitacionContinua, editingSolicitud, syncArrayWithEditingSolicitud]);

    const resetForm = () => {
        resetFormState();
        setEditingSolicitud(null);
        setEditingFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setLocalForm({ ...baseForm });
        // Mantener sincronía ocasional con el padre (se ejecuta pocas veces)
        setFormData({ ...baseForm });
        setConstruahorroFormData({ ...baseForm });
        setMegamayoristasFormData({ ...baseForm });
    };

    const showSuccess = (message) => {
        toast.custom(
            t => (<div className={`${t.visible ? 'animate-enter' : 'animate-leave'} toast-success-custom`} style={{ background: 'linear-gradient(90deg, #43e97b 0%, #43e97b 100%)', color: '#222', padding: '16px 24px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', fontWeight: 600, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '12px' }}><span style={{ fontSize: '1.5rem' }}>✅</span><span>{message}</span></div>),
            { duration: 4000 }
        );
    };

    const showError = (message) => {
        toast.custom(
            t => (<div className={`${t.visible ? 'animate-enter' : 'animate-leave'} toast-error-custom`} style={{ background: 'linear-gradient(90deg, #ff5858 0%, #ff5858 100%)', color: '#fff', padding: '16px 24px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', fontWeight: 600, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '12px' }}><span style={{ fontSize: '1.5rem' }}>❌</span><span>{message}</span></div>),
            { duration: 4000 }
        );
    };

   const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        const data = localForm;
        
        const validationError = validateForm(data);
        if (validationError) {
            toast.error(validationError);
            setIsSubmitting(false);
            return;
        }
        
        const formPayload = new FormData();
        const fields = {
            ...data,
            // Asegurar que se envíe area_formacion
            area_formacion: data.areaFormacion || data.area_formacion,
            poblacionFocalizada: JSON.stringify(data.poblacionFocalizada),
            competenciasCulturales: JSON.stringify(competenciasCulturales),
            competenciasCargo: JSON.stringify(competenciasCargo),
            responsabilidades: JSON.stringify(responsabilidades.map(r => ({ value: r.value, funcion: r.funcion }))),
            planEntrenamiento: JSON.stringify(planEntrenamiento.map(p => p.value)),
            planCapacitacionContinua: JSON.stringify(planCapacitacionContinua.map(p => p.value)),
            // Asegurar que tipoLicencia sea cadena vacía si no se requiere vehículo
            tipoLicencia: (data.requiereVehiculo === "Sí" || data.requiereVehiculo === "Si") ? (data.tipoLicencia || "") : "",
        };
        
        // Log para depuración
        console.log("Valores enviados en handleSubmit:", {
            requiereVehiculo: fields.requiereVehiculo,
            tipoLicencia: fields.tipoLicencia,
            isConstruahorro: isConstruahorroForm,
            isMegamayoristas: isMegamayoristasForm
        });
        
        Object.entries(fields).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                formPayload.append(key, value);
            }
        });
        formPayload.append("isConstruahorro", isConstruahorroForm.toString());
        formPayload.append("isMegamayoristas", isMegamayoristasForm.toString());
        
        await axios.post(`${BACKEND_URL}/yuli`, formPayload, { headers: { "Content-Type": "multipart/form-data" } });
        resetForm();
        fetchHistorial();
        showSuccess("Solicitud enviada correctamente");
    } catch (error) {
        console.error("Error al enviar la solicitud:", error);
        console.log("Detalles del error:", error.response?.data);
        const errorMessage = error.response?.data?.error || error.message || "Error interno del servidor.";
        showError(`Error al enviar: ${errorMessage}`);
    }
    setIsSubmitting(false);
};

    const handleResend = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        const syncedSolicitud = { ...syncEditingSolicitudWithLocalArrays(), ...localForm };
        
        const validationError = validateForm(syncedSolicitud);
        if (validationError) {
            toast.error(validationError);
            setIsSubmitting(false);
            return;
        }

        const formPayload = new FormData();
        
        const existingFileUrl = syncedSolicitud.estructuraOrganizacional || syncedSolicitud.estructura_organizacional;
        if (editingFile) {
            formPayload.append("estructuraOrganizacional", editingFile);
        } else if (existingFileUrl) {
            formPayload.append("keepExistingFile", "true");
            formPayload.append("existingFileUrl", existingFileUrl);
        }
        
        const fields = {
            ...syncedSolicitud,
            // Asegurar que se mantengan las banderas de empresa originales
            area_formacion: syncedSolicitud.areaFormacion || syncedSolicitud.area_formacion,
            poblacionFocalizada: JSON.stringify(syncedSolicitud.poblacionFocalizada),
            competenciasCulturales: JSON.stringify(syncedSolicitud.competenciasCulturales),
            competenciasCargo: JSON.stringify(syncedSolicitud.competenciasCargo),
            responsabilidades: JSON.stringify(syncedSolicitud.responsabilidades),
            planEntrenamiento: JSON.stringify(syncedSolicitud.planEntrenamiento),
            planCapacitacionContinua: JSON.stringify(syncedSolicitud.planCapacitacionContinua),
            // Asegurar que tipoLicencia sea cadena vacía si no se requiere vehículo
            tipoLicencia: (syncedSolicitud.requiereVehiculo === "Sí" || syncedSolicitud.requiereVehiculo === "Si") ? (syncedSolicitud.tipoLicencia || "") : "",
        };

        // Log para depuración
        console.log("Valores enviados en handleResend:", {
            requiereVehiculo: fields.requiereVehiculo,
            tipoLicencia: fields.tipoLicencia,
            isConstruahorro: fields.isConstruahorro,
            isMegamayoristas: fields.isMegamayoristas
        });

        // Itera sobre todos los campos y los adjunta al payload, excluyendo las flags y campos no necesarios
        Object.entries(fields).forEach(([key, value]) => {
            if (key !== "_id" && key !== "estructuraOrganizacional" && key !== "isConstruahorro" && key !== "isMegamayoristas" && value !== null && value !== undefined) {
                formPayload.append(key, value);
            }
        });

        formPayload.append("resend", "true");
        formPayload.append("isConstruahorro", (typeof syncedSolicitud.isConstruahorro === "boolean" ? syncedSolicitud.isConstruahorro : !!syncedSolicitud.isConstruahorro).toString());
        formPayload.append("isMegamayoristas", (typeof syncedSolicitud.isMegamayoristas === "boolean" ? syncedSolicitud.isMegamayoristas : !!syncedSolicitud.isMegamayoristas).toString());
        
        // Convertimos los IDs de aprobadores a números enteros antes de enviarlos
        formPayload.append("area", parseInt(syncedSolicitud.area));
        formPayload.append("director", parseInt(syncedSolicitud.director));
        formPayload.append("gerencia", parseInt(syncedSolicitud.gerencia));
        formPayload.append("calidad", parseInt(syncedSolicitud.calidad));
        formPayload.append("seguridad", parseInt(syncedSolicitud.seguridad));

        await axios.post(`${BACKEND_URL}/yuli/resend/${syncedSolicitud.id}`, formPayload, { headers: { "Content-Type": "multipart/form-data" } });
        showSuccess("Solicitud reenviada correctamente");
        fetchHistorial();
        resetForm();
    } catch (error) {
        console.error("Error al actualizar la solicitud:", error);
        console.log("Detalles del error:", error.response?.data);
        const errorMessage = error.response?.data?.error || error.message || "Error interno del servidor.";
        showError(`Error al actualizar: ${errorMessage}`);
    }
    setIsSubmitting(false);
};

    const handleMultiSelectChange = useCallback((event) => {
        const { name, value } = event.target;
        setLocalForm((prev) => ({ ...prev, [name]: typeof value === 'string' ? value.split(',') : value }));
    }, []);

    const formToShow = localForm;
    const aprobadoresData = useMemo(() => ({
        area: localForm.area,
        director: localForm.director,
        gerencia: localForm.gerencia,
        calidad: localForm.calidad,
        seguridad: localForm.seguridad,
    }), [localForm.area, localForm.director, localForm.gerencia, localForm.calidad, localForm.seguridad]);

    const handleAprobadorChange = useCallback((e) => {
        const { name, value } = e.target;
        setLocalForm((prev) => ({ ...prev, [name]: value }));
    }, []);

    return (
        <Paper elevation={3} sx={{ p: 4, my: 4 }}>
            <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontWeight: 600, fontSize: '1rem' } }} reverseOrder={false} limit={1} />
            <form ref={formRef} onSubmit={editingSolicitud ? (e) => e.preventDefault() : handleSubmit}>
                <GeneralInfoParams 
                    formToShow={formToShow} 
                    handleChange={handleChange} 
                    handleMultiSelectChange={handleMultiSelectChange} 
                />

                <JobDescription 
                    formToShow={formToShow} 
                    handleChange={handleChange} 
                />

                <Competencies 
                    competenciasCulturales={competenciasCulturales} 
                    handleCompetenciaCulturalChange={handleCompetenciaCulturalChange} 
                    removeCompetenciaCultural={removeCompetenciaCultural} 
                    addCompetenciaCultural={addCompetenciaCultural}
                    competenciasCargo={competenciasCargo} 
                    handleCompetenciaCargoChange={handleCompetenciaCargoChange} 
                    removeCompetenciaCargo={removeCompetenciaCargo} 
                    addCompetenciaCargo={addCompetenciaCargo}
                />

                <Responsibilities 
                    responsabilidades={responsabilidades} 
                    handleResponsabilidadChange={handleResponsabilidadChange} 
                    removeResponsabilidad={removeResponsabilidad} 
                    addResponsabilidad={addResponsabilidad}
                />

                <IndicatorsRisks 
                    formToShow={formToShow} 
                    handleChange={handleChange} 
                />

                <ComplementaryInfo 
                    planEntrenamiento={planEntrenamiento} 
                    handlePlanEntrenamientoChange={handlePlanEntrenamientoChange} 
                    removePlanEntrenamiento={removePlanEntrenamiento} 
                    addPlanEntrenamiento={addPlanEntrenamiento}
                    planCapacitacionContinua={planCapacitacionContinua} 
                    handlePlanCapacitacionContinuaChange={handlePlanCapacitacionContinuaChange} 
                    removePlanCapacitacionContinua={removePlanCapacitacionContinua} 
                    addPlanCapacitacionContinua={addPlanCapacitacionContinua}
                    formToShow={formToShow} 
                    handleChange={handleChange}
                />

                <DocumentsApprovals 
                    formToShow={formToShow} 
                    handleChange={handleChange} 
                    fileInputRef={fileInputRef} 
                    editingSolicitud={editingSolicitud} 
                    handleOpenModal={handleOpenModal} 
                    handleCloseModal={handleCloseModal} 
                    isModalOpen={isModalOpen}
                    isSubmitting={isSubmitting} 
                    isAdmin={isAdmin} 
                    isLoading={isLoading} 
                    aprobadoresData={aprobadoresData} 
                    handleAprobadorChange={handleAprobadorChange} 
                    refreshAprobadores={refreshAprobadores}
                    handleSubmit={handleSubmit} 
                    handleResend={handleResend} 
                    resetForm={resetForm}
                    isMegamayoristasForm={isMegamayoristasForm} 
                    isConstruahorroForm={isConstruahorroForm}
                />
            </form>
        </Paper>
    );
};

export default React.memo(FormComponent);