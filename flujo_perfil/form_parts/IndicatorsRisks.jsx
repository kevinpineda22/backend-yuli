import React from "react";
import { TextField, Grid, Typography } from '@mui/material';

const IndicatorsRisks = ({ formToShow, handleChange }) => {
    return (
        <>
            <Typography variant="h5" sx={{ mt: 4, mb: 3 }}>Indicadores y Riesgos</Typography>
            <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                    <TextField fullWidth label="Indicadores de Gestión" name="indicadoresGestion" value={formToShow.indicadoresGestion || ""} onChange={handleChange} multiline minRows={2} sx={{ mb: 2 }} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <TextField fullWidth label="Requisitos Físicos" name="requisitosFisicos" value={formToShow.requisitosFisicos || ""} onChange={handleChange} multiline minRows={2} sx={{ mb: 2 }} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <TextField fullWidth label="Riesgos y Obligaciones SST Organizacionales" name="riesgosObligacionesOrg" value={formToShow.riesgosObligacionesOrg || ""} onChange={handleChange} multiline minRows={2} sx={{ mb: 2 }} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <TextField fullWidth label="Riesgos y Obligaciones SST Específicos" name="riesgosObligacionesEsp" value={formToShow.riesgosObligacionesEsp || ""} onChange={handleChange} multiline minRows={2} sx={{ mb: 2 }} />
                </Grid>
            </Grid>
        </>
    );
};

const arePropsEqual = (prevProps, nextProps) => {
    return (
        prevProps.handleChange === nextProps.handleChange &&
        prevProps.formToShow.indicadoresGestion === nextProps.formToShow.indicadoresGestion &&
        prevProps.formToShow.requisitosFisicos === nextProps.formToShow.requisitosFisicos &&
        prevProps.formToShow.riesgosObligacionesOrg === nextProps.formToShow.riesgosObligacionesOrg &&
        prevProps.formToShow.riesgosObligacionesEsp === nextProps.formToShow.riesgosObligacionesEsp
    );
};

export default React.memo(IndicatorsRisks, arePropsEqual);
