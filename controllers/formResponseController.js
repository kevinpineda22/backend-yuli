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

    if (formRecord.estado !== "aprobado por gerencia") {
      return res.status(400).json({
        error: `Gerencia aún no ha aprobado esta solicitud. Estado actual: '${formRecord.estado}'`,
      });
    }

    if (decision === "rechazado") {
      await supabase
        .from("yuli")
        .update({
          estado: `rechazado por calidad (${formRecord[fieldMapping.calidad]})`,
          observacion_calidad: observacion || "",
        })
        .eq("workflow_id", workflow_id);

      return res.json({ message: "Formulario rechazado por calidad" });
    }

    await supabase
      .from("yuli")
      .update({
        estado: formRecord[fieldMapping.isConstruahorro] ? "aprobado por todos" : "pendiente por seguridad",
        observacion_calidad: observacion || "",
      })
      .eq("workflow_id", workflow_id);

    if (!formRecord[fieldMapping.isConstruahorro]) {
      if (!formRecord[fieldMapping.seguridad] || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formRecord[fieldMapping.seguridad])) {
        console.error("Correo de seguridad inválido o no definido:", formRecord[fieldMapping.seguridad]);
        return res.status(400).json({ error: "El correo de Seguridad y Salud en el Trabajo no está definido o es inválido" });
      }

      const emailData = await generarHtmlCorreoSeguridad({
        ...formRecord,
        approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/seguridad`,
        rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/seguridad`,
      });

      await sendEmail(formRecord[fieldMapping.seguridad], "Solicitud de Aprobación - Seguridad y Salud en el Trabajo", emailData.html, emailData.attachments);
    }

    res.json({
      message: formRecord[fieldMapping.isConstruahorro]
        ? "Formulario aprobado por todos"
        : "Decisión de calidad registrada y correo enviado a Seguridad y Salud en el Trabajo",
    });
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

    if (formRecord[fieldMapping.isConstruahorro]) {
      return res.status(400).json({
        error: "Esta solicitud es de Construahorro y no requiere aprobación de Seguridad y Salud en el Trabajo",
      });
    }

    if (formRecord.estado !== "pendiente por seguridad") {
      return res.status(400).json({
        error: `Estado inválido. Se esperaba 'pendiente por seguridad', pero se encontró '${formRecord.estado}'`,
      });
    }

    const newEstado = decision === "aprobado" ? "aprobado por todos" : `rechazado por seguridad (${formRecord[fieldMapping.seguridad]})`;

    await supabase
      .from("yuli")
      .update({
        estado: newEstado,
        observacion_seguridad: observacion || "",
      })
      .eq("workflow_id", workflow_id);

    res.json({ message: `Formulario ${newEstado}` });
  } catch (err) {
    console.error("Error en respuestaSeguridad:", err);
    res.status(500).json({ error: err.message || "Error interno del servidor" });
  }
};
