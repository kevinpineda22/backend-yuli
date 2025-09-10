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

// Mapeo de correos a nombres (debe coincidir con formCreationController.js)
const correoANombre = {
    "sistemas@merkahorrosas.com": "Yonatan Valencia (Coordinador Sistemas)",
    "gestionhumanamerkahorro@gmail.com": "Yuliana Garcia (Gestion Humana)",
    "compras@merkahorrosas.com": "Julian Hurtado (Coordinador Estrategico de Compras)",
    "logistica@merkahorrosas.com": "Dorancy (Coordinadora Logistica)",
    "desarrollo@merkahorrosas.com": "Kevin Pineda (Analista Especializado en Desarrollo de Software)",
    "operaciones@merkahorrosas.com": "Ramiro Hincapie",
    "contabilidad1@merkahorrosas.com": "Ana Herrera",
    "gestionhumana@merkahorrosas.com": "Yuliana Garcia",
    "gerencia@merkahorrosas.com": "Diego Salazar",
    "gerencia1@merkahorrosas.com": "Stiven Salazar",
    "gerencia@megamayoristas.com": "Adrian Hoyos",
    "gerencia@construahorrosas.com": "William Salazar",
    "Comercialconstruahorro@merkahorrosas.com": "Jaiber (Director Comercial Construahorro)",
    "juanmerkahorro@gmail.com": "Juan (Director Comercial Construahorro)",
    "johanmerkahorro777@gmail.com": "Johan (Gerencia Construahorro)",
    "catherinem.asisge@gmail.com": "Catherine (Seguridad y Salud en el Trabajo)",
    "analista@merkahorrosas.com": "Anny Solarte (Calidad)",
};

// Validar destinatario del correo
const validateEmailRecipient = (recipient, formType) => {
    if (!recipient || !correoANombre[recipient]) {
        console.error(`Destinatario no válido para ${formType}:`, recipient);
        return { valid: false, error: `El campo ${formType} debe ser un correo electrónico válido` };
    }
    return { valid: true };
};

