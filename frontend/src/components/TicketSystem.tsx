"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Download,
  MoreVertical,
  UsersRound,
  Clock,
  CheckCircle,
  FileText,
  Tag,
  Activity,
  Trash2,
  X,
} from "lucide-react";
import { logTicketActivity } from "@/app/dashboard/security/actions";
import { UserRole } from "@/context/AuthContext";
import { createTicket, updateTicket, deleteTicket as deleteTicketApi } from "@/lib/api";

// --- Tipos & Interfaces ---
type TicketStatus = "ABIERTO" | "EN-PROCESO" | "RESUELTO";
type TicketPriority = "ALTA" | "MEDIA" | "BAJA";
type TicketArea = string;

export interface Ticket {
  id: number;
  title: string;
  description: string;
  area: TicketArea;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  resolvedAt?: string;
  owner: string;
  observations?: string;
}

const TECH_DEPT =
  "Gerencia Nacional de Tecnologias de la informacion y la comunicacion";

export default function TicketSystem({
  darkMode,
  orgStructure = [],
  currentUser = "Admin. General",
  userRole = "Usuario",
  userDept = "",
  tickets = [],
  setTickets,
  hasPermission,
  currentUserId,
  refreshTickets,
}: {
  darkMode: boolean;
  orgStructure?: any[];
  currentUser?: string;
  userRole?: UserRole;
  userDept?: string;
  tickets?: Ticket[];
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
  hasPermission: (permission: string) => boolean;
  currentUserId?: string;
  refreshTickets?: () => void;
}) {
  const PERMISSIONS_MASTER = {
    TICKETS_CREATE: "TICKETS_CREATE",
    TICKETS_EDIT: "TICKETS_EDIT",
    TICKETS_DELETE: "TICKETS_DELETE",
    TICKETS_VIEW_ALL: "TICKETS_VIEW_ALL",
    TICKETS_VIEW_DEPT: "TICKETS_VIEW_DEPT",
    TICKETS_MOVE_KANBAN: "TICKETS_MOVE_KANBAN",
    TICKETS_RESOLVE: "TICKETS_RESOLVE",
    VIEW_SECURITY: "VIEW_SECURITY",
  };
  const [filterArea, setFilterArea] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newArea, setNewArea] = useState(userDept || TECH_DEPT);
  const [newPriority, setNewPriority] = useState<TicketPriority>("MEDIA");
  const [newObservations, setNewObservations] = useState("");

  const [activeMenu, setActiveMenu] = useState<number | null>(null);

  const logAction = async (
    action: string,
    ticketTitle: string,
    status: "success" | "warning" | "danger" | "info" = "success",
  ) => {
    try {
      await logTicketActivity({
        usuario: currentUser,
        accion: action,
        ticket: ticketTitle,
        estado: status,
        fecha: new Date().toLocaleString(),
      });
    } catch (e) {
      console.error("Error logging action", e);
    }
  };

  const startEdit = (e: React.MouseEvent, ticket: Ticket) => {
    e.stopPropagation();
    setEditingTicket(ticket);
    setNewTitle(ticket.title);
    setNewDesc(ticket.description);
    setNewArea(ticket.area);
    setNewPriority(ticket.priority);
    setNewObservations(ticket.observations || "");
    setShowModal(true);
    setActiveMenu(null);
  };

  const deleteTicket = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm("¿Estás seguro de eliminar este ticket permanentemente?")) {
      const ticket = tickets.find((t) => t.id === id);
      try {
        await deleteTicketApi(id);
        if (ticket) {
          logAction("ELIMINACIÓN", ticket.title, "danger");
        }
        if (refreshTickets) {
          refreshTickets();
        } else {
          setTickets((prev) => prev.filter((t) => t.id !== id));
        }
        setActiveMenu(null);
      } catch (e: any) {
        console.error("Error deleting ticket", e);
        const errorMsg = e.response?.data?.detail || e.message || "Error desconocido";
        alert(`Error al eliminar el ticket: ${errorMsg}`);
      }
    }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.owner.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesArea = filterArea === "all" || t.area === filterArea;
      const matchesPriority =
        filterPriority === "all" || t.priority === filterPriority;

      const canViewAll = hasPermission(PERMISSIONS_MASTER.TICKETS_VIEW_ALL);
      const canViewDept = hasPermission(PERMISSIONS_MASTER.TICKETS_VIEW_DEPT);

      if (!canViewAll) {
        if (canViewDept) {
          if (t.area !== userDept) return false;
        } else {
          if (t.owner !== currentUser) return false;
        }
      }

      return matchesSearch && matchesArea && matchesPriority;
    });
  }, [
    tickets,
    searchTerm,
    filterArea,
    filterPriority,
    userDept,
    currentUser,
    hasPermission,
  ]);

  const updateStatus = async (id: number, status: TicketStatus) => {
    const ticket = tickets.find((t) => t.id === id);
    if (ticket && ticket.status !== status) {
      try {
        await updateTicket(id, { status: status.toLowerCase() });
        if (refreshTickets) {
          refreshTickets();
        } else {
          setTickets((prev) =>
            prev.map((t) => (t.id === id ? { ...t, status } : t)),
          );
        }
        logAction(`CAMBIO DE ESTADO (A ${status})`, ticket.title, "info");
      } catch (e) {
        console.error("Error updating ticket status", e);
        alert("Error al actualizar el estado del ticket.");
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, id: number) => {
    if (!hasPermission(PERMISSIONS_MASTER.TICKETS_MOVE_KANBAN)) return;
    e.dataTransfer.setData("ticketId", id.toString());
  };

  const handleDrop = (e: React.DragEvent, status: TicketStatus) => {
    if (!hasPermission(PERMISSIONS_MASTER.TICKETS_MOVE_KANBAN)) return;
    e.preventDefault();
    const id = parseInt(e.dataTransfer.getData("ticketId"));
    updateStatus(id, status);
  };

  const handleSaveTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingTicket) {
        await updateTicket(editingTicket.id, {
          title: newTitle,
          description: newDesc,
          status: editingTicket.status.toLowerCase(),
          priority: newPriority.toLowerCase(),
          observations: newObservations,
        });
        logAction("EDICIÓN", newTitle, "info");
      } else {
        const activeTickets = tickets.filter(
          (t) =>
            t.owner === currentUser &&
            (t.status === "ABIERTO" || t.status === "EN-PROCESO"),
        ).length;

        if (userRole === "Usuario" && activeTickets >= 3) {
          alert(
            "Has alcanzado el límite máximo de 3 tickets activos. Por favor, espera a que tus tickets actuales sean procesados.",
          );
          return;
        }

        if (!currentUserId) {
          alert("Error: No se pudo identificar al usuario actual.");
          return;
        }

        await createTicket({
          title: newTitle,
          description: newDesc,
          area: userRole === "Usuario" ? userDept || TECH_DEPT : newArea,
          priority: userRole === "Usuario" ? "MEDIA" : newPriority,
          solicitante_id: currentUserId,
        });
        logAction("CREACIÓN", newTitle, "success");
      }

      if (refreshTickets) refreshTickets();
      closeModal();
    } catch (e: any) {
      console.error("Error saving ticket", e);
      const errorMsg =
        e.response?.data?.detail || e.message || "Error desconocido";
      alert(`Error al guardar el ticket: ${errorMsg}`);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTicket(null);
    setNewTitle("");
    setNewDesc("");
    setNewObservations("");
  };

  const openCreateModal = () => {
    setEditingTicket(null);
    setShowModal(true);
  };

  const exportJSON = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(tickets, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "tickets_export.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const getPriorityStyles = (p: TicketPriority) => {
    switch (p) {
      case "ALTA":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "BAJA":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      default:
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
  };

  const StatusColumn = ({
    status,
    icon: Icon,
    title,
    color,
  }: {
    status: TicketStatus;
    icon: any;
    title: string;
    color: string;
  }) => {
    const statusTickets = filteredTickets.filter((t) => t.status === status);

    return (
      <div
        className={`min-w-[320px] w-full rounded-2xl border ${darkMode ? "bg-zinc-900/40 border-zinc-800/50" : "bg-slate-50 border-slate-200"} flex flex-col self-start`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e, status)}
      >
        <div className="p-4 flex items-center justify-between border-b border-inherit">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${darkMode ? "bg-zinc-800/80" : "bg-white shadow-sm border border-slate-200"} ${color}`}
            >
              <Icon size={18} />
            </div>
            <div>
              <h3
                className={`font-bold text-sm ${darkMode ? "text-zinc-200" : "text-slate-800"}`}
              >
                {title}
              </h3>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                {statusTickets.length} tickets
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 pb-6 space-y-4">
          {statusTickets.map((ticket) => (
            <div
              key={ticket.id}
              draggable={hasPermission(PERMISSIONS_MASTER.TICKETS_MOVE_KANBAN)}
              onDragStart={(e) => handleDragStart(e, ticket.id)}
              className={`group p-4 rounded-xl border transition-all cursor-grab active:cursor-grabbing relative ${
                darkMode
                  ? "bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:shadow-xl hover:shadow-black/40"
                  : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-lg shadow-sm"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-tight ${getPriorityStyles(ticket.priority)}`}
                >
                  {ticket.priority}
                </span>
                

<div className="relative">
  {activeMenu === ticket.id && (
    <div
      className="fixed inset-0 z-40"
      onClick={() => setActiveMenu(null)}
    />
  )}
  <button
    onClick={() => setActiveMenu(activeMenu === ticket.id ? null : ticket.id)}
    className={`p-1.5 rounded-lg transition-all ${
      darkMode
        ? "hover:bg-zinc-700 text-zinc-400"
        : "hover:bg-slate-200 text-slate-500"
    }`}
  >
    <MoreVertical size={16} />
  </button>
  {activeMenu === ticket.id && (
    <div
      className={`absolute right-0 top-full mt-1 w-44 rounded-lg border shadow-xl z-50 overflow-hidden ${
        darkMode
          ? "bg-zinc-900 border-zinc-700 shadow-black"
          : "bg-white border-slate-200 shadow-lg"
      }`}
    >
      <button
        onClick={() => { setActiveMenu(null); startEdit({ stopPropagation: () => {} } as any, ticket); }}
        className={`w-full px-4 py-2.5 text-left text-xs font-medium flex items-center gap-2 ${
          darkMode ? "hover:bg-zinc-800 text-zinc-300" : "hover:bg-slate-50 text-slate-700"
        }`}
      >
        <FileText size={14} /> Editar
      </button>
      {hasPermission(PERMISSIONS_MASTER.TICKETS_DELETE) && (
        <button
          onClick={() => { setActiveMenu(null); deleteTicket({ stopPropagation: () => {} } as any, ticket.id); }}
          className={`w-full px-4 py-2.5 text-left text-xs font-medium flex items-center gap-2 ${
            darkMode ? "hover:bg-red-500/20 text-red-400" : "hover:bg-red-50 text-red-600"
          }`}
        >
          <Trash2 size={14} /> Eliminar
        </button>
      )}
    </div>
  )}
</div>
                {/* === FIN MENÚ CORREGIDO === */}
              </div>

              <h4
                className={`text-sm font-bold mb-1 line-clamp-1 ${darkMode ? "text-zinc-200" : "text-slate-900"}`}
              >
                {ticket.title}
              </h4>
              <p
                className={`text-xs mb-3 line-clamp-2 leading-relaxed ${darkMode ? "text-zinc-500" : "text-slate-500"}`}
              >
                {ticket.description}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-inherit">
                <div
                  className={`flex items-center gap-1.5 text-[10px] ${darkMode ? "text-zinc-400" : "text-slate-400"}`}
                >
                  <UsersRound size={12} />
                  <span className="font-medium truncate max-w-[80px]">
                    {ticket.owner}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-1.5 text-[10px] ml-auto font-mono ${darkMode ? "text-zinc-500" : "text-slate-400"}`}
                >
                  <Clock size={12} />
                  {ticket.createdAt}
                </div>
              </div>

              <div className="flex gap-2 mt-3 pt-3 border-t border-inherit">
                {ticket.status === "ABIERTO" && (userRole === "Administrativo" || userRole === "Desarrollador") && (
                  <button
                    onClick={(e) => { e.stopPropagation(); updateStatus(ticket.id, "EN-PROCESO"); }}
                    className="flex-1 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white text-[10px] font-bold transition-all"
                  >
                    Atender
                  </button>
                )}
                {ticket.status === "EN-PROCESO" && (userRole === "Administrativo" || userRole === "Desarrollador") && (
                  <button
                    onClick={(e) => { e.stopPropagation(); updateStatus(ticket.id, "RESUELTO"); }}
                    className="flex-1 py-1.5 rounded-lg bg-green-600/10 hover:bg-green-600 text-green-500 hover:text-white text-[10px] font-bold transition-all"
                  >
                    Resolver
                  </button>
                )}
              </div>
            </div>
          ))}
          {statusTickets.length === 0 && (
            <div
              className={`py-12 flex flex-col items-center justify-center opacity-40 border-2 border-dashed rounded-2xl ${darkMode ? "border-zinc-800" : "border-slate-200"}`}
            >
              <div className="p-3 rounded-full bg-zinc-500/10 mb-2">
                <Icon size={24} />
              </div>
              <span className="text-xs font-medium">Bandeja Vacía</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div
        className={`p-6 rounded-2xl border ${darkMode ? "bg-zinc-900/50 border-zinc-800/50" : "bg-white border-slate-200"} shadow-sm`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Tag className="text-red-500" size={24} />
              <h2
                className={`text-2xl font-bold tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}
              >
                Sistema de Tickets
              </h2>
            </div>
            <p
              className={`text-sm ${darkMode ? "text-zinc-400" : "text-slate-500"}`}
            >
              Gestión y seguimiento de requerimientos técnicos Corporativos
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`relative ${darkMode ? "text-zinc-300" : "text-slate-600"}`}
            >
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50"
                size={16}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar ticket o folio..."
                className={`w-full sm:w-64 pl-10 pr-4 py-2 text-sm rounded-xl border outline-none transition-all ${
                  darkMode
                    ? "bg-zinc-950 border-zinc-800 focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10"
                    : "bg-white border-slate-200 focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10"
                }`}
              />
            </div>

            {hasPermission(PERMISSIONS_MASTER.TICKETS_CREATE) && (
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-red-900/20 transition-all hover:scale-[1.02] active:scale-95"
              >
                <Plus size={18} /> Nuevo Requerimiento
              </button>
            )}

            <button
              onClick={exportJSON}
              className={`p-2.5 rounded-xl border transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800" : "bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50"}`}
              title="Exportar base de datos"
            >
              <Download size={18} />
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 pt-6 border-t border-inherit">
          <div className="space-y-2">
            <label
              className={`text-[10px] font-bold uppercase tracking-widest block ${darkMode ? "text-zinc-500" : "text-slate-400"}`}
            >
              Gerencia / Área
            </label>
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border outline-none min-w-[140px] ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-300" : "bg-white border-slate-200"}`}
            >
              <option value="all">Todas las Áreas</option>
              {orgStructure.map((cat: any) => (
                <optgroup key={cat.category} label={cat.category}>
                  {cat.items.map((item: string) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label
              className={`text-[10px] font-bold uppercase tracking-widest block ${darkMode ? "text-zinc-500" : "text-slate-400"}`}
            >
              Prioridad Crítica
            </label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border outline-none min-w-[140px] ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-300" : "bg-white border-slate-200"}`}
            >
              <option value="all">Cualquier Nivel</option>
              <option value="ALTA">Alta Prioridad</option>
              <option value="MEDIA">Normal</option>
              <option value="BAJA">Informativo</option>
            </select>
          </div>

          <div className="ml-auto mt-auto flex items-center gap-4 text-[10px] font-bold text-zinc-500">
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> TOTAL:{" "}
              {tickets.length}
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> EN CURSO:{" "}
              {tickets.filter((t) => t.status === "EN-PROCESO").length}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <StatusColumn
          status="ABIERTO"
          icon={Clock}
          title="Por Iniciar"
          color="text-red-500"
        />
        <StatusColumn
          status="EN-PROCESO"
          icon={Activity}
          title="En Revisión"
          color="text-blue-500"
        />
        <StatusColumn
          status="RESUELTO"
          icon={CheckCircle}
          title="Finalizados"
          color="text-green-500"
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div
            className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 ${darkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-slate-200"}`}
          >
            <div className="p-6 border-b border-inherit flex items-center justify-between bg-gradient-to-r from-red-600/5 to-transparent">
              <div>
                <h3
                  className={`text-xl font-bold ${darkMode ? "text-white" : "text-slate-900"}`}
                >
                  {editingTicket
                    ? "Editar Requerimiento"
                    : "Nuevo Requerimiento Técnico"}
                </h3>
                <p
                  className={`text-xs ${darkMode ? "text-zinc-500" : "text-slate-500"}`}
                >
                  Completa la información para procesar tu solicitud
                </p>
              </div>
              <button
                onClick={closeModal}
                className={`p-2 rounded-xl transition-all ${darkMode ? "hover:bg-zinc-800 text-zinc-500" : "hover:bg-slate-100 text-slate-400"}`}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveTicket} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className={`text-xs font-bold ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>
                  Asunto del Ticket
                </label>
                <input
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Falla en servidor de correo, Solicitud de acceso..."
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 text-white focus:border-red-500/50" : "bg-white border-slate-200 focus:border-red-500/50 focus:ring-4 focus:ring-red-500/5"}`}
                />
              </div>

              <div className="space-y-2">
                <label className={`text-xs font-bold ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>
                  Descripción
                </label>
                <textarea
                  required={!editingTicket}
                  rows={4}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Proporciona todos los detalles técnicos posibles..."
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all resize-none ${darkMode ? "bg-zinc-900 border-zinc-800 text-white focus:border-red-500/50" : "bg-white border-slate-200 focus:border-red-500/50 focus:ring-4 focus:ring-red-500/5"}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label
                    className={`text-xs font-bold ${darkMode ? "text-zinc-400" : "text-slate-600"}`}
                  >
                    Gerencia / Área
                  </label>
                  <select
                    disabled={Boolean(editingTicket && userRole === "Usuario")}
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${
                      darkMode
                        ? "bg-zinc-900 border-zinc-800 text-white focus:border-red-500/50"
                        : "bg-white border-slate-200 text-slate-900 focus:border-red-500/50 focus:ring-4 focus:ring-red-500/5"
                    } disabled:opacity-50`}
                  >
                    {orgStructure.map((cat: any) => (
                      <optgroup
                        key={cat.category}
                        label={cat.category}
                        className={darkMode ? "bg-zinc-900" : "bg-white"}
                      >
                        {cat.items.map((item: string) => (
                          <option
                            key={item}
                            value={item}
                            className={darkMode ? "bg-zinc-900" : "bg-white"}
                          >
                            {item}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label
                    className={`text-xs font-bold ${darkMode ? "text-zinc-400" : "text-slate-600"}`}
                  >
                    Nivel de Prioridad
                  </label>
                  <select
                    disabled={Boolean(editingTicket && userRole === "Usuario")}
                    value={newPriority}
                    onChange={(e) =>
                      setNewPriority(e.target.value as TicketPriority)
                    }
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${
                      darkMode
                        ? "bg-zinc-900 border-zinc-800 text-white focus:border-red-500/50"
                        : "bg-white border-slate-200 text-slate-900 focus:border-red-500/50 focus:ring-4 focus:ring-red-500/5"
                    } disabled:opacity-50`}
                  >
                    <option
                      value="BAJA"
                      className={darkMode ? "bg-zinc-900" : "bg-white"}
                    >
                      Baja
                    </option>
                    <option
                      value="MEDIA"
                      className={darkMode ? "bg-zinc-900" : "bg-white"}
                    >
                      Media
                    </option>
                    <option
                      value="ALTA"
                      className={darkMode ? "bg-zinc-900" : "bg-white"}
                    >
                      Alta
                    </option>
                  </select>
                </div>
              </div>

              {userRole !== "Usuario" && (
                <div className="space-y-2">
                  <label
                    className={`text-xs font-bold ${darkMode ? "text-zinc-400" : "text-slate-600"}`}
                  >
                    Observaciones Técnicas (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={newObservations}
                    onChange={(e) => setNewObservations(e.target.value)}
                    placeholder="Solo visible para personal técnico y resolutores"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all resize-none ${darkMode ? "bg-zinc-900 border-zinc-800 text-white focus:border-red-500/50" : "bg-white border-slate-200 focus:border-red-500/50 focus:ring-4 focus:ring-red-500/5"}`}
                  />
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${darkMode ? "bg-zinc-900 text-zinc-400 hover:text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-lg shadow-red-900/20 transition-all active:scale-[0.98]"
                >
                  {editingTicket ? "Actualizar Ticket" : "Enviar Requerimiento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}