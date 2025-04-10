import multer from 'multer';
import supabase from '../config/supabaseCliente.js';
import { 
  sendEmail, 
  generarHtmlCorreoArea, 
  generarHtmlCorreoDirector, 
  generarHtmlCorreoGerencia 
} from '../services/emailService.js';

// Configuración de Multer para manejar la carga de archivos
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'), false);
    }
  }
});

// Función para validar campos requeridos
const validateRequiredFields = (body, requiredFields) => {
  const missingFields = requiredFields.filter(field => !body[field]);
  if (missingFields.length > 0) {
    throw new Error(`Faltan campos requeridos: ${missingFields.join(', ')}`);
  }
};

// Controlador para crear formulario
const crearFormulario = async (req, res) => {
  try {
    const requiredFields = ['fecha', 'director', 'gerencia', 'descripcion', 'area'];
    validateRequiredFields(req.body, requiredFields);

    if (!req.file) {
      throw new Error('No se recibió ningún archivo PDF');
    }

    // Subir archivo a Supabase Storage
    const fileName = `${Date.now()}_${req.file.originalname}`;
    const { error: uploadError } = await supabase.storage
      .from('pdfs-yuli')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) throw new Error(`Error al subir archivo: ${uploadError.message}`);

    // Obtener URL pública del archivo
    const { data: publicUrlData } = supabase.storage
      .from('pdfs-yuli')
      .getPublicUrl(fileName);

    // Insertar registro en la base de datos
    const { data, error: insertError } = await supabase
      .from('yuli')
      .insert({
        ...req.body,
        documento: publicUrlData.publicUrl,
        estado: 'pendiente por área',
        observacion: '',
        role: 'creador'
      })
      .select()
      .single();

    if (insertError) throw new Error(`Error al insertar registro: ${insertError.message}`);

    // Actualizar workflow_id
    const workflow_id = data.id;
    await supabase
      .from('yuli')
      .update({ workflow_id })
      .eq('id', workflow_id);

    // Enviar correo electrónico al área
    const approvalLink = `https://www.merkahorro.com/dgdecision/${workflow_id}/area`;
    const rejectionLink = `https://www.merkahorro.com/dgdecision/${workflow_id}/area?decision=rechazado`;

    const html = generarHtmlCorreoArea({ 
      ...req.body,
      documento: publicUrlData.publicUrl,
      workflow_id,
      approvalLink,
      rejectionLink
    });

    await sendEmail(req.body.area, "Nueva Solicitud para Validación de Área", html);

    res.status(201).json({
      success: true,
      message: "Solicitud enviada al área",
      workflow_id,
      documentoUrl: publicUrlData.publicUrl
    });

  } catch (error) {
    console.error('Error en crearFormulario:', error);
    res.status(error.message.includes('Faltan campos') ? 400 : 500).json({
      success: false,
      error: error.message
    });
  }
};

