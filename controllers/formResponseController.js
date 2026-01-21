import { sendEmail, generarHtmlCorreoDirector, generarHtmlCorreoGerencia, generarHtmlCorreoCalidad, generarHtmlCorreoSeguridad } from '../services/emailService.js';
import supabase from '../supabaseCliente.js';

const getAprobadorById = async (id) => {
    const { data, error } = await supabase.from('aprobadores').select('*').eq('id', id).single();
    if (error) {
        console.error("Error al obtener aprobador por ID:", error);
        return null;
    }
    return data;
};

const getFormRecord = async (workflow_id) => {
    const { data: formRecord, error } = await supabase
        .from("yuli")
        .select("*")
        .eq("workflow_id", workflow_id)
        .single();
    if (error) {
        console.error("Error al obtener el registro:", error);
        return { formRecord: null, error };
    }
    return { formRecord, error: null };
};

export const respuestaArea = async (req, res) => {
    try {
        const { workflow_id } = req.params;
        const { decision, observacion } = req.body;

        const { formRecord, error: fetchError } = await getFormRecord(workflow_id);
        if (fetchError) {
            return res.status(500).json({ error: "Error al obtener el registro" });
        }

        const aprobadorSeguridad = await getAprobadorById(formRecord.seguridad);
        const aprobadorArea = await getAprobadorById(formRecord.area);

        if (!aprobadorSeguridad || !aprobadorArea) {
             return res.status(400).json({ error: "Aprobadores no encontrados." });
        }
        
        if (formRecord.estado !== 'pendiente por area') {
            return res.status(400).json({ error: `Estado inválido. Se esperaba 'pendiente por area', pero se encontró '${formRecord.estado}'` });
        }

        let newEstado, newEtapasAprobadas = formRecord.etapas_aprobadas;
        const currentEtapa = 'area';

        if (decision === "rechazado") {
            newEstado = `rechazado por ${currentEtapa} (${aprobadorArea.nombre})`;
        } else {
            newEstado = "pendiente por seguridad";
            newEtapasAprobadas = [...newEtapasAprobadas, currentEtapa];
        }

        await supabase.from("yuli").update({
            estado: newEstado,
            observacion_area: observacion || "",
            etapas_aprobadas: newEtapasAprobadas
        }).eq("workflow_id", workflow_id);

        if (decision === "rechazado") {
            return res.json({ message: "Formulario rechazado por el área" });
        }

        const emailData = await generarHtmlCorreoSeguridad({
            ...formRecord,
            aprobador: aprobadorSeguridad,
            approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/seguridad`,
            rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/seguridad`,
        });

        await sendEmail(aprobadorSeguridad.correo, "Solicitud de Aprobación - Seguridad y Salud en el Trabajo", emailData.html, emailData.attachments);
        res.json({ message: "Decisión del área registrada y correo enviado a Seguridad" });
    } catch (err) {
        console.error("Error en respuestaArea:", err);
        res.status(500).json({ error: err.message || "Error interno del servidor" });
    }
};

