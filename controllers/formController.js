// controllers/formController.js
import multer from 'multer';
import { sendEmail, generarHtmlCorreoDirector, generarHtmlCorreoGerencia } from '../services/emailService.js';
import supabase from '../supabaseCliente.js';

// Configuración de multer para manejar archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * Crea un formulario (registro inicial), sube el archivo a Supabase y envía correo al director.
 */
const crearFormulario = async (req, res) => {
  try {
    // Se incluye el campo "descripcion" junto con los demás datos
    const { fecha, director, gerencia, descripcion } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }

    // Subir el archivo a Supabase Storage
    const fileName = `${Date.now()}_${file.originalname}`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('pdfs-yuli')
      .upload(fileName, file.buffer, { contentType: file.mimetype });

    if (uploadError) {
      console.error('Error al subir el archivo:', uploadError);
      return res.status(500).json({ error: 'Error al subir el archivo a Supabase' });
    }

    // Obtener la URL pública del archivo
    const { data: publicUrlData, error: publicUrlError } = supabase
      .storage
      .from('pdfs-yuli')
      .getPublicUrl(fileName);

    if (publicUrlError) {
      console.error('Error al obtener URL pública:', publicUrlError);
      return res.status(500).json({ error: 'Error al obtener la URL pública' });
    }

    const documentoUrl = publicUrlData.publicUrl;

    // Insertar registro en la base de datos, incluyendo el nuevo campo "descripcion"
    const { data, error } = await supabase
      .from('yuli')
      .insert({
        fecha,
        documento: documentoUrl,
        director,
        gerencia,
        descripcion, // nuevo campo
        estado: 'pendiente',
        observacion: '',
        role: 'creador'
      })
      .select()
      .single();

    if (error) {
      console.error("Error al insertar formulario:", error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || !data.id) {
      console.error("No se generó el ID tras la inserción.");
      return res.status(500).json({ error: "Error al generar el ID para el workflow." });
    }

    // Asignar workflow_id (igual al id generado) para agrupar el proceso
    const workflow_id = data.id;
    const { error: updateError } = await supabase
      .from('yuli')
      .update({ workflow_id })
      .eq('id', workflow_id);

    if (updateError) {
      console.error("Error al actualizar workflow_id:", updateError);
      return res.status(500).json({ error: updateError.message });
    }

    // Generar enlaces para aprobar o rechazar (para el director)
    const approvalLink = `https://www.merkahorro.com/dgdecision/${workflow_id}/director`;
    const rejectionLink = `https://www.merkahorro.com/dgdecision/${workflow_id}/director?decision=rechazado`;

    // Enviar correo al director, incluyendo el campo "descripcion"
    const html = generarHtmlCorreoDirector({
      fecha,
      documento: documentoUrl,
      gerencia,
      workflow_id,
      descripcion,  // se pasa al template del correo
      approvalLink,
      rejectionLink
    });
    await sendEmail(director, "Nueva Solicitud de Aprobación", html);

    res.status(201).json({ message: "Formulario creado y correo enviado al director", workflow_id });
  } catch (err) {
    console.error("Error en crearFormulario:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Registra la respuesta del director.
 * - Si la decisión es rechazar, actualiza el registro a 'rechazado' y finaliza el proceso.
 * - Si aprueba, actualiza el registro a 'aprobado por director' y envía correo a gerencia.
 */
const respuestaDirector = async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const decision = req.query.decision || req.body.decision;
    const { observacion } = req.body;

    if (!['aprobado', 'rechazado'].includes(decision)) {
      return res.status(400).json({ error: "Decisión inválida" });
    }

    // Obtener el registro inicial del workflow
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
      // Actualizar el registro para marcarlo como rechazado
      const { error } = await supabase
        .from('yuli')
        .update({
          estado: 'rechazado',
          observacion: observacion || ''
        })
        .eq('workflow_id', workflow_id);

      if (error) {
        console.error("Error al actualizar respuesta del director:", error);
        return res.status(500).json({ error: error.message });
      }

      return res.json({ message: "Formulario rechazado por el director" });
    }

    // Si el director aprueba, actualizar el registro a 'aprobado por director'
    const { error } = await supabase
      .from('yuli')
      .update({
        estado: 'aprobado por director',
        observacion: observacion || formRecord.observacion  // Mantener la observación existente si no se proporciona una nueva
      })
      .eq('workflow_id', workflow_id);

    if (error) {
      console.error("Error al actualizar respuesta del director:", error);
      return res.status(500).json({ error: error.message });
    }

    // Generar enlaces para la gerencia
    const approvalLink = `https://www.merkahorro.com/dgdecision/${workflow_id}/gerencia`;
    const rejectionLink = `https://www.merkahorro.com/dgdecision/${workflow_id}/gerencia?decision=rechazado`;
    const html = generarHtmlCorreoGerencia({
      fecha: formRecord.fecha,
      documento: formRecord.documento,
      director: formRecord.director,
      workflow_id,
      descripcion: formRecord.descripcion, // incluir la descripción en el correo a gerencia
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
 * Registra la respuesta de gerencia y actualiza el estado final del workflow.
 */
const respuestaGerencia = async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const { decision, observacion } = req.body;

    if (!['aprobado', 'rechazado'].includes(decision)) {
      return res.status(400).json({ error: "Decisión inválida" });
    }

    // Obtener el registro inicial del workflow
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

    const newEstado = decision === 'aprobado' ? 'aprobado por ambos' : 'rechazado';
    const { error } = await supabase
      .from('yuli')
      .update({
        estado: newEstado,
        observacion: observacion || formRecord.observacion  // Mantener la observación existente si no hay una nueva
      })
      .eq('workflow_id', workflow_id);

    if (error) {
      console.error("Error al actualizar respuesta de gerencia:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: `Formulario ${newEstado}` });
  } catch (err) {
    console.error("Error en respuestaGerencia:", err);
    res.status(500).json({ error: "Error interno del servidor" });
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
 * Obtener todas las solicitudes
 */
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
  respuestaDirector,
  respuestaGerencia,
  obtenerHistorial,
  obtenerTodasLasSolicitudes,
  actualizarObservacion,
  upload
};
