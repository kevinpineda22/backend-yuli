import React from "react";
import { TextField, Button, Grid, Box, Typography } from '@mui/material';
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from '@mui/icons-material/Add';

const ResponsibilityRow = React.memo(({ resp, index, onChange, onRemove, canRemove }) => (
    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <TextField
            fullWidth
            label={`Responsabilidad ${index + 1}`}
            value={resp.value || ""}
            onChange={(e) => onChange(index, "value", e.target.value)}
            multiline
            minRows={2}
        />
        <TextField
            fullWidth
            label={`Función ${index + 1}`}
            value={resp.funcion || ""}
            onChange={(e) => onChange(index, "funcion", e.target.value)}
            multiline
            minRows={2}
        />
        {canRemove && (
            <Button color="error" size="small" startIcon={<DeleteIcon />} onClick={() => onRemove(index)}>
                Eliminar
            </Button>
        )}
    </Box>
));

const Responsibilities = ({ responsabilidades, handleResponsabilidadChange, removeResponsabilidad, addResponsabilidad }) => {
    const canRemove = responsabilidades.length > 1;

    return (
        <>
            <Typography variant="h5" sx={{ mt: 4, mb: 3 }}>Responsabilidades</Typography>
            <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                    {responsabilidades.map((resp, index) => (
                        <ResponsibilityRow
                            key={resp.id}
                            resp={resp}
                            index={index}
                            onChange={handleResponsabilidadChange}
                            onRemove={removeResponsabilidad}
                            canRemove={canRemove}
                        />
                    ))}
                    <Button variant="outlined" startIcon={<AddIcon />} onClick={addResponsabilidad} sx={{ mt: 1 }}>
                        Agregar Responsabilidad
                    </Button>
                </Grid>
            </Grid>
        </>
    );
};

export default React.memo(Responsibilities);
