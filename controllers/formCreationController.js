import multer from 'multer';
import { sendEmail, generarHtmlCorreoArea, generarHtmlCorreoDirector } from '../services/emailService.js';
import supabase from '../config/supabaseCliente.js';

export const upload = multer({ storage: multer.memoryStorage() });

// Mapeo de nombres de campos del frontend a columnas de la base de datos
const fieldMapping = {
  nombreCargo: 'nombrecargo',
  areaGeneral: 'areageneral',
  departamento: 'departamento',
  proceso: 'proceso',
  estructuraOrganizacional: 'estructuraorganizacional',
  poblacionFocalizada: 'poblacionfocalizada',
  escolaridad: 'escolaridad',
  area_formacion: 'area_formacion',
  estudiosComplementarios: 'estudioscomplementarios',
  experiencia: 'experiencia',
  jefeInmediato: 'jefeinmediato',
  supervisaA: 'supervisaa',
  numeroPersonasCargo: 'numeropersonascargo',
  tipoContrato: 'tipocontrato',
  misionCargo: 'misioncargo',
  cursosCertificaciones: 'cursoscertificaciones',
  requiereVehiculo: 'requierevehiculo',
  tipoLicencia: 'tipolicencia',
  idiomas: 'idiomas',
  requiereViajar: 'requiereviajar',
  areasRelacionadas: 'areasrelacionadas',
  relacionamientoExterno: 'relacionamientoexterno',
  fecha: 'fecha',
  director: 'director',
  gerencia: 'gerencia',
  seguridad: 'seguridad',
  area: 'area',
  descripcion: 'descripcion',
  documento: 'documento',
  isConstruahorro: 'isConstruahorro',
  competenciasCulturales: 'competencias_culturales',
  competenciasCargo: 'competencias_cargo',
  responsabilidades: 'responsabilidades'
};