export const respuestaDirector = async (req, res) => {
    try {
        const { workflow_id } = req.params;
        const { decision, observacion } = req.body;

        const { formRecord, error: fetchError } = await getFormRecord(workflow_id);
        if (fetchError) {
            return res.status(500).json({ error: "Error al obtener el registro" });
        }

        const aprobadorGerencia = await getAprobadorById(formRecord.gerencia);
        const aprobadorDirector = await getAprobadorById(formRecord.director);

        if (!aprobadorGerencia || !aprobadorDirector) {
            return res.status(400).json({ error: "Aprobadores no encontrados." });
        }
        
        const expectedEstado = "pendiente por director";
        if (formRecord.estado !== expectedEstado) {
            return res.status(400).json({ error: `Estado inválido. Se esperaba '${expectedEstado}', pero se encontró '${formRecord.estado}'` });
        }

        let newEstado, newEtapasAprobadas = formRecord.etapas_aprobadas;
        const currentEtapa = 'director';

        if (decision === "rechazado") {
            newEstado = `rechazado por ${currentEtapa} (${aprobadorDirector.nombre})`;
        } else {
            newEstado = "aprobado por director";
            newEtapasAprobadas = [...newEtapasAprobadas, currentEtapa];
        }

        await supabase.from("yuli").update({
            estado: newEstado,
            observacion_director: observacion || "",
            etapas_aprobadas: newEtapasAprobadas
        }).eq("workflow_id", workflow_id);

        if (decision === "rechazado") {
            return res.json({ message: "Formulario rechazado por el director" });
        }

        const emailData = await generarHtmlCorreoGerencia({
            ...formRecord,
            aprobador: aprobadorGerencia,
            approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/gerencia`,
            rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/gerencia`,
        });

        await sendEmail(aprobadorGerencia.correo, "Solicitud de Aprobación - Gerencia", emailData.html, emailData.attachments);
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
        const { formRecord, error: fetchError } = await getFormRecord(workflow_id);
        if (fetchError) return res.status(500).json({ error: "Error al obtener el registro" });

        const aprobadorCalidad = await getAprobadorById(formRecord.calidad);
        const aprobadorGerencia = await getAprobadorById(formRecord.gerencia);
        if (!aprobadorCalidad || !aprobadorGerencia) return res.status(400).json({ error: "Aprobadores no encontrados." });

        if (formRecord.estado !== "aprobado por director") {
            return res.status(400).json({ error: `El director aún no ha aprobado esta solicitud. Estado actual: '${formRecord.estado}'` });
        }

        let newEstado, newEtapasAprobadas = formRecord.etapas_aprobadas;
        const currentEtapa = 'gerencia';

        if (decision === "rechazado") {
            newEstado = `rechazado por ${currentEtapa} (${aprobadorGerencia.nombre})`;
        } else {
            newEstado = "aprobado por gerencia";
            newEtapasAprobadas = [...newEtapasAprobadas, currentEtapa];
        }

        await supabase.from("yuli").update({
            estado: newEstado,
            observacion_gerencia: observacion || "",
            etapas_aprobadas: newEtapasAprobadas
        }).eq("workflow_id", workflow_id);

        if (decision === "rechazado") {
            return res.json({ message: "Formulario rechazado por gerencia" });
        }
        const emailData = await generarHtmlCorreoCalidad({
            ...formRecord,
            aprobador: aprobadorCalidad,
            approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/calidad`,
            rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/calidad`,
        });
        await sendEmail(aprobadorCalidad.correo, "Solicitud de Aprobación - Calidad", emailData.html, emailData.attachments);
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
        const { formRecord, error: fetchError } = await getFormRecord(workflow_id);
        if (fetchError) return res.status(500).json({ error: "Error al obtener el registro" });

        const aprobadorCalidad = await getAprobadorById(formRecord.calidad);
        if (!aprobadorCalidad) return res.status(400).json({ error: "Aprobadores no encontrados." });
        
        if (formRecord.estado !== "aprobado por gerencia") {
            return res.status(400).json({ error: `Gerencia aún no ha aprobado esta solicitud. Estado actual: '${formRecord.estado}'` });
        }
        if (!['aprobado', 'rechazado'].includes(decision)) return res.status(400).json({ error: "Decisión no válida. Debe ser 'aprobado' o 'rechazado'" });

        let newEstado, newEtapasAprobadas = formRecord.etapas_aprobadas;
        const currentEtapa = 'calidad';

        if (decision === "rechazado") {
            newEstado = `rechazado por ${currentEtapa} (${aprobadorCalidad.nombre})`;
        } else {
            newEstado = "aprobado por todos";
            newEtapasAprobadas = [...newEtapasAprobadas, currentEtapa];
        }

        await supabase.from("yuli").update({
            estado: newEstado,
            observacion_calidad: observacion || "",
            etapas_aprobadas: newEtapasAprobadas
        }).eq("workflow_id", workflow_id);

        if (decision === "rechazado") {
            return res.json({ message: "Formulario rechazado por calidad" });
        }
        res.json({ message: "Formulario aprobado por todas las áreas" });
    } catch (err) {
        console.error("Error en respuestaCalidad:", err);
        res.status(500).json({ error: err.message || "Error interno del servidor" });
    }
};

export const respuestaSeguridad = async (req, res) => {
    try {
        const { workflow_id } = req.params;
        const { decision, observacion } = req.body;
        const { formRecord, error: fetchError } = await getFormRecord(workflow_id);
        if (fetchError) return res.status(500).json({ error: "Error al obtener el registro" });

        const aprobadorDirector = await getAprobadorById(formRecord.director);
        const aprobadorSeguridad = await getAprobadorById(formRecord.seguridad);
        if (!aprobadorDirector || !aprobadorSeguridad) return res.status(400).json({ error: "Aprobadores no encontrados." });
        
        if (formRecord.estado !== "pendiente por seguridad") {
            return res.status(400).json({ error: `Estado inválido. Se esperaba 'pendiente por seguridad', pero se encontró '${formRecord.estado}'` });
        }
        if (!['aprobado', 'rechazado'].includes(decision)) return res.status(400).json({ error: "Decisión no válida. Debe ser 'aprobado' o 'rechazado'" });

        let newEstado, newEtapasAprobadas = formRecord.etapas_aprobadas;
        const currentEtapa = 'seguridad';
        
        if (decision === "rechazado") {
            newEstado = `rechazado por ${currentEtapa} (${aprobadorSeguridad.nombre})`;
        } else {
            newEstado = "pendiente por director";
            newEtapasAprobadas = [...newEtapasAprobadas, currentEtapa];
        }

        await supabase.from("yuli").update({
            estado: newEstado,
            observacion_seguridad: observacion || "",
            etapas_aprobadas: newEtapasAprobadas
        }).eq("workflow_id", workflow_id);

        if (decision === "rechazado") {
            return res.json({ message: "Formulario rechazado por seguridad" });
        }
        
        const emailData = await generarHtmlCorreoDirector({
            ...formRecord,
            aprobador: aprobadorDirector,
            approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/director`,
            rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/director`,
        });

        await sendEmail(aprobadorDirector.correo, "Solicitud de Aprobación - Director", emailData.html, emailData.attachments);
        res.json({ message: "Decisión de seguridad registrada y correo enviado al director" });
    } catch (err) {
        console.error("Error en respuestaSeguridad:", err);
        res.status(500).json({ error: err.message || "Error interno del servidor" });
    }
};