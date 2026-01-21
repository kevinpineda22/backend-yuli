import React, { useState, useEffect, useMemo } from "react";
import { FormControl, InputLabel, Select, MenuItem, Grid } from "@mui/material";
import axios from 'axios';

const BACKEND_URL = "https://backend-yuli.vercel.app/api";

const AprobadorSelector = ({ aprobadoresData = {}, onAprobadorChange, disabled, empresa }) => {
  const [aprobadores, setAprobadores] = useState([]);

  useEffect(() => {
    const fetchAprobadores = async () => {
      try {
        const { data } = await axios.get(`${BACKEND_URL}/aprobadores`);
        setAprobadores(data.aprobadores || []);
      } catch (error) {
        console.error("Error al cargar aprobadores:", error);
        setAprobadores([]);
      }
    };

    fetchAprobadores();
  }, []);

  const aprobadoresPorRol = useMemo(() => {
    const empresaNorm = empresa ? empresa.toLowerCase().trim() : null;
    const grouped = {
      area: [],
      director: [],
      gerencia: [],
      calidad: [],
      seguridad: [],
    };

    for (const ap of aprobadores) {
      const empresaMatch = !empresaNorm || (ap.empresa && ap.empresa.toLowerCase().trim() === empresaNorm);
      if (!empresaMatch) continue;
      if (ap.rol === "Encargado de Área") grouped.area.push(ap);
      else if (ap.rol === "Director") grouped.director.push(ap);
      else if (ap.rol === "Gerencia") grouped.gerencia.push(ap);
      else if (ap.rol === "Calidad") grouped.calidad.push(ap);
      else if (ap.rol === "Seguridad") grouped.seguridad.push(ap);
    }
    return grouped;
  }, [aprobadores, empresa]);

  const data = aprobadoresData || {};

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <FormControl fullWidth required disabled={disabled}>
          <InputLabel id="area-label">Encargado de Área</InputLabel>
          <Select labelId="area-label" name="area" value={data.area || ""} onChange={onAprobadorChange}>
            <MenuItem value="">--Seleccione--</MenuItem>
            {aprobadoresPorRol.area.map(ap => (
              <MenuItem key={ap.id} value={ap.id}>
                {ap.nombre} ({ap.correo}) - {ap.empresa}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <FormControl fullWidth required disabled={disabled}>
          <InputLabel id="director-label">Director de Área</InputLabel>
          <Select labelId="director-label" name="director" value={data.director || ""} onChange={onAprobadorChange}>
            <MenuItem value="">--Seleccione--</MenuItem>
            {aprobadoresPorRol.director.map(ap => (
              <MenuItem key={ap.id} value={ap.id}>
                {ap.nombre} ({ap.correo}) - {ap.empresa}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <FormControl fullWidth required disabled={disabled}>
          <InputLabel id="gerencia-label">Gerencia General</InputLabel>
          <Select labelId="gerencia-label" name="gerencia" value={data.gerencia || ""} onChange={onAprobadorChange}>
            <MenuItem value="">--Seleccione--</MenuItem>
            {aprobadoresPorRol.gerencia.map(ap => (
              <MenuItem key={ap.id} value={ap.id}>
                {ap.nombre} ({ap.correo}) - {ap.empresa}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <FormControl fullWidth required disabled={disabled}>
          <InputLabel id="calidad-label">Calidad</InputLabel>
          <Select labelId="calidad-label" name="calidad" value={data.calidad || ""} onChange={onAprobadorChange}>
            <MenuItem value="">--Seleccione--</MenuItem>
            {aprobadoresPorRol.calidad.map(ap => (
              <MenuItem key={ap.id} value={ap.id}>
                {ap.nombre} ({ap.correo}) - {ap.empresa}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <FormControl fullWidth required disabled={disabled}>
          <InputLabel id="seguridad-label">Seguridad y Salud en el Trabajo</InputLabel>
          <Select labelId="seguridad-label" name="seguridad" value={data.seguridad || ""} onChange={onAprobadorChange}>
            <MenuItem value="">--Seleccione--</MenuItem>
            {aprobadoresPorRol.seguridad.map(ap => (
              <MenuItem key={ap.id} value={ap.id}>
                {ap.nombre} ({ap.correo}) - {ap.empresa}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );
};

const arePropsEqual = (prev, next) => {
  const prevData = prev.aprobadoresData || {};
  const nextData = next.aprobadoresData || {};

  return (
    prev.disabled === next.disabled &&
    prev.empresa === next.empresa &&
    prev.onAprobadorChange === next.onAprobadorChange &&
    prevData.area === nextData.area &&
    prevData.director === nextData.director &&
    prevData.gerencia === nextData.gerencia &&
    prevData.calidad === nextData.calidad &&
    prevData.seguridad === nextData.seguridad
  );
};

export default React.memo(AprobadorSelector, arePropsEqual);