export const crearFormulario = async (req, res) => {
  try {
    const {
      fecha, director, gerencia, descripcion, area, isConstruahorro, seguridad, nombreCargo,
      areaGeneral, departamento, proceso, poblacionFocalizada, escolaridad, area_formacion,
      estudiosComplementarios, experiencia, jefeInmediato, supervisaA, numeroPersonasCargo,
      tipoContrato, misionCargo, cursosCertificaciones, requiereVehiculo, tipoLicencia,
      idiomas, requiereViajar, areasRelacionadas, relacionamientoExterno,
      competenciasCulturales, competenciasCargo, responsabilidades
    } = req.body;

    const { documento, estructuraOrganizacional } = req.files || {};

    // Validar campos obligatorios
    const requiredFields = {
      fecha, director, gerencia, descripcion, nombreCargo, areaGeneral, departamento, proceso,
      estructuraOrganizacional: estructuraOrganizacional ? estructuraOrganizacional[0] : null,
      escolaridad, area_formacion, experiencia, jefeInmediato, tipoContrato, misionCargo,
      competenciasCulturales, competenciasCargo, responsabilidades
    };

    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value) {
        return res.status(400).json({ error: `El campo ${key} es obligatorio` });
      }
    }

    // Validar arrays JSON
    try {
      if (!Array.isArray(JSON.parse(competenciasCulturales)) ||
          !Array.isArray(JSON.parse(competenciasCargo)) ||
          !Array.isArray(JSON.parse(responsabilidades))) {
        return res.status(400).json({ error: 'Los campos competenciasCulturales, competenciasCargo y responsabilidades deben ser arrays' });
      }
    } catch (e) {
      return res.status(400).json({ error: 'Formato inválido para competenciasCulturales, competenciasCargo o responsabilidades' });
    }

    if (!isConstruahorro && !area) {
      return res.status(400).json({ error: 'El campo área es obligatorio para solicitudes de Merkahorro' });
    }

    if (requiereVehiculo === 'Sí' && !tipoLicencia) {
      return res.status(400).json({ error: 'El campo tipo de licencia es obligatorio si requiere vehículo' });
    }

    // Subir documento
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

    // Subir estructura organizacional
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

    // Mapear datos
    const formData = {
      [fieldMapping.fecha]: fecha,
      [fieldMapping.documento]: documentoUrl,
      [fieldMapping.director]: director,
      [fieldMapping.gerencia]: gerencia,
      [fieldMapping.seguridad]: isConstruahorro === 'true' ? null : seguridad,
      [fieldMapping.area]: isConstruahorro === 'true' ? null : area,
      [fieldMapping.descripcion]: descripcion,
      [fieldMapping.nombreCargo]: nombreCargo,
      [fieldMapping.areaGeneral]: areaGeneral,
      [fieldMapping.departamento]: departamento,
      [fieldMapping.proceso]: proceso,
      [fieldMapping.estructuraOrganizacional]: estructuraOrganizacionalUrl,
      [fieldMapping.poblacionFocalizada]: poblacionFocalizada,
      [fieldMapping.escolaridad]: escolaridad,
      [fieldMapping.area_formacion]: area_formacion,
      [fieldMapping.estudiosComplementarios]: estudiosComplementarios,
      [fieldMapping.experiencia]: experiencia,
      [fieldMapping.jefeInmediato]: jefeInmediato,
      [fieldMapping.supervisaA]: supervisaA,
      [fieldMapping.numeroPersonasCargo]: numeroPersonasCargo ? parseInt(numeroPersonasCargo) : null,
      [fieldMapping.tipoContrato]: tipoContrato,
      [fieldMapping.misionCargo]: misionCargo,
      [fieldMapping.cursosCertificaciones]: cursosCertificaciones,
      [fieldMapping.requiereVehiculo]: requiereVehiculo,
      [fieldMapping.tipoLicencia]: tipoLicencia,
      [fieldMapping.idiomas]: idiomas,
      [fieldMapping.requiereViajar]: requiereViajar,
      [fieldMapping.areasRelacionadas]: areasRelacionadas,
      [fieldMapping.relacionamientoExterno]: relacionamientoExterno,
      [fieldMapping.competenciasCulturales]: competenciasCulturales,
      [fieldMapping.competenciasCargo]: competenciasCargo,
      [fieldMapping.responsabilidades]: responsabilidades,
      estado: isConstruahorro === 'true' ? 'pendiente por director' : 'pendiente por area',
      observacion_area: null,
      observacion_director: null,
      observacion_gerencia: null,
      observacion_seguridad: null,
      role: 'creador',
      [fieldMapping.isConstruahorro]: isConstruahorro === 'true'
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

export const reenviarFormulario = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fecha, director, gerencia, descripcion, area, isConstruahorro, seguridad, nombreCargo,
      areaGeneral, departamento, proceso, poblacionFocalizada, escolaridad, area_formacion,
      estudiosComplementarios, experiencia, jefeInmediato, supervisaA, numeroPersonasCargo,
      tipoContrato, misionCargo, cursosCertificaciones, requiereVehiculo, tipoLicencia,
      idiomas, requiereViajar, areasRelacionadas, relacionamientoExterno,
      competenciasCulturales, competenciasCargo, responsabilidades
    } = req.body;
    const { documento, estructuraOrganizacional } = req.files || {};

    const requiredFields = {
      fecha, director, gerencia, descripcion, nombreCargo, areaGeneral, departamento, proceso,
      estructuraOrganizacional: estructuraOrganizacional ? estructuraOrganizacional[0] : null,
      escolaridad, area_formacion, experiencia, jefeInmediato, tipoContrato, misionCargo,
      competenciasCulturales, competenciasCargo, responsabilidades
    };

    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value) {
        return res.status(400).json({ error: `El campo ${key} es obligatorio` });
      }
    }

    try {
      if (!Array.isArray(JSON.parse(competenciasCulturales)) ||
          !Array.isArray(JSON.parse(competenciasCargo)) ||
          !Array.isArray(JSON.parse(responsabilidades))) {
        return res.status(400).json({ error: 'Los campos competenciasCulturales, competenciasCargo y responsabilidades deben ser arrays' });
      }
    } catch (e) {
      return res.status(400).json({ error: 'Formato inválido para competenciasCulturales, competenciasCargo o responsabilidades' });
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

    const updates = {
      [fieldMapping.fecha]: fecha,
      [fieldMapping.director]: director,
      [fieldMapping.gerencia]: gerencia,
      [fieldMapping.area]: isConstruahorro === 'true' ? null : area,
      [fieldMapping.seguridad]: isConstruahorro === 'true' ? null : seguridad,
      [fieldMapping.descripcion]: descripcion,
      [fieldMapping.nombreCargo]: nombreCargo,
      [fieldMapping.areaGeneral]: areaGeneral,
      [fieldMapping.departamento]: departamento,
      [fieldMapping.proceso]: proceso,
      [fieldMapping.estructuraOrganizacional]: estructuraOrganizacionalUrl,
      [fieldMapping.poblacionFocalizada]: poblacionFocalizada,
      [fieldMapping.escolaridad]: escolaridad,
      [fieldMapping.area_formacion]: area_formacion,
      [fieldMapping.estudiosComplementarios]: estudiosComplementarios,
      [fieldMapping.experiencia]: experiencia,
      [fieldMapping.jefeInmediato]: jefeInmediato,
      [fieldMapping.supervisaA]: supervisaA,
      [fieldMapping.numeroPersonasCargo]: numeroPersonasCargo ? parseInt(numeroPersonasCargo) : null,
      [fieldMapping.tipoContrato]: tipoContrato,
      [fieldMapping.misionCargo]: misionCargo,
      [fieldMapping.cursosCertificaciones]: cursosCertificaciones,
      [fieldMapping.requiereVehiculo]: requiereVehiculo,
      [fieldMapping.tipoLicencia]: tipoLicencia,
      [fieldMapping.idiomas]: idiomas,
      [fieldMapping.requiereViajar]: requiereViajar,
      [fieldMapping.areasRelacionadas]: areasRelacionadas,
      [fieldMapping.relacionamientoExterno]: relacionamientoExterno,
      [fieldMapping.competenciasCulturales]: competenciasCulturales,
      [fieldMapping.competenciasCargo]: competenciasCargo,
      [fieldMapping.responsabilidades]: responsabilidades,
      estado: isConstruahorro === 'true' ? 'pendiente por director' : 'pendiente por area',
      observacion_area: null,
      observacion_director: null,
      observacion_gerencia: null,
      observacion_seguridad: null,
      [fieldMapping.isConstruahorro]: isConstruahorro === 'true'
    };

    if (documentoUrl) updates[fieldMapping.documento] = documentoUrl;

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

    const emailRecipient = isConstruahorro === 'true' ? updated[fieldMapping.director] : updated[fieldMapping.area];
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
      fecha, director, gerencia, descripcion, area, isConstruahorro, seguridad, nombreCargo,
      areaGeneral, departamento, proceso, poblacionFocalizada, escolaridad, area_formacion,
      estudiosComplementarios, experiencia, jefeInmediato, supervisaA, numeroPersonasCargo,
      tipoContrato, misionCargo, cursosCertificaciones, requiereVehiculo, tipoLicencia,
      idiomas, requiereViajar, areasRelacionadas, relacionamientoExterno,
      competenciasCulturales, competenciasCargo, responsabilidades
    } = req.body;
    const { documento, estructuraOrganizacional } = req.files || {};

    const requiredFields = {
      fecha, director, gerencia, descripcion, nombreCargo, areaGeneral, departamento, proceso,
      estructuraOrganizacional: estructuraOrganizacional ? estructuraOrganizacional[0] : null,
      escolaridad, area_formacion, experiencia, jefeInmediato, tipoContrato, misionCargo,
      competenciasCulturales, competenciasCargo, responsabilidades
    };

    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value) {
        return res.status(400).json({ error: `El campo ${key} es obligatorio` });
      }
    }

    try {
      if (!Array.isArray(JSON.parse(competenciasCulturales)) ||
          !Array.isArray(JSON.parse(competenciasCargo)) ||
          !Array.isArray(JSON.parse(responsabilidades))) {
        return res.status(400).json({ error: 'Los campos competenciasCulturales, competenciasCargo y responsabilidades deben ser arrays' });
      }
    } catch (e) {
      return res.status(400).json({ error: 'Formato inválido para competenciasCulturales, competenciasCargo o responsabilidades' });
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

    const updateFields = {
      [fieldMapping.fecha]: fecha,
      [fieldMapping.director]: director,
      [fieldMapping.gerencia]: gerencia,
      [fieldMapping.descripcion]: descripcion,
      [fieldMapping.area]: isConstruahorro === 'true' ? null : area,
      [fieldMapping.seguridad]: isConstruahorro === 'true' ? null : seguridad,
      [fieldMapping.nombreCargo]: nombreCargo,
      [fieldMapping.areaGeneral]: areaGeneral,
      [fieldMapping.departamento]: departamento,
      [fieldMapping.proceso]: proceso,
      [fieldMapping.estructuraOrganizacional]: estructuraOrganizacionalUrl,
      [fieldMapping.poblacionFocalizada]: poblacionFocalizada,
      [fieldMapping.escolaridad]: escolaridad,
      [fieldMapping.area_formacion]: area_formacion,
      [fieldMapping.estudiosComplementarios]: estudiosComplementarios,
      [fieldMapping.experiencia]: experiencia,
      [fieldMapping.jefeInmediato]: jefeInmediato,
      [fieldMapping.supervisaA]: supervisaA,
      [fieldMapping.numeroPersonasCargo]: numeroPersonasCargo ? parseInt(numeroPersonasCargo) : null,
      [fieldMapping.tipoContrato]: tipoContrato,
      [fieldMapping.misionCargo]: misionCargo,
      [fieldMapping.cursosCertificaciones]: cursosCertificaciones,
      [fieldMapping.requiereVehiculo]: requiereVehiculo,
      [fieldMapping.tipoLicencia]: tipoLicencia,
      [fieldMapping.idiomas]: idiomas,
      [fieldMapping.requiereViajar]: requiereViajar,
      [fieldMapping.areasRelacionadas]: areasRelacionadas,
      [fieldMapping.relacionamientoExterno]: relacionamientoExterno,
      [fieldMapping.competenciasCulturales]: competenciasCulturales,
      [fieldMapping.competenciasCargo]: competenciasCargo,
      [fieldMapping.responsabilidades]: responsabilidades,
      [fieldMapping.isConstruahorro]: isConstruahorro === 'true'
    };

    if (documentoUrl) updateFields[fieldMapping.documento] = documentoUrl;

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