// Controlador para respuesta del área
const respuestaArea = async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const decision = req.query.decision || req.body.decision;
    const { observacion = '' } = req.body;

    if (!['aprobado', 'rechazado'].includes(decision)) {
      throw new Error('Decisión inválida. Debe ser "aprobado" o "rechazado"');
    }

    // Obtener el registro actual
    const { data: formRecord, error: fetchError } = await supabase
      .from('yuli')
      .select('*')
      .eq('workflow_id', workflow_id)
      .single();

    if (fetchError) throw new Error(`Error al obtener registro: ${fetchError.message}`);

    // Actualizar estado según la decisión
    if (decision === 'rechazado') {
      await supabase
        .from('yuli')
        .update({ estado: 'rechazado', observacion })
        .eq('workflow_id', workflow_id);
      
      return res.json({ 
        success: true,
        message: "Rechazado por área" 
      });
    }

    // Si es aprobado, actualizar estado y enviar al director
    await supabase
      .from('yuli')
      .update({ estado: 'aprobado por área', observacion })
      .eq('workflow_id', workflow_id);

    const approvalLink = `https://www.merkahorro.com/dgdecision/${workflow_id}/director`;
    const rejectionLink = `https://www.merkahorro.com/dgdecision/${workflow_id}/director?decision=rechazado`;
    
    const html = generarHtmlCorreoDirector({ 
      fecha: formRecord.fecha,
      documento: formRecord.documento,
      workflow_id,
      descripcion: formRecord.descripcion,
      gerencia: formRecord.gerencia,
      approvalLink,
      rejectionLink
    });

    await sendEmail(
      formRecord.director, 
      "Solicitud de Aprobación - Director", 
      html
    );

    res.json({ 
      success: true,
      message: "Aprobado por área. Enviado a director." 
    });

  } catch (error) {
    console.error('Error en respuestaArea:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Controlador para respuesta del director
const respuestaDirector = async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const decision = req.query.decision || req.body.decision;
    const { observacion = '' } = req.body;

    if (!['aprobado', 'rechazado'].includes(decision)) {
      throw new Error('Decisión inválida. Debe ser "aprobado" o "rechazado"');
    }

    // Obtener el registro actual
    const { data: formRecord, error: fetchError } = await supabase
      .from('yuli')
      .select('*')
      .eq('workflow_id', workflow_id)
      .single();

    if (fetchError) throw new Error(`Error al obtener registro: ${fetchError.message}`);

    // Validar que el área haya aprobado primero
    if (formRecord.estado !== 'aprobado por área') {
      throw new Error('No autorizado. El área no ha aprobado aún.');
    }

    // Actualizar estado según la decisión
    if (decision === 'rechazado') {
      await supabase
        .from('yuli')
        .update({ estado: 'rechazado', observacion })
        .eq('workflow_id', workflow_id);
      
      return res.json({ 
        success: true,
        message: "Rechazado por director" 
      });
    }

    // Si es aprobado, actualizar estado y enviar a gerencia
    await supabase
      .from('yuli')
      .update({ estado: 'aprobado por director', observacion })
      .eq('workflow_id', workflow_id);

    const approvalLink = `https://www.merkahorro.com/dgdecision/${workflow_id}/gerencia`;
    const rejectionLink = `https://www.merkahorro.com/dgdecision/${workflow_id}/gerencia?decision=rechazado`;
    
    const html = generarHtmlCorreoGerencia({ 
      fecha: formRecord.fecha,
      documento: formRecord.documento,
      workflow_id,
      descripcion: formRecord.descripcion,
      director: formRecord.director,
      approvalLink,
      rejectionLink
    });

    await sendEmail(
      formRecord.gerencia, 
      "Solicitud de Aprobación - Gerencia", 
      html
    );

    res.json({ 
      success: true,
      message: "Aprobado por director. Enviado a gerencia." 
    });

  } catch (error) {
    console.error('Error en respuestaDirector:', error);
    res.status(error.message.includes('No autorizado') ? 403 : 500).json({
      success: false,
      error: error.message
    });
  }
};

// Controlador para respuesta de gerencia
const respuestaGerencia = async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const { decision, observacion = '' } = req.body;

    if (!['aprobado', 'rechazado'].includes(decision)) {
      throw new Error('Decisión inválida. Debe ser "aprobado" o "rechazado"');
    }

    // Obtener el registro actual
    const { data: formRecord, error: fetchError } = await supabase
      .from('yuli')
      .select('*')
      .eq('workflow_id', workflow_id)
      .single();

    if (fetchError) throw new Error(`Error al obtener registro: ${fetchError.message}`);

    // Actualizar estado según la decisión
    const newEstado = decision === 'aprobado' ? 'aprobado por ambos' : 'rechazado';
    await supabase
      .from('yuli')
      .update({ estado: newEstado, observacion })
      .eq('workflow_id', workflow_id);

    res.json({ 
      success: true,
      message: `Formulario ${newEstado}` 
    });

  } catch (error) {
    console.error('Error en respuestaGerencia:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Controlador para obtener historial de un workflow
const obtenerHistorial = async (req, res) => {
  try {
    const { workflow_id } = req.params;

    const { data, error } = await supabase
      .from('yuli')
      .select('*')
      .eq('workflow_id', workflow_id)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Error al obtener historial: ${error.message}`);

    res.json({ 
      success: true,
      historial: data 
    });

  } catch (error) {
    console.error('Error en obtenerHistorial:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Controlador para obtener todas las solicitudes
const obtenerTodasLasSolicitudes = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('yuli')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Error al obtener solicitudes: ${error.message}`);

    res.json({ 
      success: true,
      historial: data 
    });

  } catch (error) {
    console.error('Error en obtenerTodasLasSolicitudes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Controlador para actualizar observación
const actualizarObservacion = async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const { observacion } = req.body;

    if (!observacion) {
      throw new Error('La observación es requerida');
    }

    const { error } = await supabase
      .from('yuli')
      .update({ observacion })
      .eq('workflow_id', workflow_id);

    if (error) throw new Error(`Error al actualizar observación: ${error.message}`);

    res.json({ 
      success: true,
      message: "Observación actualizada correctamente" 
    });

  } catch (error) {
    console.error('Error en actualizarObservacion:', error);
    res.status(error.message.includes('requerida') ? 400 : 500).json({
      success: false,
      error: error.message
    });
  }
};

export {
  crearFormulario,
  respuestaArea,
  respuestaDirector,
  respuestaGerencia,
  obtenerHistorial,
  obtenerTodasLasSolicitudes,
  actualizarObservacion,
  upload
};