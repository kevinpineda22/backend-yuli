import React, { useState, useMemo, useCallback, useEffect } from "react";
import "./HistorialComponent.css";
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Avatar,
  Stack,
  Tooltip,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import PersonIcon from "@mui/icons-material/Person";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PendingIcon from "@mui/icons-material/Pending";
import RefreshIcon from "@mui/icons-material/Refresh";

const correoANombre = {
  "sistemas@merkahorrosas.com": "Yonatan Valencia (Coordinador Sistemas)",
  "operacionescomerciales@merkahorrosas.com":
    "Andrés Gómez (Coordinador Punto de Ventas)",
  "compras@merkahorrosas.com":
    "Julián Hurtado (Coordinador Estratégico de Compras)",
  "logistica@merkahorrosas.com": "Dorancy (Coordinadora Logística)",
  "desarrollo@merkahorrosas.com":
    "Kevin Pineda (Analista Especializado en Desarrollo de Software)",
  "operaciones@merkahorrosas.com": "Ramiro Hincapié",
  "contabilidad1@merkahorrosas.com": "Ana Herrera",
  "gestionhumana@merkahorrosas.com": "Yuliana Garcia",
  "gerencia@merkahorrosas.com": "Diego Salazar",
  "gerencia1@merkahorrosas.com": "Stiven Salazar",
  "gerencia@megamayoristas.com": "Adrián Hoyos",
  "gerencia@construahorrosas.com": "William Salazar",
  "Comercialconstruahorro@merkahorrosas.com":
    "Jaiber (Director Comercial Construahorro)",
  "juanmerkahorro@gmail.com": "Juan (Director Comercial Construahorro)",
  "johanmerkahorro777@gmail.com": "Johan (Gerencia Construahorro)",
  "catherinem.asisge@gmail.com": "Catherine (Seguridad y Salud en el Trabajo)",
  "analista@merkahorrosas.com": "Anny Solarte (Calidad)",
};

// Mapeo de correos a áreas
const correoAAreas = {
  "sistemas@merkahorrosas.com": "Sistemas",
  "operacionescomerciales@merkahorrosas.com": "Operaciones Comerciales",
  "compras@merkahorrosas.com": "Compras",
  "logistica@merkahorrosas.com": "Logística",
  "desarrollo@merkahorrosas.com": "Desarrollo",
  "operaciones@merkahorrosas.com": "Operaciones",
  "contabilidad1@merkahorrosas.com": "Contabilidad",
  "gestionhumana@merkahorrosas.com": "Gestión Humana",
  "gestionhumanamerkahorro@gmail.com": "Gestión Humana",
  "gerencia@merkahorrosas.com": "Gerencia",
  "gerencia1@merkahorrosas.com": "Gerencia",
  "gerencia@megamayoristas.com": "Gerencia Megamayoristas",
  "gerencia@construahorrosas.com": "Gerencia Construahorro",
  "Comercialconstruahorro@merkahorrosas.com": "Comercial Construahorro",
  "juanmerkahorro@gmail.com": "Comercial Construahorro",
  "johanmerkahorro777@gmail.com": "Gerencia Construahorro",
  "catherinem.asisge@gmail.com": "Seguridad y Salud en el Trabajo",
  "analista@merkahorrosas.com": "Calidad",
};

const EstadoChip = ({ estado }) => {
  if (!estado) return null;
  const estadoLower = estado.toLowerCase();
  let variant = "default";
  if (estadoLower.includes("rechaz")) variant = "error";
  else if (estadoLower.includes("pendient")) variant = "warning";
  else if (estadoLower.includes("aprobado")) variant = "approved";
  const match = estado.match(/\(([^)]+)\)/);
  let pretty = estado;
  if (match) {
    const correo = match[1];
    const nombre = correoANombre[correo] || correo;
    pretty = estado.replace(correo, nombre);
  }
  const sxMap = {
    approved: {
      backgroundColor: "var(--corporate-blue)",
      color: "#fff",
      fontWeight: 700,
    },
    warning: {
      backgroundColor: "var(--warning-color)",
      color: "#111",
      fontWeight: 700,
    },
    error: {
      backgroundColor: "var(--error-color)",
      color: "#fff",
      fontWeight: 700,
    },
    default: { backgroundColor: "#efefef", color: "#333", fontWeight: 700 },
  };
  return (
    <Tooltip title={pretty}>
      <Chip
        label={pretty}
        size="small"
        sx={{
          borderRadius: 999,
          textTransform: "none",
          maxWidth: 360,
          ...sxMap[variant],
        }}
      />
    </Tooltip>
  );
};

