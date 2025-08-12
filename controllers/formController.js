import multer from 'multer';
import {
  sendEmail,
  generarHtmlCorreoArea,
  generarHtmlCorreoDirector,
  generarHtmlCorreoGerencia,
  generarHtmlCorreoSeguridad
} from '../services/emailService.js';
import supabase from '../supabaseCliente.js';

export const upload = multer({ storage: multer.memoryStorage() }).fields([
  { name: 'documento', maxCount: 1 },
  { name: 'estructuraOrganizacional', maxCount: 1 }
]);

export const crearFormulario = async (req, res) => {
  try {
    const {
      fecha,
      director,
      gerencia,
      descripcion,
      area,
      isConstruahorro,
      seguridad,
      nombreCargo,
      areaGeneral,
      departamento,
      proceso,
      poblacionFocalizada,
      escolaridad,
      areaFormacion,
      estudiosComplementarios,
      experiencia,
      jefeInmediato,
      supervisaA,
      numeroPersonasCargo,
      tipoContrato,
      misionCargo,
      cursosCertificaciones,
      requiereVehiculo,
      tipoLicencia,
      idiomas,
      requiereViajar,
      areasRelacionadas,
      relacionamientoExterno
    } = req.body;

    const { documento, estructuraOrganizacional } = req.files || {};

    const requiredFields = {
      fecha,
      director,
      gerencia,
      descripcion,
      nombreCargo,
      areaGeneral,
      departamento,
      proceso,
      estructuraOrganizacional: estructuraOrganizacional ? estructuraOrganizacional[0] : null,
      escolaridad,
      areaFormacion,
      experiencia,
      jefeInmediato,
      tipoContrato,
      misionCargo
    };

    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value) {
        return res.status(400).json({ error: `El campo ${key} es obligatorio` });
      }
    }

    if (!isConstruahorro && !area) {
      return res.status(400).json({ error: 'El campo área es obligatorio para solicitudes de Merkahorro' });
    }

    if (requiereVehiculo === 'Sí' && !tipoLicencia) {
      return res.status(400).json({ error: 'El campo tipo de licencia es obligatorio si requiere vehículo' });
    }

    let documentoUrl = null;
    if (documento && documento[0]) {
      const fileName = `${Date.now()}_${documento[0].originalname}`;
      const { error: uploadError } = await supabase
        .storage.from('pdfs-yuli')
        .upload(fileName, documento[0].buffer, { contentType: documento[0].mimetype });

      if (uploadError) {
        console.error("Error al subir archivo documento:", uploadError);
        return res.status(500).json({ error: 'Error al subir archivo documento' });
      }

      const { data: publicUrlData } = supabase.storage.from('pdfs-yuli').getPublicUrl(fileName);
      documentoUrl = publicUrlData.publicUrl;
    }

    let estructuraOrganizacionalUrl = null;
    if (estructuraOrganizacional && estructuraOrganizacional[0]) {
      const fileName = `${Date.now()}_${estructuraOrganizacional[0].originalname}`;
      const { error: uploadError } = await supabase
        .storage.from('pdfs-yuli')
        .upload(fileName, estructuraOrganizacional[0].buffer, { contentType: estructuraOrganizacional[0].mimetype });

      if (uploadError) {
        console.error("Error al subir archivo estructuraOrganizacional:", uploadError);
        return res.status(500).json({ error: 'Error al subir archivo estructuraOrganizacional' });
      }

      const { data: publicUrlData } = supabase.storage.from('pdfs-yuli').getPublicUrl(fileName);
      estructuraOrganizacionalUrl = publicUrlData.publicUrl;
    } else {
      return res.status(400).json({ error: 'El archivo estructura organizacional es obligatorio' });
    }

    const formData = {
      fecha,
      documento: documentoUrl,
      director,
      gerencia,
      seguridad: isConstruahorro === 'true' ? null : seguridad,
      area: isConstruahorro === 'true' ? null : area,
      descripcion,
      nombreCargo,
      areaGeneral,
      departamento,
      proceso,
      estructuraOrganizacional: estructuraOrganizacionalUrl,
      poblacionFocalizada,
      escolaridad,
      areaFormacion,
      estudiosComplementarios,
      experiencia,
      jefeInmediato,
      supervisaA,
      numeroPersonasCargo: numeroPersonasCargo ? parseInt(numeroPersonasCargo) : null,
      tipoContrato,
      misionCargo,
      cursosCertificaciones,
      requiereVehiculo,
      tipoLicencia,
      idiomas,
      requiereViajar,
      areasRelacionadas,
      relacionamientoExterno,
      estado: isConstruahorro === 'true' ? 'pendiente por director' : 'pendiente por area',
      observacion_area: null,
      observacion_director: null,
      observacion_gerencia: null,
      observacion_seguridad: null,
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
    const emailData = await (isConstruahorro === 'true'
      ? generarHtmlCorreoDirector({ ...formData, workflow_id, approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/director`, rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/director` })
      : generarHtmlCorreoArea({ ...formData, workflow_id, approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/area`, rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/area` }));

    await sendEmail(emailRecipient, emailSubject, emailData.html, emailData.attachments);

    res.status(201).json({ message: `Formulario creado y correo enviado a ${isConstruahorro === 'true' ? 'director' : 'área'}`, workflow_id });
  } catch (err) {
    console.error("Error en crearFormulario:", err);
    res.status(500).json({ error: err.message || "Error interno del servidor" });
  }
};

