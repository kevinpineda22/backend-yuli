import { sendEmail, generarHtmlCorreoDirector, generarHtmlCorreoGerencia, generarHtmlCorreoSeguridad, generarHtmlCorreoCalidad } from '../services/emailService.js';
import supabase from '../supabaseCliente.js';

const fieldMapping = {
  isConstruahorro: 'isConstruahorro',
  area: 'area',
  director: 'director',
  gerencia: 'gerencia',
  calidad: 'calidad',
  seguridad: 'seguridad'
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

    if (formRecord[fieldMapping.isConstruahorro]) {
      return res.status(400).json({ error: "Esta solicitud es de Construahorro y no requiere aprobación de área" });
    }

    if (formRecord.estado !== "pendiente por area") {
      return res.status(400).json({ error: `Estado inválido. Se esperaba 'pendiente por area', pero se encontró '${formRecord.estado}'` });
    }

    if (decision === "rechazado") {
      await supabase
        .from("yuli")
        .update({
          estado: `rechazado por area (${formRecord[fieldMapping.area]})`,
          observacion_area: observacion || "",
        })
        .eq("workflow_id", workflow_id);

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

    await sendEmail(formRecord[fieldMapping.director], "Solicitud de Aprobación - Director", emailData.html, emailData.attachments);

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

    const expectedEstado = formRecord[fieldMapping.isConstruahorro] ? "pendiente por director" : "aprobado por area";
    if (formRecord.estado !== expectedEstado) {
      return res.status(400).json({ error: `Estado inválido. Se esperaba '${expectedEstado}', pero se encontró '${formRecord.estado}'` });
    }

    if (decision === "rechazado") {
      await supabase
        .from("yuli")
        .update({
          estado: `rechazado por director (${formRecord[fieldMapping.director]})`,
          observacion_director: observacion || "",
        })
        .eq("workflow_id", workflow_id);

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

    await sendEmail(formRecord[fieldMapping.gerencia], "Solicitud de Aprobación - Gerencia", emailData.html, emailData.attachments);

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

    if (formRecord.estado !== "aprobado por director") {
      return res.status(400).json({
        error: `El director aún no ha aprobado esta solicitud. Estado actual: '${formRecord.estado}'`,
      });
    }

    if (decision === "rechazado") {
      await supabase
        .from("yuli")
        .update({
          estado: `rechazado por gerencia (${formRecord[fieldMapping.gerencia]})`,
          observacion_gerencia: observacion || "",
        })
        .eq("workflow_id", workflow_id);

      return res.json({ message: "Formulario rechazado por gerencia" });
    }

    await supabase
      .from("yuli")
      .update({
        estado: "aprobado por gerencia",
        observacion_gerencia: observacion || "",
      })
      .eq("workflow_id", workflow_id);

    const emailData = await generarHtmlCorreoCalidad({
      ...formRecord,
      approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/calidad`,
      rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/calidad`,
    });

    await sendEmail(formRecord[fieldMapping.calidad], "Solicitud de Aprobación - Calidad", emailData.html, emailData.attachments);

    res.json({ message: "Decisión de gerencia registrada y correo enviado a Calidad" });
  } catch (err) {
    console.error("Error en respuestaGerencia:", err);
    res.status(500).json({ error: err.message || "Error interno del servidor" });
  }
};

export const respuestaCalidad = async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const { decision, observacion } = req.body;

    console.log("Iniciando respuestaCalidad para workflow_id:", workflow_id);
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

    // Log adicional para depurar
    console.log('Solicitud obtenida:', {
      id: formRecord.id,
      workflow_id: formRecord.workflow_id,
      estado: formRecord.estado,
      isConstruahorro: formRecord[fieldMapping.isConstruahorro],
      seguridad: formRecord[fieldMapping.seguridad],
      calidad: formRecord[fieldMapping.calidad],
    });

    if (formRecord.estado !== "aprobado por gerencia") {
      console.error("Estado inválido para calidad:", formRecord.estado);
      return res.status(400).json({
        error: `Gerencia aún no ha aprobado esta solicitud. Estado actual: '${formRecord.estado}'`,
      });
    }

    if (!['aprobado', 'rechazado'].includes(decision)) {
      console.error("Decisión no válida:", decision);
      return res.status(400).json({ error: "Decisión no válida. Debe ser 'aprobado' o 'rechazado'" });
    }

    if (decision === "rechazado") {
      await supabase
        .from("yuli")
        .update({
          estado: `rechazado por calidad (${formRecord[fieldMapping.calidad]})`,
          observacion_calidad: observacion || "",
        })
        .eq("workflow_id", workflow_id);

      // Enviar correo al creador notificando el rechazo
      const creatorEmail = formRecord[fieldMapping.isConstruahorro] ? formRecord[fieldMapping.director] : formRecord[fieldMapping.area];
      const creatorValidation = validateEmailRecipient(creatorEmail, formRecord[fieldMapping.isConstruahorro] ? 'director' : 'area');
      if (creatorValidation.valid) {
        const emailSubject = `Solicitud ${workflow_id} rechazada por Calidad`;
        const emailData = {
          html: `
            <h2>Solicitud de Perfil de Cargo #${workflow_id}</h2>
            <p>La solicitud para el cargo <strong>${formRecord.nombrecargo}</strong> ha sido rechazada por Calidad.</p>
            ${observacion ? `<p><strong>Observación:</strong> ${observacion}</p>` : ''}
            <p><a href="https://www.merkahorro.com/dgdecision/${workflow_id}/view">Ver solicitud</a></p>
          `,
          attachments: [],
        };
        console.log('Enviando correo de rechazo a:', creatorEmail, 'Asunto:', emailSubject);
        await sendEmail(creatorEmail, emailSubject, emailData.html, emailData.attachments);
      } else {
        console.warn('No se pudo enviar correo al creador debido a correo inválido:', creatorEmail);
      }

      return res.json({ message: "Formulario rechazado por calidad" });
    }

    // Validar el correo de Seguridad
    const seguridadValidation = validateEmailRecipient(formRecord[fieldMapping.seguridad], 'seguridad');
    if (!seguridadValidation.valid) {
      console.error("Correo de seguridad inválido o no definido:", formRecord[fieldMapping.seguridad]);
      return res.status(400).json({ error: seguridadValidation.error });
    }

    await supabase
      .from("yuli")
      .update({
        estado: "pendiente por seguridad",
        observacion_calidad: observacion || "",
      })
      .eq("workflow_id", workflow_id);

    const emailData = await generarHtmlCorreoSeguridad({
      ...formRecord,
      approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/seguridad`,
      rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/seguridad`,
    });

    console.log('Enviando correo a Seguridad:', formRecord[fieldMapping.seguridad], 'Asunto:', "Solicitud de Aprobación - Seguridad y Salud en el Trabajo");
    await sendEmail(formRecord[fieldMapping.seguridad], "Solicitud de Aprobación - Seguridad y Salud en el Trabajo", emailData.html, emailData.attachments);

    // Enviar actualización vía WebSocket (si está configurado)
    if (global.wss) {
      const wsMessage = {
        type: 'solicitudUpdate',
        solicitudId: workflow_id,
        newStatus: "pendiente por seguridad",
        updatedData: {
          observacion_calidad: observacion || null,
        },
      };
      global.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(wsMessage));
        }
      });
    }

    res.json({ message: "Decisión de calidad registrada y correo enviado a Seguridad y Salud en el Trabajo" });
  } catch (err) {
    console.error("Error en respuestaCalidad:", err);
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

    if (formRecord.estado !== "pendiente por seguridad") {
      console.error("Estado inválido para seguridad:", formRecord.estado);
      return res.status(400).json({
        error: `Estado inválido. Se esperaba 'pendiente por seguridad', pero se encontró '${formRecord.estado}'`,
      });
    }

    if (!['aprobado', 'rechazado'].includes(decision)) {
      console.error("Decisión no válida:", decision);
      return res.status(400).json({ error: "Decisión no válida. Debe ser 'aprobado' o 'rechazado'" });
    }

    const newEstado = decision === "aprobado" ? "aprobado por todos" : `rechazado por seguridad (${formRecord[fieldMapping.seguridad]})`;

    await supabase
      .from("yuli")
      .update({
        estado: newEstado,
        observacion_seguridad: observacion || "",
      })
      .eq("workflow_id", workflow_id);

    // Enviar correo al creador
    const creatorEmail = formRecord[fieldMapping.isConstruahorro] ? formRecord[fieldMapping.director] : formRecord[fieldMapping.area];
    const creatorValidation = validateEmailRecipient(creatorEmail, formRecord[fieldMapping.isConstruahorro] ? 'director' : 'area');
    if (creatorValidation.valid) {
      const finalStatus = decision === "aprobado" ? "aprobado por todos" : "rechazado por Seguridad";
      const emailSubject = `Solicitud ${workflow_id} ${finalStatus}`;
      const emailData = {
        html: `
          <h2>Solicitud de Perfil de Cargo #${workflow_id}</h2>
          <p>La solicitud para el cargo <strong>${formRecord.nombrecargo}</strong> ha sido ${finalStatus}.</p>
          ${observacion ? `<p><strong>Observación de Seguridad:</strong> ${observacion}</p>` : ''}
          <p><a href="https://www.merkahorro.com/dgdecision/${workflow_id}/view">Ver solicitud</a></p>
        `,
        attachments: [],
      };
      console.log('Enviando correo de resultado final a:', creatorEmail, 'Asunto:', emailSubject);
      await sendEmail(creatorEmail, emailSubject, emailData.html, emailData.attachments);
    } else {
      console.warn('No se pudo enviar correo al creador debido a correo inválido:', creatorEmail);
    }

    // Enviar actualización vía WebSocket
    if (global.wss) {
      const wsMessage = {
        type: 'solicitudUpdate',
        solicitudId: workflow_id,
        newStatus: newEstado,
        updatedData: {
          observacion_seguridad: observacion || null,
        },
      };
      global.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(wsMessage));
        }
      });
    }

    res.json({ message: `Formulario ${newEstado}` });
  } catch (err) {
    console.error("Error en respuestaSeguridad:", err);
    res.status(500).json({ error: err.message || "Error interno del servidor" });
  }
};