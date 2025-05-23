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
    const { fecha, director, gerencia, descripcion, area, isConstruahorro } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'No se recibió ningún archivo' });
    if (!fecha || !director || !gerencia || !descripcion) {
      return res.status(400).json({ error: 'Los campos fecha, director, gerencia y descripción son obligatorios' });
    }
    if (!isConstruahorro && !area) {
      return res.status(400).json({ error: 'El campo área es obligatorio para solicitudes de Merkahorro' });
    }

    const fileName = `${Date.now()}_${file.originalname}`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage.from('pdfs-yuli')
      .upload(fileName, file.buffer, { contentType: file.mimetype });

    if (uploadError) {
      console.error("Error al subir archivo:", uploadError);
      return res.status(500).json({ error: 'Error al subir archivo' });
    }

    const { data: publicUrlData } = supabase.storage.from('pdfs-yuli').getPublicUrl(fileName);
    const documentoUrl = publicUrlData.publicUrl;

    const formData = {
      fecha,
      documento: documentoUrl,
      director,
      gerencia,
      area: isConstruahorro === 'true' ? null : area,
      descripcion,
      estado: isConstruahorro === 'true' ? 'pendiente por director' : 'pendiente por area',
      observacion_area: null,
      observacion_director: null,
      observacion_gerencia: null,
      role: 'creador',
      isConstruahorro: isConstruahorro === 'true'
    };

    const { data, error } = await supabase
      .from('yuli')
      .insert(formData)
      .select()
      .single();

    if (error) {
      console.error("Error al insertar en Supabase:", error);
      return res.status(500).json({ error: error.message });
    }

    const workflow_id = data.id;
    await supabase.from('yuli').update({ workflow_id }).eq('id', workflow_id);

    const emailRecipient = isConstruahorro === 'true' ? director : area;
    const emailSubject = isConstruahorro === 'true' ? "Nueva Solicitud de Aprobación - Director" : "Nueva Solicitud de Aprobación - Área";
    const html = isConstruahorro === 'true'
      ? generarHtmlCorreoDirector({
          fecha,
          documento: documentoUrl,
          gerencia,
          area,
          workflow_id,
          descripcion,
          approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/director`,
          rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/director`
        })
      : generarHtmlCorreoArea({
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

    await sendEmail(emailRecipient, emailSubject, html);

    res.status(201).json({ message: `Formulario creado y correo enviado a ${isConstruahorro === 'true' ? 'director' : 'área'}`, workflow_id });
  } catch (err) {
    console.error("Error en crearFormulario:", err);
    res.status(500).json({ error: err.message || "Error interno del servidor" });
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

    if (formRecord.isConstruahorro) {
      return res.status(400).json({ error: "Esta solicitud es de Construahorro y no requiere aprobación de área" });
    }

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
    console.error("Error en respuestaArea:", err);
    res.status(500).json({ error: err.message || "Error interno del servidor" });
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

    const expectedEstado = formRecord.isConstruahorro ? 'pendiente por director' : 'aprobado por area';
    if (formRecord.estado !== expectedEstado) {
      return res.status(400).json({ error: `Estado inválido. Se esperaba ${expectedEstado}` });
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
    console.error("Error en respuestaDirector:", err);
    res.status(500).json({ error: err.message || "Error interno del servidor" });
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
    console.error("Error en respuestaGerencia:", err);
    res.status(500).json({ error: err.message || "Error interno del servidor" });
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

    if (error) {
      console.error("Error en obtenerHistorial:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ historial: data });
  } catch (err) {
    console.error("Error en obtenerHistorial:", err);
    res.status(500).json({ error: err.message || "Error interno del servidor" });
  }
};

const obtenerTodasLasSolicitudes = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('yuli')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error en obtenerTodasLasSolicitudes:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ historial: data });
  } catch (err) {
    console.error("Error en obtenerTodasLasSolicitudes:", err);
    res.status(500).json({ error: err.message || "Error interno del servidor" });
  }
};