export const respuestaArea = async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const { decision, observacion } = req.body;

    console.log("Iniciando respuestaArea para workflow_id:", workflow_id);
    console.log("Datos recibidos:", { decision, observacion });

    const { data: formRecord, error: fetchError } = await supabase
      .from("yuli")
      .select("*")
      .eq("workflow_id", workflow_id)
      .single();

    if (fetchError) {
      console.error("Error al obtener el registro:", fetchError);
      return res.status(500).json({ error: "Error al obtener el registro" });
    }

    console.log("Registro encontrado:", formRecord);

    if (formRecord.isConstruahorro) {
      console.log("Solicitud de Construahorro no requiere aprobación de área");
      return res.status(400).json({ error: "Esta solicitud es de Construahorro y no requiere aprobación de área" });
    }

    if (formRecord.estado !== "pendiente por area") {
      console.log("Estado inválido. Estado actual:", formRecord.estado);
      return res.status(400).json({ error: `Estado inválido. Se esperaba 'pendiente por area', pero se encontró '${formRecord.estado}'` });
    }

    if (decision === "rechazado") {
      await supabase
        .from("yuli")
        .update({
          estado: `rechazado por area (${formRecord.area})`,
          observacion_area: observacion || "",
        })
        .eq("workflow_id", workflow_id);

      console.log("Formulario rechazado por área");
      return res.json({ message: "Formulario rechazado por el área" });
    }

    await supabase
      .from("yuli")
      .update({
        estado: "aprobado por area",
        observacion_area: observacion || "",
      })
      .eq("workflow_id", workflow_id);

    const emailData = await generarHtmlCorreoDirector({
      ...formRecord,
      approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/director`,
      rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/director`,
    });

    await sendEmail(formRecord.director, "Solicitud de Aprobación - Director", emailData.html, emailData.attachments);
    console.log("Correo enviado al director:", formRecord.director);

    res.json({ message: "Decisión del área registrada y correo enviado al director" });
  } catch (err) {
    console.error("Error en respuestaArea:", err);
    res.status(500).json({ error: err.message || "Error interno del servidor" });
  }
};

export const respuestaDirector = async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const { decision, observacion } = req.body;

    console.log("Iniciando respuestaDirector para workflow_id:", workflow_id);
    console.log("Datos recibidos:", { decision, observacion });

    const { data: formRecord, error: fetchError } = await supabase
      .from("yuli")
      .select("*")
      .eq("workflow_id", workflow_id)
      .single();

    if (fetchError) {
      console.error("Error al obtener el registro:", fetchError);
      return res.status(500).json({ error: "Error al obtener el registro" });
    }

    console.log("Registro encontrado:", formRecord);

    const expectedEstado = formRecord.isConstruahorro ? "pendiente por director" : "aprobado por area";
    if (formRecord.estado !== expectedEstado) {
      console.log("Estado inválido. Estado actual:", formRecord.estado);
      return res.status(400).json({ error: `Estado inválido. Se esperaba '${expectedEstado}', pero se encontró '${formRecord.estado}'` });
    }

    if (decision === "rechazado") {
      await supabase
        .from("yuli")
        .update({
          estado: `rechazado por director (${formRecord.director})`,
          observacion_director: observacion || "",
        })
        .eq("workflow_id", workflow_id);

      console.log("Formulario rechazado por director");
      return res.json({ message: "Formulario rechazado por el director" });
    }

    await supabase
      .from("yuli")
      .update({
        estado: "aprobado por director",
        observacion_director: observacion || "",
      })
      .eq("workflow_id", workflow_id);

    const emailData = await generarHtmlCorreoGerencia({
      ...formRecord,
      approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/gerencia`,
      rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/gerencia`,
    });

    await sendEmail(formRecord.gerencia, "Solicitud de Aprobación - Gerencia", emailData.html, emailData.attachments);
    console.log("Correo enviado a gerencia:", formRecord.gerencia);

    res.json({ message: "Decisión del director registrada y correo enviado a gerencia" });
  } catch (err) {
    console.error("Error en respuestaDirector:", err);
    res.status(500).json({ error: err.message || "Error interno del servidor" });
  }
};

