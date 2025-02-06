import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, generarHtmlCorreoDirector, generarHtmlCorreoGerencia } from '../services/emailService.js';

// Configuración de Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Configuración de multer para manejar archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * Crea un formulario (registro inicial), sube el archivo a Supabase y envía correo al director.
 */
const crearFormulario = async (req, res) => {
  try {
    const { fecha, director, gerencia } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }

    // Subir el archivo a Supabase Storage
    const fileName = `${Date.now()}_${file.originalname}`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('pdfs-yuli')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
      });

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

    // Insertamos el registro en la base de datos
    const { data, error } = await supabase
      .from('yuli')
      .insert({
        fecha,
        documento: documentoUrl,
        director,
        gerencia,
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

    const workflow_id = data.id;
    await supabase
      .from('yuli')
      .update({ workflow_id })
      .eq('id', workflow_id);

    // Generar link para aprobar/rechazar
    const approvalLink = `${process.env.FRONTEND_URL}/aprobar/${workflow_id}`;
    const rejectionLink = `${process.env.FRONTEND_URL}/rechazar/${workflow_id}`;

    // Enviar correo al director con botones para aprobar/rechazar
    const html = generarHtmlCorreoDirector({ fecha, documento: documentoUrl, gerencia, approvalLink, rejectionLink });
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

    if (fetchError) {
      console.error("Error al obtener formulario:", fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    const newEstado = decision === 'rechazado' ? 'rechazado' : 'pendiente';
    await supabase
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

    if (decision === 'aprobado') {
      const approvalLink = `${process.env.FRONTEND_URL}/aprobar/${workflow_id}`;
      const rejectionLink = `${process.env.FRONTEND_URL}/rechazar/${workflow_id}`;
      const html = generarHtmlCorreoGerencia({ fecha: formRecord.fecha, documento: formRecord.documento, director: formRecord.director, approvalLink, rejectionLink });
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

    if (fetchError) {
      console.error("Error al obtener formulario:", fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    const newEstado = decision === 'aprobado' ? 'aprobado' : 'rechazado';
    await supabase
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

    res.json({ message: `Formulario ${newEstado} por gerencia` });
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

export {
  crearFormulario,
  respuestaDirector,
  respuestaGerencia,
  obtenerHistorial,
  upload
};
