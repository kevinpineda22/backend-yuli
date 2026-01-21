import React, { useMemo } from "react";
import { TextField, Select, MenuItem, FormControl, InputLabel, Grid, Chip, Box, OutlinedInput, Typography } from '@mui/material';

const DEPARTAMENTOS = [
    "DIRECCIÓN OPERACIONES",
    "DIRECCIÓN ADMINISTRATIVA Y FINANCIERA",
    "DIRECCIÓN GESTIÓN HUMANA",
    "DIRECCIÓN COMERCIAL",
];

const POBLACIONES = [
    "Discapacidad",
    "Víctimas del Conflicto",
    "Migrantes Venezolanos",
    "Ninguna",
];

const ESCOLARIDADES = ["Primaria", "Bachillerato", "Técnico", "Tecnólogo", "Universitario", "Posgrado"];

const TIPOS_CONTRATO = ["Indefinido", "Fijo", "Por obra o labor", "Prestación de servicios"];

const FechaNombre = React.memo(
    ({ fecha, nombreCargo, handleChange }) => (
        <>
            <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Fecha" type="date" name="fecha" value={fecha || ""} onChange={handleChange} InputLabelProps={{ shrink: true }} required />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Nombre del cargo" name="nombreCargo" value={nombreCargo || ""} onChange={handleChange} required />
            </Grid>
        </>
    ),
    (prev, next) => prev.fecha === next.fecha && prev.nombreCargo === next.nombreCargo && prev.handleChange === next.handleChange
);

const AreaDepto = React.memo(
    ({ areaGeneral, departamento, handleChange, departamentoItems }) => (
        <>
            <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Área" name="areaGeneral" value={areaGeneral || ""} onChange={handleChange} required />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                    <InputLabel id="departamento-label">Departamento</InputLabel>
                    <Select labelId="departamento-label" name="departamento" value={departamento || ""} onChange={handleChange}>
                        <MenuItem value="">--Seleccione--</MenuItem>
                        {departamentoItems}
                    </Select>
                </FormControl>
            </Grid>
        </>
    ),
    (prev, next) =>
        prev.areaGeneral === next.areaGeneral &&
        prev.departamento === next.departamento &&
        prev.handleChange === next.handleChange &&
        prev.departamentoItems === next.departamentoItems
);

const ProcesoPoblacion = React.memo(
    ({ proceso, poblacionFocalizada, handleChange, handleMultiSelectChange, poblacionItems }) => (
        <>
            <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Proceso al que pertenece" name="proceso" value={proceso || ""} onChange={handleChange} required />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                    <InputLabel id="poblacion-focalizada-label">Población focalizada</InputLabel>
                    <Select
                        labelId="poblacion-focalizada-label"
                        name="poblacionFocalizada"
                        multiple
                        value={poblacionFocalizada || []}
                        onChange={handleMultiSelectChange}
                        input={<OutlinedInput id="select-multiple-chip" label="Población focalizada" />}
                        renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {selected.map((value) => <Chip key={value} label={value} />)}
                            </Box>
                        )}
                    >
                        {poblacionItems}
                    </Select>
                </FormControl>
            </Grid>
        </>
    ),
    (prev, next) =>
        prev.proceso === next.proceso &&
        prev.poblacionFocalizada === next.poblacionFocalizada &&
        prev.handleChange === next.handleChange &&
        prev.handleMultiSelectChange === next.handleMultiSelectChange &&
        prev.poblacionItems === next.poblacionItems
);

const EscolaridadArea = React.memo(
    ({ escolaridad, areaFormacion, handleChange, escolaridadItems }) => (
        <>
            <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                    <InputLabel id="escolaridad-label">Escolaridad</InputLabel>
                    <Select labelId="escolaridad-label" name="escolaridad" value={escolaridad || ""} onChange={handleChange}>
                        <MenuItem value="">--Seleccione--</MenuItem>
                        {escolaridadItems}
                    </Select>
                </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Área de formación" name="areaFormacion" value={areaFormacion || ""} onChange={handleChange} required />
            </Grid>
        </>
    ),
    (prev, next) =>
        prev.escolaridad === next.escolaridad &&
        prev.areaFormacion === next.areaFormacion &&
        prev.handleChange === next.handleChange &&
        prev.escolaridadItems === next.escolaridadItems
);