export const respuestaGerencia = async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const { decision, observacion } = req.body;

    console.log("Iniciando respuestaGerencia para workflow_id:", workflow_id);
    console.log("Datos recibidos:", { decision, observacion });

    const { data: formRecord, error: fetchError } = await supabase
      .from("yuli")
      .select("*")
      .eq("workflow_id", workflow_id)
      .single();

    if (fetchError) {
      console.error("Error al obtener el registro:", fetchError);
      return res.status(500).json({ error: "Error al obtener el registro" });
    }

    console.log("Registro encontrado:", formRecord);

    if (formRecord.estado !== "aprobado por director") {
      console.log("Estado inválido. Estado actual:", formRecord.estado);
      return res.status(400).json({
        error: `El director aún no ha aprobado esta solicitud. Estado actual: '${formRecord.estado}'`,
      });
    }

    if (decision === "rechazado") {
      await supabase
        .from("yuli")
        .update({
          estado: `rechazado por gerencia (${formRecord.gerencia})`,
          observacion_gerencia: observacion || "",
        })
        .eq("workflow_id", workflow_id);

      console.log("Formulario rechazado por gerencia");
      return res.json({ message: "Formulario rechazado por gerencia" });
    }

    await supabase
      .from("yuli")
      .update({
        estado: formRecord.isConstruahorro ? "aprobado por todos" : "pendiente por seguridad",
        observacion_gerencia: observacion || "",
      })
      .eq("workflow_id", workflow_id);

    if (!formRecord.isConstruahorro) {
      if (!formRecord.seguridad || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formRecord.seguridad)) {
        console.error("Correo de seguridad inválido o no definido:", formRecord.seguridad);
        return res.status(400).json({ error: "El correo de Seguridad y Salud en el Trabajo no está definido o es inválido" });
      }

      console.log("Generando correo para Seguridad y Salud en el Trabajo");
      const emailData = await generarHtmlCorreoSeguridad({
        ...formRecord,
        approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/seguridad`,
        rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/seguridad`,
      });

      await sendEmail(formRecord.seguridad, "Solicitud de Aprobación - Seguridad y Salud en el Trabajo", emailData.html, emailData.attachments);
      console.log("Correo enviado a seguridad:", formRecord.seguridad);
    }

    res.json({
      message: formRecord.isConstruahorro
        ? "Formulario aprobado por todos"
        : "Decisión de gerencia registrada y correo enviado a Seguridad y Salud en el Trabajo",
    });
  } catch (err) {
    console.error("Error en respuestaGerencia:", err);
    res.status(500).json({ error: err.message || "Error interno del servidor" });
  }
};

export const respuestaSeguridad = async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const { decision, observacion } = req.body;

    console.log("Iniciando respuestaSeguridad para workflow_id:", workflow_id);
    console.log("Datos recibidos:", { decision, observacion });

    const { data: formRecord, error: fetchError } = await supabase
      .from("yuli")
      .select("*")
      .eq("workflow_id", workflow_id)
      .single();

    if (fetchError) {
      console.error("Error al obtener el registro:", fetchError);
      return res.status(500).json({ error: "Error al obtener el registro" });
    }

    console.log("Registro encontrado:", formRecord);

    if (formRecord.isConstruahorro) {
      console.log("Solicitud de Construahorro no requiere aprobación de Seguridad");
      return res.status(400).json({
        error: "Esta solicitud es de Construahorro y no requiere aprobación de Seguridad y Salud en el Trabajo",
      });
    }

    if (formRecord.estado !== "pendiente por seguridad") {
      console.log("Estado inválido. Estado actual:", formRecord.estado);
      return res.status(400).json({
        error: `Estado inválido. Se esperaba 'pendiente por seguridad', pero se encontró '${formRecord.estado}'`,
      });
    }

    const newEstado = decision === "aprobado" ? "aprobado por todos" : `rechazado por seguridad (${formRecord.seguridad})`;

    await supabase
      .from("yuli")
      .update({
        estado: newEstado,
        observacion_seguridad: observacion || "",
      })
      .eq("workflow_id", workflow_id);

    console.log("Estado actualizado a:", newEstado);

    res.json({ message: `Formulario ${newEstado}` });
  } catch (err) {
    console.error("Error en respuestaSeguridad:", err);
    res.status(500).json({ error: err.message || "Error interno del servidor" });
  }
};

