export const generarHtmlCorreoDirector = (formData) => `
  <html>
    <body style="font-family: Arial, sans-serif;">
      <h2>Solicitud de Aprobación - Director de Área</h2>
      <p><strong>Fecha:</strong> ${formData.fecha}</p>
      <p><strong>Documento:</strong> <a href="${formData.documento}" target="_blank">Ver Documento</a></p>
      <p><strong>Gerencia:</strong> ${formData.gerencia}</p>
      <p>Por favor, revisa la solicitud y toma una decisión:</p>
      <p>
        <a href="${process.env.FRONTEND_URL}/dgdecision/${formData.workflow_id}/director" target="_blank">Aprobar</a>
         | 
        <a href="${process.env.FRONTEND_URL}/dgdecision/${formData.workflow_id}/director?decision=rechazado" target="_blank">Rechazar</a>
      </p>
    </body>
  </html>
`;

export const generarHtmlCorreoGerencia = (formData) => `
  <html>
    <body style="font-family: Arial, sans-serif;">
      <h2>Solicitud de Aprobación - Gerencia</h2>
      <p><strong>Fecha:</strong> ${formData.fecha}</p>
      <p><strong>Documento:</strong> <a href="${formData.documento}" target="_blank">Ver Documento</a></p>
      <p><strong>Director:</strong> ${formData.director}</p>
      <p>Por favor, revisa la solicitud y toma una decisión:</p>
      <p>
        <a href="${process.env.FRONTEND_URL}/dgdecision/${formData.workflow_id}/gerencia" target="_blank">Aprobar</a>
         | 
        <a href="${process.env.FRONTEND_URL}/dgdecision/${formData.workflow_id}/gerencia?decision=rechazado" target="_blank">Rechazar</a>
      </p>
    </body>
  </html>
`;
