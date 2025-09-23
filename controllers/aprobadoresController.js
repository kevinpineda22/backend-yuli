// src/controllers/aprobadoresController.js
import supabase from '../supabaseCliente.js';

// Obtener todos los aprobadores
export const getAprobadores = async (req, res) => {
  try {
    const { data, error } = await supabase.from('aprobadores').select('*');
    if (error) {
      console.error('Error al obtener aprobadores:', error);
      return res.status(500).json({ error: 'Error al obtener la lista de aprobadores' });
    }
    res.status(200).json({ aprobadores: data });
  } catch (err) {
    console.error('Error en getAprobadores:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear un nuevo aprobador
export const createAprobador = async (req, res) => {
  try {
    const { nombre, correo, rol, empresa } = req.body;
    if (!nombre || !correo || !rol || !empresa) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    const { data, error } = await supabase.from('aprobadores').insert([{ nombre, correo, rol, empresa }]).select().single();
    if (error) {
      console.error('Error al crear aprobador:', error);
      return res.status(500).json({ error: 'Error al crear el aprobador' });
    }
    res.status(201).json({ message: 'Aprobador creado correctamente', aprobador: data });
  } catch (err) {
    console.error('Error en createAprobador:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar un aprobador
export const updateAprobador = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, correo, rol, empresa } = req.body;
    const { data, error } = await supabase.from('aprobadores').update({ nombre, correo, rol, empresa }).eq('id', id).select().single();
    if (error) {
      console.error('Error al actualizar aprobador:', error);
      return res.status(500).json({ error: 'Error al actualizar el aprobador' });
    }
    if (!data) {
      return res.status(404).json({ error: 'Aprobador no encontrado' });
    }
    res.status(200).json({ message: 'Aprobador actualizado correctamente', aprobador: data });
  } catch (err) {
    console.error('Error en updateAprobador:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar un aprobador
export const deleteAprobador = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('aprobadores').delete().eq('id', id).select();
    if (error) {
      console.error('Error al eliminar aprobador:', error);
      return res.status(500).json({ error: 'Error al eliminar el aprobador' });
    }
    if (data.length === 0) {
      return res.status(404).json({ error: 'Aprobador no encontrado' });
    }
    res.status(200).json({ message: 'Aprobador eliminado correctamente' });
  } catch (err) {
    console.error('Error en deleteAprobador:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};