const reenviarFormulario = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, director, gerencia, descripcion, area, isConstruahorro } = req.body;
    const file = req.file;

    if (!fecha || !director || !gerencia || !descripcion) {
      return res.status(400).json({ error: 'Los campos fecha, director, gerencia y descripción son obligatorios' });
    }
    if (!isConstruahorro && !area) {
      return res.status(400).json({ error: 'El campo área es obligatorio para solicitudes de Merkahorro' });
    }

    let documentoUrl = null;
    if (file) {
      const fileName = `${Date.now()}_${file.originalname}`;
      const { data: uploadData, error: uploadError } = await supabase
        .storage.from('pdfs-yuli')
        .upload(fileName, file.buffer, { contentType: file.mimetype });

      if (uploadError) {
        console.error("Error al subir archivo en reenviarFormulario:", uploadError);
        return res.status(500).json({ error: 'Error al subir archivo' });
      }

      const { data: publicUrlData } = supabase.storage.from('pdfs-yuli').getPublicUrl(fileName);
      documentoUrl = publicUrlData.publicUrl;
    }

    const updates = {
      fecha,
      director,
      gerencia,
      area: isConstruahorro === 'true' ? null : area,
      descripcion,
      estado: isConstruahorro === 'true' ? 'pendiente por director' : 'pendiente por area',
      observacion_area: null,
      observacion_director: null,
      observacion_gerencia: null,
      isConstruahorro: isConstruahorro === 'true'
    };

    if (documentoUrl) updates.documento = documentoUrl;

    const { data: updated, error: updateError } = await supabase
      .from('yuli')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error("Error al actualizar en reenviarFormulario:", updateError);
      return res.status(500).json({ error: updateError.message });
    }

    const workflow_id = updated.workflow_id;

    const emailRecipient = isConstruahorro === 'true' ? updated.director : updated.area;
    const emailSubject = isConstruahorro === 'true' ? "Reenvío de Solicitud Editada - Director" : "Reenvío de Solicitud Editada - Área";
    const html = isConstruahorro === 'true'
      ? generarHtmlCorreoDirector({
          fecha: updated.fecha,
          documento: updated.documento,
          gerencia: updated.gerencia,
          area: updated.area,
          workflow_id,
          descripcion: updated.descripcion,
          approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/director`,
          rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/director`
        })
      : generarHtmlCorreoArea({
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

    await sendEmail(emailRecipient, emailSubject, html);

    res.json({ message: `Solicitud reenviada, flujo reiniciado y correo enviado a ${isConstruahorro === 'true' ? 'director' : 'área'}` });
  } catch (err) {
    console.error("Error en reenviarFormulario:", err);
    res.status(500).json({ error: err.message || "Error interno al reenviar solicitud" });
  }
};

const actualizarFormulario = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, director, gerencia, descripcion, area, isConstruahorro } = req.body;
    const file = req.file;

    if (!fecha || !director || !gerencia || !descripcion) {
      return res.status(400).json({ error: 'Los campos fecha, director, gerencia y descripción son obligatorios' });
    }
    if (!isConstruahorro && !area) {
      return res.status(400).json({ error: 'El campo área es obligatorio para solicitudes de Merkahorro' });
    }

    let documentoUrl;
    if (file) {
      const fileName = `${Date.now()}_${file.originalname}`;
      const { data: uploadData, error: uploadError } = await supabase
        .storage.from('pdfs-yuli')
        .upload(fileName, file.buffer, { contentType: file.mimetype });

      if (uploadError) {
        console.error("Error al subir archivo en actualizarFormulario:", uploadError);
        return res.status(500).json({ error: 'Error al subir el archivo' });
      }

      const { data: publicUrlData } = supabase.storage.from('pdfs-yuli').getPublicUrl(fileName);
      documentoUrl = publicUrlData.publicUrl;
    }

    const updateFields = {
      fecha,
      director,
      gerencia,
      descripcion,
      area: isConstruahorro === 'true' ? null : area,
      isConstruahorro: isConstruahorro === 'true'
    };

    if (documentoUrl) updateFields.documento = documentoUrl;

    const { data, error } = await supabase
      .from('yuli')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error("Error al actualizar en actualizarFormulario:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: "✅ Solicitud actualizada correctamente", data });
  } catch (err) {
    console.error("Error en actualizarFormulario:", err);
    res.status(500).json({ error: err.message || "Error interno al actualizar solicitud" });
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