// Obtiene los datos del registro y parsea las etapas
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

    // Asegura que etapas_aprobadas sea un array
    if (formRecord.etapas_aprobadas) {
        try {
            formRecord.etapas_aprobadas = Array.isArray(formRecord.etapas_aprobadas) ? formRecord.etapas_aprobadas : JSON.parse(formRecord.etapas_aprobadas);
        } catch {
            formRecord.etapas_aprobadas = [];
        }
    } else {
        formRecord.etapas_aprobadas = [];
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

        if (formRecord[fieldMapping.isConstruahorro]) {
            return res.status(400).json({ error: "Esta solicitud es de Construahorro y no requiere aprobación de área" });
        }
        if (formRecord.estado !== "pendiente por area") {
            return res.status(400).json({ error: `Estado inválido. Se esperaba 'pendiente por area', pero se encontró '${formRecord.estado}'` });
        }

        let newEstado, newEtapasAprobadas = formRecord.etapas_aprobadas;
        const currentEtapa = 'area';

        if (decision === "rechazado") {
            newEstado = `rechazado por ${currentEtapa} (${formRecord[fieldMapping.area]})`;
        } else {
            newEstado = "aprobado por area";
            newEtapasAprobadas = [...newEtapasAprobadas, currentEtapa];
        }

        await supabase
            .from("yuli")
            .update({
                estado: newEstado,
                observacion_area: observacion || "",
                etapas_aprobadas: newEtapasAprobadas
            })
            .eq("workflow_id", workflow_id);

        if (decision === "rechazado") {
            return res.json({ message: "Formulario rechazado por el área" });
        }

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

        const { formRecord, error: fetchError } = await getFormRecord(workflow_id);
        if (fetchError) {
            return res.status(500).json({ error: "Error al obtener el registro" });
        }

        const expectedEstado = formRecord[fieldMapping.isConstruahorro] ? "pendiente por director" : "aprobado por area";
        if (formRecord.estado !== expectedEstado) {
            return res.status(400).json({ error: `Estado inválido. Se esperaba '${expectedEstado}', pero se encontró '${formRecord.estado}'` });
        }

        let newEstado, newEtapasAprobadas = formRecord.etapas_aprobadas;
        const currentEtapa = 'director';

        if (decision === "rechazado") {
            newEstado = `rechazado por ${currentEtapa} (${formRecord[fieldMapping.director]})`;
        } else {
            newEstado = "aprobado por director";
            newEtapasAprobadas = [...newEtapasAprobadas, currentEtapa];
        }

        await supabase
            .from("yuli")
            .update({
                estado: newEstado,
                observacion_director: observacion || "",
                etapas_aprobadas: newEtapasAprobadas
            })
            .eq("workflow_id", workflow_id);

        if (decision === "rechazado") {
            return res.json({ message: "Formulario rechazado por el director" });
        }

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

        const { formRecord, error: fetchError } = await getFormRecord(workflow_id);
        if (fetchError) {
            return res.status(500).json({ error: "Error al obtener el registro" });
        }
        if (formRecord.estado !== "aprobado por director") {
            return res.status(400).json({ error: `El director aún no ha aprobado esta solicitud. Estado actual: '${formRecord.estado}'` });
        }

        let newEstado, newEtapasAprobadas = formRecord.etapas_aprobadas;
        const currentEtapa = 'gerencia';

        if (decision === "rechazado") {
            newEstado = `rechazado por ${currentEtapa} (${formRecord[fieldMapping.gerencia]})`;
        } else {
            newEstado = "aprobado por gerencia";
            newEtapasAprobadas = [...newEtapasAprobadas, currentEtapa];
        }

        await supabase
            .from("yuli")
            .update({
                estado: newEstado,
                observacion_gerencia: observacion || "",
                etapas_aprobadas: newEtapasAprobadas
            })
            .eq("workflow_id", workflow_id);

        if (decision === "rechazado") {
            return res.json({ message: "Formulario rechazado por gerencia" });
        }

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

        const { formRecord, error: fetchError } = await getFormRecord(workflow_id);
        if (fetchError) {
            return res.status(500).json({ error: "Error al obtener el registro" });
        }
        if (formRecord.estado !== "aprobado por gerencia") {
            return res.status(400).json({ error: `Gerencia aún no ha aprobado esta solicitud. Estado actual: '${formRecord.estado}'` });
        }
        if (!['aprobado', 'rechazado'].includes(decision)) {
            return res.status(400).json({ error: "Decisión no válida. Debe ser 'aprobado' o 'rechazado'" });
        }

        let newEstado, newEtapasAprobadas = formRecord.etapas_aprobadas;
        const currentEtapa = 'calidad';

        if (decision === "rechazado") {
            newEstado = `rechazado por ${currentEtapa} (${formRecord[fieldMapping.calidad]})`;
        } else {
            newEstado = "pendiente por seguridad";
            newEtapasAprobadas = [...newEtapasAprobadas, currentEtapa];
        }

        await supabase
            .from("yuli")
            .update({
                estado: newEstado,
                observacion_calidad: observacion || "",
                etapas_aprobadas: newEtapasAprobadas
            })
            .eq("workflow_id", workflow_id);

        if (decision === "rechazado") {
            // Lógica de correo de rechazo
            return res.json({ message: "Formulario rechazado por calidad" });
        }

        // Lógica de correo a Seguridad
        const seguridadValidation = validateEmailRecipient(formRecord[fieldMapping.seguridad], 'seguridad');
        if (!seguridadValidation.valid) {
            return res.status(400).json({ error: seguridadValidation.error });
        }

        const emailData = await generarHtmlCorreoSeguridad({
            ...formRecord,
            approvalLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/seguridad`,
            rejectionLink: `https://www.merkahorro.com/dgdecision/${workflow_id}/seguridad`,
        });

        await sendEmail(formRecord[fieldMapping.seguridad], "Solicitud de Aprobación - Seguridad y Salud en el Trabajo", emailData.html, emailData.attachments);
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

        const { formRecord, error: fetchError } = await getFormRecord(workflow_id);
        if (fetchError) {
            return res.status(500).json({ error: "Error al obtener el registro" });
        }
        if (formRecord.estado !== "pendiente por seguridad") {
            return res.status(400).json({ error: `Estado inválido. Se esperaba 'pendiente por seguridad', pero se encontró '${formRecord.estado}'` });
        }
        if (!['aprobado', 'rechazado'].includes(decision)) {
            return res.status(400).json({ error: "Decisión no válida. Debe ser 'aprobado' o 'rechazado'" });
        }

        let newEstado, newEtapasAprobadas = formRecord.etapas_aprobadas;
        const currentEtapa = 'seguridad';
        
        if (decision === "rechazado") {
            newEstado = `rechazado por ${currentEtapa} (${formRecord[fieldMapping.seguridad]})`;
        } else {
            newEstado = "aprobado por todos";
            newEtapasAprobadas = [...newEtapasAprobadas, currentEtapa];
        }

        await supabase
            .from("yuli")
            .update({
                estado: newEstado,
                observacion_seguridad: observacion || "",
                etapas_aprobadas: newEtapasAprobadas
            })
            .eq("workflow_id", workflow_id);

        // Lógica de correo de resultado final
        res.json({ message: `Formulario ${newEstado}` });
    } catch (err) {
        console.error("Error en respuestaSeguridad:", err);
        res.status(500).json({ error: err.message || "Error interno del servidor" });
    }
};