const ProgressStepper = ({ item }) => {
  const estadoLower = (item.estado || "").toLowerCase();
  const etapasCompletadas = item.etapas_aprobadas || [];
  const isConstruahorro = item.isConstruahorro;
  // CAMBIO: Ahora Construahorro también tiene 5 etapas
  const steps = [
    { key: "area", label: "Área" },
    { key: "director", label: "Director" },
    { key: "gerencia", label: "Gerencia" },
    { key: "calidad", label: "Calidad" },
    { key: "seguridad", label: "Seguridad" },
  ];
  const isApprovedFinal = estadoLower.includes("aprobado por todos");
  return (
    <div className="stepper-root" aria-label="Progreso de la solicitud">
      {steps.map((s, i) => {
        const isCompleted =
          etapasCompletadas.includes(s.key) || isApprovedFinal;
        const isPending = estadoLower.includes(`pendiente por ${s.key}`);
        const isInactive = !isCompleted && !isPending;
        return (
          <div
            key={s.key}
            className={`step ${
              isCompleted ? "completed" : isPending ? "pending" : "inactive"
            }`}
            aria-current={isPending ? "step" : undefined}
          >
            <div className="step-icon" aria-hidden="false">
              {isCompleted ? (
                <CheckCircleIcon fontSize="small" />
              ) : (
                <HourglassEmptyIcon fontSize="small" />
              )}
            </div>
            <div className="step-label">{s.label}</div>
            {i < steps.length - 1 && (
              <div
                className={`connector ${
                  isCompleted || isPending ? "connected" : ""
                }`}
              />
            )}
          </div>
        );
      })}
      {isApprovedFinal && (
        <div className="step completed">
          <div className="step-icon" aria-hidden="false">
            <CheckCircleIcon fontSize="small" />
          </div>
          <div className="step-label">Aprobado</div>
        </div>
      )}
    </div>
  );
};

const ProgressSummaryWithTooltip = ({ item }) => {
  const estadoLower = (item.estado || "").toLowerCase();
  const etapasCompletadas = item.etapas_aprobadas || [];
  const isConstruahorro = item.isConstruahorro;
  // CAMBIO: Ahora todos tienen 5 etapas
  const approvalSteps = [
    "area",
    "director",
    "gerencia",
    "calidad",
    "seguridad",
  ];
  const completedStepsCount = etapasCompletadas.length;
  const totalSteps = approvalSteps.length;
  let summaryText;
  let summaryIcon;
  let summaryIconColor;
  if (estadoLower.includes("aprobado por todos")) {
    summaryText = `${totalSteps} de ${totalSteps} aprobados`;
    summaryIcon = <CheckCircleIcon fontSize="small" />;
    summaryIconColor = "#28a745";
  } else {
    summaryText = `${completedStepsCount} de ${totalSteps} aprobados`;
    summaryIcon = <HourglassEmptyIcon fontSize="small" />;
    summaryIconColor = "#ffc107";
  }
  return (
    <Tooltip title={<ProgressStepper item={item} />} arrow placement="top">
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ cursor: "pointer" }}
      >
        <div style={{ color: summaryIconColor }}>{summaryIcon}</div>
        <Typography variant="body2" sx={{ fontWeight: "bold" }}>
          {summaryText}
        </Typography>
      </Stack>
    </Tooltip>
  );
};

const ensureArray = (val) => {
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === "string" && val.trim() !== "") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed)
        ? parsed.filter(Boolean)
        : [parsed].filter(Boolean);
    } catch {
      return val
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
    }
  }
  return [];
};

const parseJsonSafe = (data) => {
  try {
    if (
      data === null ||
      data === undefined ||
      data === "" ||
      data === "No aplica"
    )
      return [];
    if (Array.isArray(data)) return data.filter(Boolean);
    if (typeof data === "object") return [data].filter(Boolean);
    return ensureArray(data);
  } catch {
    return ensureArray(data);
  }
};