export const obtenerHistorial = async (req, res) => {
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

export const obtenerTodasLasSolicitudes = async (req, res) => {
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

export const reenviarFormulario = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fecha,
      director,
      gerencia,
      descripcion,
      area,
      isConstruahorro,
      seguridad,
      nombreCargo,
      areaGeneral,
      departamento,
      proceso,
      poblacionFocalizada,
      escolaridad,
      areaFormacion,
      estudiosComplementarios,
      experiencia,
      jefeInmediato,
      supervisaA,
      numeroPersonasCargo,
      tipoContrato,
      misionCargo,
      cursosCertificaciones,
      requiereVehiculo,
      tipoLicencia,
      idiomas,
      requiereViajar,
      areasRelacionadas,
      relacionamientoExterno
    } = req.body;
    const { documento, estructuraOrganizacional } = req.files || {};

    const requiredFields = {
      fecha,
      director,
      gerencia,
      descripcion,
      nombreCargo,
      areaGeneral,
      departamento,
      proceso,
      estructuraOrganizacional: estructuraOrganizacional ? estructuraOrganizacional[0] : null,
      escolaridad,
      areaFormacion,
      experiencia,
      jefeInmediato,
      tipoContrato,
      misionCargo
    };

    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value) {
        return res.status(400).json({ error: `El campo ${key} es obligatorio` });
      }
    }

    if (!isConstruahorro && !area) {
      return res.status(400).json({ error: 'El campo área es obligatorio para solicitudes de Merkahorro' });
    }

    if (requiereVehiculo === 'Sí' && !tipoLicencia) {
      return res.status(400).json({ error: 'El campo tipo de licencia es obligatorio si requiere vehículo' });
    }

    let documentoUrl = null;
    if (documento && documento[0]) {
      const fileName = `${Date.now()}_${documento[0].originalname}`;
      const { error: uploadError } = await supabase
        .storage.from('pdfs-yuli')
        .upload(fileName, documento[0].buffer, { contentType: documento[0].mimetype });

      if (uploadError) {
        console.error("Error al subir archivo documento en reenviarFormulario:", uploadError);
        return res.status(500).json({ error: 'Error al subir archivo documento' });
      }

      const { data: publicUrlData } = supabase.storage.from('pdfs-yuli').getPublicUrl(fileName);
      documentoUrl = publicUrlData.publicUrl;
    }

    let estructuraOrganizacionalUrl = null;
    if (estructuraOrganizacional && estructuraOrganizacional[0]) {
      const fileName = `${Date.now()}_${estructuraOrganizacional[0].originalname}`;
      const { error: uploadError } = await supabase
        .storage.from('pdfs-yuli')
        .upload(fileName, estructuraOrganizacional[0].buffer, { contentType: estructuraOrganizacional[0].mimetype });

      if (uploadError) {
        console.error("Error al subir archivo estructuraOrganizacional en reenviarFormulario:", uploadError);
        return res.status(500).json({ error: 'Error al subir archivo estructuraOrganizacional' });
      }

      const { data: publicUrlData } = supabase.storage.from('pdfs-yuli').getPublicUrl(fileName);
      estructuraOrganizacionalUrl = publicUrlData.publicUrl;
    } else {
      return res.status(400).json({ error: 'El archivo estructura organizacional es obligatorio' });
    }

    const updates = {
      fecha,
      director,
      gerencia,
      area: isConstruahorro === 'true' ? null : area,
      seguridad: isConstruahorro === 'true' ? null : seguridad,
      descripcion,
      nombreCargo,
      areaGeneral,
      departamento,
      proceso,
      estructuraOrganizacional: estructuraOrganizacionalUrl,
      poblacionFocalizada,
      escolaridad,
      areaFormacion,
      estudiosComplementarios,
      experiencia,
      jefeInmediato,
      supervisaA,
      numeroPersonasCargo: numeroPersonasCargo ? parseInt(numeroPersonasCargo) : null,
      tipoContrato,
      misionCargo,
      cursosCertificaciones,
      requiereVehiculo,
      tipoLicencia,
      idiomas,
      requiereViajar,
      areasRelacionadas,
      relacionamientoExterno,
      estado: isConstruahorro === 'true' ? 'pendiente por director' : 'pendiente por area',
      observacion_area: null,
      observacion_director: null,
      observacion_gerencia: null,
      observacion_seguridad: null,
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
    const emailData = await (isConstruahorro === 'true'
      ? generarHtmlCorreoDirector({ ...updated, approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/director`, rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/director` })
      : generarHtmlCorreoArea({ ...updated, approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/area`, rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/area` }));

    await sendEmail(emailRecipient, emailSubject, emailData.html, emailData.attachments);

    res.json({ message: `Solicitud reenviada, flujo reiniciado y correo enviado a ${isConstruahorro === 'true' ? 'director' : 'área'}` });
  } catch (err) {
    console.error("Error en reenviarFormulario:", err);
    res.status(500).json({ error: err.message || "Error interno al reenviar solicitud" });
  }
};

