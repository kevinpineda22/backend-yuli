import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from 'react-toastify';
import { TextField, Select, MenuItem, Button, FormControl, InputLabel, Paper, Typography, Box, Grid, Chip, OutlinedInput, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from "@mui/icons-material/Send";
import DeleteIcon from "@mui/icons-material/Delete";

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
    const [competenciasCulturales, setCompetenciasCulturales] = useState([{ competencia: "", nivel: "", definicion: "" }]);
    const [competenciasCargo, setCompetenciasCargo] = useState([{ competencia: "", nivel: "", definicion: "" }]);
    const [responsabilidades, setResponsabilidades] = useState([{ id: 1, value: "", funcion: "" }]);
    const [planEntrenamiento, setPlanEntrenamiento] = useState([{ id: 1, value: "" }]);
    const [planCapacitacionContinua, setPlanCapacitacionContinua] = useState([{ id: 1, value: "" }]);

    useEffect(() => {
        if (editingSolicitud) {
            const dataToLoad = {
                ...editingSolicitud,
                estructuraOrganizacional: null,
                planCarrera: editingSolicitud.planCarrera || "",
                competenciasDesarrolloIngreso: editingSolicitud.competenciasDesarrolloIngreso || "",
                indicadoresGestion: editingSolicitud.indicadores_gestion || "",
                requisitosFisicos: editingSolicitud.requisitos_fisicos || "",
                riesgosObligacionesOrg: editingSolicitud.riesgos_obligaciones_sst_organizacionales || "",
                riesgosObligacionesEsp: editingSolicitud.riesgos_obligaciones_sst_especificos || "",
                calidad: editingSolicitud.calidad || "",
            };
            if (editingSolicitud.isMegamayoristas) {
                setMegamayoristasFormData(dataToLoad);
            } else if (editingSolicitud.isConstruahorro) {
                setConstruahorroFormData(dataToLoad);
            } else {
                setFormData(dataToLoad);
            }

            setCompetenciasCulturales(typeof editingSolicitud.competenciasCulturales === "string" 
                ? JSON.parse(editingSolicitud.competenciasCulturales) 
                : (editingSolicitud.competenciasCulturales || [{ competencia: "", nivel: "", definicion: "" }]));
            
            setCompetenciasCargo(typeof editingSolicitud.competenciasCargo === "string" 
                ? JSON.parse(editingSolicitud.competenciasCargo) 
                : (editingSolicitud.competenciasCargo || [{ competencia: "", nivel: "", definicion: "" }]));
            
            setResponsabilidades((editingSolicitud.responsabilidades || []).map((item, id) => ({
                id: id + 1,
                value: typeof item === "string" ? item : item.value || "",
                funcion: typeof item === "object" && item.funcion ? item.funcion : "",
            })));

            setPlanEntrenamiento((editingSolicitud.planEntrenamiento || []).map((value, id) => ({ id: id + 1, value })));
            setPlanCapacitacionContinua((editingSolicitud.planCapacitacionContinua || []).map((value, id) => ({ id: id + 1, value })));
        } else {
            resetFormState();
        }
    }, [editingSolicitud]);

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

    const validateForm = (data, isConstruahorro) => {
        if (!data.fecha) return "La fecha es requerida.";
        if (!data.director) return "El director de área es requerido.";
        if (!data.gerencia) return "La gerencia general es requerida.";
        if (!data.calidad) return "El aprobador de calidad es requerido.";
        if (!data.seguridad) return "Seguridad y Salud en el Trabajo es requerido.";
        if (!isConstruahorro && !data.area) return "El encargado de área es requerido para Merkahorro.";
        if (!data.nombreCargo) return "El nombre del cargo es requerido.";
        if (!data.areaGeneral) return "El área es requerida.";
        if (!data.departamento) return "El departamento es requerido.";
        if (!data.proceso) return "El proceso al que pertenece es requerido.";
        if (!data.escolaridad) return "La escolaridad es requerida.";
        if (!data.area_formacion) return "El área de formación es requerida.";
        if (!data.experiencia) return "La experiencia necesaria es requerida.";
        if (!data.jefeInmediato) return "El jefe inmediato es requerido.";
        if (!data.tipoContrato) return "El tipo de contrato es requerido.";
        if (!data.misionCargo) return "La misión del cargo es requerida.";
        if (!data.estructuraOrganizacional) return "El archivo de estructura organizacional es requerido.";
        if (data.requiereVehiculo === "Sí" && !data.tipoLicencia) return "El tipo de licencia es requerido si se requiere vehículo.";
        return null;
    };

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        let newValue = value;
        const setter = editingSolicitud
            ? setEditingSolicitud
            : isMegamayoristasForm
            ? setMegamayoristasFormData
            : isConstruahorroForm
            ? setConstruahorroFormData
            : setFormData;

        if (name === "estructuraOrganizacional" && files && files[0]) {
            const file = sanitizeFileName(files[0]);
            const validationError = validateFile(file);
            if (validationError) {
                toast.error(validationError);
                return;
            }
            newValue = file;
        } else if (name === "areaGeneral") {
            newValue = value.toUpperCase();
        } else if (name === "proceso") {
            newValue = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        }

        setter((prev) => ({ ...prev, [name]: newValue }));
    };

    const handleCompetenciaCulturalChange = (index, field, value) => {
        const updatedCompetencias = [...competenciasCulturales];
        updatedCompetencias[index][field] = value;
        setCompetenciasCulturales(updatedCompetencias);
    };

    const handleCompetenciaCargoChange = (index, field, value) => {
        const updatedCompetencias = [...competenciasCargo];
        updatedCompetencias[index][field] = value;
        setCompetenciasCargo(updatedCompetencias);
    };

    const handleResponsabilidadChange = (index, field, value) => {
        const updatedResponsabilidades = [...responsabilidades];
        updatedResponsabilidades[index][field] = value;
        setResponsabilidades(updatedResponsabilidades);
    };

    const handlePlanEntrenamientoChange = (index, value) => {
        const updatedPlan = [...planEntrenamiento];
        updatedPlan[index].value = value;
        setPlanEntrenamiento(updatedPlan);
    };

    const handlePlanCapacitacionContinuaChange = (index, value) => {
        const updatedPlan = [...planCapacitacionContinua];
        updatedPlan[index].value = value;
        setPlanCapacitacionContinua(updatedPlan);
    };

    const addCompetenciaCultural = () => setCompetenciasCulturales([...competenciasCulturales, { competencia: "", nivel: "", definicion: "" }]);
    const addCompetenciaCargo = () => setCompetenciasCargo([...competenciasCargo, { competencia: "", nivel: "", definicion: "" }]);
    const addResponsabilidad = () => setResponsabilidades([...responsabilidades, { id: responsabilidades.length + 1, value: "", funcion: "" }]);
    const addPlanEntrenamiento = () => setPlanEntrenamiento([...planEntrenamiento, { id: planEntrenamiento.length + 1, value: "" }]);
    const addPlanCapacitacionContinua = () => setPlanCapacitacionContinua([...planCapacitacionContinua, { id: planCapacitacionContinua.length + 1, value: "" }]);

    const removeCompetenciaCultural = (index) => setCompetenciasCulturales(prev => prev.filter((_, i) => i !== index));
    const removeCompetenciaCargo = (index) => setCompetenciasCargo(prev => prev.filter((_, i) => i !== index));
    const removeResponsabilidad = (index) => setResponsabilidades(prev => prev.filter((_, i) => i !== index));
    const removePlanEntrenamiento = (index) => setPlanEntrenamiento(prev => prev.filter((_, i) => i !== index));
    const removePlanCapacitacionContinua = (index) => setPlanCapacitacionContinua(prev => prev.filter((_, i) => i !== index));

    const resetForm = () => {
        const defaultData = {
            fecha: new Date().toISOString().split("T")[0],
            director: isConstruahorroForm ? "Comercialconstruahorro@merkahorrosas.com" : "",
            gerencia: isConstruahorroForm ? "gerencia@construahorrosas.com" : "",
            calidad: "",
            seguridad: "",
            area: "",
            nombreCargo: "",
            areaGeneral: "",
            departamento: "",
            proceso: "",
            estructuraOrganizacional: null,
            poblacionFocalizada: [],
            escolaridad: "",
            area_formacion: "",
            estudiosComplementarios: "",
            experiencia: "",
            jefeInmediato: "",
            supervisaA: "",
            numeroPersonasCargo: "",
            tipoContrato: "",
            misionCargo: "",
            cursosCertificaciones: "",
            requiereVehiculo: "",
            tipoLicencia: "",
            idiomas: "",
            requiereViajar: "",
            areasRelacionadas: "",
            relacionamientoExterno: "",
            competenciasCulturales: [{ competencia: "", nivel: "", definicion: "" }],
            competenciasCargo: [{ competencia: "", nivel: "", definicion: "" }],
            responsabilidades: [{ value: "", funcion: "" }],
            indicadoresGestion: "",
            requisitosFisicos: "",
            riesgosObligacionesOrg: "",
            riesgosObligacionesEsp: "",
            planEntrenamiento: [""],
            planCapacitacionContinua: [""],
            planCarrera: "",
            competenciasDesarrolloIngreso: "",
        };
        isConstruahorroForm ? setConstruahorroFormData({ ...defaultData, director: "Comercialconstruahorro@merkahorrosas.com", gerencia: "gerencia@construahorrosas.com" }) : setFormData(defaultData);
        resetFormState();
        setEditingSolicitud(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const data = isConstruahorroForm ? construahorroFormData : formData;
            const validationError = validateForm(data, isConstruahorroForm);
            if (validationError) {
                toast.error(validationError);
                setIsSubmitting(false);
                return;
            }
            const formPayload = new FormData();
            const fields = {
                ...data,
                descripcion: "No aplica",
                poblacionFocalizada: JSON.stringify(data.poblacionFocalizada),
                estudiosComplementarios: data.estudiosComplementarios || "No aplica",
                supervisaA: data.supervisaA || "No aplica",
                numeroPersonasCargo: data.numeroPersonasCargo || "0",
                cursosCertificaciones: data.cursosCertificaciones || "No aplica",
                requiereVehiculo: data.requiereVehiculo || "No aplica",
                tipoLicencia: data.tipoLicencia || "No aplica",
                idiomas: data.idiomas || "No aplica",
                requiereViajar: data.requiereViajar || "No aplica",
                areasRelacionadas: data.areasRelacionadas || "No aplica",
                relacionamientoExterno: data.relacionamientoExterno || "No aplica",
                competenciasCulturales: JSON.stringify(competenciasCulturales),
                competenciasCargo: JSON.stringify(competenciasCargo),
                responsabilidades: JSON.stringify(responsabilidades.map(r => ({ value: r.value, funcion: r.funcion }))),
                indicadores_gestion: data.indicadoresGestion || "No aplica",
                requisitos_fisicos: data.requisitosFisicos || "No aplica",
                riesgos_obligaciones_sst_organizacionales: data.riesgosObligacionesOrg || "No aplica",
                riesgos_obligaciones_sst_especificos: data.riesgosObligacionesEsp || "No aplica",
                planEntrenamiento: JSON.stringify(planEntrenamiento.map(p => p.value)),
                planCapacitacionContinua: JSON.stringify(planCapacitacionContinua.map(p => p.value)),
                planCarrera: data.planCarrera || "No aplica",
                competenciasDesarrolloIngreso: data.competenciasDesarrolloIngreso || "No aplica",
            };
            Object.entries(fields).forEach(([key, value]) => {
                if (value !== null && !(isConstruahorroForm && key === "area")) formPayload.append(key, value);
            });
            formPayload.append("isConstruahorro", isConstruahorroForm.toString());
            formPayload.append("isMegamayoristas", isMegamayoristasForm.toString()); // NUEVO
            await axios.post(`${BACKEND_URL}/yuli`, formPayload, { headers: { "Content-Type": "multipart/form-data" } });
            resetForm();
            fetchHistorial();
            toast.success("Solicitud enviada correctamente");
        } catch (error) {
            console.error("Error al enviar la solicitud:", error);
            const errorMessage = error.response?.data?.error || error.message || "Error interno del servidor.";
            toast.error(`Error al enviar: ${errorMessage}`);
        }
        setIsSubmitting(false);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editingSolicitud) return;
        setIsSubmitting(true);
        try {
            const formPayload = new FormData();
            const fields = {
                ...editingSolicitud,
                descripcion: "No aplica",
                poblacionFocalizada: JSON.stringify(editingSolicitud.poblacionFocalizada),
                estudiosComplementarios: editingSolicitud.estudiosComplementarios || "No aplica",
                supervisaA: editingSolicitud.supervisaA || "No aplica",
                numeroPersonasCargo: editingSolicitud.numeroPersonasCargo || "0",
                cursosCertificaciones: editingSolicitud.cursosCertificaciones || "No aplica",
                requiereVehiculo: editingSolicitud.requiereVehiculo || "No aplica",
                tipoLicencia: editingSolicitud.tipoLicencia || "No aplica",
                idiomas: editingSolicitud.idiomas || "No aplica",
                requiereViajar: editingSolicitud.requiereViajar || "No aplica",
                areasRelacionadas: editingSolicitud.areasRelacionadas || "No aplica",
                relacionamientoExterno: editingSolicitud.relacionamientoExterno || "No aplica",
                competenciasCulturales: JSON.stringify(competenciasCulturales),
                competenciasCargo: JSON.stringify(competenciasCargo),
                responsabilidades: JSON.stringify(responsabilidades.map(r => ({ value: r.value, funcion: r.funcion }))),
                indicadores_gestion: editingSolicitud.indicadoresGestion || "No aplica",
                requisitos_fisicos: editingSolicitud.requisitosFisicos || "No aplica",
                riesgos_obligaciones_sst_organizacionales: editingSolicitud.riesgosObligacionesOrg || "No aplica",
                riesgos_obligaciones_sst_especificos: editingSolicitud.riesgosObligacionesEsp || "No aplica",
                planEntrenamiento: JSON.stringify(planEntrenamiento.map(p => p.value)),
                planCapacitacionContinua: JSON.stringify(planCapacitacionContinua.map(p => p.value)),
                planCarrera: editingSolicitud.planCarrera || "No aplica",
                competenciasDesarrolloIngreso: editingSolicitud.competenciasDesarrolloIngreso || "No aplica",
            };
            Object.entries(fields).forEach(([key, value]) => {
                if (key !== "_id" && value !== null && !(editingSolicitud.isConstruahorro && key === "area")) formPayload.append(key, value);
            });
            formPayload.append("isConstruahorro", editingSolicitud.isConstruahorro.toString());
            formPayload.append("isMegamayoristas", editingSolicitud.isMegamayoristas.toString()); // NUEVO
            await axios.put(`${BACKEND_URL}/yuli/${editingSolicitud.id}`, formPayload, { headers: { "Content-Type": "multipart/form-data" } });
            toast.success("Solicitud actualizada correctamente");
            fetchHistorial();
            resetForm();
        } catch (error) {
            console.error("Error al actualizar la solicitud:", error);
            const errorMessage = error.response?.data?.error || error.message || "Error interno del servidor.";
            toast.error(`Error al actualizar: ${errorMessage}`);
        }
        setIsSubmitting(false);
    };

    const handleResend = async () => {
        if (!editingSolicitud) return;
        setIsSubmitting(true);
        try {
            const formPayload = new FormData();
            const fields = {
                ...editingSolicitud,
                descripcion: "No aplica",
                poblacionFocalizada: JSON.stringify(editingSolicitud.poblacionFocalizada),
                estudiosComplementarios: editingSolicitud.estudiosComplementarios || "No aplica",
                supervisaA: editingSolicitud.supervisaA || "No aplica",
                numeroPersonasCargo: editingSolicitud.numeroPersonasCargo || "0",
                cursosCertificaciones: editingSolicitud.cursosCertificaciones || "No aplica",
                requiereVehiculo: editingSolicitud.requiereVehiculo || "No aplica",
                tipoLicencia: editingSolicitud.tipoLicencia || "No aplica",
                idiomas: editingSolicitud.idiomas || "No aplica",
                requiereViajar: editingSolicitud.requiereViajar || "No aplica",
                areasRelacionadas: editingSolicitud.areasRelacionadas || "No aplica",
                relacionamientoExterno: editingSolicitud.relacionamientoExterno || "No aplica",
                competenciasCulturales: JSON.stringify(competenciasCulturales),
                competenciasCargo: JSON.stringify(competenciasCargo),
                responsabilidades: JSON.stringify(responsabilidades.map(r => ({ value: r.value, funcion: r.funcion }))),
                indicadores_gestion: editingSolicitud.indicadoresGestion || "No aplica",
                requisitos_fisicos: editingSolicitud.requisitosFisicos || "No aplica",
                riesgos_obligaciones_sst_organizacionales: editingSolicitud.riesgosObligacionesOrg || "No aplica",
                riesgos_obligaciones_sst_especificos: editingSolicitud.riesgosObligacionesEsp || "No aplica",
                planEntrenamiento: JSON.stringify(planEntrenamiento.map(p => p.value)),
                planCapacitacionContinua: JSON.stringify(planCapacitacionContinua.map(p => p.value)),
                planCarrera: editingSolicitud.planCarrera || "No aplica",
                competenciasDesarrolloIngreso: editingSolicitud.competenciasDesarrolloIngreso || "No aplica",
            };
            Object.entries(fields).forEach(([key, value]) => {
                if (key !== "_id" && value !== null && !(editingSolicitud.isConstruahorro && key === "area")) formPayload.append(key, value);
            });
            formPayload.append("resend", "true");
            formPayload.append("isConstruahorro", editingSolicitud.isConstruahorro.toString());
            formPayload.append("isMegamayoristas", editingSolicitud.isMegamayoristas.toString()); // NUEVO
            await axios.post(`${BACKEND_URL}/yuli/resend/${editingSolicitud.id}`, formPayload, { headers: { "Content-Type": "multipart/form-data" } });
            toast.success("Solicitud reenviada correctamente");
            fetchHistorial();
            resetForm();
        } catch (error) {
            console.error("Error al reenviar la solicitud:", error);
            const errorMessage = error.response?.data?.error || error.message || "Error interno del servidor.";
            toast.error(`Error al reenviar: ${errorMessage}`);
        }
        setIsSubmitting(false);
    };

    const handleMultiSelectChange = (event) => {
        const { name, value } = event.target;
        const setter = editingSolicitud
            ? setEditingSolicitud
            : isMegamayoristasForm
            ? setMegamayoristasFormData
            : isConstruahorroForm
            ? setConstruahorroFormData
            : setFormData;
        setter((prev) => ({ ...prev, [name]: typeof value === 'string' ? value.split(',') : value }));
    };

    const formToShow = editingSolicitud
        || (isMegamayoristasForm
            ? megamayoristasFormData
            : isConstruahorroForm
            ? construahorroFormData
            : formData);

    return (
        <Paper elevation={3} sx={{ p: 4, my: 4 }}>
            <form ref={formRef} onSubmit={editingSolicitud ? (e) => e.preventDefault() : handleSubmit}>
                <Typography variant="h5" sx={{ mb: 3 }}>Información General</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Fecha" type="date" name="fecha" value={formToShow.fecha || ""} onChange={handleChange} InputLabelProps={{ shrink: true }} required />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Nombre del cargo" name="nombreCargo" value={formToShow.nombreCargo || ""} onChange={handleChange} required />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Área" name="areaGeneral" value={formToShow.areaGeneral || ""} onChange={handleChange} required />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Departamento" name="departamento" value={formToShow.departamento || ""} onChange={handleChange} required />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Proceso al que pertenece" name="proceso" value={formToShow.proceso || ""} onChange={handleChange} required />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required>
                            <InputLabel id="poblacion-focalizada-label">Población focalizada</InputLabel>
                            <Select
                                labelId="poblacion-focalizada-label"
                                name="poblacionFocalizada"
                                multiple
                                value={formToShow.poblacionFocalizada || []}
                                onChange={handleMultiSelectChange}
                                input={<OutlinedInput id="select-multiple-chip" label="Población focalizada" />}
                                renderValue={(selected) => (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {selected.map((value) => <Chip key={value} label={value} />)}
                                    </Box>
                                )}
                            >
                                <MenuItem value="Discapacidad">Discapacidad</MenuItem>
                                <MenuItem value="Víctimas del Conflicto">Víctimas del Conflicto</MenuItem>
                                <MenuItem value="Migrantes Venezolanos">Migrantes Venezolanos</MenuItem>
                                <MenuItem value="Ninguna">Ninguna</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required>
                            <InputLabel id="escolaridad-label">Escolaridad</InputLabel>
                            <Select labelId="escolaridad-label" name="escolaridad" value={formToShow.escolaridad || ""} onChange={handleChange} InputLabelProps={{ shrink: true }}>
                                <MenuItem value="">--Seleccione--</MenuItem>
                                <MenuItem value="Primaria">Primaria</MenuItem>
                                <MenuItem value="Bachillerato">Bachillerato</MenuItem>
                                <MenuItem value="Técnico">Técnico</MenuItem>
                                <MenuItem value="Tecnólogo">Tecnólogo</MenuItem>
                                <MenuItem value="Universitario">Universitario</MenuItem>
                                <MenuItem value="Posgrado">Posgrado</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Área de formación" name="area_formacion" value={formToShow.area_formacion || ""} onChange={handleChange} required />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField fullWidth label="Estudios complementarios" name="estudiosComplementarios" value={formToShow.estudiosComplementarios || ""} onChange={handleChange} multiline minRows={2} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField fullWidth label="Experiencia necesaria" name="experiencia" value={formToShow.experiencia || ""} onChange={handleChange} required />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Jefe inmediato" name="jefeInmediato" value={formToShow.jefeInmediato || ""} onChange={handleChange} required />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Supervisa a" name="supervisaA" value={formToShow.supervisaA || ""} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Número de personas a cargo" type="number" name="numeroPersonasCargo" value={formToShow.numeroPersonasCargo || ""} onChange={handleChange} inputProps={{ min: 0 }} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required>
                            <InputLabel id="tipo-contrato-label">Tipo de contrato</InputLabel>
                            <Select labelId="tipo-contrato-label" name="tipoContrato" value={formToShow.tipoContrato || ""} onChange={handleChange} InputLabelProps={{ shrink: true }}>
                                <MenuItem value="">--Seleccione--</MenuItem>
                                <MenuItem value="Indefinido">Indefinido</MenuItem>
                                <MenuItem value="Fijo">Fijo</MenuItem>
                                <MenuItem value="Por obra o labor">Por obra o labor</MenuItem>
                                <MenuItem value="Prestación de servicios">Prestación de servicios</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>

                <Typography variant="h5" sx={{ mt: 4, mb: 3 }}>Descripción del Cargo</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField fullWidth label="Misión del cargo" name="misionCargo" value={formToShow.misionCargo || ""} onChange={handleChange} required multiline minRows={3} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField fullWidth label="Cursos o certificaciones" name="cursosCertificaciones" value={formToShow.cursosCertificaciones || ""} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <InputLabel id="requiere-vehiculo-label">¿Requiere vehículo?</InputLabel>
                            <Select labelId="requiere-vehiculo-label" name="requiereVehiculo" value={formToShow.requiereVehiculo || ""} onChange={handleChange} InputLabelProps={{ shrink: true }}>
                                <MenuItem value="">--Seleccione--</MenuItem>
                                <MenuItem value="Sí">Sí</MenuItem>
                                <MenuItem value="No">No</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    {formToShow.requiereVehiculo === "Sí" && (
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Tipo de licencia" name="tipoLicencia" value={formToShow.tipoLicencia || ""} onChange={handleChange} />
                        </Grid>
                    )}
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Idiomas" name="idiomas" value={formToShow.idiomas || ""} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <InputLabel id="requiere-viajar-label">¿Requiere viajar?</InputLabel>
                            <Select labelId="requiere-viajar-label" name="requiereViajar" value={formToShow.requiereViajar || ""} onChange={handleChange} InputLabelProps={{ shrink: true }}>
                                <MenuItem value="">--Seleccione--</MenuItem>
                                <MenuItem value="Sí">Sí</MenuItem>
                                <MenuItem value="No">No</MenuItem>
                                <MenuItem value="Ocasional">Ocasional</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField fullWidth label="Áreas con las cuales se relaciona el cargo (internas)" name="areasRelacionadas" value={formToShow.areasRelacionadas || ""} onChange={handleChange} multiline minRows={2} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField fullWidth label="Relacionamiento externo" name="relacionamientoExterno" value={formToShow.relacionamientoExterno || ""} onChange={handleChange} multiline minRows={2} />
                    </Grid>
                </Grid>

                <Typography variant="h5" sx={{ mt: 4, mb: 3 }}>Competencias Requeridas</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Competencias Culturales</Typography>
                        {competenciasCulturales.map((competencia, index) => (
                            <Grid container spacing={2} key={index} sx={{ mb: 2, alignItems: 'center' }}>
                                <Grid item xs={12} sm={4}>
                                    <TextField fullWidth label={`Competencia Cultural ${index + 1}`} value={competencia.competencia} onChange={(e) => handleCompetenciaCulturalChange(index, "competencia", e.target.value)} />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <FormControl fullWidth>
                                        <InputLabel>Nivel</InputLabel>
                                        <Select value={competencia.nivel} onChange={(e) => handleCompetenciaCulturalChange(index, "nivel", e.target.value)}>
                                            <MenuItem value="">--Seleccione--</MenuItem>
                                            <MenuItem value="Alto (Siempre)">Alto (Siempre)</MenuItem>
                                            <MenuItem value="Bueno (Casi siempre)">Bueno (Casi siempre)</MenuItem>
                                            <MenuItem value="Mínimo necesario (En ocasiones)">Mínimo necesario (En ocasiones)</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField fullWidth label="Definición" value={competencia.definicion} onChange={(e) => handleCompetenciaCulturalChange(index, "definicion", e.target.value)} />
                                </Grid>
                                <Grid item xs={12} sm={12} sx={{ textAlign: 'right' }}>
                                    {competenciasCulturales.length > 1 && (
                                        <Button color="error" size="small" startIcon={<DeleteIcon />} onClick={() => removeCompetenciaCultural(index)}>Eliminar</Button>
                                    )}
                                </Grid>
                            </Grid>
                        ))}
                        <Button variant="outlined" startIcon={<AddIcon />} onClick={addCompetenciaCultural} sx={{ mt: 1 }}>Agregar Competencia Cultural</Button>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>Competencias del Cargo</Typography>
                        {competenciasCargo.map((competencia, index) => (
                            <Grid container spacing={2} key={index} sx={{ mb: 2, alignItems: 'center' }}>
                                <Grid item xs={12} sm={4}>
                                    <TextField fullWidth label={`Competencia del Cargo ${index + 1}`} value={competencia.competencia} onChange={(e) => handleCompetenciaCargoChange(index, "competencia", e.target.value)} />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <FormControl fullWidth>
                                        <InputLabel>Nivel</InputLabel>
                                        <Select value={competencia.nivel} onChange={(e) => handleCompetenciaCargoChange(index, "nivel", e.target.value)}>
                                            <MenuItem value="">--Seleccione--</MenuItem>
                                            <MenuItem value="Alto (Siempre)">Alto (Siempre)</MenuItem>
                                            <MenuItem value="Bueno (Casi siempre)">Bueno (Casi siempre)</MenuItem>
                                            <MenuItem value="Mínimo necesario (En ocasiones)">Mínimo necesario (En ocasiones)</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField fullWidth label="Definición" value={competencia.definicion} onChange={(e) => handleCompetenciaCargoChange(index, "definicion", e.target.value)} />
                                </Grid>
                                <Grid item xs={12} sm={12} sx={{ textAlign: 'right' }}>
                                    {competenciasCargo.length > 1 && (
                                        <Button color="error" size="small" startIcon={<DeleteIcon />} onClick={() => removeCompetenciaCargo(index)}>Eliminar</Button>
                                    )}
                                </Grid>
                            </Grid>
                        ))}
                        <Button variant="outlined" startIcon={<AddIcon />} onClick={addCompetenciaCargo} sx={{ mt: 1 }}>Agregar Competencia del Cargo</Button>
                    </Grid>
                </Grid>

                <Typography variant="h5" sx={{ mt: 4, mb: 3 }}>Responsabilidades</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        {responsabilidades.map((resp, index) => (
                            <Box key={resp.id} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                                <TextField fullWidth label={`Responsabilidad ${index + 1}`} value={resp.value} onChange={(e) => handleResponsabilidadChange(index, "value", e.target.value)} multiline minRows={2} />
                                <TextField fullWidth label={`Función ${index + 1}`} value={resp.funcion} onChange={(e) => handleResponsabilidadChange(index, "funcion", e.target.value)} multiline minRows={2} />
                                {responsabilidades.length > 1 && (
                                    <Button color="error" size="small" startIcon={<DeleteIcon />} onClick={() => removeResponsabilidad(index)}>Eliminar</Button>
                                )}
                            </Box>
                        ))}
                        <Button variant="outlined" startIcon={<AddIcon />} onClick={addResponsabilidad} sx={{ mt: 1 }}>Agregar Responsabilidad</Button>
                    </Grid>
                </Grid>

                <Typography variant="h5" sx={{ mt: 4, mb: 3 }}>Indicadores y Riesgos</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField fullWidth label="Indicadores de Gestión" name="indicadoresGestion" value={formToShow.indicadoresGestion || ""} onChange={handleChange} multiline minRows={2} sx={{ mb: 2 }} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField fullWidth label="Requisitos Físicos" name="requisitosFisicos" value={formToShow.requisitosFisicos || ""} onChange={handleChange} multiline minRows={2} sx={{ mb: 2 }} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField fullWidth label="Riesgos y Obligaciones SST Organizacionales" name="riesgosObligacionesOrg" value={formToShow.riesgosObligacionesOrg || ""} onChange={handleChange} multiline minRows={2} sx={{ mb: 2 }} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField fullWidth label="Riesgos y Obligaciones SST Específicos" name="riesgosObligacionesEsp" value={formToShow.riesgosObligacionesEsp || ""} onChange={handleChange} multiline minRows={2} sx={{ mb: 2 }} />
                    </Grid>
                </Grid>

                <Typography variant="h5" sx={{ mt: 4, mb: 3 }}>Complementario</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Plan de Entrenamiento (Inducción y Acompañamiento - Primeros 90 días)</Typography>
                        {planEntrenamiento.map((plan, index) => (
                            <Box key={plan.id} sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                                <TextField fullWidth label={`Plan de Entrenamiento ${index + 1}`} value={plan.value} onChange={(e) => handlePlanEntrenamientoChange(index, e.target.value)} multiline minRows={2} />
                                {planEntrenamiento.length > 1 && (
                                    <Button color="error" size="small" startIcon={<DeleteIcon />} onClick={() => removePlanEntrenamiento(index)} sx={{ ml: 2 }}>Eliminar</Button>
                                )}
                            </Box>
                        ))}
                        <Button variant="outlined" startIcon={<AddIcon />} onClick={addPlanEntrenamiento} sx={{ mt: 1 }}>Agregar Plan de Entrenamiento</Button>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Plan de Capacitación Continua</Typography>
                        {planCapacitacionContinua.map((plan, index) => (
                            <Box key={plan.id} sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                                <TextField fullWidth label={`Plan de Capacitación ${index + 1}`} value={plan.value} onChange={(e) => handlePlanCapacitacionContinuaChange(index, e.target.value)} multiline minRows={2} />
                                {planCapacitacionContinua.length > 1 && (
                                    <Button color="error" size="small" startIcon={<DeleteIcon />} onClick={() => removePlanCapacitacionContinua(index)} sx={{ ml: 2 }}>Eliminar</Button>
                                )}
                            </Box>
                        ))}
                        <Button variant="outlined" startIcon={<AddIcon />} onClick={addPlanCapacitacionContinua} sx={{ mt: 1 }}>Agregar Plan de Capacitación</Button>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField fullWidth label="Plan de Carrera" name="planCarrera" value={formToShow.planCarrera || ""} onChange={handleChange} multiline minRows={3} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField fullWidth label="Competencias para Desarrollar en el Ingreso" name="competenciasDesarrolloIngreso" value={formToShow.competenciasDesarrolloIngreso || ""} onChange={handleChange} multiline minRows={3} />
                    </Grid>
                </Grid>

                <Typography variant="h5" sx={{ mt: 4, mb: 3 }}>Documentos y Aprobaciones</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <input type="file" name="estructuraOrganizacional" accept=".jpg,.jpeg,.png,.webp" onChange={handleChange} required ref={fileInputRef} style={{ padding: '12px', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }} />
                        <Typography variant="caption" color="text.secondary">Estructura organizacional</Typography>
                    </Grid>
                </Grid>

                <Typography variant="h5" sx={{ mt: 4, mb: 3 }}>Aprobaciones</Typography>
                <Grid container spacing={2}>
                    {isConstruahorroForm ? (
                        <>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth required>
                                    <InputLabel id="director-label">Director de Área</InputLabel>
                                    <Select labelId="director-label" name="director" value={formToShow.director || ""} onChange={handleChange} InputLabelProps={{ shrink: true }}>
                                        <MenuItem value="">--Seleccione--</MenuItem>
                                        <MenuItem value="Comercialconstruahorro@merkahorrosas.com">Jaiber (Director Comercial Construahorro)</MenuItem>
                                        <MenuItem value="juanmerkahorro@gmail.com">Juan (Director Comercial Construahorro)</MenuItem>
                                        <MenuItem value="johanmerkahorro777@gmail.com">Johan (Gerencia Construahorro)</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth required>
                                    <InputLabel id="gerencia-label">Gerencia General</InputLabel>
                                    <Select labelId="gerencia-label" name="gerencia" value={formToShow.gerencia || ""} onChange={handleChange} InputLabelProps={{ shrink: true }}>
                                        <MenuItem value="">--Seleccione--</MenuItem>
                                        <MenuItem value="gerencia@construahorrosas.com">William Salazar</MenuItem>
                                        <MenuItem value="johanmerkahorro777@gmail.com">Johan (Gerencia Construahorro)</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth required>
                                    <InputLabel id="calidad-label">Calidad</InputLabel>
                                    <Select labelId="calidad-label" name="calidad" value={formToShow.calidad || ""} onChange={handleChange} InputLabelProps={{ shrink: true }}>
                                        <MenuItem value="">--Seleccione--</MenuItem>
                                        <MenuItem value="analista@merkahorrosas.com">Anny Solarte (Calidad)</MenuItem>
                                        <MenuItem value="juanmerkahorro@gmail.com">Juan (Director Comercial Construahorro)</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth required>
                                    <InputLabel id="seguridad-label">Seguridad y Salud en el Trabajo</InputLabel>
                                    <Select labelId="seguridad-label" name="seguridad" value={formToShow.seguridad || ""} onChange={handleChange} InputLabelProps={{ shrink: true }}>
                                        <MenuItem value="">--Seleccione--</MenuItem>
                                        <MenuItem value="catherinem.asisge@gmail.com">Catherine (Seguridad y Salud en el Trabajo)</MenuItem>
                                        <MenuItem value="johanmerkahorro777@gmail.com">Johan (Gerencia Construahorro)</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary">Nota: El campo de Área no es requerido para Construahorro.</Typography>
                            </Grid>
                        </>
                    ) : (
                        <>
                            <Grid item xs={12} sm={6}>
                                <Tooltip title="Este campo es exclusivo para Merkahorro">
                                    <FormControl fullWidth required>
                                        <InputLabel id="area-label">Encargado de Área</InputLabel>
                                        <Select labelId="area-label" name="area" value={formToShow.area || ""} onChange={handleChange} InputLabelProps={{ shrink: true }}>
                                            <MenuItem value="">--Seleccione--</MenuItem>
                                            <MenuItem value="sistemas@merkahorrosas.com">Yonatan Valencia (Coordinador Sistemas)</MenuItem>
                                            <MenuItem value="gestionhumanamerkahorro@gmail.com">Yuliana Garcia (Gestion Humana)</MenuItem>
                                            <MenuItem value="operacionescomerciales@merkahorrosas.com">operaciones comerciales</MenuItem>
                                            <MenuItem value="compras@merkahorrosas.com">Julian Hurtado (Coordinador Estrategico de Compras)</MenuItem>
                                            <MenuItem value="logistica@merkahorrosas.com">Dorancy (Coordinadora Logistica)</MenuItem>
                                            <MenuItem value="desarrollo@merkahorrosas.com">Kevin Pineda (Analista Especializado en Desarrollo de Software)</MenuItem>
                                            <MenuItem value="juanmerkahorro@gmail.com">Juan (Director Comercial Construahorro)</MenuItem>
                                            <MenuItem value="johanmerkahorro777@gmail.com">Johan (Gerencia Construahorro)</MenuItem>
                                            <MenuItem value="catherinem.asisge@gmail.com">Catherine (Seguridad y Salud en el Trabajo)</MenuItem>
                                            <MenuItem value="analista@merkahorrosas.com">Anny Solarte (Calidad)</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Tooltip>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth required>
                                    <InputLabel id="director-label">Director de Área</InputLabel>
                                    <Select labelId="director-label" name="director" value={formToShow.director || ""} onChange={handleChange} InputLabelProps={{ shrink: true }}>
                                        <MenuItem value="">--Seleccione--</MenuItem>
                                        <MenuItem value="operaciones@merkahorrosas.com">Ramiro Hincapie</MenuItem>
                                        <MenuItem value="contabilidad1@merkahorrosas.com">Ana Herrera</MenuItem>
                                        <MenuItem value="gestionhumana@merkahorrosas.com">Yuliana Garcia</MenuItem>
                                        <MenuItem value="juanmerkahorro@gmail.com">Juan (Director Comercial Construahorro)</MenuItem>
                                        <MenuItem value="johanmerkahorro777@gmail.com">Johan (Gerencia Construahorro)</MenuItem>
                                        <MenuItem value="analista@merkahorrosas.com">Anny Solarte (Calidad)</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth required>
                                    <InputLabel id="gerencia-label">Gerencia General</InputLabel>
                                    <Select labelId="gerencia-label" name="gerencia" value={formToShow.gerencia || ""} onChange={handleChange} InputLabelProps={{ shrink: true }}>
                                        <MenuItem value="">--Seleccione--</MenuItem>
                                        <MenuItem value="gerencia@merkahorrosas.com">Diego Salazar</MenuItem>
                                        <MenuItem value="gerencia1@merkahorrosas.com">Stiven Salazar</MenuItem>
                                        <MenuItem value="gerencia@megamayoristas.com">Adrian Hoyos</MenuItem>
                                        <MenuItem value="gerencia@construahorrosas.com">William Salazar</MenuItem>
                                        <MenuItem value="johanmerkahorro777@gmail.com">Johan (Gerencia Construahorro)</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth required>
                                    <InputLabel id="calidad-label">Calidad</InputLabel>
                                    <Select labelId="calidad-label" name="calidad" value={formToShow.calidad || ""} onChange={handleChange} InputLabelProps={{ shrink: true }}>
                                        <MenuItem value="">--Seleccione--</MenuItem>
                                        <MenuItem value="analista@merkahorrosas.com">Anny Solarte (Calidad)</MenuItem>
                                        <MenuItem value="juanmerkahorro@gmail.com">Juan (Director Comercial Construahorro)</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <Tooltip title="Este campo es exclusivo para Merkahorro">
                                    <FormControl fullWidth required>
                                        <InputLabel id="seguridad-label">Seguridad y Salud en el Trabajo</InputLabel>
                                        <Select labelId="seguridad-label" name="seguridad" value={formToShow.seguridad || ""} onChange={handleChange} InputLabelProps={{ shrink: true }}>
                                            <MenuItem value="">--Seleccione--</MenuItem>
                                            <MenuItem value="catherinem.asisge@gmail.com">Catherine (Seguridad y Salud en el Trabajo)</MenuItem>
                                            <MenuItem value="johanmerkahorro777@gmail.com">Johan (Gerencia Construahorro)</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Tooltip>
                            </Grid>
                        </>
                    )}
                </Grid>

                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, gap: 2 }}>
                    {!editingSolicitud && (
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={isSubmitting}
                            startIcon={<SendIcon />}
                            sx={{
                                backgroundColor: isConstruahorroForm ? 'var(--construahorro-primary)' : 'var(--merkahorro-primary)',
                                '&:hover': { backgroundColor: isConstruahorroForm ? 'var(--construahorro-secondary)' : 'var(--merkahorro-secondary)' },
                            }}
                        >
                            {isSubmitting ? 'Guardando...' : `Enviar Solicitud ${isConstruahorroForm ? 'Construahorro' : 'Merkahorro'}`}
                        </Button>
                    )}
                    {editingSolicitud && (
                        <>
                            <Button
                                type="button"
                                variant="contained"
                                onClick={handleSaveEdit}
                                disabled={isSubmitting}
                                startIcon={<SendIcon />}
                                sx={{
                                    backgroundColor: isConstruahorroForm ? 'var(--construahorro-primary)' : 'var(--merkahorro-primary)',
                                    '&:hover': { backgroundColor: isConstruahorroForm ? 'var(--construahorro-secondary)' : 'var(--merkahorro-secondary)' },
                                }}
                            >
                                {isSubmitting ? "Guardando..." : "Guardar Edición"}
                            </Button>
                            <Button
                                type="button"
                                variant="contained"
                                onClick={handleResend}
                                disabled={isSubmitting}
                                sx={{
                                    backgroundColor: isConstruahorroForm ? 'var(--construahorro-primary)' : 'var(--merkahorro-primary)',
                                    '&:hover': { backgroundColor: isConstruahorroForm ? 'var(--construahorro-secondary)' : 'var(--merkahorro-secondary)' },
                                }}
                            >
                                {isSubmitting ? "Enviando..." : "Enviar de Nuevo"}
                            </Button>
                            <Button type="button" variant="outlined" onClick={resetForm} disabled={isSubmitting}>Cancelar</Button>
                        </>
                    )}
                </Box>
            </form>
        </Paper>
    );
};

export default FormComponent;