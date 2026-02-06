'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Activity, Users, Lock, ChevronRight, ChevronLeft, Search, Download, Filter, FileText, Edit2, Trash2, Plus, Briefcase, Zap, Factory } from 'lucide-react';
import { getSecurityLogs, getUsersList } from './actions';

// Mapping icons for serialization support
const ORG_ICONS: Record<string, React.ElementType> = {
    Shield,
    Briefcase,
    Zap,
    Users,
    Factory
};

interface SecurityModuleProps {
    darkMode: boolean;
    announcement: any;
    setAnnouncement: (data: any) => void;
    documents: any[]; // Recibe la lista real
    setDocuments: (docs: any[]) => void;
    userRole: string;
    orgStructure: any[];
    setOrgStructure: (data: any[]) => void;
}

export default function SecurityModule({ darkMode, announcement, setAnnouncement, documents, setDocuments, userRole, orgStructure, setOrgStructure }: SecurityModuleProps) {
    const [activeTab, setActiveTab] = useState('docLogs'); // Default focus on new requirement
    const [logs, setLogs] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploadPanelOpen, setIsUploadPanelOpen] = useState(false); // New State

    // Mock Data for Document Logs
    const MOCK_DOC_LOGS = [
        { id: 1, type: 'Circular', aproxResponse: 'N/A', date: '2026-02-05', time: '08:00 AM', importance: 'Alta', sentBy: 'Gerencia General', receivedBy: 'Todas' },
        { id: 2, type: 'Oficio', aproxResponse: '48h', date: '2026-02-04', time: '10:30 AM', importance: 'Media', sentBy: 'Jurídico', receivedBy: 'RRHH' },
        { id: 3, type: 'Informe', aproxResponse: '5 días', date: '2026-02-04', time: '02:00 PM', importance: 'Baja', sentBy: 'TIC', receivedBy: 'Logística' },
        { id: 4, type: 'Memorando', aproxResponse: '24h', date: '2026-02-03', time: '09:15 AM', importance: 'Alta', sentBy: 'Presidencia', receivedBy: 'Gerencia General' },
        { id: 5, type: 'Solicitudes', aproxResponse: '72h', date: '2026-02-03', time: '11:45 AM', importance: 'Media', sentBy: 'Sindicato', receivedBy: 'Gestión Humana' },
    ];

    const scrollRef = React.useRef<HTMLDivElement>(null);

    const scrollTabs = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { scrollLeft } = scrollRef.current;
            const scrollAmount = 250;
            scrollRef.current.scrollTo({
                left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            const [logsData, usersData] = await Promise.all([getSecurityLogs(), getUsersList()]);
            setLogs(logsData);
            setUsers(usersData);
            setLoading(false);
        }
        fetchData();
    }, [activeTab]);

    const theme = {
        bg: darkMode ? 'bg-zinc-900' : 'bg-white',
        text: darkMode ? 'text-white' : 'text-slate-900',
        subtext: darkMode ? 'text-slate-400' : 'text-slate-500',
        card: darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200',
        header: darkMode ? 'bg-zinc-950/50' : 'bg-slate-50/50',
        rowHover: darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50',
        input: darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900',
        th: darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500',
        td: darkMode ? 'text-slate-300' : 'text-slate-700'
    };

    // Function to handle export
    const handleExport = () => {
        if (activeTab === 'docLogs') {
            const headers = ['Tipo', 'ID', 'Título', 'Fecha', 'Hora', 'Enviado Por', 'Recibido Por'];
            const csvRows = [
                headers.join(','),
                ...documents.map(l => [l.category, l.idDoc, l.name, l.uploadDate, l.uploadTime, l.uploadedBy, l.receivedBy].join(','))
            ];
            const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `logs_documentos_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const deleteDocument = (id: number, name: string) => {
        if (confirm(`¿Estás seguro de eliminar el documento "${name}"? Esta acción no se puede deshacer.`)) {
            setDocuments(documents.filter(d => d.id !== id));
            alert("Documento eliminado correctamente.");
        }
    };

    const [editingDept, setEditingDept] = useState<{ groupIdx: number, itemIdx: number } | null>(null);
    const [newDeptName, setNewDeptName] = useState('');
    const [newGroupIdx, setNewGroupIdx] = useState(0);

    const handleAddDept = () => {
        if (!newDeptName) return;
        const newOrg = [...orgStructure];
        newOrg[newGroupIdx].items.push(newDeptName);
        setOrgStructure(newOrg);
        setNewDeptName('');
    };

    const handleDeleteDept = (groupIdx: number, itemIdx: number) => {
        if (confirm("¿Estás seguro de eliminar esta gerencia?")) {
            const newOrg = [...orgStructure];
            newOrg[groupIdx].items.splice(itemIdx, 1);
            setOrgStructure(newOrg);
        }
    };

    const handleEditDept = (groupIdx: number, itemIdx: number) => {
        const newName = prompt("Nuevo nombre para la gerencia:", orgStructure[groupIdx].items[itemIdx]);
        if (newName) {
            const newOrg = [...orgStructure];
            newOrg[groupIdx].items[itemIdx] = newName;
            setOrgStructure(newOrg);
        }
    };

    return (
        <div className={`space-y-6 font-sans pt-2 ${darkMode ? 'text-zinc-200' : 'text-slate-800'}`}>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className={`p-5 rounded-xl border shadow-sm flex items-center justify-between ${theme.card}`}>
                    <div>
                        <p className={`text-sm font-medium uppercase tracking-wider ${theme.subtext}`}>Docs Tramitados</p>
                        <h3 className={`text-3xl font-bold mt-1 ${theme.text}`}>{documents.length}</h3>
                    </div>
                    <div className={`p-3 rounded-lg ${darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                        <FileText size={24} />
                    </div>
                </div>
                <div className={`p-5 rounded-xl border shadow-sm flex items-center justify-between ${theme.card}`}>
                    <div>
                        <p className={`text-sm font-medium uppercase tracking-wider ${theme.subtext}`}>Cuentas Activas</p>
                        <h3 className={`text-3xl font-bold mt-1 ${theme.text}`}>{users.length}</h3>
                    </div>
                    <div className={`p-3 rounded-lg ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                        <Users size={24} />
                    </div>
                </div>
                <div className={`p-5 rounded-xl border shadow-sm flex items-center justify-between ${theme.card}`}>
                    <div>
                        <p className="text-sm font-medium uppercase tracking-wider text-slate-500">Eventos Hoy</p>
                        <h3 className={`text-3xl font-bold mt-1 ${theme.text}`}>{logs.filter(l => new Date(l.fecha_hora).toDateString() === new Date().toDateString()).length}</h3>
                    </div>
                    <div className={`p-3 rounded-lg ${darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'}`}>
                        <Activity size={24} />
                    </div>
                </div>
                <div className={`p-5 rounded-xl border shadow-sm flex items-center justify-between ${theme.card}`}>
                    <div>
                        <p className="text-sm font-medium uppercase tracking-wider text-slate-500">Alertas Seguridad</p>
                        <h3 className={`text-3xl font-bold mt-1 ${theme.text}`}>{logs.filter(l => l.estado === 'danger' || l.estado === 'warning').length}</h3>
                    </div>
                    <div className={`p-3 rounded-lg ${darkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                        <Lock size={24} />
                    </div>
                </div>
            </div>

            {/* Navigation Tabs with Arrows */}
            <div className="relative group/tabs mb-1">
                <button
                    onClick={() => scrollTabs('left')}
                    className={`absolute left-0 top-0 bottom-0 z-10 px-1 flex items-center bg-gradient-to-r ${darkMode ? 'from-zinc-900 via-zinc-900/80 to-transparent' : 'from-white via-white/80 to-transparent'} opacity-40 hover:opacity-100 transition-opacity`}
                >
                    <ChevronLeft size={20} className="text-red-600" />
                </button>

                <div
                    ref={scrollRef}
                    className={`flex border-b overflow-x-auto no-scrollbar scroll-smooth ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}
                >
                    <button
                        onClick={() => setActiveTab('docLogs')}
                        className={`px-6 py-3 font-bold text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'docLogs' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                    >
                        LOGS DE DOCUMENTOS
                    </button>
                    <button
                        onClick={() => setActiveTab('anuncios')}
                        className={`px-6 py-3 font-bold text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'anuncios' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                    >
                        GESTIÓN DE ANUNCIOS
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`px-6 py-3 font-bold text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'logs' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                    >
                        HISTORIAL DE ACCESOS
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-6 py-3 font-bold text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'users' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                    >
                        GESTIÓN DE USUARIOS
                    </button>
                    <button
                        onClick={() => setActiveTab('orgMgmt')}
                        className={`px-6 py-3 font-bold text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'orgMgmt' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                    >
                        ESTRUCTURA ORGANIZATIVA
                    </button>
                </div>

                <button
                    onClick={() => scrollTabs('right')}
                    className={`absolute right-0 top-0 bottom-0 z-10 px-1 flex items-center bg-gradient-to-l ${darkMode ? 'from-zinc-900 via-zinc-900/80 to-transparent' : 'from-white via-white/80 to-transparent'} opacity-40 hover:opacity-100 transition-opacity`}
                >
                    <ChevronRight size={20} className="text-red-600" />
                </button>
            </div>

            {/* Content Area */}
            <div className={`rounded-xl shadow-sm border overflow-hidden min-h-[500px] ${theme.card}`}>
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <>
                        {/* TAB: DOC LOGS */}
                        {/* TAB CONTENT: GESTIÓN DE ANUNCIOS */}
                        {activeTab === 'anuncios' && (
                            <div className="animate-in fade-in duration-500">
                                <div className={`p-4 border-b flex justify-between items-center ${darkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
                                    <div className="flex items-center gap-3">
                                        <Activity className="text-red-600" size={20} />
                                        <div>
                                            <h3 className={`font-bold ${theme.text}`}>Editor de Comunicado Principal</h3>
                                            <p className={`text-[10px] ${theme.subtext}`}>Modifica el banner que visualizan todos los usuarios en el Dashboard General</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <div>
                                                <label className={`block text-xs font-bold uppercase mb-2 ${theme.subtext}`}>Etiqueta (Badge)</label>
                                                <input
                                                    type="text"
                                                    value={announcement.badge}
                                                    onChange={(e) => setAnnouncement({ ...announcement, badge: e.target.value })}
                                                    className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 outline-none ${theme.input}`}
                                                    placeholder="Ej: Comunicado del Día"
                                                />
                                            </div>
                                            <div>
                                                <label className={`block text-xs font-bold uppercase mb-2 ${theme.subtext}`}>Título del Anuncio</label>
                                                <input
                                                    type="text"
                                                    value={announcement.title}
                                                    onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
                                                    className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 outline-none ${theme.input}`}
                                                />
                                            </div>
                                            <div>
                                                <label className={`block text-xs font-bold uppercase mb-2 ${theme.subtext}`}>Contenido / Descripción</label>
                                                <textarea
                                                    rows={4}
                                                    value={announcement.description}
                                                    onChange={(e) => setAnnouncement({ ...announcement, description: e.target.value })}
                                                    className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 outline-none ${theme.input}`}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <label className={`block text-xs font-bold uppercase mb-2 ${theme.subtext}`}>Urgencia</label>
                                                <select
                                                    value={announcement.urgency}
                                                    onChange={(e) => setAnnouncement({ ...announcement, urgency: e.target.value })}
                                                    className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 outline-none ${theme.input}`}
                                                >
                                                    <option value="Alta">Alta</option>
                                                    <option value="Media">Media</option>
                                                    <option value="Baja">Baja</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className={`block text-xs font-bold uppercase mb-2 ${theme.subtext}`}>Estado del Sistema</label>
                                                <select
                                                    value={announcement.status}
                                                    onChange={(e) => setAnnouncement({ ...announcement, status: e.target.value })}
                                                    className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 outline-none ${theme.input}`}
                                                >
                                                    <option value="Activo">Activo</option>
                                                    <option value="Mantenimiento">Mantenimiento</option>
                                                    <option value="Alerta">Alerta</option>
                                                </select>
                                            </div>

                                            <div className={`p-6 rounded-xl border-2 border-dashed ${darkMode ? 'border-zinc-800 bg-zinc-950/30' : 'border-slate-200 bg-slate-50'}`}>
                                                <p className={`text-xs font-bold uppercase mb-4 text-center ${theme.subtext}`}>Vista Previa en Vivo</p>
                                                <div className="space-y-2 opacity-80 scale-90 origin-top">
                                                    <span className="inline-block px-2 py-0.5 rounded-full bg-red-600 text-white text-[8px] font-bold uppercase">{announcement.badge}</span>
                                                    <h4 className="font-bold text-sm tracking-tight">{announcement.title}</h4>
                                                    <p className="text-[10px] line-clamp-2 leading-relaxed">{announcement.description}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'docLogs' && (
                            <div>
                                <div className={`p-4 border-b flex justify-between items-center ${darkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
                                    <h3 className={`font-bold ${theme.text}`}>Trazabilidad Documental</h3>
                                    <div className="flex gap-2">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Buscar documento..."
                                                className={`pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 ${theme.input}`}
                                            />
                                        </div>
                                        <button
                                            onClick={handleExport}
                                            className={`px-4 py-2 border rounded-lg font-medium flex items-center gap-2 ${darkMode ? 'bg-zinc-800 border-zinc-700 text-slate-300 hover:bg-zinc-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            <Download size={16} />
                                            Exportar
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className={`uppercase ${theme.th}`}>
                                            <tr>
                                                <th className="px-6 py-3 font-semibold">Categoría / ID</th>
                                                <th className="px-6 py-3 font-semibold">Nombre Documento</th>
                                                <th className="px-6 py-3 font-semibold">Fecha</th>
                                                <th className="px-6 py-3 font-semibold">Hora</th>
                                                <th className="px-6 py-3 font-semibold">Enviado Por</th>
                                                <th className="px-6 py-3 font-semibold">Receptor Actual</th>
                                                <th className="px-6 py-3 font-semibold text-center">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${darkMode ? 'divide-zinc-800' : 'divide-slate-100'}`}>
                                            {documents.map((log) => (
                                                <tr key={log.id} className={`${theme.rowHover} transition-colors`}>
                                                    <td className={`px-6 py-4 flex flex-col ${theme.text}`}>
                                                        <span className="font-bold text-xs text-red-500">{log.category}</span>
                                                        <span className="font-mono text-[10px] opacity-70">{log.idDoc}</span>
                                                    </td>
                                                    <td className={`px-6 py-4 font-medium ${theme.text}`}>{log.name}</td>
                                                    <td className={`px-6 py-4 ${theme.subtext}`}>{log.uploadDate}</td>
                                                    <td className={`px-6 py-4 ${theme.subtext}`}>{log.uploadTime}</td>
                                                    <td className={`px-6 py-4 ${theme.text}`}>{log.uploadedBy}</td>
                                                    <td className={`px-6 py-4 ${theme.text}`}>{log.receivedBy}</td>
                                                    <td className={`px-6 py-4 text-center`}>
                                                        {userRole === 'admin' && (
                                                            <button
                                                                onClick={() => deleteDocument(log.id, log.name)}
                                                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                                                                title="Eliminar Documento"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'logs' && (
                            <div>
                                <div className={`p-4 border-b flex justify-between items-center ${darkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
                                    <h3 className={`font-bold ${theme.text}`}>Registro de Actividad Reciente</h3>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Buscar evento..."
                                            className={`pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 ${theme.input}`}
                                        />
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className={`uppercase ${theme.th}`}>
                                            <tr>
                                                <th className="px-6 py-3 font-semibold">Usuario</th>
                                                <th className="px-6 py-3 font-semibold">Evento</th>
                                                <th className="px-6 py-3 font-semibold">Detalles</th>
                                                <th className="px-6 py-3 font-semibold">IP Address</th>
                                                <th className="px-6 py-3 font-semibold">Fecha / Hora</th>
                                                <th className="px-6 py-3 font-semibold">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${darkMode ? 'divide-zinc-800' : 'divide-slate-100'}`}>
                                            {logs.map((log) => (
                                                <tr key={log.id} className={`${theme.rowHover} transition-colors`}>
                                                    <td className={`px-6 py-4 font-medium border-l-4 border-transparent hover:border-red-500 ${theme.text}`}>
                                                        {log.username}
                                                    </td>
                                                    <td className={`px-6 py-4 ${theme.text}`}>{log.evento}</td>
                                                    <td className={`px-6 py-4 ${theme.subtext}`}>{log.detalles}</td>
                                                    <td className="px-6 py-4 font-mono text-xs opacity-70">{log.ip_address}</td>
                                                    <td className={`px-6 py-4 ${theme.subtext}`}>
                                                        {new Date(log.fecha_hora).toLocaleDateString()} <span className="text-xs opacity-70">{new Date(log.fecha_hora).toLocaleTimeString()}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${log.estado === 'success' ? (darkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-700') :
                                                            log.estado === 'warning' ? (darkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-700') :
                                                                log.estado === 'danger' ? (darkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-100 text-red-700') :
                                                                    (darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600')
                                                            }`}>
                                                            {log.estado}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {logs.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                                        No hay registros de actividad disponibles.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'users' && (
                            <div>
                                <div className={`p-4 border-b flex justify-between items-center ${darkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
                                    <h3 className={`font-bold ${theme.text}`}>Directorio de Usuarios</h3>
                                    <a href="/registro" className="text-sm text-white bg-red-600 px-3 py-1.5 rounded-lg font-medium hover:bg-red-700 flex items-center gap-1 transition-colors">
                                        <span>+</span> Crear Usuario
                                    </a>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className={`uppercase ${theme.th}`}>
                                            <tr>
                                                <th className="px-6 py-3 font-semibold">Usuario</th>
                                                <th className="px-6 py-3 font-semibold">Nombre Completo</th>
                                                <th className="px-6 py-3 font-semibold">Gerencia</th>
                                                <th className="px-6 py-3 font-semibold">Email</th>
                                                <th className="px-6 py-3 font-semibold">Nivel Permiso</th>
                                                <th className="px-6 py-3 font-semibold">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${darkMode ? 'divide-zinc-800' : 'divide-slate-100'}`}>
                                            {users.map((user) => (
                                                <tr key={user.id} className={`${theme.rowHover} transition-colors`}>
                                                    <td className={`px-6 py-4 font-bold flex items-center gap-2 ${theme.text}`}>
                                                        <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
                                                            {user.usuario_corp ? user.usuario_corp.substring(0, 2).toUpperCase() : '??'}
                                                        </div>
                                                        {user.usuario_corp}
                                                    </td>
                                                    <td className={`px-6 py-4 ${theme.text}`}>{user.nombre} {user.apellido}</td>
                                                    <td className={`px-6 py-4 ${theme.subtext}`}>{user.gerencia_depto}</td>
                                                    <td className={`px-6 py-4 ${theme.subtext}`}>{user.email_corp}</td>
                                                    <td className="px-6 py-4">
                                                        <select className={`px-2 py-1 rounded border text-xs font-semibold outline-none ${darkMode ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 bg-white text-slate-600'}`}>
                                                            <option>Usuario</option>
                                                            <option>Administrador</option>
                                                            <option>CEO</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <a
                                                            href={`/dashboard/security/user/${user.id}`}
                                                            className="text-blue-600 hover:text-blue-800 font-medium text-xs hover:underline"
                                                        >
                                                            Ver Historial
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'orgMgmt' && (
                            <div className="space-y-6 animate-in fade-in duration-500 p-6">
                                <div className={`p-6 rounded-xl border ${theme.card}`}>
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                        <Plus size={20} className="text-red-600" /> AÑADIR NUEVA GERENCIA
                                    </h3>
                                    <div className="flex flex-wrap gap-4 items-end">
                                        <div className="flex-1 min-w-[300px]">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Nombre de la Gerencia</label>
                                            <input
                                                value={newDeptName}
                                                onChange={(e) => setNewDeptName(e.target.value)}
                                                className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 ${theme.input} outline-none`}
                                                placeholder="Ej: Gerencia Nacional de Logística"
                                            />
                                        </div>
                                        <div className="w-64">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Categoría Jerárquica</label>
                                            <select
                                                value={newGroupIdx}
                                                onChange={(e) => setNewGroupIdx(parseInt(e.target.value))}
                                                className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 ${theme.input} outline-none`}
                                            >
                                                {orgStructure.map((g: any, i: number) => (
                                                    <option key={i} value={i}>{g.category}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button
                                            onClick={handleAddDept}
                                            className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20 active:scale-95 transition-transform"
                                        >
                                            GUARDAR
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {orgStructure.map((group: any, groupIdx: number) => (
                                        <div key={groupIdx} className={`p-5 rounded-xl border shadow-sm ${theme.card}`}>
                                            <div className="flex items-center gap-2 mb-4 border-b pb-3 border-zinc-800/50">
                                                {(() => {
                                                    const IconComp = ORG_ICONS[group.icon] || Shield;
                                                    return <IconComp size={20} className="text-red-500" />;
                                                })()}
                                                <h4 className="font-bold text-sm tracking-tight">{group.category}</h4>
                                            </div>
                                            <div className="space-y-2">
                                                {group.items.map((item: string, itemIdx: number) => (
                                                    <div key={itemIdx} className={`group flex justify-between items-center p-3 rounded-lg border transition-all ${darkMode ? 'bg-zinc-800/30 border-zinc-700/50 hover:bg-zinc-700/40' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-sm'}`}>
                                                        <span className={`text-sm font-medium ${theme.text}`}>{item}</span>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => handleEditDept(groupIdx, itemIdx)}
                                                                className={`p-1.5 rounded-md hover:bg-blue-500/20 hover:text-blue-400 transition-colors ${theme.subtext}`}
                                                            >
                                                                <Edit2 size={12} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteDept(groupIdx, itemIdx)}
                                                                className={`p-1.5 rounded-md hover:bg-red-500/20 hover:text-red-400 transition-colors ${theme.subtext}`}
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {group.items.length === 0 && (
                                                    <p className="text-xs text-center py-4 text-slate-500 italic">No hay gerencias en esta categoría</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
            {/* Upload Document Slide-over Panel */}
            {isUploadPanelOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className={`w-full max-w-md h-full shadow-2xl animate-in slide-in-from-right duration-500 ${theme.card}`}>
                        <div className={`p-6 border-b flex justify-between items-center ${darkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
                            <h3 className={`text-xl font-bold ${theme.text}`}>Subir Documento</h3>
                            <button
                                onClick={() => setIsUploadPanelOpen(false)}
                                className={`p-2 rounded-full hover:bg-slate-800 transition-colors ${theme.subtext}`}
                            >
                                <Users size={20} className="rotate-45" /> {/* Simple X replacement if icon not in scope or just text */}
                                <span className="font-bold">X</span>
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className={`p-10 border-2 border-dashed rounded-xl text-center transition-colors ${darkMode ? 'border-zinc-800 bg-zinc-950/30 hover:border-red-500/50' : 'border-slate-200 bg-slate-50 hover:border-red-500/50'}`}>
                                <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                                    <Download size={24} />
                                </div>
                                <p className={`text-sm font-medium ${theme.text}`}>Haz clic para subir o arrastra un archivo</p>
                                <p className={`text-xs mt-1 ${theme.subtext}`}>PDF, Word, Excel (Max 10MB)</p>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className={`block text-xs font-bold uppercase mb-2 ${theme.subtext}`}>Tipo de Documento</label>
                                    <select className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 outline-none ${theme.input}`}>
                                        <option>Circular</option>
                                        <option>Oficio</option>
                                        <option>Informe</option>
                                        <option>Memorando</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={`block text-xs font-bold uppercase mb-2 ${theme.subtext}`}>Gerencia Destino</label>
                                    <input type="text" className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 outline-none ${theme.input}`} placeholder="Escriba la gerencia..." />
                                </div>
                                <div>
                                    <label className={`block text-xs font-bold uppercase mb-2 ${theme.subtext}`}>Observaciones</label>
                                    <textarea rows={3} className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 outline-none ${theme.input}`} placeholder="Opcional..."></textarea>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsUploadPanelOpen(false)}
                                className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-900/20 active:scale-[0.98]"
                            >
                                Procesar Documento
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