const SolicitudRow = React.memo(({ item, onEdit, onView, mode = "all" }) => {
  const estadoDisplay = (() => {
    const estado = item.estado || "";
    const match = estado.match(/\(([^)]+)\)/);
    if (match) {
      const correo = match[1];
      const nombre = correoANombre[correo] || correo;
      return estado.replace(correo, nombre);
    }
    return estado;
  })();

  const renderRow = () => (
    <tr className="solicitud-row">
      <td className="td-date">{item.fecha}</td>
      <td className="td-name">
        <span className="td-name-text" title={item.nombreCargo}>
          {item.nombreCargo}
        </span>
      </td>
      <td className="td-area">{item.areaGeneral}</td>
      <td className="td-status">
        <EstadoChip estado={estadoDisplay} />
      </td>
      <td className="td-progress">
        <ProgressSummaryWithTooltip item={item} />
      </td>
      <td className="td-actions">
        <div className="acciones-container-desktop">
          <Tooltip title="Editar">
            <Button
              variant="contained"
              size="small"
              className="accion-edit"
              startIcon={<EditIcon />}
              onClick={() => onEdit(item)}
            >
              Editar
            </Button>
          </Tooltip>
          <Tooltip title="Ver">
            <Button
              variant="outlined"
              size="small"
              className="accion-view"
              startIcon={<VisibilityIcon />}
              onClick={() => onView(item)}
            >
              Ver
            </Button>
          </Tooltip>
        </div>
      </td>
    </tr>
  );

  const renderCard = () => (
    <div className="solicitud-card" aria-hidden>
      <div className="card-top">
        <div className="card-title">
          <Avatar
            sx={{ width: 40, height: 40, bgcolor: "var(--corporate-blue)" }}
          >
            <PersonIcon fontSize="small" />
          </Avatar>
          <div>
            <Typography
              variant="subtitle2"
              component="div"
              sx={{ fontWeight: 800 }}
            >
              {item.nombreCargo}
            </Typography>
            <Typography variant="caption" component="div" className="muted">
              {item.fecha} • {item.areaGeneral}
            </Typography>
          </div>
        </div>
        <div className="card-actions">
          <IconButton
            size="small"
            aria-label="ver"
            onClick={() => onView(item)}
          >
            <VisibilityIcon />
          </IconButton>
          <IconButton
            size="small"
            aria-label="editar"
            onClick={() => onEdit(item)}
          >
            <EditIcon />
          </IconButton>
        </div>
      </div>
      <div className="card-body">
        <div className="card-row">
          <div className="card-label">Estado</div>
          <div className="card-value">
            <EstadoChip estado={estadoDisplay} />
          </div>
        </div>
        <div className="card-row">
          <div className="card-label">Progreso</div>
          <div className="card-value">
            <ProgressStepper item={item} />
          </div>
        </div>
      </div>
    </div>
  );

  if (mode === "row") return renderRow();
  if (mode === "card") return renderCard();

  return (
    <>
      {renderRow()}
      {renderCard()}
    </>
  );
});

