import React from "react";
import { Button, Grid, Typography, Box } from '@mui/material';
import SendIcon from "@mui/icons-material/Send";
import AprobadorSelector from "../AprobadorSelector";
import AdminAprobadoresModal from "../AdminAprobadoresModal";

const DocumentsApprovals = ({ 
    formToShow, handleChange, fileInputRef, editingSolicitud, 
    handleOpenModal, handleCloseModal, isModalOpen,
    isSubmitting, isAdmin, isLoading, 
    aprobadoresData = {}, handleAprobadorChange, refreshAprobadores,
    handleSubmit, handleResend, resetForm,
    isMegamayoristasForm, isConstruahorroForm
}) => {
    return (
        <>
            <Typography variant="h5" sx={{ mt: 4, mb: 3 }}>Documentos y Aprobaciones</Typography>
            <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                    <input
                        type="file"
                        name="estructuraOrganizacional"
                        accept=".jpg,.jpeg,.png,.webp"
                        onChange={handleChange}
                        required={!editingSolicitud}
                        ref={fileInputRef}
                        style={{ padding: '12px', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }}
                    />
                    <Typography variant="caption" color="text.secondary">
                        {editingSolicitud
                            ? "Estructura organizacional (opcional - solo si desea cambiar la imagen actual)"
                            : "Estructura organizacional (requerido)"
                        }
                    </Typography>
                    {editingSolicitud && formToShow.estructuraOrganizacional && (
                        <Box sx={{ mt: 1, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                <strong>Imagen actual:</strong>
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <img
                                    src={formToShow.estructuraOrganizacional}
                                    alt="Estructura Organizacional Actual"
                                    style={{
                                        maxWidth: '100px',
                                        maxHeight: '60px',
                                        objectFit: 'cover',
                                        borderRadius: '4px',
                                        border: '1px solid #ddd'
                                    }}
                                />
                                <a
                                    href={formToShow.estructuraOrganizacional}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#1976d2', textDecoration: 'none' }}
                                >
                                    Ver imagen completa
                                </a>
                            </Box>
                        </Box>
                    )}
                </Grid>
            </Grid>
            
            {/* Botón para abrir el modal de administrar aprobadores - Solo para administradores */}
            {!isLoading && isAdmin && (
                <Box sx={{ mt: 3, mb: 2, display: 'flex', justifyContent: 'center' }}>
                    <Button 
                        variant="outlined" 
                        onClick={handleOpenModal}
                        disabled={isSubmitting}
                        sx={{ 
                            borderColor: isConstruahorroForm ? 'var(--construahorro-primary)' : isMegamayoristasForm ? 'var(--megamayoristas-primary)' : 'var(--merkahorro-primary)',
                            color: isConstruahorroForm ? 'var(--construahorro-primary)' : isMegamayoristasForm ? 'var(--megamayoristas-primary)' : 'var(--merkahorro-primary)',
                            '&:hover': {
                                borderColor: isConstruahorroForm ? 'var(--construahorro-secondary)' : isMegamayoristasForm ? 'var(--megamayoristas-secondary)' : 'var(--merkahorro-secondary)',
                                backgroundColor: 'rgba(25, 118, 210, 0.04)'
                            }
                        }}
                    >
                        Administrar Aprobadores
                    </Button>
                </Box>
            )}
            
            <AprobadorSelector
                aprobadoresData={aprobadoresData}
                onAprobadorChange={handleAprobadorChange}
                empresa={isMegamayoristasForm ? 'Megamayoristas' : isConstruahorroForm ? 'Construahorro' : 'Merkahorro'}
                disabled={isSubmitting}
                key={refreshAprobadores} // Forzar re-render cuando se actualicen los aprobadores
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, gap: 2 }}>
                {!editingSolicitud && (
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={isSubmitting}
                        startIcon={<SendIcon />}
                        sx={{
                            backgroundColor: isConstruahorroForm ? 'var(--construahorro-primary)' : isMegamayoristasForm ? 'var(--megamayoristas-primary)' : 'var(--merkahorro-primary)',
                            '&:hover': { backgroundColor: isConstruahorroForm ? 'var(--construahorro-secondary)' : isMegamayoristasForm ? 'var(--megamayoristas-secondary)' : 'var(--merkahorro-secondary)' },
                        }}
                    >
                        {isSubmitting ? 'Guardando...' : `Enviar Solicitud ${isMegamayoristasForm ? 'Megamayoristas' : isConstruahorroForm ? 'Construahorro' : 'Merkahorro'}`}
                    </Button>
                )}
                {editingSolicitud && (
                    <>
                        <Button
                            type="button"
                            variant="contained"
                            onClick={handleResend}
                            disabled={isSubmitting}
                            sx={{
                                backgroundColor: isConstruahorroForm ? 'var(--construahorro-primary)' : isMegamayoristasForm ? 'var(--megamayoristas-primary)' : 'var(--merkahorro-primary)',
                                '&:hover': { backgroundColor: isConstruahorroForm ? 'var(--construahorro-secondary)' : isMegamayoristasForm ? 'var(--megamayoristas-secondary)' : 'var(--merkahorro-secondary)' },
                            }}
                        >
                            {isSubmitting ? "Enviando..." : "Enviar de Nuevo"}
                        </Button>
                        <Button type="button" variant="outlined" onClick={resetForm} disabled={isSubmitting}>Cancelar</Button>
                    </>
                )}
            </Box>

            {!isLoading && isAdmin && (
                <AdminAprobadoresModal 
                    open={isModalOpen} 
                    handleClose={handleCloseModal}
                    empresaActual={isMegamayoristasForm ? 'Megamayoristas' : isConstruahorroForm ? 'Construahorro' : 'Merkahorro'}
                />
            )}
        </>
    );
};

const arePropsEqual = (prevProps, nextProps) => {
    // Comparación superficial de props simples
    if (
        prevProps.handleChange !== nextProps.handleChange ||
        prevProps.handleOpenModal !== nextProps.handleOpenModal ||
        prevProps.handleCloseModal !== nextProps.handleCloseModal ||
        prevProps.isModalOpen !== nextProps.isModalOpen ||
        prevProps.isSubmitting !== nextProps.isSubmitting ||
        prevProps.isAdmin !== nextProps.isAdmin ||
        prevProps.isLoading !== nextProps.isLoading ||
        prevProps.handleAprobadorChange !== nextProps.handleAprobadorChange ||
        prevProps.refreshAprobadores !== nextProps.refreshAprobadores ||
        prevProps.isMegamayoristasForm !== nextProps.isMegamayoristasForm ||
        prevProps.isConstruahorroForm !== nextProps.isConstruahorroForm ||
        prevProps.editingSolicitud !== nextProps.editingSolicitud
    ) {
        return false;
    }

    // Comparar formToShow solo en campos relevantes
    if (
        prevProps.formToShow.estructuraOrganizacional !== nextProps.formToShow.estructuraOrganizacional
    ) {
        return false;
    }

    // Comparar aprobadoresData (solo los campos usados por el selector)
    const prev = prevProps.aprobadoresData || {};
    const next = nextProps.aprobadoresData || {};
    return (
        prev.area === next.area &&
        prev.director === next.director &&
        prev.gerencia === next.gerencia &&
        prev.calidad === next.calidad &&
        prev.seguridad === next.seguridad
    );
};

export default React.memo(DocumentsApprovals, arePropsEqual);
