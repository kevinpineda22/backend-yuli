import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import toast, { Toaster } from 'react-hot-toast';
import { Tabs, Tab, Box, Alert } from '@mui/material';
import FormComponent from "./FormComponent";
import HistorialComponent from "./HistorialComponent";
import FilterComponent from "./FilterComponent";
import { useAuth } from "../../hooks/useAuth";
import "./SolicitudAprobacion.css";
import { getAssetUrl } from "../../config/storage";

const BACKEND_URL = "https://backend-yuli.vercel.app/api";

const SolicitudAprobacion = () => {
    // ...existing code para todos los estados...
    const [formData, setFormData] = useState({
        fecha: new Date().toISOString().split("T")[0],
        director: "",
        gerencia: "",
        seguridad: "",
        calidad: "",
        area: "",
        nombreCargo: "",
        areaGeneral: "",
        departamento: "",
        proceso: "",
        estructuraOrganizacional: null,
        poblacionFocalizada: "",
        escolaridad: "",
        areaFormacion: "",
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
        responsabilidades: [""],
    });

    const [construahorroFormData, setConstruahorroFormData] = useState({
        fecha: new Date().toISOString().split("T")[0],
        director: "",
        gerencia: "",
        seguridad: "",
        calidad: "",
        area: "",
        nombreCargo: "",
        areaGeneral: "",
        departamento: "",
        proceso: "",
        estructuraOrganizacional: null,
        poblacionFocalizada: "",
        escolaridad: "",
        areaFormacion: "",
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
        responsabilidades: [""],
    });

    const [megamayoristasFormData, setMegamayoristasFormData] = useState({
        fecha: new Date().toISOString().split("T")[0],
        director: "",
        gerencia: "",
        seguridad: "",
        calidad: "",
        area: "",
        nombreCargo: "",
        areaGeneral: "",
        departamento: "",
        proceso: "",
        estructuraOrganizacional: null,
        poblacionFocalizada: "",
        escolaridad: "",
        areaFormacion: "",
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
        responsabilidades: [""],
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [merkahorroHistorial, setMerkahorroHistorial] = useState([]);
    const [construahorroHistorial, setConstruahorroHistorial] = useState([]);
    const [megamayoristasHistorial, setMegamayoristasHistorial] = useState([]);
    const [expandedAreas, setExpandedAreas] = useState({});
    const [filters, setFilters] = useState({
        area: "",
        estado: "",
        director: "",
    });
    const [isConstruahorroForm, setIsConstruahorroForm] = useState(false);
    const [isMegamayoristasForm, setIsMegamayoristasForm] = useState(false);
    const [editingSolicitud, setEditingSolicitud] = useState(null);
    const fileInputRef = useRef(null);
    const formRef = useRef(null);

    // Nuevas funciones de acceso por empresa
    const { getAvailableCompanyForms, canUseCompany, getCompanyAccess } = useAuth();

    // Obtener empresas disponibles para el usuario
    const availableCompanies = getAvailableCompanyForms();
    const userAccess = getCompanyAccess();

    const fetchHistorial = async () => {
        try {
            const response = await axios.get(`${BACKEND_URL}/yuli`);
            const allHistorial = response.data.historial;
            setMerkahorroHistorial(allHistorial.filter(item => item.isConstruahorro !== true && item.isMegamayoristas !== true));
            setConstruahorroHistorial(allHistorial.filter(item => item.isConstruahorro === true));
            setMegamayoristasHistorial(allHistorial.filter(item => item.isMegamayoristas === true));
        } catch (error) {
            console.error("Error al obtener el historial:", error);
        }
    };

    const companiesKey = useMemo(
        () => [...availableCompanies].sort().join('|'),
        [availableCompanies]
    );

    useEffect(() => {
        // Evitar múltiples fetch por renders: solo cuando cambie la lista de empresas disponible.
        fetchHistorial();
        
        // Auto-configurar el formulario según el acceso del usuario
        if (availableCompanies.length === 1) {
            const singleCompany = availableCompanies[0];
            if (singleCompany === 'construahorro' && !isConstruahorroForm) {
                setIsConstruahorroForm(true);
                setIsMegamayoristasForm(false);
            } else if (singleCompany === 'megamayoristas' && !isMegamayoristasForm) {
                setIsMegamayoristasForm(true);
                setIsConstruahorroForm(false);
            } else if (singleCompany === 'merkahorro' && (isConstruahorroForm || isMegamayoristasForm)) {
                setIsConstruahorroForm(false);
                setIsMegamayoristasForm(false);
            }
        }
    }, [companiesKey]);

    // Nuevo useEffect para manejar el cambio de formulario cuando se edita una solicitud
    useEffect(() => {
        if (editingSolicitud) {
            // Cuando se está editando una solicitud, cambiar automáticamente al formulario correcto
            if (editingSolicitud.isMegamayoristas && !isMegamayoristasForm) {
                setIsMegamayoristasForm(true);
                setIsConstruahorroForm(false);
            } else if (editingSolicitud.isConstruahorro && !isConstruahorroForm) {
                setIsConstruahorroForm(true);
                setIsMegamayoristasForm(false);
            } else if (!editingSolicitud.isConstruahorro && !editingSolicitud.isMegamayoristas && (isConstruahorroForm || isMegamayoristasForm)) {
                setIsConstruahorroForm(false);
                setIsMegamayoristasForm(false);
            }
        }
    }, [editingSolicitud]);

    const toggleArea = useCallback((key) => {
        setExpandedAreas((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);
    
    const resetFormAndHistorial = useCallback((formType) => {
        // Verificar si el usuario puede acceder a este formulario
        if (!canUseCompany(formType)) {
            toast.error(`No tienes permisos para acceder al formulario de ${formType}`);
            return;
        }

        // Solo resetear si no estamos editando una solicitud
        if (editingSolicitud) {
            return;
        }
        
        const baseForm = {
            fecha: new Date().toISOString().split("T")[0],
            director: "",
            gerencia: "",
            seguridad: "",
            calidad: "",
            area: "",
            nombreCargo: "",
            areaGeneral: "",
            departamento: "",
            proceso: "",
            estructuraOrganizacional: null,
            poblacionFocalizada: "",
            escolaridad: "",
            areaFormacion: "",
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
            responsabilidades: [""],
        };
        setFormData({ ...baseForm });
        setConstruahorroFormData({ ...baseForm });
        setMegamayoristasFormData({ ...baseForm });
        setEditingSolicitud(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        
        let formName = '';
        if (formType === 'megamayoristas') {
            formName = 'Megamayoristas';
        } else if (formType === 'construahorro') {
            formName = 'Construahorro';
        } else {
            formName = 'Merkahorro';
        }

        toast.custom(
            t => (
                <div
                    className={`${t.visible ? 'animate-enter' : 'animate-leave'} toast-info-custom`}
                    style={{ 
                        background: 'var(--secondary-color)', 
                        color: 'white',
                        padding: '16px',
                        borderRadius: '10px',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}
                >
                    <span style={{ fontSize: '1.5rem' }}>ℹ️</span>
                    <span>{`Cambiado al formulario de ${formName}`}</span>
                </div>
            ),
            { duration: 3000 }
        );
    }, [canUseCompany, editingSolicitud, isConstruahorroForm, isMegamayoristasForm]);

    // Función para obtener el logo de la empresa actual
    const getCurrentCompanyLogo = () => {
        if (isMegamayoristasForm) {
            return {
                src: getAssetUrl("logoMegamayoristas.webp"),
                alt: "Logo Megamayoristas",
                company: "megamayoristas"
            };
        } else if (isConstruahorroForm) {
            return {
                src: getAssetUrl("logoConstruahorro.webp"), 
                alt: "Logo Construahorro",
                company: "construahorro"
            };
        } else {
            return {
                src: getAssetUrl("logoMK.webp"),
                alt: "Logo Merkahorro",
                company: "merkahorro"
            };
        }
    };

    // Función para verificar si se debe mostrar una pestaña
    const shouldShowTab = (company) => {
        return availableCompanies.includes(company);
    };

    // Si el usuario no tiene acceso a ninguna empresa
    if (availableCompanies.length === 0) {
        return (
            <div className="solicitud-aprobacion-container">
                <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Tu correo no tiene acceso configurado a ningún formulario.
                        Contacta al administrador para obtener permisos.
                    </Alert>
                </Box>
            </div>
        );
    }

    const currentLogo = getCurrentCompanyLogo();

    return (
        <div
            className={`solicitud-aprobacion-container ${
                isMegamayoristasForm ? 'megamayoristas' : isConstruahorroForm ? 'construahorro' : 'merkahorro'
            }`}
            aria-label={
                isMegamayoristasForm ? 'Formulario de Megamayoristas'
                : isConstruahorroForm ? 'Formulario de Construahorro'
                : 'Formulario de Merkahorro'
            }
        >
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: { fontWeight: 600, fontSize: '1rem' }
                }}
                reverseOrder={false}
                limit={1}
            />
            
            {/* Mostrar información de acceso si es limitado */}
            {userAccess !== 'all' && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Acceso limitado: Solo puedes usar el formulario de {
                        userAccess === 'merkahorro' ? 'Merkahorro' :
                        userAccess === 'construahorro' ? 'Construahorro' :
                        userAccess === 'megamayoristas' ? 'Megamayoristas' : 'tu empresa asignada'
                    }
                </Alert>
            )}

            {/* Solo mostrar pestañas si el usuario tiene acceso a múltiples empresas */}
            {availableCompanies.length > 1 && (
                <Tabs
                    value={isMegamayoristasForm ? 2 : isConstruahorroForm ? 1 : 0}
                    onChange={(e, newValue) => {
                        // No cambiar de tab si estamos editando una solicitud
                        if (editingSolicitud) {
                            toast.error("No puedes cambiar de formulario mientras editas una solicitud. Cancela la edición primero.");
                            return;
                        }
                        
                        let formType;
                        if (newValue === 2) formType = 'megamayoristas';
                        else if (newValue === 1) formType = 'construahorro';
                        else formType = 'merkahorro';
                        
                        // Verificar permisos antes de cambiar
                        if (!canUseCompany(formType)) {
                            toast.error(`No tienes permisos para acceder al formulario de ${formType}`);
                            return;
                        }
                        
                        setIsMegamayoristasForm(newValue === 2);
                        setIsConstruahorroForm(newValue === 1);
                        resetFormAndHistorial(formType);
                    }}
                    centered
                    sx={{ mb: 3 }}
                >
                    {shouldShowTab('merkahorro') && (
                        <Tab label="Merkahorro" sx={{ fontWeight: 'bold', color: isMegamayoristasForm || isConstruahorroForm ? 'inherit' : 'var(--merkahorro-primary)' }} />
                    )}
                    {shouldShowTab('construahorro') && (
                        <Tab label="Construahorro" sx={{ fontWeight: 'bold', color: isMegamayoristasForm ? 'inherit' : isConstruahorroForm ? 'var(--construahorro-primary)' : 'inherit' }} />
                    )}
                    {shouldShowTab('megamayoristas') && (
                        <Tab label="Megamayoristas" sx={{ fontWeight: 'bold', color: isMegamayoristasForm ? 'var(--megamayoristas-primary)' : 'inherit' }} />
                    )}
                </Tabs>
            )}
            
          {/* LOGOS - Mostrar siempre, pero comportamiento diferente según acceso */}
            <div className="logo-container-solicitud">
                {availableCompanies.length > 1 ? (
                    // Si tiene acceso múltiple, mostrar todos los logos con funcionalidad de cambio
                    <>
                        {shouldShowTab('merkahorro') && (
                            <img
                                src={getAssetUrl("logoMK.webp")}
                                alt="Logo Merkahorro - Cambiar al formulario de Merkahorro"
                                onClick={() => {
                                    if (editingSolicitud) {
                                        toast.error("No puedes cambiar de formulario mientras editas una solicitud. Cancela la edición primero.");
                                        return;
                                    }
                                    if (!canUseCompany('merkahorro')) {
                                        toast.error("No tienes permisos para acceder al formulario de Merkahorro");
                                        return;
                                    }
                                    setIsMegamayoristasForm(false);
                                    setIsConstruahorroForm(false);
                                    resetFormAndHistorial('merkahorro');
                                }}
                                className={isMegamayoristasForm || isConstruahorroForm ? '' : 'active-logo'}
                                style={{ cursor: 'pointer' }}
                            />
                        )}
                        {shouldShowTab('construahorro') && (
                            <img
                                src={getAssetUrl("logoConstruahorro.webp")}
                                alt="Logo Construahorro - Cambiar al formulario de Construahorro"
                                onClick={() => {
                                    if (editingSolicitud) {
                                        toast.error("No puedes cambiar de formulario mientras editas una solicitud. Cancela la edición primero.");
                                        return;
                                    }
                                    if (!canUseCompany('construahorro')) {
                                        toast.error("No tienes permisos para acceder al formulario de Construahorro");
                                        return;
                                    }
                                    setIsMegamayoristasForm(false);
                                    setIsConstruahorroForm(true);
                                    resetFormAndHistorial('construahorro');
                                }}
                                className={isConstruahorroForm ? 'active-logo' : ''}
                                style={{ cursor: 'pointer' }}
                            />
                        )}
                        {shouldShowTab('megamayoristas') && (
                            <img
                                src={getAssetUrl("logoMegamayoristas.webp")}
                                alt="Logo Megamayoristas - Cambiar al formulario de Megamayoristas"
                                onClick={() => {
                                    if (editingSolicitud) {
                                        toast.error("No puedes cambiar de formulario mientras editas una solicitud. Cancela la edición primero.");
                                        return;
                                    }
                                    if (!canUseCompany('megamayoristas')) {
                                        toast.error("No tienes permisos para acceder al formulario de Megamayoristas");
                                        return;
                                    }
                                    setIsMegamayoristasForm(true);
                                    setIsConstruahorroForm(false);
                                    resetFormAndHistorial('megamayoristas');
                                }}
                                className={isMegamayoristasForm ? 'active-logo' : ''}
                                style={{ cursor: 'pointer' }}
                            />
                        )}
                    </>
                ) : (
                    // Si solo tiene acceso a una empresa, mostrar solo ese logo (sin funcionalidad de cambio)
                    <img
                        src={currentLogo.src}
                        alt={currentLogo.alt}
                        className="active-logo single-company-logo"
                        style={{ 
                            cursor: 'default',
                            opacity: 1,
                            transform: 'scale(1.1)', // Hacer el logo un poco más grande para destacar
                            filter: 'brightness(1.1)' // Hacer el logo un poco más brillante
                        }}
                    />
                )}
            </div>
            
            <h1 className={`solicitud-aprobacion-header ${
                isMegamayoristasForm ? 'megamayoristas' : isConstruahorroForm ? 'construahorro' : 'merkahorro'
            }`}>
                {editingSolicitud ? 'Editar Solicitud' : `Descripción de Perfil - ${
                    isMegamayoristasForm ? 'Megamayoristas' : isConstruahorroForm ? 'Construahorro' : 'Merkahorro'
                }`}
            </h1>
            <h4 className="frase-motivacional">
                "La belleza de la vida está en los detalles que a menudo pasamos por alto"
            </h4>
            
            {/* ...resto del código existente... */}
            <FormComponent
                formData={formData}
                setFormData={setFormData}
                construahorroFormData={construahorroFormData}
                setConstruahorroFormData={setConstruahorroFormData}
                megamayoristasFormData={megamayoristasFormData}
                setMegamayoristasFormData={setMegamayoristasFormData}
                isConstruahorroForm={isConstruahorroForm}
                isMegamayoristasForm={isMegamayoristasForm}
                editingSolicitud={editingSolicitud}
                setEditingSolicitud={setEditingSolicitud}
                isSubmitting={isSubmitting}
                setIsSubmitting={setIsSubmitting}
                fileInputRef={fileInputRef}
                formRef={formRef}
                fetchHistorial={fetchHistorial}
            />
            <FilterComponent
                filters={filters}
                setFilters={setFilters}
                solicitudes={
                    isMegamayoristasForm
                        ? megamayoristasHistorial
                        : isConstruahorroForm
                        ? construahorroHistorial
                        : merkahorroHistorial
                }
            />
            <HistorialComponent
                historial={
                    isMegamayoristasForm
                        ? megamayoristasHistorial
                        : isConstruahorroForm
                        ? construahorroHistorial
                        : merkahorroHistorial
                }
                title={
                    isMegamayoristasForm
                        ? '📂 Historial Megamayoristas'
                        : isConstruahorroForm
                        ? '📂 Historial Construahorro'
                        : '📂 Historial Merkahorro'
                }
                filters={filters}
                expandedAreas={expandedAreas}
                toggleArea={toggleArea}
                setEditingSolicitud={setEditingSolicitud}
                isConstruahorroForm={isConstruahorroForm}
                isMegamayoristasForm={isMegamayoristasForm}
                setFormData={setFormData}
                setConstruahorroFormData={setConstruahorroFormData}
                setMegamayoristasFormData={setMegamayoristasFormData}
                formRef={formRef}
            />
        </div>
    );
};

export { SolicitudAprobacion };