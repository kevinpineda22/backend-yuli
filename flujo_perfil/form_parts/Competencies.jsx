import React from "react";
import { TextField, Select, MenuItem, FormControl, InputLabel, Button, Grid, Typography } from '@mui/material';
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from '@mui/icons-material/Add';

const CompetenciaCulturalRow = React.memo(({ competencia, index, onChange, onRemove, canRemove }) => (
    <Grid container spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
        <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label={`Competencia Cultural ${index + 1}`} value={competencia.competencia} onChange={(e) => onChange(index, "competencia", e.target.value)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth>
                <InputLabel>Nivel</InputLabel>
                <Select value={competencia.nivel} onChange={(e) => onChange(index, "nivel", e.target.value)}>
                    <MenuItem value="">--Seleccione--</MenuItem>
                    <MenuItem value="Alto (Siempre)">Alto (Siempre)</MenuItem>
                    <MenuItem value="Bueno (Casi siempre)">Bueno (Casi siempre)</MenuItem>
                    <MenuItem value="Mínimo necesario (En ocasiones)">Mínimo necesario (En ocasiones)</MenuItem>
                </Select>
            </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Definición" value={competencia.definicion} onChange={(e) => onChange(index, "definicion", e.target.value)} />
        </Grid>
        <Grid size={{ xs: 12 }} sx={{ textAlign: 'right' }}>
            {canRemove && (
                <Button color="error" size="small" startIcon={<DeleteIcon />} onClick={() => onRemove(index)}>Eliminar</Button>
            )}
        </Grid>
    </Grid>
));

const CompetenciaCargoRow = React.memo(({ competencia, index, onChange, onRemove, canRemove }) => (
    <Grid container spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
        <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label={`Competencia del Cargo ${index + 1}`} value={competencia.competencia} onChange={(e) => onChange(index, "competencia", e.target.value)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth>
                <InputLabel>Nivel</InputLabel>
                <Select value={competencia.nivel} onChange={(e) => onChange(index, "nivel", e.target.value)}>
                    <MenuItem value="">--Seleccione--</MenuItem>
                    <MenuItem value="Alto (Siempre)">Alto (Siempre)</MenuItem>
                    <MenuItem value="Bueno (Casi siempre)">Bueno (Casi siempre)</MenuItem>
                    <MenuItem value="Mínimo necesario (En ocasiones)">Mínimo necesario (En ocasiones)</MenuItem>
                </Select>
            </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Definición" value={competencia.definicion} onChange={(e) => onChange(index, "definicion", e.target.value)} />
        </Grid>
        <Grid size={{ xs: 12 }} sx={{ textAlign: 'right' }}>
            {canRemove && (
                <Button color="error" size="small" startIcon={<DeleteIcon />} onClick={() => onRemove(index)}>Eliminar</Button>
            )}
        </Grid>
    </Grid>
));

const Competencies = ({ 
    competenciasCulturales, handleCompetenciaCulturalChange, removeCompetenciaCultural, addCompetenciaCultural,
    competenciasCargo, handleCompetenciaCargoChange, removeCompetenciaCargo, addCompetenciaCargo
}) => {
    const canRemoveCultural = competenciasCulturales.length > 1;
    const canRemoveCargo = competenciasCargo.length > 1;

    return (
        <>
            <Typography variant="h5" sx={{ mt: 4, mb: 3 }}>Competencias Requeridas</Typography>
            <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Competencias Culturales</Typography>
                    {competenciasCulturales.map((competencia, index) => (
                        <CompetenciaCulturalRow
                            key={index}
                            competencia={competencia}
                            index={index}
                            onChange={handleCompetenciaCulturalChange}
                            onRemove={removeCompetenciaCultural}
                            canRemove={canRemoveCultural}
                        />
                    ))}
                    <Button variant="outlined" startIcon={<AddIcon />} onClick={addCompetenciaCultural} sx={{ mt: 1 }}>Agregar Competencia Cultural</Button>
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>Competencias del Cargo</Typography>
                    {competenciasCargo.map((competencia, index) => (
                        <CompetenciaCargoRow
                            key={index}
                            competencia={competencia}
                            index={index}
                            onChange={handleCompetenciaCargoChange}
                            onRemove={removeCompetenciaCargo}
                            canRemove={canRemoveCargo}
                        />
                    ))}
                    <Button variant="outlined" startIcon={<AddIcon />} onClick={addCompetenciaCargo} sx={{ mt: 1 }}>Agregar Competencia del Cargo</Button>
                </Grid>
            </Grid>
        </>
    );
};

export default React.memo(Competencies);