const EstudiosExperiencia = React.memo(
    ({ estudiosComplementarios, experiencia, handleChange }) => (
        <>
            <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Estudios complementarios" name="estudiosComplementarios" value={estudiosComplementarios || ""} onChange={handleChange} multiline minRows={2} />
            </Grid>
            <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Experiencia necesaria" name="experiencia" value={experiencia || ""} onChange={handleChange} required />
            </Grid>
        </>
    ),
    (prev, next) =>
        prev.estudiosComplementarios === next.estudiosComplementarios &&
        prev.experiencia === next.experiencia &&
        prev.handleChange === next.handleChange
);

const JefeSupervisionContrato = React.memo(
    ({ jefeInmediato, supervisaA, numeroPersonasCargo, tipoContrato, handleChange, tipoContratoItems }) => (
        <>
            <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Jefe inmediato" name="jefeInmediato" value={jefeInmediato || ""} onChange={handleChange} required />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Supervisa a" name="supervisaA" value={supervisaA || ""} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Número de personas a cargo" type="number" name="numeroPersonasCargo" value={numeroPersonasCargo || ""} onChange={handleChange} inputProps={{ min: 0 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                    <InputLabel id="tipo-contrato-label">Tipo de contrato</InputLabel>
                    <Select labelId="tipo-contrato-label" name="tipoContrato" value={tipoContrato || ""} onChange={handleChange}>
                        <MenuItem value="">--Seleccione--</MenuItem>
                        {tipoContratoItems}
                    </Select>
                </FormControl>
            </Grid>
        </>
    ),
    (prev, next) =>
        prev.jefeInmediato === next.jefeInmediato &&
        prev.supervisaA === next.supervisaA &&
        prev.numeroPersonasCargo === next.numeroPersonasCargo &&
        prev.tipoContrato === next.tipoContrato &&
        prev.handleChange === next.handleChange &&
        prev.tipoContratoItems === next.tipoContratoItems
);

const GeneralInfoParams = ({ formToShow, handleChange, handleMultiSelectChange }) => {
    const safeForm = formToShow || {};

    const departamentoItems = useMemo(
        () => DEPARTAMENTOS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>),
        []
    );

    const poblacionItems = useMemo(
        () => POBLACIONES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>),
        []
    );

    const escolaridadItems = useMemo(
        () => ESCOLARIDADES.map((e) => <MenuItem key={e} value={e}>{e}</MenuItem>),
        []
    );

    const tipoContratoItems = useMemo(
        () => TIPOS_CONTRATO.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>),
        []
    );

    return (
        <>
            <Typography variant="h5" sx={{ mb: 3 }}>Información General</Typography>
            <Grid container spacing={2}>
                <FechaNombre fecha={safeForm.fecha} nombreCargo={safeForm.nombreCargo} handleChange={handleChange} />
                <AreaDepto areaGeneral={safeForm.areaGeneral} departamento={safeForm.departamento} handleChange={handleChange} departamentoItems={departamentoItems} />
                <ProcesoPoblacion proceso={safeForm.proceso} poblacionFocalizada={safeForm.poblacionFocalizada} handleChange={handleChange} handleMultiSelectChange={handleMultiSelectChange} poblacionItems={poblacionItems} />
                <EscolaridadArea escolaridad={safeForm.escolaridad} areaFormacion={safeForm.areaFormacion || safeForm.area_formacion} handleChange={handleChange} escolaridadItems={escolaridadItems} />
                <EstudiosExperiencia estudiosComplementarios={safeForm.estudiosComplementarios} experiencia={safeForm.experiencia} handleChange={handleChange} />
                <JefeSupervisionContrato
                    jefeInmediato={safeForm.jefeInmediato}
                    supervisaA={safeForm.supervisaA}
                    numeroPersonasCargo={safeForm.numeroPersonasCargo}
                    tipoContrato={safeForm.tipoContrato}
                    handleChange={handleChange}
                    tipoContratoItems={tipoContratoItems}
                />
            </Grid>
        </>
    );
};

const arePropsEqual = (prevProps, nextProps) => {
    return (
        prevProps.handleChange === nextProps.handleChange &&
        prevProps.handleMultiSelectChange === nextProps.handleMultiSelectChange &&
        prevProps.formToShow === nextProps.formToShow &&
        prevProps.departamentoItems === nextProps.departamentoItems &&
        prevProps.poblacionItems === nextProps.poblacionItems &&
        prevProps.escolaridadItems === nextProps.escolaridadItems &&
        prevProps.tipoContratoItems === nextProps.tipoContratoItems
    );
};

export default React.memo(GeneralInfoParams, arePropsEqual);
