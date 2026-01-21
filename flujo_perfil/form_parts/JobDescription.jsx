import React from "react";
import { TextField, Select, MenuItem, FormControl, InputLabel, Grid, Typography } from '@mui/material';

const JobDescription = ({ formToShow, handleChange }) => {
    return (
        <>
            <Typography variant="h5" sx={{ mt: 4, mb: 3 }}>Descripción del Cargo</Typography>
            <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                    <TextField fullWidth label="Misión del cargo" name="misionCargo" value={formToShow.misionCargo || ""} onChange={handleChange} required multiline minRows={3} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <TextField fullWidth label="Cursos o certificaciones" name="cursosCertificaciones" value={formToShow.cursosCertificaciones || ""} onChange={handleChange} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth>
                        <InputLabel id="requiere-vehiculo-label">¿Requiere vehículo?</InputLabel>
                        <Select labelId="requiere-vehiculo-label" name="requiereVehiculo" value={formToShow.requiereVehiculo || ""} onChange={handleChange}>
                            <MenuItem value="">--Seleccione--</MenuItem>
                            <MenuItem value="Sí">Sí</MenuItem>
                            <MenuItem value="No">No</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                {formToShow.requiereVehiculo === "Sí" && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth label="Tipo de licencia" name="tipoLicencia" value={formToShow.tipoLicencia || ""} onChange={handleChange} />
                    </Grid>
                )}
                <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField fullWidth label="Idiomas" name="idiomas" value={formToShow.idiomas || ""} onChange={handleChange} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth>
                        <InputLabel id="requiere-viajar-label">¿Requiere viajar?</InputLabel>
                        <Select labelId="requiere-viajar-label" name="requiereViajar" value={formToShow.requiereViajar || ""} onChange={handleChange}>
                            <MenuItem value="">--Seleccione--</MenuItem>
                            <MenuItem value="Sí">Sí</MenuItem>
                            <MenuItem value="No">No</MenuItem>
                            <MenuItem value="Ocasional">Ocasional</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <TextField fullWidth label="Áreas con las cuales se relaciona el cargo (internas)" name="areasRelacionadas" value={formToShow.areasRelacionadas || ""} onChange={handleChange} multiline minRows={2} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <TextField fullWidth label="Relacionamiento externo" name="relacionamientoExterno" value={formToShow.relacionamientoExterno || ""} onChange={handleChange} multiline minRows={2} />
                </Grid>
            </Grid>
        </>
    );
};

const arePropsEqual = (prevProps, nextProps) => {
    return (
        prevProps.handleChange === nextProps.handleChange &&
        prevProps.formToShow.misionCargo === nextProps.formToShow.misionCargo &&
        prevProps.formToShow.cursosCertificaciones === nextProps.formToShow.cursosCertificaciones &&
        prevProps.formToShow.requiereVehiculo === nextProps.formToShow.requiereVehiculo &&
        prevProps.formToShow.tipoLicencia === nextProps.formToShow.tipoLicencia &&
        prevProps.formToShow.idiomas === nextProps.formToShow.idiomas &&
        prevProps.formToShow.requiereViajar === nextProps.formToShow.requiereViajar &&
        prevProps.formToShow.areasRelacionadas === nextProps.formToShow.areasRelacionadas &&
        prevProps.formToShow.relacionamientoExterno === nextProps.formToShow.relacionamientoExterno
    );
};

export default React.memo(JobDescription, arePropsEqual);
