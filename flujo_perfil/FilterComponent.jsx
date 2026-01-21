import React, { useMemo } from "react";
import './FilterComponent.css';

const FilterComponent = ({ filters, setFilters, solicitudes }) => {
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    // Obtener áreas únicas de las solicitudes existentes
    const areasUnicas = useMemo(() => {
        if (!solicitudes || !Array.isArray(solicitudes)) return [];
        const areas = solicitudes
            .map(solicitud => solicitud.areaGeneral)
            .filter(area => area && area.trim() !== '')
            .map(area => area.trim());
        return [...new Set(areas)].sort();
    }, [solicitudes]);

    const nombresCargosUnicos = useMemo(() => {
        if (!solicitudes || !Array.isArray(solicitudes)) return [];
        const cargos = solicitudes
            .map(solicitud => solicitud.nombreCargo)
            .filter(cargo => cargo && cargo.trim() !== '')
            .map(cargo => cargo.trim());
        return [...new Set(cargos)].sort();
    }, [solicitudes]);

    return (
        <div className="filter-container">
            <div className="filter-group">
                <label className="filter-label">Filtrar por Estado:</label>
                <select name="estado" value={filters.estado || ''} onChange={handleFilterChange} className="filter-select">
                    <option value="">Todos</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="rechazado">Rechazado</option>
                </select>
            </div>

            <div className="filter-group">
                <label className="filter-label">Filtrar por Empresa:</label>
                <select name="empresa" value={filters.empresa || ''} onChange={handleFilterChange} className="filter-select">
                    <option value="">Todas</option>
                    <option value="Merkahorro">Merkahorro</option>
                    <option value="Construahorro">Construahorro</option>
                    <option value="Megamayoristas">Megamayoristas</option>
                </select>
            </div>

            <div className="filter-group">
                <label className="filter-label">Filtrar por Departamento:</label>
                <select name="departamento" value={filters.departamento || ''} onChange={handleFilterChange} className="filter-select">
                    <option value="">Todos</option>
                    <option value="DIRECCIÓN OPERACIONES">DIRECCIÓN OPERACIONES</option>
                    <option value="DIRECCIÓN ADMINISTRATIVA Y FINANCIERA">DIRECCIÓN ADMINISTRATIVA Y FINANCIERA</option>
                    <option value="DIRECCIÓN GESTIÓN HUMANA">DIRECCIÓN GESTIÓN HUMANA</option>
                    <option value="DIRECCIÓN COMERCIAL">DIRECCIÓN COMERCIAL</option>
                </select>
            </div>

            <div className="filter-group">
                <label className="filter-label">Filtrar por Área:</label>
                <select name="areaGeneral" value={filters.areaGeneral || ''} onChange={handleFilterChange} className="filter-select">
                    <option value="">Todas las áreas ({areasUnicas.length} disponibles)</option>
                    {areasUnicas.map(area => (
                        <option key={area} value={area}>{area}</option>
                    ))}
                </select>
            </div>

            <div className="filter-group">
                <label className="filter-label">Filtrar por Nombre del Cargo:</label>
                <select name="nombreCargo" value={filters.nombreCargo || ''} onChange={handleFilterChange} className="filter-select">
                    <option value="">Todos los cargos ({nombresCargosUnicos.length} disponibles)</option>
                    {nombresCargosUnicos.map(cargo => (
                        <option key={cargo} value={cargo}>{cargo}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default React.memo(FilterComponent);