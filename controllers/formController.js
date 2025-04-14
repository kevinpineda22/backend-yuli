// controllers/formController.js
import multer from 'multer';
import {
  sendEmail,
  generarHtmlCorreoArea,
  generarHtmlCorreoDirector,
  generarHtmlCorreoGerencia
} from '../services/emailService.js';
import supabase from '../supabaseCliente.js';

const storage = multer.memoryStorage();
const upload = multer({ storage });

const crearFormulario = async (req, res) => {
  try {
    const { fecha, director, gerencia, descripcion, area } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

    const fileName = `${Date.now()}_${file.originalname}`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage.from('pdfs-yuli')
      .upload(fileName, file.buffer, { contentType: file.mimetype });

    if (uploadError) return res.status(500).json({ error: 'Error al subir archivo' });

    const { data: publicUrlData } = supabase.storage.from('pdfs-yuli').getPublicUrl(fileName);
    const documentoUrl = publicUrlData.publicUrl;

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
        observacion_area: null,
        observacion_director: null,
        observacion_gerencia: null,
        role: 'creador'
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const workflow_id = data.id;
    await supabase.from('yuli').update({ workflow_id }).eq('id', workflow_id);

    const html = generarHtmlCorreoArea({
      fecha,
      documento: documentoUrl,
      director,
      gerencia,
      area,
      workflow_id,
      descripcion,
      approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/area`,
      rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/area`
    });
    await sendEmail(area, "Nueva Solicitud de Aprobación - Área", html);

    res.status(201).json({ message: "Formulario creado y correo enviado al área", workflow_id });
  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

const respuestaArea = async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const decision = req.query.decision || req.body.decision;
    const { observacion } = req.body;

    const { data: formRecord } = await supabase
      .from('yuli')
      .select('*')
      .eq('workflow_id', workflow_id)
      .single();

    if (decision === 'rechazado') {
      await supabase.from('yuli').update({
        estado: `rechazado por area (${formRecord.area})`,
        observacion_area: observacion || ''
      }).eq('workflow_id', workflow_id);

      return res.json({ message: "Formulario rechazado por el área" });
    }

    await supabase.from('yuli').update({
      estado: 'aprobado por area',
      observacion_area: observacion || ''
    }).eq('workflow_id', workflow_id);

    const html = generarHtmlCorreoDirector({
      fecha: formRecord.fecha,
      documento: formRecord.documento,
      gerencia: formRecord.gerencia,
      area: formRecord.area,
      workflow_id,
      descripcion: formRecord.descripcion,
      approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/director`,
      rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/director`
    });
    await sendEmail(formRecord.director, "Solicitud de Aprobación - Director", html);

    res.json({ message: "Decisión del área registrada y correo enviado al director" });
  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

const respuestaDirector = async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const decision = req.query.decision || req.body.decision;
    const { observacion } = req.body;

    const { data: formRecord } = await supabase
      .from('yuli')
      .select('*')
      .eq('workflow_id', workflow_id)
      .single();

    if (formRecord.estado !== 'aprobado por area') {
      return res.status(400).json({ error: "El área aún no ha aprobado esta solicitud" });
    }

    if (decision === 'rechazado') {
      await supabase.from('yuli').update({
        estado: `rechazado por director (${formRecord.director})`,
        observacion_director: observacion || ''
      }).eq('workflow_id', workflow_id);

      return res.json({ message: "Formulario rechazado por el director" });
    }

    await supabase.from('yuli').update({
      estado: 'aprobado por director',
      observacion_director: observacion || ''
    }).eq('workflow_id', workflow_id);

    const html = generarHtmlCorreoGerencia({
      fecha: formRecord.fecha,
      documento: formRecord.documento,
      director: formRecord.director,
      area: formRecord.area,
      workflow_id,
      descripcion: formRecord.descripcion,
      approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/gerencia`,
      rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/gerencia`
    });
    await sendEmail(formRecord.gerencia, "Solicitud de Aprobación - Gerencia", html);

    res.json({ message: "Decisión del director registrada y correo enviado a gerencia" });
  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

const respuestaGerencia = async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const { decision, observacion } = req.body;

    const { data: formRecord } = await supabase
      .from('yuli')
      .select('*')
      .eq('workflow_id', workflow_id)
      .single();

    if (formRecord.estado !== 'aprobado por director') {
      return res.status(400).json({ error: "El director aún no ha aprobado esta solicitud" });
    }

    const newEstado = decision === 'aprobado'
      ? 'aprobado por todos'
      : `rechazado por gerencia (${formRecord.gerencia})`;

    await supabase.from('yuli').update({
      estado: newEstado,
      observacion_gerencia: observacion || ''
    }).eq('workflow_id', workflow_id);

    res.json({ message: `Formulario ${newEstado}` });
  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

const obtenerHistorial = async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const { data, error } = await supabase
      .from('yuli')
      .select('*')
      .eq('workflow_id', workflow_id)
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    res.json({ historial: data });
  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

const obtenerTodasLasSolicitudes = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('yuli')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    res.json({ historial: data });
  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

const reenviarFormulario = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, director, gerencia, descripcion, area } = req.body;
    const file = req.file;

    // Subir nuevo archivo si viene
    let documentoUrl = null;

    if (file) {
      const fileName = `${Date.now()}_${file.originalname}`;
      const { data: uploadData, error: uploadError } = await supabase
        .storage.from('pdfs-yuli')
        .upload(fileName, file.buffer, { contentType: file.mimetype });

      if (uploadError) return res.status(500).json({ error: 'Error al subir archivo' });

      const { data: publicUrlData } = supabase.storage.from('pdfs-yuli').getPublicUrl(fileName);
      documentoUrl = publicUrlData.publicUrl;
    }

    // Construcción de campos actualizados y reseteo de flujo
    const updates = {
      fecha,
      director,
      gerencia,
      descripcion,
      area,
      estado: 'pendiente por area',
      observacion_area: null,
      observacion_director: null,
      observacion_gerencia: null,
    };

    if (documentoUrl) updates.documento = documentoUrl;

    const { data: updated, error: updateError } = await supabase
      .from('yuli')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) return res.status(500).json({ error: updateError.message });

    const workflow_id = updated.workflow_id;

    // Generar y enviar correo al área
    const html = generarHtmlCorreoArea({
      fecha: updated.fecha,
      documento: updated.documento,
      director: updated.director,
      gerencia: updated.gerencia,
      area: updated.area,
      workflow_id,
      descripcion: updated.descripcion,
      approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/area`,
      rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/area`
    });

    await sendEmail(updated.area, "📨 Reenvío de Solicitud Editada - Área", html);

    res.json({ message: "✅ Solicitud reenviada, flujo reiniciado y correo enviado al área." });
  } catch (err) {
    console.error("Error al reenviar solicitud:", err);
    res.status(500).json({ error: "Error interno al reenviar solicitud" });
  }
};

const actualizarFormulario = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, director, gerencia, descripcion, area } = req.body;

    const { data, error } = await supabase
      .from('yuli')
      .update({
        fecha,
        director,
        gerencia,
        descripcion,
        area
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: "Solicitud actualizada correctamente", data });
  } catch (err) {
    console.error("Error al actualizar solicitud:", err);
    res.status(500).json({ error: "Error interno al actualizar solicitud" });
  }
};


export {
  crearFormulario,
  respuestaArea,
  respuestaDirector,
  respuestaGerencia,
  obtenerHistorial,
  obtenerTodasLasSolicitudes,
  upload,
  reenviarFormulario,
  actualizarFormulario
};
