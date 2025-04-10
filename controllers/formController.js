// controllers/formController.js
import multer from 'multer';
import { sendEmail, generarHtmlCorreoArea, generarHtmlCorreoDirector, generarHtmlCorreoGerencia } from '../services/emailService.js';
import supabase from '../supabaseCliente.js';

// Configuración de multer para manejar archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * Crea un formulario, sube el archivo a Supabase y envía correo al área primero
 */const crearFormulario = async (req, res) => {
  try {
    console.log("Datos recibidos en el backend:", req.body, req.file); // Log para verificar datos entrantes
    const { fecha, director, gerencia, descripcion, area } = req.body;
    const file = req.file;

    if (!file) {
      console.error("No se recibió archivo");
      return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }

    // Subir el archivo a Supabase Storage
    const fileName = `${Date.now()}_${file.originalname}`;
    console.log("Subiendo archivo a Supabase:", fileName);
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('pdfs-yuli')
      .upload(fileName, file.buffer, { contentType: file.mimetype });

    if (uploadError) {
      console.error('Error al subir el archivo:', uploadError);
      return res.status(500).json({ error: 'Error al subir el archivo a Supabase' });
    }

    const { data: publicUrlData, error: publicUrlError } = supabase
      .storage
      .from('pdfs-yuli')
      .getPublicUrl(fileName);

    if (publicUrlError) {
      console.error('Error al obtener URL pública:', publicUrlError);
      return res.status(500).json({ error: 'Error al obtener la URL pública' });
    }

    const documentoUrl = publicUrlData.publicUrl;

    // Insertar registro en la base de datos
    console.log("Insertando en Supabase:", { fecha, director, gerencia, area, descripcion });
    const { data, error } = await supabase
      .from('yuli')
      .insert({
        fecha,
        documento: documentoUrl,
        director,
        gerencia,
        area,
        descripcion,
        estado: 'pendiente por area',
        observacion: '',
        role: 'creador'
      })
      .select()
      .single();

    if (error) {
      console.error("Error al insertar formulario:", error);
      return res.status(500).json({ error: error.message });
    }

    const workflow_id = data.id;
    const { error: updateError } = await supabase
      .from('yuli')
      .update({ workflow_id })
      .eq('id', workflow_id);

    if (updateError) {
      console.error("Error al actualizar workflow_id:", updateError);
      return res.status(500).json({ error: updateError.message });
    }

    // Enviar correo al área
    const approvalLink = `https://www.merkahorro.com/dgdecision/${workflow_id}/area`;
    const rejectionLink = `https://www.merkahorro.com/dgdecision/${workflow_id}/area`;
    const html = generarHtmlCorreoArea({
      fecha,
      documento: documentoUrl,
      director,
      gerencia,
      area,
      workflow_id,
      descripcion,
      approvalLink,
      rejectionLink
    });
    console.log("Enviando correo a:", area);
    await sendEmail(area, "Nueva Solicitud de Aprobación - Área", html);

    res.status(201).json({ message: "Formulario creado y correo enviado al área", workflow_id });
  } catch (err) {
    console.error("Error en crearFormulario:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Maneja la respuesta del área
 */
const respuestaArea = async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const decision = req.query.decision || req.body.decision;
    const { observacion } = req.body;

    if (!['aprobado', 'rechazado'].includes(decision)) {
      return res.status(400).json({ error: "Decisión inválida" });
    }

    const { data: formRecord, error: fetchError } = await supabase
      .from('yuli')
      .select('*')
      .eq('workflow_id', workflow_id)
      .order('id', { ascending: true })
      .limit(1)
      .single();

    if (fetchError) {
      console.error("Error al obtener formulario:", fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    if (decision === 'rechazado') {
      const { error } = await supabase
        .from('yuli')
        .update({
          estado: 'rechazado por area',
          observacion: observacion || '',
          rechazadoPor: formRecord.area
        })
        .eq('workflow_id', workflow_id);

      if (error) return res.status(500).json({ error: error.message });
      return res.json({ message: "Formulario rechazado por el área" });
    }

    // Si el área aprueba, pasar al director
    const { error } = await supabase
      .from('yuli')
      .update({
        estado: 'aprobado por area',
        observacion: observacion || ''
      })
      .eq('workflow_id', workflow_id);

    if (error) return res.status(500).json({ error: error.message });

    const approvalLink = `https://www.merkahorro.com/dgdecision/${workflow_id}/director`;
    const rejectionLink = `https://www.merkahorro.com/dgdecision/${workflow_id}/director`;
    const html = generarHtmlCorreoDirector({
      fecha: formRecord.fecha,
      documento: formRecord.documento,
      gerencia: formRecord.gerencia,
      area: formRecord.area,
      workflow_id,
      descripcion: formRecord.descripcion,
      approvalLink,
      rejectionLink
    });
    await sendEmail(formRecord.director, "Solicitud de Aprobación - Director", html);

    return res.json({ message: "Decisión del área registrada y correo enviado al director" });
  } catch (err) {
    console.error("Error en respuestaArea:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Maneja la respuesta del director
 */
const respuestaDirector = async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const decision = req.query.decision || req.body.decision;
    const { observacion } = req.body;

    if (!['aprobado', 'rechazado'].includes(decision)) {
      return res.status(400).json({ error: "Decisión inválida" });
    }

    const { data: formRecord, error: fetchError } = await supabase
      .from('yuli')
      .select('*')
      .eq('workflow_id', workflow_id)
      .order('id', { ascending: true })
      .limit(1)
      .single();

    if (fetchError) return res.status(500).json({ error: fetchError.message });
    if (formRecord.estado !== 'aprobado por area') {
      return res.status(400).json({ error: "El área aún no ha aprobado esta solicitud" });
    }

    if (decision === 'rechazado') {
      const { error } = await supabase
        .from('yuli')
        .update({
          estado: 'rechazado por director',
          observacion: observacion || '',
          rechazadoPor: formRecord.director
        })
        .eq('workflow_id', workflow_id);

      if (error) return res.status(500).json({ error: error.message });
      return res.json({ message: "Formulario rechazado por el director" });
    }

    const { error } = await supabase
      .from('yuli')
      .update({
        estado: 'aprobado por director',
        observacion: observacion || formRecord.observacion
      })
      .eq('workflow_id', workflow_id);

    if (error) return res.status(500).json({ error: error.message });

    const approvalLink = `https://www.merkahorro.com/dgdecision/${workflow_id}/gerencia`;
    const rejectionLink = `https://www.merkahorro.com/dgdecision/${workflow_id}/gerencia`;
    const html = generarHtmlCorreoGerencia({
      fecha: formRecord.fecha,
      documento: formRecord.documento,
      director: formRecord.director,
      area: formRecord.area,
      workflow_id,
      descripcion: formRecord.descripcion,
      approvalLink,
      rejectionLink
    });
    await sendEmail(formRecord.gerencia, "Solicitud de Aprobación - Gerencia", html);

    return res.json({ message: "Decisión del director registrada y correo enviado a gerencia" });
  } catch (err) {
    console.error("Error en respuestaDirector:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Maneja la respuesta de gerencia
 */
const respuestaGerencia = async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const { decision, observacion } = req.body;

    if (!['aprobado', 'rechazado'].includes(decision)) {
      return res.status(400).json({ error: "Decisión inválida" });
    }

    const { data: formRecord, error: fetchError } = await supabase
      .from('yuli')
      .select('*')
      .eq('workflow_id', workflow_id)
      .order('id', { ascending: true })
      .limit(1)
      .single();

    if (fetchError) return res.status(500).json({ error: fetchError.message });
    if (formRecord.estado !== 'aprobado por director') {
      return res.status(400).json({ error: "El director aún no ha aprobado esta solicitud" });
    }

    const newEstado = decision === 'aprobado' ? 'aprobado por todos' : 'rechazado por gerencia';
    const { error } = await supabase
      .from('yuli')
      .update({
        estado: newEstado,
        observacion: observacion || formRecord.observacion,
        ...(decision === 'rechazado' && { rechazadoPor: formRecord.gerencia })
      })
      .eq('workflow_id', workflow_id);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: `Formulario ${newEstado}` });
  } catch (err) {
    console.error("Error en respuestaGerencia:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// Las siguientes funciones no necesitan cambios adicionales ya que funcionan con el flujo existente
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

const obtenerTodasLasSolicitudes = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('yuli')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error al obtener todas las solicitudes:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ historial: data });
  } catch (err) {
    console.error("Error en obtenerTodasLasSolicitudes:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

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