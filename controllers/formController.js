// controllers/formController.js
const { sendEmail, generarHtmlCorreoDirector, generarHtmlCorreoGerencia } = require('../services/emailService');

/**
 * Crea un formulario (registro inicial) y envía correo al director.
 * Se asume que el campo "documento" contiene la URL del PDF subido al bucket "pdfs-yuli".
 */
const crearFormulario = async (req, res) => {
  try {
    const { fecha, documento, director, gerencia } = req.body;
    const supabase = req.supabase;

    // Insertamos el registro inicial con role "creador" y estado "pendiente"
    let { data, error } = await supabase
      .from('yuli')
      .insert({
        fecha,
        documento,
        director,
        gerencia,
        estado: 'pendiente',
        observacion: '',
        role: 'creador'
      })
      .single();

    if (error) {
      console.error("Error al insertar formulario:", error);
      return res.status(500).json({ error: error.message });
    }

    // Usamos el id insertado como workflow_id para agrupar las acciones
    const workflow_id = data.id;
    let { error: updateError } = await supabase
      .from('yuli')
      .update({ workflow_id })
      .eq('id', workflow_id);

    if (updateError) {
      console.error("Error al actualizar workflow_id:", updateError);
      return res.status(500).json({ error: updateError.message });
    }

    // Enviamos correo al director
    const html = generarHtmlCorreoDirector({ fecha, documento, gerencia });
    await sendEmail(director, "Nueva Solicitud de Aprobación", html);

    res.status(201).json({ message: "Formulario creado y correo enviado al director", workflow_id });
  } catch (err) {
    console.error("Error en crearFormulario:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Registra la respuesta del director.  
 * Si aprueba, se envía automáticamente un correo a gerencia.
 */
const respuestaDirector = async (req, res) => {
  try {
    const supabase = req.supabase;
    const { workflow_id } = req.params;
    const { decision, observacion } = req.body;

    if (!['aprobado', 'rechazado'].includes(decision)) {
      return res.status(400).json({ error: "Decisión inválida" });
    }

    // Obtenemos el registro inicial del workflow
    let { data: formRecord, error: fetchError } = await supabase
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

    // Insertamos un registro con la respuesta del director
    let newEstado = decision === 'rechazado' ? 'rechazado' : 'pendiente';
    let { data, error } = await supabase
      .from('yuli')
      .insert({
        workflow_id,
        fecha: formRecord.fecha,
        documento: formRecord.documento,
        director: formRecord.director,
        gerencia: formRecord.gerencia,
        estado: newEstado,
        observacion: observacion || (decision === 'rechazado' ? 'Rechazado por director' : ''),
        role: 'director'
      })
      .single();

    if (error) {
      console.error("Error al insertar respuesta del director:", error);
      return res.status(500).json({ error: error.message });
    }

    if (decision === 'aprobado') {
      // Enviamos correo a gerencia
      const html = generarHtmlCorreoGerencia({
        fecha: formRecord.fecha,
        documento: formRecord.documento,
        director: formRecord.director
      });
      await sendEmail(formRecord.gerencia, "Solicitud de Aprobación - Gerencia", html);
      return res.json({ message: "Decisión del director registrada y correo enviado a gerencia" });
    } else {
      return res.json({ message: "Formulario rechazado por el director" });
    }
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
    const supabase = req.supabase;
    const { workflow_id } = req.params;
    const { decision, observacion } = req.body;

    if (!['aprobado', 'rechazado'].includes(decision)) {
      return res.status(400).json({ error: "Decisión inválida" });
    }

    // Obtenemos el registro inicial del workflow
    let { data: formRecord, error: fetchError } = await supabase
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

    // Insertamos un registro con la respuesta de gerencia
    let newEstado = decision === 'aprobado' ? 'aprobado' : 'rechazado';
    let { data, error } = await supabase
      .from('yuli')
      .insert({
        workflow_id,
        fecha: formRecord.fecha,
        documento: formRecord.documento,
        director: formRecord.director,
        gerencia: formRecord.gerencia,
        estado: newEstado,
        observacion: observacion || (decision === 'rechazado' ? 'Rechazado por gerencia' : ''),
        role: 'gerencia'
      })
      .single();

    if (error) {
      console.error("Error al insertar respuesta de gerencia:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ message: `Formulario ${newEstado} por gerencia` });
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
    const supabase = req.supabase;
    const { workflow_id } = req.params;
    
    let { data, error } = await supabase
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

module.exports = {
  crearFormulario,
  respuestaDirector,
  respuestaGerencia,
  obtenerHistorial
};
