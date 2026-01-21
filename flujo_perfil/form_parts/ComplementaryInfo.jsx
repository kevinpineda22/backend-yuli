import React from "react";
import { TextField, Button, Grid, Box, Typography } from '@mui/material';
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from '@mui/icons-material/Add';

const PlanRow = React.memo(({ label, plan, index, onChange, onRemove, canRemove }) => (
    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <TextField fullWidth label={`${label} ${index + 1}`} value={plan.value} onChange={(e) => onChange(index, e.target.value)} multiline minRows={2} />
        {canRemove && (
            <Button color="error" size="small" startIcon={<DeleteIcon />} onClick={() => onRemove(index)} sx={{ ml: 2 }}>Eliminar</Button>
        )}
    </Box>
));

const ComplementaryInfo = ({ 
    planEntrenamiento, handlePlanEntrenamientoChange, removePlanEntrenamiento, addPlanEntrenamiento,
    planCapacitacionContinua, handlePlanCapacitacionContinuaChange, removePlanCapacitacionContinua, addPlanCapacitacionContinua,
    formToShow, handleChange
}) => {
    const canRemoveEntrenamiento = planEntrenamiento.length > 1;
    const canRemoveCapacitacion = planCapacitacionContinua.length > 1;

    return (
        <>
            <Typography variant="h5" sx={{ mt: 4, mb: 3 }}>Complementario</Typography>
            <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Plan de Entrenamiento (Inducción y Acompañamiento - Primeros 90 días)</Typography>
                    {planEntrenamiento.map((plan, index) => (
                        <PlanRow
                            key={plan.id}
                            label="Plan de Entrenamiento"
                            plan={plan}
                            index={index}
                            onChange={handlePlanEntrenamientoChange}
                            onRemove={removePlanEntrenamiento}
                            canRemove={canRemoveEntrenamiento}
                        />
                    ))}
                    <Button variant="outlined" startIcon={<AddIcon />} onClick={addPlanEntrenamiento} sx={{ mt: 1 }}>Agregar Plan de Entrenamiento</Button>
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Plan de Capacitación Continua</Typography>
                    {planCapacitacionContinua.map((plan, index) => (
                        <PlanRow
                            key={plan.id}
                            label="Plan de Capacitación"
                            plan={plan}
                            index={index}
                            onChange={handlePlanCapacitacionContinuaChange}
                            onRemove={removePlanCapacitacionContinua}
                            canRemove={canRemoveCapacitacion}
                        />
                    ))}
                    <Button variant="outlined" startIcon={<AddIcon />} onClick={addPlanCapacitacionContinua} sx={{ mt: 1 }}>Agregar Plan de Capacitación</Button>
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <TextField fullWidth label="Plan de Carrera" name="planCarrera" value={formToShow.planCarrera || ""} onChange={handleChange} multiline minRows={3} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <TextField fullWidth label="Competencias para Desarrollar en el Ingreso" name="competenciasDesarrolloIngreso" value={formToShow.competenciasDesarrolloIngreso || ""} onChange={handleChange} multiline minRows={3} />
                </Grid>
            </Grid>
        </>
    );
};

const arePropsEqual = (prevProps, nextProps) => {
    return (
        prevProps.handleChange === nextProps.handleChange &&
        prevProps.planEntrenamiento === nextProps.planEntrenamiento &&
        prevProps.planCapacitacionContinua === nextProps.planCapacitacionContinua &&
        prevProps.formToShow.planCarrera === nextProps.formToShow.planCarrera &&
        prevProps.formToShow.competenciasDesarrolloIngreso === nextProps.formToShow.competenciasDesarrolloIngreso
    );
};

export default React.memo(ComplementaryInfo, arePropsEqual);
