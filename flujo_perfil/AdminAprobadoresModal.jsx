import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Modal, Box, Typography, TextField, Button, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton,
    FormControl, InputLabel, Select, MenuItem, Paper, Grid, Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from "../../hooks/useAuth";

const BACKEND_URL = "https://backend-yuli.vercel.app/api";

const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: { xs: '95%', md: 800 },
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
    maxHeight: '90vh',
    overflowY: 'auto'
};

const ROLES = [
    "Encargado de Área",
    "Director",
    "Gerencia",
    "Calidad",
    "Seguridad"
];

const EMPRESAS = ["Merkahorro", "Construahorro", "Megamayoristas"];

const AprobadorRow = React.memo(({ aprobador, onEdit, onDelete }) => (
    <ListItem divider>
        <ListItemText
            primary={`${aprobador.nombre} (${aprobador.empresa})`}
            secondary={`${aprobador.rol} - ${aprobador.correo}`}
        />
        <ListItemSecondaryAction>
            <IconButton edge="end" aria-label="edit" onClick={() => onEdit(aprobador)}>
                <EditIcon />
            </IconButton>
            <IconButton edge="end" aria-label="delete" onClick={() => onDelete(aprobador.id)}>
                <DeleteIcon color="error" />
            </IconButton>
        </ListItemSecondaryAction>
    </ListItem>
), (prev, next) => prev.aprobador === next.aprobador && prev.onEdit === next.onEdit && prev.onDelete === next.onDelete);

const AdminAprobadoresModal = ({ open, handleClose }) => {
    const [aprobadores, setAprobadores] = useState([]);
    const [formState, setFormState] = useState({ id: null, nombre: '', correo: '', rol: '', empresa: '' });
    const [isEditing, setIsEditing] = useState(false);
    const { isAdmin, user } = useAuth();

    const fetchAprobadores = async () => {
        try {
            const { data } = await axios.get(`${BACKEND_URL}/aprobadores`);
            setAprobadores(data.aprobadores);
        } catch (error) {
            toast.error("Error al cargar aprobadores.");
            console.error(error);
        }
    };

    useEffect(() => {
        if (open) {
            fetchAprobadores();
        }
    }, [open]);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        // Evitar que el submit del modal burbujee y dispare la validación del formulario principal.
        e.preventDefault();
        e.stopPropagation();
        try {
            if (isEditing) {
                await axios.put(`${BACKEND_URL}/aprobadores/${formState.id}`, formState);
                toast.success("Aprobador actualizado correctamente.");
            } else {
                await axios.post(`${BACKEND_URL}/aprobadores`, formState);
                toast.success("Aprobador creado correctamente.");
            }
            fetchAprobadores();
            setFormState({ id: null, nombre: '', correo: '', rol: '', empresa: '' });
            setIsEditing(false);
        } catch (error) {
            toast.error("Error al guardar aprobador.");
            console.error(error);
        }
    };

    const handleEdit = useCallback((aprobador) => {
        setFormState(aprobador);
        setIsEditing(true);
    }, []);

    const handleDelete = useCallback(async (id) => {
        try {
            await axios.delete(`${BACKEND_URL}/aprobadores/${id}`);
            toast.success("Aprobador eliminado correctamente.");
            fetchAprobadores();
        } catch (error) {
            toast.error("Error al eliminar aprobador.");
            console.error(error);
        }
    }, []);

    // No renderizar nada si el modal está cerrado: evita trabajo de layout y pintura.
    if (!open) return null;

    // Verificación de seguridad
    if (!isAdmin) {
        return (
            <Modal open={open} onClose={handleClose}>
                <Box sx={style}>
                    <Alert severity="error" sx={{ mb: 2 }}>
                        No tienes permisos para acceder a esta funcionalidad.
                    </Alert>
                    <Box display="flex" justifyContent="flex-end">
                        <Button onClick={handleClose} variant="contained" color="primary">
                            Cerrar
                        </Button>
                    </Box>
                </Box>
            </Modal>
        );
    }

    return (
        <Modal open={open} onClose={handleClose}>
            <Box sx={style}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h5">Administrar Aprobadores</Typography>
                    <IconButton onClick={handleClose}><CloseIcon /></IconButton>
                </Box>
                
                {/* Mostrar información del usuario administrador */}
                <Alert severity="info" sx={{ mb: 2 }}>
                    Sesión de administrador: {user?.email}
                </Alert>
                
                <Paper component="form" onSubmit={handleSubmit} sx={{ p: 2, mb: 3 }}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth label="Nombre" name="nombre" value={formState.nombre} onChange={handleFormChange} required />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth label="Correo" name="correo" type="email" value={formState.correo} onChange={handleFormChange} required />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth required>
                                <InputLabel>Rol</InputLabel>
                                <Select name="rol" value={formState.rol} onChange={handleFormChange}>
                                    {ROLES.map((r) => (
                                        <MenuItem key={r} value={r}>{r}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth required>
                                <InputLabel>Empresa</InputLabel>
                                <Select name="empresa" value={formState.empresa} onChange={handleFormChange}>
                                    {EMPRESAS.map((e) => (
                                        <MenuItem key={e} value={e}>{e}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Button type="submit" variant="contained" color="primary" startIcon={isEditing ? <SaveIcon /> : <AddIcon />}>
                                {isEditing ? 'Guardar Cambios' : 'Añadir Aprobador'}
                            </Button>
                        </Grid>
                    </Grid>
                </Paper>
                
                <Typography variant="h6">Aprobadores Existentes</Typography>
                <List component={Paper} sx={{ maxHeight: 300, overflowY: 'auto' }}>
                    {aprobadores.map((aprobador) => (
                        <AprobadorRow
                            key={aprobador.id}
                            aprobador={aprobador}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    ))}
                </List>
            </Box>
        </Modal>
    );
};
const arePropsEqual = (prev, next) => prev.open === next.open && prev.handleClose === next.handleClose;

export default React.memo(AdminAprobadoresModal, arePropsEqual);