const CompetencyTable = ({ data }) => {
  const rows = ensureArray(data);
  if (rows.length === 0) {
    return (
      <Typography variant="body1" className="no-aplica">
        No aplica
      </Typography>
    );
  }
  return (
    <table className="competency-table">
      <thead>
        <tr>
          <th className="competency-table-cell">Competencia</th>
          <th className="competency-table-cell level-col">Alto (A)</th>
          <th className="competency-table-cell level-col">Bueno (B)</th>
          <th className="competency-table-cell level-col">
            Mín. Necesario (C)
          </th>
          <th className="competency-table-cell definition-col">Definición</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => {
          const nivelLower = (row.nivel || "").toLowerCase();
          return (
            <tr key={index}>
              <td className="competency-table-cell">{row.competencia || ""}</td>
              <td className="competency-table-cell level-col">
                {nivelLower.includes("alto") || nivelLower.includes("(a)")
                  ? "X"
                  : ""}
              </td>
              <td className="competency-table-cell level-col">
                {nivelLower.includes("bueno") || nivelLower.includes("(b)")
                  ? "X"
                  : ""}
              </td>
              <td className="competency-table-cell level-col">
                {nivelLower.includes("mínimo") || nivelLower.includes("(c)")
                  ? "X"
                  : ""}
              </td>
              <td className="competency-table-cell definition-col">
                {row.definicion || ""}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const ResponsabilidadesCards = ({ data, renderInfo }) => {
  const responsabilidades = ensureArray(data);
  if (responsabilidades.length === 0) {
    return renderInfo("Responsabilidades", []);
  }
  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: "bold" }}>
        Responsabilidades
      </Typography>
      <div className="responsibilities-container">
        {responsabilidades.map((item, index) => {
          // Extraer valor y función de manera segura
          let displayValue = "";
          let displayFuncion = "";

          if (typeof item === "object" && item !== null) {
            displayValue =
              item.value ||
              item.titulo ||
              item.title ||
              item.responsabilidad ||
              item.nombre ||
              "";
            displayFuncion =
              item.funcion ||
              item.detalle ||
              item.descripcion ||
              item.description ||
              "";
          } else {
            displayValue = String(item || "");
          }

          return (
            <Paper key={index} component="div" className="responsibility-card">
              <Typography variant="body2">
                <strong>{displayValue}</strong>
                {displayFuncion && (
                  <>
                    <br />
                    <span style={{ color: "#555" }}>
                      Función: {displayFuncion}
                    </span>
                  </>
                )}
              </Typography>
            </Paper>
          );
        })}
      </div>
    </Box>
  );
};

const HistorialComponent = ({
  historial,
  setHistorial,
  title,
  filters,
  expandedAreas,
  toggleArea,
  setEditingSolicitud,
  isConstruahorroForm,
  isMegamayoristasForm,
  setFormData,
  setConstruahorroFormData,
  setMegamayoristasFormData,
  formRef,
}) => {
  const [selectedSolicitud, setSelectedSolicitud] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [ws, setWs] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    // WebSocket connection disabled due to Vercel limitations
    /*
        const websocket = new WebSocket('wss://backend-yuli.vercel.app/ws');
        websocket.onopen = () => {
            console.log('WebSocket connected');
        };
        websocket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'solicitudUpdate') {
                    const { solicitudId, newStatus, updatedData } = message;
                    setHistorial((prevHistorial) =>
                        prevHistorial.map((item) =>
                            item.id === solicitudId
                                ? { ...item, estado: newStatus, ...updatedData }
                                : item
                        )
                    );
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        };
        websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        websocket.onclose = () => {
            console.log('WebSocket disconnected');
        };
        setWs(websocket);
        return () => {
            websocket.close();
        };
        */
  }, [setHistorial]);

  const openDialog = useCallback((solicitud) => {
    setSelectedSolicitud(solicitud);
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setSelectedSolicitud(null);
    setIsDialogOpen(false);
  }, []);

  const handleEditClick = useCallback(
    (item) => {
      const parseArray = (val) => {
        if (Array.isArray(val)) return val.filter(Boolean);
        if (typeof val === "string" && val.trim() !== "") {
          try {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed)
              ? parsed.filter(Boolean)
              : [parsed].filter(Boolean);
          } catch {
            return val
              .split(/\r?\n/)
              .map((l) => l.trim())
              .filter(Boolean);
          }
        }
        return [];
      };

      // Función específica para parsear arrays de strings simples
      const parseStringArray = (val) => {
        if (Array.isArray(val)) {
          return val
            .map((item) => {
              if (typeof item === "string") return item;
              if (typeof item === "object" && item !== null) {
                // Si es un objeto, extraer el valor string
                return (
                  item.value ||
                  item.texto ||
                  item.descripcion ||
                  JSON.stringify(item)
                );
              }
              return String(item);
            })
            .filter(Boolean);
        }
        if (typeof val === "string" && val.trim() !== "") {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) {
              return parsed
                .map((item) => {
                  if (typeof item === "string") return item;
                  if (typeof item === "object" && item !== null) {
                    return (
                      item.value ||
                      item.texto ||
                      item.descripcion ||
                      JSON.stringify(item)
                    );
                  }
                  return String(item);
                })
                .filter(Boolean);
            }
            return [String(parsed)].filter(Boolean);
          } catch {
            return val
              .split(/\r?\n/)
              .map((l) => l.trim())
              .filter(Boolean);
          }
        }
        return [];
      };

      const safeString = (val) =>
        val === null || val === undefined || val === ""
          ? ""
          : String(val).trim();
      const safeNumber = (val) => {
        if (val === null || val === undefined || val === "") return "";
        const num = parseInt(val);
        return isNaN(num) ? "" : num;
      };

      const cleanedItem = {
        id: item.id || "",
        workflow_id: item.workflow_id || item.id || "",
        nombreCargo: safeString(item.nombrecargo || item.nombreCargo),
        areaGeneral: safeString(item.areageneral || item.areaGeneral),
        jefeInmediato: safeString(item.jefeinmediato || item.jefeInmediato),
        misionCargo: safeString(item.misioncargo || item.misionCargo),
        estudiosComplementarios: safeString(
          item.estudioscomplementarios || item.estudiosComplementarios
        ),
        numeroPersonasCargo: safeString(
          item.numeropersonascargo || item.numeroPersonasCargo
        ),
        tipoContrato: safeString(item.tipocontrato || item.tipoContrato),
        requiereVehiculo: safeString(
          item.requierevehiculo || item.requiereVehiculo
        ),
        tipoLicencia: safeString(item.tipolicencia || item.tipoLicencia),
        requiereViajar: safeString(item.requiereviajar || item.requiereViajar),
        areasRelacionadas: safeString(
          item.areasrelacionadas || item.areasRelacionadas
        ),
        relacionamientoExterno: safeString(
          item.relacionamientoexterno || item.relacionamientoExterno
        ),
        area_formacion: safeString(item.area_formacion),
        competenciasDesarrolloIngreso: safeString(
          item.competencias_desarrollo_ingreso ||
            item.competenciasDesarrolloIngreso
        ),
        indicadoresGestion: safeString(
          item.indicadores_gestion || item.indicadoresGestion || ""
        ),
        requisitosFisicos: safeString(
          item.requisitos_fisicos || item.requisitosFisicos || ""
        ),
        riesgosObligacionesOrg: safeString(
          item.riesgos_obligaciones_sst_organizacionales ||
            item.riesgosObligacionesSstOrganizacionales ||
            ""
        ),
        riesgosObligacionesEsp: safeString(
          item.riesgos_obligaciones_sst_especificos ||
            item.riesgosObligacionesSstEspecificos ||
            ""
        ),
        poblacionFocalizada: parseArray(
          item.poblacionFocalizada || item.poblacionfocalizada
        ),
        competenciasCulturales: parseArray(
          item.competenciasCulturales || item.competencias_culturales
        ),
        competenciasCargo: parseArray(
          item.competenciasCargo || item.competencias_cargo
        ),
        responsabilidades: parseArray(item.responsabilidades).map((r) => {
          if (typeof r === "string") {
            const parts = r.split(" - ");
            return {
              value: parts[0].trim(),
              funcion: parts.slice(1).join(" - ").trim(),
            };
          }
          if (typeof r === "object") {
            return {
              value: safeString(
                r.value ||
                  r.titulo ||
                  r.title ||
                  r.responsabilidad ||
                  r.nombre ||
                  r
              ),
              funcion: safeString(
                r.funcion || r.detalle || r.descripcion || r.description || ""
              ),
            };
          }
          return { value: safeString(r), funcion: "" };
        }),
        // Usar la función específica para arrays de strings
        planEntrenamiento: parseStringArray(
          item.planEntrenamiento || item.plan_entrenamiento
        ),
        planCapacitacionContinua: parseStringArray(
          item.planCapacitacionContinua || item.plan_capacitacion_continua
        ),
        planCarrera: safeString(item.plan_carrera || item.planCarrera),
        departamento: safeString(item.departamento),
        proceso: safeString(item.proceso),
        escolaridad: safeString(item.escolaridad),
        experiencia: safeString(item.experiencia),
        supervisaA: safeString(item.supervisaA || item.supervisa_a),
        cursosCertificaciones: safeString(
          item.cursosCertificaciones || item.cursos_certificaciones
        ),
        idiomas: safeString(item.idiomas),
        estructuraOrganizacional:
          item.estructuraOrganizacional ||
          item.estructura_organizacional ||
          null,
        // IMPORTANTE: Mantener las banderas de empresa de la solicitud original
        isConstruahorro: Boolean(item.isConstruahorro),
        isMegamayoristas: Boolean(item.isMegamayoristas),
        // NUEVO: Incluir los IDs de los aprobadores
        area: safeNumber(item.area),
        director: safeNumber(item.director),
        gerencia: safeNumber(item.gerencia),
        calidad: safeNumber(item.calidad),
        seguridad: safeNumber(item.seguridad),
        observacion_area: safeString(item.observacion_area),
        observacion_director: safeString(item.observacion_director),
        observacion_gerencia: safeString(item.observacion_gerencia),
        observacion_calidad: safeString(item.observacion_calidad),
        observacion_seguridad: safeString(item.observacion_seguridad),
        etapas_aprobadas: Array.isArray(item.etapas_aprobadas)
          ? item.etapas_aprobadas
          : [],
        fecha: item.fecha || "",
      };

      setEditingSolicitud(cleanedItem);

      // Actualizar también el formulario correspondiente según la empresa
      if (cleanedItem.isMegamayoristas) {
        setMegamayoristasFormData(cleanedItem);
      } else if (cleanedItem.isConstruahorro) {
        setConstruahorroFormData(cleanedItem);
      } else {
        setFormData(cleanedItem);
      }

      if (formRef && formRef.current) {
        formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      closeDialog();
    },
    [
      setEditingSolicitud,
      setMegamayoristasFormData,
      setConstruahorroFormData,
      setFormData,
      formRef,
      closeDialog,
    ]
  );

  const matchesFilters = useCallback(
    (item) => {
      // Filtro por estado
      const matchesEstado = filters?.estado
        ? (item.estado || "")
            .toLowerCase()
            .includes(filters.estado.toLowerCase())
        : true;

      // Filtro por empresa
      const matchesEmpresa = filters?.empresa
        ? (filters.empresa === "Merkahorro" &&
            !item.isConstruahorro &&
            !item.isMegamayoristas) ||
          (filters.empresa === "Construahorro" && item.isConstruahorro) ||
          (filters.empresa === "Megamayoristas" && item.isMegamayoristas)
        : true;

      // Filtro por departamento
      const matchesDepartamento = filters?.departamento
        ? (item.departamento || "").toLowerCase() ===
          filters.departamento.toLowerCase()
        : true;

      // Filtro por área general
      const matchesAreaGeneral = filters?.areaGeneral
        ? (item.areaGeneral || "").toLowerCase() ===
          filters.areaGeneral.toLowerCase()
        : true;

      // Filtro por nombre del cargo
      const matchesNombreCargo = filters?.nombreCargo
        ? (item.nombreCargo || "").toLowerCase() ===
          filters.nombreCargo.toLowerCase()
        : true;

      return (
        matchesEstado &&
        matchesEmpresa &&
        matchesDepartamento &&
        matchesAreaGeneral &&
        matchesNombreCargo
      );
    },
    [filters]
  );

  const filtered = useMemo(
    () => (Array.isArray(historial) ? historial.filter(matchesFilters) : []),
    [historial, matchesFilters]
  );

  const getProceso = useCallback((item) => {
    // Usar departamento como agrupación principal, pero normalizarlo
    const departamento = item.departamento || "Departamento No Definido";
    return departamento.toUpperCase();
  }, []);

  const getAreaGeneral = useCallback((item) => {
    // Usar areaGeneral que contiene el nombre real del área, no el correo
    let area = item.areaGeneral || item.areageneral || "Área No Definida";

    // Si por alguna razón areaGeneral también contiene un correo, convertirlo
    if (area.includes("@")) {
      area = correoAAreas[area.toLowerCase()] || area;
    }

    return area;
  }, []);

  const renderTabla = (items) => {
    if (isMobile) {
        return (
            <div className="solicitud-cards-container">
            {items.map((item, idx) => (
                <SolicitudRow
                key={`card-${idx}`}
                item={item}
                onEdit={handleEditClick}
                onView={openDialog}
                mode="card"
                />
            ))}
            </div>
        );
    }

    return (
      <table
        className="solicitud-aprobacion-historial-table"
        role="table"
        aria-label="Historial de solicitudes"
      >
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Nombre del Cargo</th>
            <th>Área</th>
            <th>Estado</th>
            <th>Progreso</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <SolicitudRow
              key={`row-${idx}`}
              item={item}
              onEdit={handleEditClick}
              onView={openDialog}
              mode="row"
            />
          ))}
        </tbody>
      </table>
    );
  };

  const renderSubfolders = (departamento, items, isRechazado) => {
    const subfolders = [...new Set(items.map((item) => getAreaGeneral(item)))];
    return subfolders.map((subfolder, subIndex) => {
      const subItems = items.filter(
        (item) => getAreaGeneral(item) === subfolder
      );
      if (subItems.length === 0) return null;

      const key = `${departamento}-${subfolder}${
        isRechazado ? "-rechazado" : ""
      }`;
      const isOpen = !!expandedAreas?.[key];

      return (
        <div
          key={subIndex}
          className="solicitud-aprobacion-historial-subcarpeta"
        >
          <div
            className="carpeta-titulo"
            onClick={() => toggleArea(key)}
            role="button"
            tabIndex={0}
            aria-expanded={isOpen}
            style={{
              paddingLeft: "40px",
              backgroundColor: isOpen ? "#f0f8ff" : "#f9f9f9",
              borderLeft: "3px solid #2196f3",
              cursor: "pointer",
            }}
          >
            <div>📂 {subfolder}</div>
            <div className="carpeta-right">
              {isOpen ? "▲" : "▼"}
              <span className="subcount"> {subItems.length} </span>
            </div>
          </div>
          {isOpen && (
            <div style={{ paddingLeft: "20px", backgroundColor: "#fafafa" }}>
              {renderTabla(subItems)}
            </div>
          )}
        </div>
      );
    });
  };

  const renderInfo = (label, value) => {
    if (
      !value ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === "object" && Object.keys(value).length === 0)
    ) {
      return (
        <Box sx={{ border: "1px solid #eee", p: 2, mb: 2, borderRadius: 1 }}>
          <Typography variant="body1">
            <strong>{label}:</strong>{" "}
            <span className="no-aplica">No aplica</span>
          </Typography>
        </Box>
      );
    }
    if (
      Array.isArray(value) &&
      value.length > 0 &&
      typeof value[0] === "object" &&
      "competencia" in value[0]
    ) {
      return (
        <Box sx={{ border: "1px solid #eee", p: 2, mb: 2, borderRadius: 1 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            <strong>{label}</strong>
          </Typography>
          <ul className="list-competencias">
            {value.map((item, index) => (
              <li key={index}>{`${item.competencia || ""} (${
                item.nivel || ""
              }) - ${item.definicion || ""}`}</li>
            ))}
          </ul>
        </Box>
      );
    }
    if (Array.isArray(value) && value.length > 0) {
      return (
        <Box sx={{ border: "1px solid #eee", p: 2, mb: 2, borderRadius: 1 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            <strong>{label}</strong>
          </Typography>
          <ul>
            {value.map((item, index) => {
              // Manejar objetos con estructura {value, funcion} (responsabilidades)
              if (
                typeof item === "object" &&
                item !== null &&
                "value" in item
              ) {
                return (
                  <li key={index}>
                    <strong>{item.value || ""}</strong>
                    {item.funcion && (
                      <>
                        <br />
                        <span style={{ color: "#666", fontSize: "0.9em" }}>
                          Función: {item.funcion}
                        </span>
                      </>
                    )}
                  </li>
                );
              }
              // Manejar otros tipos de objetos
              else if (typeof item === "object" && item !== null) {
                return <li key={index}>{JSON.stringify(item)}</li>;
              }
              // Manejar strings normales
              else {
                return <li key={index}>{String(item)}</li>;
              }
            })}
          </ul>
        </Box>
      );
    }
    return (
      <Box sx={{ border: "1px solid #eee", p: 2, mb: 2, borderRadius: 1 }}>
        <Typography variant="body1">
          <strong>{label}:</strong> {String(value)}
        </Typography>
      </Box>
    );
  };

  const renderDetallePerfil = (solicitud) => {
    const competenciasCulturales = parseJsonSafe(
      solicitud.competenciasCulturales
    );
    const competenciasCargo = parseJsonSafe(solicitud.competenciasCargo);
    const responsabilidades = parseJsonSafe(solicitud.responsabilidades);
    const planEntrenamiento = parseJsonSafe(solicitud.planEntrenamiento);
    const planCapacitacionContinua = parseJsonSafe(
      solicitud.planCapacitacionContinua
    );
    const poblacionFocalizada = parseJsonSafe(solicitud.poblacionFocalizada);
    return (
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              INFORMACIÓN GENERAL
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                {renderInfo("Fecha", solicitud.fecha)}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                {renderInfo("Nombre del Cargo", solicitud.nombreCargo)}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                {renderInfo("Área", solicitud.areaGeneral)}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                {renderInfo("Departamento", solicitud.departamento)}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                {renderInfo("Proceso", solicitud.proceso)}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                {renderInfo("Población Focalizada", poblacionFocalizada)}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                {renderInfo("Escolaridad", solicitud.escolaridad)}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                {renderInfo("Área de Formación", solicitud.area_formacion)}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                {renderInfo(
                  "Estudios Complementarios",
                  solicitud.estudiosComplementarios
                )}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                {renderInfo("Experiencia Necesaria", solicitud.experiencia)}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                {renderInfo("Jefe Inmediato", solicitud.jefeInmediato)}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                {renderInfo("Supervisa a", solicitud.supervisaA)}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                {renderInfo(
                  "Nº Personas a Cargo",
                  solicitud.numeroPersonasCargo
                )}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                {renderInfo("Tipo de Contrato", solicitud.tipoContrato)}
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              DESCRIPCIÓN DEL CARGO
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                {renderInfo("Misión del Cargo", solicitud.misionCargo)}
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                {renderInfo(
                  "Cursos o Certificaciones",
                  solicitud.cursosCertificaciones
                )}
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                {renderInfo("Requiere Vehículo", solicitud.requiereVehiculo)}
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                {renderInfo("Tipo de Licencia", solicitud.tipoLicencia)}
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                {renderInfo("Idiomas", solicitud.idiomas)}
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                {renderInfo("Requiere Viajar", solicitud.requiereViajar)}
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                {renderInfo(
                  "Áreas de Relacionamiento (Internas)",
                  solicitud.areasRelacionadas
                )}
              </Grid>
              <Grid size={{ xs: 12 }}>
                {renderInfo(
                  "Relacionamiento Externo",
                  solicitud.relacionamientoExterno
                )}
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              COMPETENCIAS Y RESPONSABILIDADES
            </Typography>
            <Box mb={2}>
              <Typography
                variant="subtitle1"
                sx={{ mb: 1, fontWeight: "bold" }}
              >
                Competencias Culturales
              </Typography>
              <CompetencyTable data={competenciasCulturales} />
            </Box>
            <Box mb={2}>
              <Typography
                variant="subtitle1"
                sx={{ mb: 1, fontWeight: "bold" }}
              >
                Competencias del Cargo
              </Typography>
              <CompetencyTable data={competenciasCargo} />
            </Box>
            <Box mb={2}>
              <ResponsabilidadesCards
                data={responsabilidades}
                renderInfo={renderInfo}
              />
            </Box>
            <Box mb={2}>
              {renderInfo(
                "Indicadores de Gestión",
                solicitud.indicadores_gestion
              )}
            </Box>
            <Box mb={2}>
              {renderInfo("Requisitos Físicos", solicitud.requisitos_fisicos)}
            </Box>
            <Box mb={2}>
              {renderInfo(
                "Riesgos y Obligaciones SST Organizacionales",
                solicitud.riesgos_obligaciones_sst_organizacionales
              )}
            </Box>
            <Box mb={2}>
              {renderInfo(
                "Riesgos y Obligaciones SST Específicos",
                solicitud.riesgos_obligaciones_sst_especificos
              )}
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              COMPLEMENTARIO
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                {renderInfo(
                  "Plan de Entrenamiento (Inducción y Acompañamiento)",
                  planEntrenamiento
                )}
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                {renderInfo(
                  "Plan de Capacitación Continua",
                  planCapacitacionContinua
                )}
              </Grid>
            </Grid>
            {renderInfo("Plan de Carrera", solicitud.planCarrera)}
            {renderInfo(
              "Competencias para Desarrollar en el Ingreso",
              solicitud.competenciasDesarrolloIngreso
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              DOCUMENTOS
            </Typography>
            {solicitud.estructuraOrganizacional ? (
              <Box sx={{ border: "1px solid #eee", p: 2, borderRadius: 1 }}>
                <Typography variant="body1">
                  <strong>Estructura Organizacional:</strong>
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <img
                    src={solicitud.estructuraOrganizacional}
                    alt="Estructura Organizacional"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "300px",
                      borderRadius: "8px",
                    }}
                  />
                </Box>
                <Box sx={{ mt: 1 }}>
                  <a
                    href={solicitud.estructuraOrganizacional}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver Archivo
                  </a>
                </Box>
              </Box>
            ) : (
              <Box sx={{ border: "1px solid #eee", p: 2, borderRadius: 1 }}>
                <Typography variant="body1">
                  <strong>Estructura Organizacional:</strong>{" "}
                  <span className="no-aplica">No aplica</span>
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              APROBACIONES
            </Typography>
            {renderInfo("Estado", solicitud.estado)}
            {renderInfo(
              "Observación de Área",
              solicitud.observacion_area || "No hay observaciones"
            )}{" "}
            {/* CAMBIO: Ahora también para Construahorro */}
            {renderInfo(
              "Observación de Director",
              solicitud.observacion_director || "No hay observaciones"
            )}
            {renderInfo(
              "Observación de Gerencia",
              solicitud.observacion_gerencia || "No hay observaciones"
            )}
            {renderInfo(
              "Observación de Calidad",
              solicitud.observacion_calidad || "No hay observaciones"
            )}
            {renderInfo(
              "Observación de Seguridad",
              solicitud.observacion_seguridad || "No hay observaciones"
            )}
          </Paper>
        </Grid>
      </Grid>
    );
  };

  return (
    <div className="historial-section">
      <h2 className="historial-title">{title}</h2>
      {filtered.length === 0 ? (
        <p className="no-solicitudes">
          No hay solicitudes para mostrar según el filtro seleccionado.
        </p>
      ) : (
        <>
          {[...new Set(filtered.map((item) => getProceso(item)))].map(
            (departamento, index) => {
              const items = filtered.filter(
                (item) =>
                  getProceso(item) === departamento &&
                  !item.estado.toLowerCase().includes("rechazado")
              );
              if (items.length === 0) return null;

              const key = departamento;
              const isOpen = !!expandedAreas?.[key];
              const needsSubfolders = true; // Siempre mostrar subcarpetas

              return (
                <div
                  key={index}
                  className="solicitud-aprobacion-historial-carpeta"
                >
                  <div
                    className="carpeta-titulo"
                    onClick={() => toggleArea(key)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                  >
                    <div>📁 {departamento}</div>
                    <div className="carpeta-right">
                      {isOpen ? "▲" : "▼"}
                      <span className="subcount"> {items.length} </span>
                    </div>
                  </div>
                  {isOpen && (
                    <div>{renderSubfolders(departamento, items, false)}</div>
                  )}
                </div>
              );
            }
          )}

          <h2 className="historial-title small">📁 Solicitudes Rechazadas</h2>
          {[...new Set(filtered.map((item) => getProceso(item)))].map(
            (departamento, index) => {
              const key = `${departamento}-rechazado`;
              const items = filtered.filter(
                (item) =>
                  getProceso(item) === departamento &&
                  item.estado.toLowerCase().includes("rechazado")
              );
              if (items.length === 0) return null;

              const isOpen = !!expandedAreas?.[key];

              return (
                <div
                  key={index}
                  className="solicitud-aprobacion-historial-carpeta"
                >
                  <div
                    className="carpeta-titulo"
                    onClick={() => toggleArea(key)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                  >
                    <div>❌ {departamento}</div>
                    <div className="carpeta-right">
                      {isOpen ? "▲" : "▼"}
                      <span className="subcount"> {items.length} </span>
                    </div>
                  </div>
                  {isOpen && (
                    <div>{renderSubfolders(departamento, items, true)}</div>
                  )}
                </div>
              );
            }
          )}
        </>
      )}

      <Dialog
        open={isDialogOpen}
        onClose={closeDialog}
        fullWidth
        maxWidth="lg"
        aria-labelledby="detalle-dialog-title"
      >
        <DialogTitle
          sx={{
            borderBottom: 1,
            borderColor: "#eee",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span id="detalle-dialog-title">Detalles del Perfil de Cargo</span>
          <IconButton onClick={closeDialog}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ maxHeight: "75vh" }}>
          {selectedSolicitud ? (
            renderDetallePerfil(selectedSolicitud)
          ) : (
            <Typography>Cargando...</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", p: 3 }}>
          <Button
            variant="contained"
            sx={{
              bgcolor: "var(--corporate-blue)",
              "&:hover": { bgcolor: "#004a9e" },
            }}
            onClick={() => handleEditClick(selectedSolicitud)}
          >
            Editar Solicitud
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default React.memo(HistorialComponent);