export const actualizarFormulario = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fecha,
      director,
      gerencia,
      descripcion,
      area,
      isConstruahorro,
      seguridad,
      nombreCargo,
      areaGeneral,
      departamento,
      proceso,
      poblacionFocalizada,
      escolaridad,
      areaFormacion,
      estudiosComplementarios,
      experiencia,
      jefeInmediato,
      supervisaA,
      numeroPersonasCargo,
      tipoContrato,
      misionCargo,
      cursosCertificaciones,
      requiereVehiculo,
      tipoLicencia,
      idiomas,
      requiereViajar,
      areasRelacionadas,
      relacionamientoExterno
    } = req.body;
    const { documento, estructuraOrganizacional } = req.files || {};

    const requiredFields = {
      fecha,
      director,
      gerencia,
      descripcion,
      nombreCargo,
      areaGeneral,
      departamento,
      proceso,
      estructuraOrganizacional: estructuraOrganizacional ? estructuraOrganizacional[0] : null,
      escolaridad,
      areaFormacion,
      experiencia,
      jefeInmediato,
      tipoContrato,
      misionCargo
    };

    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value) {
        return res.status(400).json({ error: `El campo ${key} es obligatorio` });
      }
    }

    if (!isConstruahorro && !area) {
      return res.status(400).json({ error: 'El campo área es obligatorio para solicitudes de Merkahorro' });
    }

    if (requiereVehiculo === 'Sí' && !tipoLicencia) {
      return res.status(400).json({ error: 'El campo tipo de licencia es obligatorio si requiere vehículo' });
    }

    let documentoUrl = null;
    if (documento && documento[0]) {
      const fileName = `${Date.now()}_${documento[0].originalname}`;
      const { error: uploadError } = await supabase
        .storage.from('pdfs-yuli')
        .upload(fileName, documento[0].buffer, { contentType: documento[0].mimetype });

      if (uploadError) {
        console.error("Error al subir archivo documento en actualizarFormulario:", uploadError);
        return res.status(500).json({ error: 'Error al subir archivo documento' });
      }

      const { data: publicUrlData } = supabase.storage.from('pdfs-yuli').getPublicUrl(fileName);
      documentoUrl = publicUrlData.publicUrl;
    }

    let estructuraOrganizacionalUrl = null;
    if (estructuraOrganizacional && estructuraOrganizacional[0]) {
      const fileName = `${Date.now()}_${estructuraOrganizacional[0].originalname}`;
      const { error: uploadError } = await supabase
        .storage.from('pdfs-yuli')
        .upload(fileName, estructuraOrganizacional[0].buffer, { contentType: estructuraOrganizacional[0].mimetype });

      if (uploadError) {
        console.error("Error al subir archivo estructuraOrganizacional en actualizarFormulario:", uploadError);
        return res.status(500).json({ error: 'Error al subir archivo estructuraOrganizacional' });
      }

      const { data: publicUrlData } = supabase.storage.from('pdfs-yuli').getPublicUrl(fileName);
      estructuraOrganizacionalUrl = publicUrlData.publicUrl;
    } else {
      return res.status(400).json({ error: 'El archivo estructura organizacional es obligatorio' });
    }

    const updateFields = {
      fecha,
      director,
      gerencia,
      descripcion,
      area: isConstruahorro === 'true' ? null : area,
      seguridad: isConstruahorro === 'true' ? null : seguridad,
      nombreCargo,
      areaGeneral,
      departamento,
      proceso,
      estructuraOrganizacional: estructuraOrganizacionalUrl,
      poblacionFocalizada,
      escolaridad,
      areaFormacion,
      estudiosComplementarios,
      experiencia,
      jefeInmediato,
      supervisaA,
      numeroPersonasCargo: numeroPersonasCargo ? parseInt(numeroPersonasCargo) : null,
      tipoContrato,
      misionCargo,
      cursosCertificaciones,
      requiereVehiculo,
      tipoLicencia,
      idiomas,
      requiereViajar,
      areasRelacionadas,
      relacionamientoExterno,
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