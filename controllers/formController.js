// controllers/formController.js
import multer from 'multer';
import { sendEmail, generarHtmlCorreoArea, generarHtmlCorreoDirector, generarHtmlCorreoGerencia } from '../services/emailService.js';
import supabase from '../supabaseCliente.js';

const storage = multer.memoryStorage();
const upload = multer({ storage });

const crearFormulario = async (req, res) => {
  try {
    const { fecha, director, gerencia, descripcion, area } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }

    const fileName = `${Date.now()}_${file.originalname}`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('pdfs-yuli')
      .upload(fileName, file.buffer, { contentType: file.mimetype });

    if (uploadError) {
      return res.status(500).json({ error: 'Error al subir archivo' });
    }

    const { data: publicUrlData } = supabase
      .storage
      .from('pdfs-yuli')
      .getPublicUrl(fileName);

    const documentoUrl = publicUrlData.publicUrl;

    const { data, error } = await supabase
      .from('yuli')
      .insert({
        fecha,
        documento: documentoUrl,
        director,
        gerencia,
        descripcion,
        area,
        estado: 'pendiente por área',
        observacion: '',
        role: 'creador'
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const workflow_id = data.id;
    await supabase.from('yuli').update({ workflow_id }).eq('id', workflow_id);

    const approvalLink = `https://www.merkahorro.com/dgdecision/${workflow_id}/area`;
    const rejectionLink = `https://www.merkahorro.com/dgdecision/${workflow_id}/area?decision=rechazado`;

    const html = generarHtmlCorreoArea({ fecha, documento: documentoUrl, workflow_id, descripcion, approvalLink, rejectionLink });
    await sendEmail(area, "Nueva Solicitud para Validación de Área", html);

    res.status(201).json({ message: "Solicitud enviada al área", workflow_id });
  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

const respuestaArea = async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const decision = req.query.decision || req.body.decision;
    const { observacion } = req.body;

    if (!['aprobado', 'rechazado'].includes(decision)) {
      return res.status(400).json({ error: "Decisión inválida" });
    }

    const { data: formRecord } = await supabase
      .from('yuli')
      .select('*')
      .eq('workflow_id', workflow_id)
      .single();

    if (decision === 'rechazado') {
      await supabase.from('yuli').update({ estado: 'rechazado', observacion }).eq('workflow_id', workflow_id);
      return res.json({ message: "Rechazado por área" });
    }

    await supabase.from('yuli').update({ estado: 'aprobado por área', observacion }).eq('workflow_id', workflow_id);

    const approvalLink = `https://www.merkahorro.com/dgdecision/${workflow_id}/director`;
    const rejectionLink = `https://www.merkahorro.com/dgdecision/${workflow_id}/director?decision=rechazado`;
    const html = generarHtmlCorreoDirector({ fecha: formRecord.fecha, documento: formRecord.documento, workflow_id, descripcion: formRecord.descripcion, approvalLink, rejectionLink });

    await sendEmail(formRecord.director, "Solicitud de Aprobación - Director", html);
    res.json({ message: "Aprobado por área. Enviado a director." });
  } catch (err) {
    res.status(500).json({ error: "Error interno en respuestaArea" });
  }
};

const respuestaDirector = async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const decision = req.query.decision || req.body.decision;
    const { observacion } = req.body;

    if (!['aprobado', 'rechazado'].includes(decision)) {
      return res.status(400).json({ error: "Decisión inválida" });
    }

    const { data: formRecord } = await supabase
      .from('yuli')
      .select('*')
      .eq('workflow_id', workflow_id)
      .single();

    if (formRecord.estado !== 'aprobado por área') {
      return res.status(400).json({ error: "No autorizado. El área no ha aprobado aún." });
    }

    if (decision === 'rechazado') {
      await supabase.from('yuli').update({ estado: 'rechazado', observacion }).eq('workflow_id', workflow_id);
      return res.json({ message: "Rechazado por director" });
    }

    await supabase.from('yuli').update({ estado: 'aprobado por director', observacion }).eq('workflow_id', workflow_id);

    const approvalLink = `https://www.merkahorro.com/dgdecision/${workflow_id}/gerencia`;
    const rejectionLink = `https://www.merkahorro.com/dgdecision/${workflow_id}/gerencia?decision=rechazado`;
    const html = generarHtmlCorreoGerencia({ fecha: formRecord.fecha, documento: formRecord.documento, director: formRecord.director, workflow_id, descripcion: formRecord.descripcion, approvalLink, rejectionLink });

    await sendEmail(formRecord.gerencia, "Solicitud de Aprobación - Gerencia", html);
    res.json({ message: "Aprobado por director. Enviado a gerencia." });
  } catch (err) {
    res.status(500).json({ error: "Error interno en respuestaDirector" });
  }
};

const respuestaGerencia = async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const { decision, observacion } = req.body;

    if (!['aprobado', 'rechazado'].includes(decision)) {
      return res.status(400).json({ error: "Decisión inválida" });
    }

    const { data: formRecord } = await supabase
      .from('yuli')
      .select('*')
      .eq('workflow_id', workflow_id)
      .single();

    const newEstado = decision === 'aprobado' ? 'aprobado por ambos' : 'rechazado';
    await supabase.from('yuli').update({ estado: newEstado, observacion }).eq('workflow_id', workflow_id);

    res.json({ message: `Formulario ${newEstado}` });
  } catch (err) {
    res.status(500).json({ error: "Error interno en respuestaGerencia" });
  }
};

const obtenerTodasLasSolicitudes = async (req, res) => {
  try {
    const { data, error } = await supabase.from('yuli').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ historial: data });
  } catch (err) {
    res.status(500).json({ error: "Error interno al obtener solicitudes" });
  }
};

/**
 * Obtiene el historial completo de un workflow (todos los registros asociados al workflow_id).
 */
const obtenerHistorial = async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const { data, error } = await supabase
      .from('yuli')
      .select('*')
      .eq('workflow_id', workflow_id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error al obtener historial:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ historial: data });
  } catch (err) {
    console.error("Error en obtenerHistorial:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Actualiza la observación de un formulario.
 */
const actualizarObservacion = async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const { observacion } = req.body;

    const { error } = await supabase
      .from('yuli')
      .update({ observacion })
      .eq('workflow_id', workflow_id);

    if (error) {
      console.error("Error al actualizar la observación:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: "Observación actualizada correctamente" });
  } catch (err) {
    console.error("Error en actualizarObservacion:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

export {
  crearFormulario,
  respuestaArea,
  respuestaDirector,
  respuestaGerencia,
  obtenerHistorial,
  obtenerTodasLasSolicitudes,
  actualizarObservacion,
  upload
};
