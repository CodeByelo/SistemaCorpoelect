"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Download, MoreVertical, UsersRound, Clock, CheckCircle, FileText } from 'lucide-react';
import { logTicketActivity } from '@/app/dashboard/security/actions';

// --- Tipos & Interfaces ---
type TicketStatus = 'ABIERTO' | 'EN-PROCESO' | 'RESUELTO';
type TicketPriority = 'ALTA' | 'MEDIA' | 'BAJA';
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
}

export default function TicketSystem({
    darkMode,
    orgStructure = [],
    currentUser = 'Admin. General',
    userRole = 'admin',
    tickets = [],
    setTickets
}: {
    darkMode: boolean;
    orgStructure?: any[];
    currentUser?: string;
    userRole?: 'admin' | 'user';
    tickets?: Ticket[];
    setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
}) {
    const [filterArea, setFilterArea] = useState<string>('all');
    const [filterPriority, setFilterPriority] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
    const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);

    // List of all areas from orgStructure
    const allAreas = useMemo(() => {
        return orgStructure.flatMap(group => group.items);
    }, [orgStructure]);

    // Form state
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newArea, setNewArea] = useState<TicketArea>('');
    useEffect(() => {
        if (allAreas.length > 0 && !newArea) {
            setNewArea(allAreas[0]);
        }
    }, [allAreas, newArea]);

    const [newPriority, setNewPriority] = useState<TicketPriority>('MEDIA');

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = () => setMenuOpenId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    // Helper for logging
    const logAction = async (action: string, ticketTitle: string, status: 'success' | 'warning' | 'danger' | 'info' = 'success') => {
        await logTicketActivity({
            username: currentUser,
            evento: 'GESTIÓN DE TICKETS',
            detalles: `Ticket "${ticketTitle}": ${action}`,
            estado: status
        });
    };

    // Handle Edit Start
    const startEdit = (e: React.MouseEvent, ticket: Ticket) => {
        e.stopPropagation();
        setEditingTicket(ticket);
        setNewTitle(ticket.title);
        setNewDesc(ticket.description);
        setNewArea(ticket.area);
        setNewPriority(ticket.priority);
        setShowModal(true);
        setMenuOpenId(null);
    };

    // Handle Delete
    const deleteTicket = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        const ticket = tickets.find(t => t.id === id);
        if (ticket && confirm(`¿Estás seguro de que deseas eliminar el ticket "${ticket.title}"?`)) {
            setTickets(prev => prev.filter(t => t.id !== id));
            setMenuOpenId(null);
            logAction('ELIMINACIÓN', ticket.title, 'danger');
        }
    };

    // Filtrado
    const filteredTickets = useMemo(() => {
        return tickets.filter(t => {
            // Role restriction: Users only see their own tickets
            if (userRole === 'user' && t.owner !== currentUser) return false;

            const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesArea = filterArea === 'all' || t.area === filterArea;
            const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
            return matchesSearch && matchesArea && matchesPriority;
        });
    }, [tickets, searchTerm, filterArea, filterPriority, userRole, currentUser]);

    const updateStatus = (id: number, status: TicketStatus) => {
        const ticket = tickets.find(t => t.id === id);
        if (ticket && ticket.status !== status) {
            logAction(`CAMBIO DE ESTADO (A ${status})`, ticket.title, 'info');
        }

        setTickets(prev => prev.map(t => {
            if (t.id === id) {
                return {
                    ...t,
                    status,
                    resolvedAt: status === 'RESUELTO' ? new Date().toLocaleDateString('es-ES') : undefined
                };
            }
            return t;
        }));
    };

    // Drag & Drop
    const handleDragStart = (e: React.DragEvent, id: number) => {
        e.dataTransfer.setData("ticketId", id.toString());
    };

    const handleDrop = (e: React.DragEvent, status: TicketStatus) => {
        e.preventDefault();
        if (userRole !== 'admin') return; // Prevent move if not admin

        const idString = e.dataTransfer.getData("ticketId");
        if (!idString) return;
        const id = parseInt(idString);
        updateStatus(id, status);
    };

    const handleSaveTicket = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingTicket) {
            // Update existing
            logAction('EDICIÓN', newTitle, 'info');
            setTickets(prev => prev.map(t => {
                if (t.id === editingTicket.id) {
                    return {
                        ...t,
                        title: newTitle,
                        description: newDesc,
                        area: newArea,
                        priority: newPriority
                    };
                }
                return t;
            }));
        } else {
            // Create new
            const ticket: Ticket = {
                id: Date.now(),
                title: newTitle,
                description: newDesc,
                area: newArea,
                priority: newPriority,
                status: 'ABIERTO',
                createdAt: new Date().toLocaleDateString('es-ES'),
                owner: currentUser
            };
            setTickets([ticket, ...tickets]);
            logAction('CREACIÓN', newTitle, 'success');
        }

        closeModal();
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingTicket(null);
        setNewTitle('');
        setNewDesc('');
        setNewArea(allAreas[0] || '');
        setNewPriority('MEDIA');
    };

    const openCreateModal = () => {
        setEditingTicket(null);
        setShowModal(true);
    };

    const exportJSON = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tickets, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `reporte_tickets_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const getPriorityStyles = (p: TicketPriority) => {
        switch (p) {
            case 'ALTA': return darkMode ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-red-50 text-red-700 border-red-200';
            case 'MEDIA': return darkMode ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200';
            case 'BAJA': return darkMode ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-green-50 text-green-700 border-green-200';
        }
    };

    return (
        <div className="space-y-6">
            {/* Search & Actions */}
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex flex-wrap gap-2 items-center">
                    <div className={`flex items-center px-3 py-2 rounded-lg border ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <Search size={16} className="text-slate-500 mr-2" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por título..."
                            className="bg-transparent border-none outline-none text-sm w-48 transition-all focus:w-64"
                        />
                    </div>
                    <select
                        value={filterArea}
                        onChange={(e) => setFilterArea(e.target.value)}
                        className={`px-3 py-2 rounded-lg border text-sm focus:outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}
                    >
                        <option value="all">Todas las Áreas</option>
                        {allAreas.map(area => (
                            <option key={area} value={area}>{area}</option>
                        ))}
                    </select>
                    <select
                        value={filterPriority}
                        onChange={(e) => setFilterPriority(e.target.value)}
                        className={`px-3 py-2 rounded-lg border text-sm focus:outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}
                    >
                        <option value="all">Prioridades</option>
                        <option value="ALTA">Alta</option>
                        <option value="MEDIA">Media</option>
                        <option value="BAJA">Baja</option>
                    </select>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={openCreateModal}
                        className="px-8 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold flex items-center gap-2 transition-all transform active:scale-95 shadow-lg shadow-red-900/40"
                    >
                        <Plus size={18} /> NUEVO TICKET
                    </button>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-280px)] min-h-[600px]">
                {(['ABIERTO', 'EN-PROCESO', 'RESUELTO'] as TicketStatus[]).map((status) => (
                    <div
                        key={status}
                        className={`flex flex-col rounded-xl border ${darkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50/50 border-slate-200'}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, status)}
                    >
                        <div className={`p-4 flex justify-between items-center border-b-2 ${status === 'ABIERTO' ? 'border-blue-500' : status === 'EN-PROCESO' ? 'border-amber-500' : 'border-emerald-500'
                            }`}>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${status === 'ABIERTO' ? 'bg-blue-500' : status === 'EN-PROCESO' ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`} />
                                <h2 className="text-xs font-bold uppercase tracking-widest">{status === 'EN-PROCESO' ? 'EN PROCESO' : status}</h2>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                                {filteredTickets.filter(t => t.status === status).length}
                            </span>
                        </div>

                        <div className="p-3 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                            {filteredTickets.filter(t => t.status === status).map((ticket) => (
                                <div
                                    key={ticket.id}
                                    draggable={userRole === 'admin'}
                                    onDragStart={(e) => handleDragStart(e, ticket.id)}
                                    className={`group relative p-4 rounded-lg border transition-all cursor-grab active:cursor-grabbing hover:shadow-lg ${darkMode
                                        ? 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
                                        : 'bg-white border-slate-200 hover:border-red-200'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase ${getPriorityStyles(ticket.priority)}`}>
                                            {ticket.priority}
                                        </span>
                                        <div className="relative">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === ticket.id ? null : ticket.id); }}
                                                className={`p-1 rounded-md transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}
                                            >
                                                <MoreVertical size={14} />
                                            </button>

                                            {/* Context Menu */}
                                            {menuOpenId === ticket.id && (
                                                <div className={`absolute right-0 top-full mt-1 w-32 rounded-lg shadow-xl z-20 border py-1 animate-in fade-in zoom-in duration-100 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                                                    <button
                                                        onClick={(e) => startEdit(e, ticket)}
                                                        className={`flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-left transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={(e) => deleteTicket(e, ticket.id)}
                                                        className={`flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-left transition-colors text-red-500 ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-red-50'}`}
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <h3 className={`font-semibold text-sm mb-1 leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{ticket.title}</h3>
                                    <p className={`text-xs mb-3 line-clamp-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{ticket.description}</p>

                                    <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-800/50">
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium font-mono uppercase tracking-tighter">
                                            <UsersRound size={12} className="text-slate-400" />
                                            {ticket.area}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                                            <Clock size={12} className="text-slate-400" />
                                            {ticket.createdAt}
                                        </div>
                                        {ticket.resolvedAt && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold w-full mt-1 uppercase tracking-widest">
                                                <CheckCircle size={12} />
                                                Resuelto: {ticket.resolvedAt}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {filteredTickets.filter(t => t.status === status).length === 0 && (
                                <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-800/20 rounded-xl">
                                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Sin Tickets</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal CRUD Ticket */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
                        <div className={`p-6 border-b flex justify-between items-center ${editingTicket ? (darkMode ? 'bg-blue-600' : 'bg-blue-700') : (darkMode ? 'bg-red-600' : 'bg-red-600')}`}>
                            <h2 className="text-white font-bold flex items-center gap-2 uppercase tracking-tight">
                                {editingTicket ? <FileText size={20} /> : <Plus size={20} />}
                                {editingTicket ? 'EDITAR SOLICITUD' : 'NUEVA SOLICITUD'}
                            </h2>
                            <button onClick={closeModal} className="text-white/80 hover:text-white text-2xl transition-transform hover:scale-125 focus:outline-none">&times;</button>
                        </div>
                        <form onSubmit={handleSaveTicket} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Título de la Solicitud</label>
                                <input
                                    required
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-lg border outline-none focus:ring-2 focus:ring-red-500/20 transition-all ${darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'}`}
                                    placeholder="Ej: Falla en equipo de red..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Descripción Detallada</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-lg border outline-none focus:ring-2 focus:ring-red-500/20 transition-all ${darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'}`}
                                    placeholder="Explica el problema o requerimiento..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Área Responsable</label>
                                    <select
                                        value={newArea}
                                        onChange={(e) => setNewArea(e.target.value)}
                                        className={`w-full px-4 py-3 rounded-lg border outline-none cursor-pointer ${darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'}`}
                                    >
                                        {allAreas.map(area => (
                                            <option key={area} value={area}>{area}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Prioridad</label>
                                    <select
                                        value={newPriority}
                                        onChange={(e) => setNewPriority(e.target.value as TicketPriority)}
                                        className={`w-full px-4 py-3 rounded-lg border outline-none cursor-pointer ${darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'}`}
                                    >
                                        <option value="ALTA">Alta</option>
                                        <option value="MEDIA">Media</option>
                                        <option value="BAJA">Baja</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-6">
                                <button type="button" onClick={closeModal} className={`flex-1 py-3 rounded-lg font-bold text-xs tracking-widest border transition-all ${darkMode ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                    CANCELAR
                                </button>
                                <button type="submit" className={`flex-1 py-3 rounded-lg font-bold text-xs tracking-widest text-white transition-all transform active:scale-95 shadow-lg ${editingTicket ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/20' : 'bg-red-600 hover:bg-red-700 shadow-red-900/20'}`}>
                                    {editingTicket ? 'GUARDAR CAMBIOS' : 'CREAR TICKET'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
