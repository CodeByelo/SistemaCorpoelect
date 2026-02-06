"use client";
import React, { useState, useEffect, useMemo } from 'react';
import {
  Home, BarChart2, Users, Settings, Bell, Search,
  ChevronRight, Activity, Server, Shield, Zap, LogOut,
  AlertTriangle, Filter, Sun, Moon, Building2, Briefcase, Factory,
  ChevronDown, ChevronUp, Download, Info, Clock, TrendingUp, UsersRound,
  Flag, Tag, FileText, Printer, CheckCircle, AlertCircle, File, FileCheck,
  Check, X, AlertOctagon, Eye, Mail, Globe, Sparkles, Inbox, Send
} from 'lucide-react';

// ✅ IMPORTA LOS COMPONENTES DEL BOT AL INICIO
import BotButton from '@/components/BotButton';
import ChatWindow from '@/components/ChatWindow';
import TicketSystem from '@/components/TicketSystem';
import { logDocumentActivity } from '@/app/dashboard/security/actions';
import { useRouter } from 'next/navigation';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { useIdleTimer } from '@/hooks/useIdleTimer';

// ==========================================
// TIPOS Y INTERFACES
// ==========================================
interface OrgCategory {
  category: string;
  icon: React.ElementType;
  items: string[];
  expanded?: boolean;
}
interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active: boolean;
  collapsed: boolean;
  darkMode: boolean;
  onClick?: () => void;
}
interface DeptCardProps {
  group: OrgCategory;
  darkMode: boolean;
  onToggle?: () => void;
  onItemClick?: (item: string) => void;
}
interface AuditAlert {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  date: string;
}
interface PriorityItem {
  id: number;
  title: string;
  description: string;
  priority: 'alta' | 'media' | 'baja';
  responsible: string;
  deadline: string;
  status: 'pendiente' | 'en-progreso' | 'completado';
}
interface Ticket {
  id: number;
  title: string;
  description: string;
  type: 'tecnico' | 'administrativo' | 'operativo';
  status: 'abierto' | 'en-proceso' | 'resuelto';
  priority: 'alta' | 'media' | 'baja';
  assignedTo: string;
  createdAt: string;
}
interface Document {
  id: number;
  idDoc: string;
  name: string;
  type: 'pdf' | 'word' | 'excel' | 'powerpoint';
  category: string; // Circular, Oficio, Informe, etc.
  size: string;
  uploadedBy: string; // Enviado Por
  receivedBy: string; // Recibido Por
  uploadDate: string;
  uploadTime: string;
  signatureStatus: 'pendiente' | 'aprobado' | 'rechazado' | 'omitido' | 'en-proceso';
  department: string; // Gerencia (Origen)
  targetDepartment: string; // Gerencia (Destino)
  fileUrl?: string;
}
interface Printer {
  id: number;
  name: string;
  model: string;
  location: string;
  status: 'operativo' | 'mantenimiento' | 'fuera-servicio';
  tonerLevel: number;
  paperLevel: number;
  lastMaintenance: string;
}

interface AnnouncementData {
  badge: string;
  title: string;
  description: string;
  status: string;
  urgency: string;
}

// ==========================================
// DATA MOCKS
// ==========================================
const DEFAULT_ORG_STRUCTURE: OrgCategory[] = [
  {
    category: "I. Alta Dirección y Control",
    icon: Shield,
    items: ["Gerencia General", "Auditoria Interna", "Consultoria Juridica", "Gerencia Nacional de Planificacion y presupuesto"]
  },
  {
    category: "II. Gestión Administrativa",
    icon: Briefcase,
    items: ["Gerencia Nacional de Administracion", "Gerencia Nacional de Gestion Humana", "Gerencia Nacional de Tecnologias de la informacion y la comunicacion", "Gerencia nacional de tecnologias de proyectos"]
  },
  {
    category: "III. Gestión Operativa y ASHO",
    icon: Zap,
    items: ["Gerencia Nacional de Adecuaciones y Mejoras", "Gerencia Nacional de Asho", "Gerencia Nacional de Atencion al Ciudadano", "Gerencia de Comercializacion"]
  },
  {
    category: "IV. Energía y Comunidad",
    icon: Users,
    items: ["Gerencia Nacional de energia alternativa y eficiencia energetica", "Gerencia Nacional de gestion comunical"]
  },
  {
    category: "V. Filiales y Unidades",
    icon: Factory,
    items: ["Unerven", "Vietven"]
  }
];

const MANAGEMENT_DETAILS: Record<string, string[]> = {
  "Gerencia General": [
    "Definición de políticas institucionales.",
    "Supervisión de gerencias operativas y administrativas.",
    "Representación legal de la institución.",
    "Aprobación de presupuesto anual.",
    "Coordinación de relaciones interinstitucionales."
  ],
  "Auditoria Interna": [
    "Evaluación de controles internos.",
    "Auditoría de procesos financieros y administrativos.",
    "Verificación del cumplimiento normativo.",
    "Investigación de irregularidades.",
    "Elaboración de informes de gestión de riesgos."
  ],
  "Consultoria Juridica": [
    "Asesoría legal a la presidencia y gerencias.",
    "Revisión y redacción de contratos y convenios.",
    "Defensa judicial y extrajudicial de la institución.",
    "Emitir dictámenes jurídicos vinculantes."
  ],
  "Gerencia Nacional de Planificacion y presupuesto": [
    "Formulación del Plan Operativo Anual (POA).",
    "Control y seguimiento de la ejecución presupuestaria.",
    "Evaluación de indicadores de gestión.",
    "Proyección de escenarios financieros a mediano plazo."
  ],
  "Gerencia Nacional de Administracion": [
    "Gestión de recursos financieros y tesorería.",
    "Administración de servicios generales.",
    "Procesamiento de pagos a proveedores.",
    "Contabilización de operaciones financieras."
  ],
  "Gerencia Nacional de Gestion Humana": [
    "Reclutamiento y selección de personal.",
    "Gestión de nómina y beneficios laborales.",
    "Planificación de capacitación y desarrollo.",
    "Evaluación del desempeño del personal."
  ],
  "Gerencia Nacional de Tecnologias de la informacion y la comunicacion": [
    "Mantenimiento de infraestructura tecnológica.",
    "Desarrollo y soporte de sistemas de información.",
    "Garantizar la seguridad de la información.",
    "Soporte técnico a usuarios finales."
  ]
};

const getDefaultFunctions = (name: string) => [
  `Gestión operativa de ${name}.`,
  "Coordinación de personal asignado.",
  "Reporte de indicadores de gestión.",
  "Cumplimiento de metas trimestrales asignadas.",
  "Seguimiento de planes de mejora continua."
];

const PLANT_METRICS = [
  { name: "Planta Luis Zambrano", availability: 95, trend: "+2%", status: "optimal" },
  { name: "Planta Metrocontadores", availability: 88, trend: "-1%", status: "warning" },
  { name: "Planta Tanques", availability: 92, trend: "+5%", status: "optimal" },
  { name: "Centro Textil", availability: 85, trend: "-3%", status: "warning" },
  { name: "UNERVEN", availability: 90, trend: "+1%", status: "optimal" },
  { name: "VIETVEN", availability: 87, trend: "+4%", status: "optimal" }
];

const AUDIT_ALERTS: AuditAlert[] = [
  {
    title: "Revisión Jurídica Pendiente",
    description: "Gerencia General requiere firma de documentos legales",
    priority: "high",
    date: "Hoy"
  },
  {
    title: "Mantenimiento Preventivo",
    description: "Planta Tanques entra en ciclo de revisión programada",
    priority: "medium",
    date: "Mañana"
  },
  {
    title: "Actualización de Protocolos",
    description: "Departamento TIC necesita aprobación de nuevos estándares",
    priority: "low",
    date: "En 3 días"
  }
];

// NUEVOS DATOS PARA MÓDULOS
const PRIORITY_MATRIX: PriorityItem[] = [
  {
    id: 1,
    title: "Implementación Protocolo Seguridad",
    description: "Actualización de protocolos ASHO para todas las plantas",
    priority: "alta",
    responsible: "Gerencia General",
    deadline: "15/02/2026",
    status: "pendiente"
  },
  {
    id: 2,
    title: "Optimización Infraestructura TI",
    description: "Migración a nuevo servidor central y actualización de redes",
    priority: "alta",
    responsible: "Departamento TIC",
    deadline: "28/02/2026",
    status: "en-progreso"
  },
  {
    id: 3,
    title: "Capacitación Personal Operativo",
    description: "Programa de formación en nuevas tecnologías de producción",
    priority: "media",
    responsible: "Gestión Humana",
    deadline: "10/03/2026",
    status: "pendiente"
  },
  {
    id: 4,
    title: "Revisión Presupuesto Anual",
    description: "Análisis y ajuste de presupuesto 2026",
    priority: "media",
    responsible: "Planificación y Presupuesto",
    deadline: "20/03/2026",
    status: "pendiente"
  },
  {
    id: 5,
    title: "Actualización Equipos de Medición",
    description: "Calibración y mantenimiento de equipos metrocontadores",
    priority: "baja",
    responsible: "Producción",
    deadline: "30/03/2026",
    status: "pendiente"
  }
];

// Tickets data moved to TicketSystem component

const INITIAL_DOCUMENTS: Document[] = [
  {
    id: 1,
    idDoc: "DOC-2026-001",
    name: "Contrato Marco 2026",
    type: 'pdf',
    category: 'Oficio',
    size: "2.4 MB",
    uploadedBy: "Maria Rodríguez",
    receivedBy: "Carlos Pérez",
    uploadDate: "31/01/2026",
    uploadTime: "09:30 AM",
    signatureStatus: 'pendiente',
    department: "Consultoria Juridica",
    targetDepartment: "Gerencia General"
  },
  {
    id: 2,
    idDoc: "DOC-2026-002",
    name: "Informe Financiero Q4",
    type: 'excel',
    category: 'Informe',
    size: "1.8 MB",
    uploadedBy: "Pedro Sánchez",
    receivedBy: "Ana Ruiz",
    uploadDate: "30/01/2026",
    uploadTime: "10:15 AM",
    signatureStatus: 'aprobado',
    department: "Gerencia Nacional de Administracion",
    targetDepartment: "Gerencia Nacional de Planificacion y presupuesto"
  },
  {
    id: 3,
    idDoc: "DOC-2026-003",
    name: "Manual de Procedimientos TIC",
    type: 'word',
    category: 'Circular',
    size: "3.2 MB",
    uploadedBy: "Roberto Díaz",
    receivedBy: "Equipo TIC",
    uploadDate: "29/01/2026",
    uploadTime: "02:45 PM",
    signatureStatus: 'aprobado',
    department: "Gerencia Nacional de Tecnologias de la informacion y la comunicacion",
    targetDepartment: "Gerencia Nacional de Tecnologias de la informacion y la comunicacion"
  }
];

const PRINTERS: Printer[] = [
  {
    id: 1,
    name: "Impresora Gerencia Principal",
    model: "HP LaserJet Pro M404dn",
    location: "Edificio Central - Piso 3",
    status: 'operativo',
    tonerLevel: 85,
    paperLevel: 90,
    lastMaintenance: "15/01/2026"
  },
  {
    id: 2,
    name: "Impresora Departamento TIC",
    model: "Canon imageCLASS MF644Cdw",
    location: "Edificio Central - Piso 2",
    status: 'operativo',
    tonerLevel: 65,
    paperLevel: 70,
    lastMaintenance: "20/01/2026"
  },
  {
    id: 3,
    name: "Impresora Administración",
    model: "Brother HL-L8360CDW",
    location: "Edificio Central - Piso 1",
    status: 'mantenimiento',
    tonerLevel: 25,
    paperLevel: 40,
    lastMaintenance: "01/02/2026"
  },
  {
    id: 4,
    name: "Impresora Producción",
    model: "Epson WorkForce Pro WF-C5790",
    location: "Planta Luis Zambrano",
    status: 'operativo',
    tonerLevel: 92,
    paperLevel: 85,
    lastMaintenance: "10/01/2026"
  },
  {
    id: 5,
    name: "Impresora Logística",
    model: "HP Color LaserJet Pro M255dw",
    location: "Bodega Principal",
    status: 'fuera-servicio',
    tonerLevel: 10,
    paperLevel: 5,
    lastMaintenance: "25/01/2026"
  }
];

// NUEVOS DATOS PARA MÓDULO DE SEGURIDAD
const ACCOUNT_REQUESTS = [
  { id: 1, name: "Pedro Alcantara", email: "p.alcantara@corpoelec.gob.ve", department: "Sistemas", date: "04/02/2026", status: "pendiente" },
  { id: 2, name: "Maria Gonzalez", email: "m.gonzalez@corpoelec.gob.ve", department: "Admin", date: "03/02/2026", status: "pendiente" },
];

const USER_PERMISSIONS = [
  { id: 101, user: "JPEREZ (Admin)", role: "Administrador Global", access: ["Todo"], lastActive: "Ahora" },
  { id: 102, user: "MARODRIGUEZ (Gerente)", role: "Gerente Planta", access: ["Reportes", "Personal"], lastActive: "Hace 10 min" },
  { id: 103, user: "CSANCHEZ (Soporte)", role: "Técnico Nivel 2", access: ["Tickets", "Sistemas"], lastActive: "Hace 1h" },
];

const SECURITY_LOGS = [
  { id: 1, event: "Inicio de Sesión Exitoso", user: "JPEREZ", ip: "192.168.1.10", time: "10:23 AM" },
  { id: 2, event: "Cambio de Permisos", user: "SYSTEM", ip: "LOCALHOST", time: "09:45 AM" },
  { id: 3, event: "Intento Fallido de Acceso", user: "UNKNOWN", ip: "192.168.1.45", time: "08:12 AM" },
];

// ==========================================
// COMPONENTES REUTILIZABLES (CORPORATE STYLE)
// ==========================================
const ThemeToggle: React.FC<{ darkMode: boolean; onToggle: () => void }> = ({ darkMode, onToggle }) => (
  <button
    onClick={onToggle}
    aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
    className={`
      p-2 rounded-md transition-colors border
      ${darkMode
        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
        : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
      }
    `}
  >
    {darkMode ? <Sun size={16} /> : <Moon size={16} />}
  </button>
);

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, active, collapsed, darkMode, onClick }) => (
  <div
    onClick={onClick}
    role="button"
    tabIndex={0}
    aria-label={label}
    className={`
      group flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-all duration-200
      ${active
        ? (darkMode ? 'bg-red-900/50 text-white shadow-sm border border-red-800/50' : 'bg-red-700 text-white shadow-sm')
        : (darkMode
          ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')
      }
    `}
  >
    <Icon size={18} className={`${active ? 'text-white' : ''}`} />
    {!collapsed && (
      <span className="font-medium text-sm tracking-tight">{label}</span>
    )}
  </div>
);

const DeptCard: React.FC<DeptCardProps> = ({ group, darkMode, onToggle, onItemClick }) => {
  const [expanded, setExpanded] = useState(true);
  const toggleExpand = () => {
    setExpanded(!expanded);
    onToggle?.();
  };

  return (
    <div className={`
      rounded-lg border transition-all duration-200
      ${darkMode
        ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
        : 'bg-white border-slate-200 hover:border-slate-300'
      }
    `}>
      <div
        onClick={toggleExpand}
        className={`
          p-3 border-b cursor-pointer flex items-center justify-between transition-colors
          ${darkMode ? 'border-zinc-800 hover:bg-zinc-800/50' : 'border-slate-100 hover:bg-slate-50'}
        `}
      >
        <div className="flex items-center gap-2">
          <group.icon size={16} className={darkMode ? 'text-slate-400' : 'text-slate-500'} />
          <h3 className={`font-semibold text-xs uppercase tracking-wide ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            {group.category}
          </h3>
        </div>
        {expanded
          ? <ChevronUp size={14} className="text-slate-500" />
          : <ChevronDown size={14} className="text-slate-500" />
        }
      </div>
      {expanded && (
        <div className="p-2 space-y-1">
          {group.items.map((item, idx) => (
            <div
              key={idx}
              onClick={() => onItemClick?.(item)}
              className={`
                flex items-center gap-2 px-2 py-1.5 rounded transition-colors text-xs cursor-pointer
                ${darkMode
                  ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }
              `}
            >
              <div className={`w-1 h-1 rounded-full ${darkMode ? 'bg-red-800' : 'bg-red-600'}`} />
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const DetailModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  functions: string[];
  darkMode: boolean;
}> = ({ isOpen, onClose, title, functions, darkMode }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className={`
          w-full max-w-md rounded-lg shadow-xl transform transition-all scale-100
          ${darkMode ? 'bg-zinc-900 border border-zinc-700' : 'bg-white'}
        `}
      >
        <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
          <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className={`p-1 rounded-md transition-colors ${darkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'}`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Funciones Operativas
          </h4>
          <ul className="space-y-3">
            {functions.map((func, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${darkMode ? 'bg-red-500' : 'bg-red-600'}`} />
                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  {func}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className={`p-4 border-t flex justify-end ${darkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
          <button
            onClick={onClose}
            className={`
              px-4 py-2 rounded-md text-sm font-medium transition-colors
              ${darkMode
                ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
              }
            `}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  title: string;
  value: string;
  subtext: string;
  icon: React.ElementType;
  darkMode: boolean;
  trend?: string;
  trendPositive?: boolean;
}> = ({ title, value, subtext, icon: Icon, darkMode, trend, trendPositive }) => (
  <div className={`
    p-5 rounded-lg border flex flex-col justify-between h-full
    ${darkMode
      ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
      : 'bg-white border-slate-200 hover:border-slate-300'
    }
  `}>
    <div className="flex justify-between items-start mb-2">
      <span className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
        {title}
      </span>
      <Icon size={18} className={darkMode ? 'text-slate-600' : 'text-slate-400'} />
    </div>
    <div className="flex items-baseline gap-2 mb-1">
      <span className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{value}</span>
      {trend && (
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${trendPositive
          ? (darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700')
          : (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-700')
          }`}>
          {trend}
        </span>
      )}
    </div>
    <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
      {subtext}
    </p>
  </div>
);

const AlertCard: React.FC<{
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  date: string;
  darkMode: boolean;
}> = ({ title, description, priority, date, darkMode }) => {
  const getStyles = () => {
    switch (priority) {
      case 'high':
        return { borderL: 'border-l-red-600', text: 'text-red-600', bg: '' };
      case 'medium':
        return { borderL: 'border-l-amber-500', text: 'text-amber-600', bg: '' };
      default:
        return { borderL: 'border-l-blue-500', text: 'text-blue-600', bg: '' };
    }
  };

  const s = getStyles();

  return (
    <div className={`
      pl-3 py-2 border-l-4 rounded-r-md transition-colors
      ${s.borderL}
      ${darkMode ? 'bg-slate-800/30 hover:bg-slate-800/50' : 'bg-slate-50 hover:bg-slate-100'}
    `}>
      <div className="flex justify-between items-start">
        <div>
          <span className={`text-xs font-bold uppercase ${s.text} block mb-0.5`}>{title}</span>
          <p className={`text-sm leading-tight ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{description}</p>
        </div>
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-white text-slate-500 border border-slate-200'}`}>
          {date}
        </span>
      </div>
    </div>
  );
};

// ==========================================
// NUEVOS COMPONENTES MODULARES
// ==========================================
const PriorityMatrix: React.FC<{ darkMode: boolean; userRole: 'admin' | 'user' }> = ({ darkMode, userRole }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return darkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-700';
      case 'media': return darkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700';
      case 'baja': return darkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-700';
      default: return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendiente': return darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600';
      case 'en-progreso': return darkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700';
      case 'completado': return darkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-700';
      default: return '';
    }
  };

  const filteredPriorities = userRole === 'admin'
    ? PRIORITY_MATRIX
    : PRIORITY_MATRIX.filter(item =>
      item.responsible.includes('TIC') || item.responsible === 'Gerencia TI'
    );

  return (
    <div className="space-y-4 pt-2">
      <div className="flex justify-end mb-2">
        <button className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}>
          <Download size={16} className="inline mr-2" />
          Exportar
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className={`w-full rounded-lg overflow-hidden ${darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'
          }`}>
          <thead className={`${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
            <tr>
              <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>Prioridad</th>
              <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>Título</th>
              <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>Responsable</th>
              <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>Plazo</th>
              <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filteredPriorities.map((item) => (
              <tr
                key={item.id}
                className={`border-t transition-colors ${darkMode ? 'border-slate-800 hover:bg-slate-800/50' : 'border-slate-200 hover:bg-slate-50'
                  }`}
              >
                <td className="px-4 py-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getPriorityColor(item.priority)
                    }`}>
                    {item.priority}
                  </span>
                </td>
                <td className={`px-4 py-3 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <div className="font-medium">{item.title}</div>
                  <div className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                    {item.description}
                  </div>
                </td>
                <td className={`px-4 py-3 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  {item.responsible}
                </td>
                <td className={`px-4 py-3 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  {item.deadline}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(item.status)
                    }`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Kanban Ticket System logic integrated from @/components/TicketSystem

const DocumentManager: React.FC<{
  darkMode: boolean;
  userRole: 'admin' | 'user';
  documents: Document[];
  setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
  orgStructure: OrgCategory[];
}> = ({ darkMode, userRole, documents, setDocuments, orgStructure }) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [docView, setDocView] = useState<'inbox' | 'sent'>('inbox');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docName, setDocName] = useState('');
  const [sentBy, setSentBy] = useState('');
  const [docCategory, setDocCategory] = useState('Informe');
  const [targetDept, setTargetDept] = useState('Gerencia General');

  // Extract unique departments for filter
  const departments = useMemo(() => {
    return orgStructure.flatMap(group => group.items);
  }, [orgStructure]);

  const filteredDocs = documents.filter(doc => {
    // 0. Workflow Logic: Inbox vs Sent
    // Inbox: Target is current dept
    // Sent: Source is current dept
    const myDept = "Gerencia Nacional de Tecnologias de la informacion y la comunicacion";

    if (docView === 'inbox') {
      if (userRole === 'user' && doc.targetDepartment !== myDept) return false;
    } else {
      if (userRole === 'user' && doc.department !== myDept) return false;
    }

    // 1. Filter by Status
    if (filterStatus !== 'all' && doc.signatureStatus !== filterStatus) return false;

    // 2. Filter by Dept (Only relevant for admin viewing everything)
    if (userRole === 'admin' && filterDept !== 'all' && doc.department !== filterDept && doc.targetDepartment !== filterDept) return false;

    // 3. Search
    if (searchTerm && !doc.name.toLowerCase().includes(searchTerm.toLowerCase()) && !doc.idDoc.toLowerCase().includes(searchTerm.toLowerCase())) return false;

    return true;
  });

  const updateDocumentStatus = async (id: number, newStatus: Document['signatureStatus']) => {
    const doc = documents.find(d => d.id === id);
    if (!doc) return;

    setDocuments(prev => prev.map(d =>
      d.id === id ? { ...d, signatureStatus: newStatus, receivedBy: newStatus === 'en-proceso' ? "Recibido por TIC" : d.receivedBy } : d
    ));

    await logDocumentActivity({
      username: userRole === 'admin' ? "Admin. General" : "Usuario Estándar",
      evento: 'FLUJO DOCUMENTAL',
      detalles: `Cambio de estado en "${doc.name}" a ${newStatus.toUpperCase()}`,
      estado: newStatus === 'aprobado' ? 'success' : newStatus === 'rechazado' ? 'danger' : 'info'
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setDocName(file.name);
    setShowUploadModal(true);
  };

  const confirmUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    const fileUrl = URL.createObjectURL(selectedFile);
    const newDoc: Document = {
      id: Date.now(),
      idDoc: `DOC-2026-${String(documents.length + 1).padStart(3, '0')}`,
      name: docName,
      category: docCategory,
      type: selectedFile.type.includes('pdf') ? 'pdf' : selectedFile.type.includes('word') ? 'word' : selectedFile.type.includes('excel') ? 'excel' : 'pdf',
      size: `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`,
      uploadedBy: sentBy,
      receivedBy: "Pendiente de Recepción",
      uploadDate: new Date().toLocaleDateString('es-ES'),
      uploadTime: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      signatureStatus: 'pendiente',
      department: "TIC", // Current dept
      targetDepartment: targetDept,
      fileUrl
    };

    setDocuments([newDoc, ...documents]);

    // Logging activity
    await logDocumentActivity({
      username: userRole === 'admin' ? "Admin. General" : "Usuario Estándar",
      evento: 'GESTIÓN DOCUMENTAL',
      detalles: `Envío de ${docCategory}: "${docName}" para ${targetDept}`,
      estado: 'success'
    });

    // Reset and close
    setShowUploadModal(false);
    setSelectedFile(null);
    setDocName('');
    setSentBy('');
    setDocCategory('Informe');
    setTargetDept('Gerencia General');
    if (fileInputRef.current) fileInputRef.current.value = '';

    alert(`Documento "${docName}" enviado con éxito a ${targetDept}.`);
  };

  const viewDocument = (doc: Document) => {
    if (doc.fileUrl) {
      window.open(doc.fileUrl, '_blank');
    } else {
      alert("Este es un documento de ejemplo. Por favor, suba un archivo nuevo para probar la visualización.");
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <File size={18} className="text-red-500" />;
      case 'word': return <FileText size={18} className="text-blue-500" />;
      case 'excel': return <FileText size={18} className="text-green-500" />;
      case 'powerpoint': return <FileText size={18} className="text-amber-500" />;
      default: return <File size={18} />;
    }
  };

  const getSignatureStatus = (status: string) => {
    switch (status) {
      case 'pendiente': return { color: darkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700', icon: AlertCircle, label: 'Pendiente' };
      case 'aprobado': return { color: darkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-700', icon: CheckCircle, label: 'Aprobado' };
      case 'rechazado': return { color: darkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-700', icon: X, label: 'Rechazado' };
      case 'omitido': return { color: darkMode ? 'bg-gray-500/10 text-gray-400' : 'bg-gray-50 text-gray-700', icon: LogOut, label: 'Omitido' };
      case 'en-proceso': return { color: darkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700', icon: Clock, label: 'Recibido' };
      default: return { color: '', icon: AlertCircle, label: status };
    }
  };

  return (
    <div className="space-y-4 pt-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx"
      />

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
            <div className="p-6 border-b flex justify-between items-center bg-green-700 text-white">
              <h2 className="font-bold flex items-center gap-2 uppercase tracking-tight">
                <FileCheck size={20} />
                REGISTRAR DOCUMENTO
              </h2>
              <button
                onClick={() => { setShowUploadModal(false); setSelectedFile(null); }}
                className="text-white/80 hover:text-white text-2xl"
              >
                &times;
              </button>
            </div>
            <form onSubmit={confirmUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">Nombre del Documento (Archivo)</label>
                <input
                  required
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-lg border outline-none text-sm ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">Tipo de Documento</label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border outline-none text-sm ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <option value="Circular">Circular</option>
                    <option value="Oficio">Oficio</option>
                    <option value="Informe">Informe</option>
                    <option value="Memorando">Memorando</option>
                    <option value="Solicitud">Solicitud</option>
                    <option value="Notificaciones">Notificación</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">Enviado Por (Nombre)</label>
                  <input
                    required
                    value={sentBy}
                    onChange={(e) => setSentBy(e.target.value)}
                    placeholder="Ej: Ing. Carlos Martínez"
                    className={`w-full px-4 py-2.5 rounded-lg border outline-none text-sm ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">Gerencia de Destino</label>
                <select
                  value={targetDept}
                  onChange={(e) => setTargetDept(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-lg border outline-none text-sm ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                >
                  <option value="Gerencia General">Gerencia General</option>
                  <option value="TIC">TIC</option>
                  <option value="Finanzas">Finanzas</option>
                  <option value="Jurídico">Jurídico</option>
                  <option value="RRHH">RRHH</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowUploadModal(false); setSelectedFile(null); }}
                  className={`flex-1 py-3 rounded-lg font-bold text-xs tracking-widest border ${darkMode ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-lg font-bold text-xs tracking-widest text-white bg-green-700 hover:bg-green-800 transition-all transform active:scale-95 shadow-lg shadow-green-900/20"
                >
                  CONFIRMAR SUBIDA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-2">
        <div className={`flex p-1 rounded-lg border ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
          <button
            onClick={() => setDocView('inbox')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${docView === 'inbox' ? (darkMode ? 'bg-red-600 text-white' : 'bg-red-700 text-white') : (darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-600 hover:text-slate-900')}`}
          >
            <Inbox size={14} />
            BANDEJA DE ENTRADA
            {documents.filter(d => d.targetDepartment === 'TIC' && d.signatureStatus === 'pendiente').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse ml-1" />
            )}
          </button>
          <button
            onClick={() => setDocView('sent')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${docView === 'sent' ? (darkMode ? 'bg-red-600 text-white' : 'bg-red-700 text-white') : (darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-600 hover:text-slate-900')}`}
          >
            <Send size={14} />
            ENVIADOS
          </button>
        </div>
        <div className="flex gap-2">
          <button className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
            <Download size={16} className="inline mr-2" />
            Descargar Todo
          </button>
          <button
            onClick={handleUploadClick}
            className={`px-4 py-2 rounded-md text-sm font-medium ${darkMode ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-green-700 text-white hover:bg-green-800'}`}
          >
            + Nuevo Documento
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={`p-4 rounded-lg flex flex-wrap gap-4 items-end ${darkMode ? 'bg-slate-900/50 border border-slate-800' : 'bg-slate-50 border border-slate-200'}`}>

        {/* Filter: Search */}
        <div className="flex-1 min-w-[200px]">
          <label className={`block text-xs font-bold uppercase mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Búsqueda</label>
          <div className={`flex items-center px-3 py-2 rounded-md border ${darkMode ? 'bg-slate-950 border-slate-700' : 'bg-white border-slate-300'}`}>
            <Search size={14} className="text-slate-500 mr-2" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por ID o Título..."
              className="bg-transparent border-none outline-none text-sm w-full"
            />
          </div>
        </div>

        {/* Filter: Status */}
        <div className="w-48">
          <label className={`block text-xs font-bold uppercase mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Estado</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`w-full px-3 py-2 rounded-md border text-sm outline-none cursor-pointer ${darkMode ? 'bg-slate-950 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'}`}
          >
            <option value="all">Todos los Estados</option>
            <option value="aprobado">Aprobados</option>
            <option value="omitido">Omitidos</option>
            <option value="en-proceso">En Proceso</option>
            <option value="pendiente">Pendientes</option>
            <option value="rechazado">Rechazados</option>
          </select>
        </div>

        {/* Filter: Gerencia (Dept) */}
        <div className="w-48">
          <label className={`block text-xs font-bold uppercase mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Gerencia</label>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className={`w-full px-3 py-2 rounded-md border text-sm outline-none cursor-pointer ${darkMode ? 'bg-slate-950 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'}`}
          >
            <option value="all">Todas las Gerencias</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200/20">
        <table className={`w-full ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
          <thead className={`${darkMode ? 'bg-slate-950/50' : 'bg-slate-50'} border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <tr>
              <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>ID / Documento</th>
              <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Fecha / Hora</th>
              <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{docView === 'inbox' ? 'Remitente' : 'Destinatario'}</th>
              <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Estado / Firma</th>
              <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Acciones</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
            {filteredDocs.map((doc) => {
              const statusInfo = getSignatureStatus(doc.signatureStatus);
              const StatusIcon = statusInfo.icon;

              return (
                <tr key={doc.id} className={`transition-colors ${darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                  {/* ID / Titulo */}
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 p-2 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        {getFileIcon(doc.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <div className={`font-mono text-[9px] uppercase px-1 rounded border ${darkMode ? 'border-blue-900 text-blue-400 bg-blue-900/20' : 'border-blue-200 text-blue-600 bg-blue-50'}`}>{doc.idDoc}</div>
                          <div className={`text-[9px] font-extrabold uppercase px-1 rounded border ${darkMode ? 'border-slate-700 text-slate-400 bg-slate-800' : 'border-slate-200 text-slate-500 bg-slate-100'}`}>{doc.category}</div>
                        </div>
                        <div className={`font-bold text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{doc.name}</div>
                        <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{doc.size} • {doc.type.toUpperCase()}</div>
                      </div>
                    </div>
                  </td>

                  {/* Fecha / Hora */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{doc.uploadDate}</span>
                      <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{doc.uploadTime}</span>
                    </div>
                  </td>

                  {/* Remitente / Destinatario */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {docView === 'inbox' ? doc.uploadedBy : doc.receivedBy}
                      </span>
                      <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                        {docView === 'inbox' ? doc.department : doc.targetDepartment}
                      </span>
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusInfo.color} ${darkMode ? 'border-transparent' : 'border-transparent'}`}>
                      <StatusIcon size={12} />
                      {statusInfo.label}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {docView === 'inbox' && doc.signatureStatus === 'pendiente' && (
                        <button
                          onClick={() => updateDocumentStatus(doc.id, 'en-proceso')}
                          className={`p-2 rounded-lg ${darkMode ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/40' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                          title="Confirmar Recepción"
                        >
                          <Inbox size={16} />
                        </button>
                      )}
                      {docView === 'inbox' && doc.signatureStatus === 'en-proceso' && (
                        <>
                          <button
                            onClick={() => updateDocumentStatus(doc.id, 'aprobado')}
                            className={`p-2 rounded-lg ${darkMode ? 'bg-green-600/20 text-green-400 hover:bg-green-600/40' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                            title="Aprobar / Firmar"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => updateDocumentStatus(doc.id, 'rechazado')}
                            className={`p-2 rounded-lg ${darkMode ? 'bg-red-600/20 text-red-400 hover:bg-red-600/40' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                            title="Rechazar"
                          >
                            <X size={16} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => viewDocument(doc)}
                        className={`p-2 rounded-lg transition-all ${darkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'}`}
                        title="Ver Documento"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredDocs.length === 0 && (
          <div className={`p-8 text-center ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            <p>No se encontraron documentos con los filtros seleccionados.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const PrinterControl: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operativo':
        return { bg: darkMode ? 'bg-green-500/10' : 'bg-green-50', text: darkMode ? 'text-green-400' : 'text-green-700', icon: Check };
      case 'mantenimiento':
        return { bg: darkMode ? 'bg-blue-500/10' : 'bg-blue-50', text: darkMode ? 'text-blue-400' : 'text-blue-700', icon: Clock };
      case 'fuera-servicio':
        return { bg: darkMode ? 'bg-red-500/10' : 'bg-red-50', text: darkMode ? 'text-red-400' : 'text-red-700', icon: AlertOctagon };
      default:
        return { bg: '', text: '', icon: AlertOctagon };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center pb-4 border-b border-slate-200/10">
        <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          Control de Impresoras y Toners
        </h2>
        <button className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}>
          <Printer size={16} className="inline mr-2" />
          Generar Reporte
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PRINTERS.map((printer) => {
          const status = getStatusColor(printer.status);
          const Icon = status.icon;

          return (
            <div
              key={printer.id}
              className={`rounded-lg border p-4 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className={`font-bold text-sm ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                    {printer.name}
                  </h3>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {printer.model}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 ${status.bg
                  } ${status.text}`}>
                  <Icon size={12} />
                  {printer.status.toUpperCase()}
                </span>
              </div>
              <div className="space-y-3 mb-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Ubicación</span>
                    <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>{printer.location}</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Nivel de Tóner</span>
                    <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>{printer.tonerLevel}%</span>
                  </div>
                  <div className={`h-2 w-full rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'
                    }`}>
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${printer.tonerLevel > 50 ? 'bg-green-500' :
                        printer.tonerLevel > 20 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                      style={{ width: `${printer.tonerLevel}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Nivel de Papel</span>
                    <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>{printer.paperLevel}%</span>
                  </div>
                  <div className={`h-2 w-full rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'
                    }`}>
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${printer.paperLevel > 50 ? 'bg-green-500' :
                        printer.paperLevel > 20 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                      style={{ width: `${printer.paperLevel}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className={`text-xs p-2 rounded ${darkMode ? 'bg-slate-800' : 'bg-slate-50'
                }`}>
                <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                  Último mantenimiento: {printer.lastMaintenance}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Módulo importado desde archivo externo
import SecurityModule from './security/page';

const ChartsModule: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const [view, setView] = useState<'overview' | 'drilldown'>('overview');
  const [selectedDept, setSelectedDept] = useState<string>('all');

  // Mock data for Documents Status
  const docStatusData = [
    { name: 'Aprobados', value: 45, color: '#10b981' },
    { name: 'Pendientes', value: 25, color: '#f59e0b' },
    { name: 'En Proceso', value: 20, color: '#3b82f6' },
    { name: 'Rechazados', value: 10, color: '#ef4444' }
  ];

  // Mock data for Ticket Priority
  const ticketPriorityData = [
    { name: 'Alta', value: 15, color: '#ef4444' },
    { name: 'Media', value: 35, color: '#f59e0b' },
    { name: 'Baja', value: 50, color: '#10b981' }
  ];

  // Mock data for Drill-down (Documents by Department)
  const deptData = [
    { name: 'TIC', docs: 120, tickets: 45 },
    { name: 'RRHH', docs: 85, tickets: 20 },
    { name: 'Finanzas', docs: 65, tickets: 15 },
    { name: 'Jurídico', docs: 45, tickets: 10 },
    { name: 'Seguridad', docs: 30, tickets: 25 }
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setView('overview')}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${view === 'overview' ? 'bg-red-700 text-white' : (darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}`}
          >
            Vista General
          </button>
          <button
            onClick={() => setView('drilldown')}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${view === 'drilldown' ? 'bg-red-700 text-white' : (darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}`}
          >
            Desglose por Depto.
          </button>
        </div>
        {view === 'drilldown' && (
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className={`px-3 py-2 rounded-md border text-sm outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'}`}
          >
            <option value="all">Todos los Departamentos</option>
            {deptData.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>
        )}
      </div>

      {view === 'overview' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Chart 1: Document Status */}
          <div className={`p-6 rounded-lg border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className={`font-bold mb-6 text-center ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>ESTADO DE DOCUMENTOS</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={docStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {docStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: darkMode ? '#0f172a' : '#fff',
                      borderColor: darkMode ? '#1e293b' : '#e2e8f0',
                      color: darkMode ? '#f1f5f9' : '#1e293b'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Ticket Priority */}
          <div className={`p-6 rounded-lg border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className={`font-bold mb-6 text-center ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>PRIORIDAD DE TICKETS</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ticketPriorityData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                    dataKey="value"
                  >
                    {ticketPriorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: darkMode ? '#0f172a' : '#fff',
                      borderColor: darkMode ? '#1e293b' : '#e2e8f0',
                      color: darkMode ? '#f1f5f9' : '#1e293b'
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className={`p-6 rounded-lg border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className={`font-bold mb-6 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>DESEMPEÑO POR DEPARTAMENTO</h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={selectedDept === 'all' ? deptData : deptData.filter(d => d.name === selectedDept)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                  <XAxis
                    dataKey="name"
                    stroke={darkMode ? '#94a3b8' : '#64748b'}
                    fontSize={12}
                  />
                  <YAxis
                    stroke={darkMode ? '#94a3b8' : '#64748b'}
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: darkMode ? '#0f172a' : '#fff',
                      borderColor: darkMode ? '#1e293b' : '#e2e8f0',
                      color: darkMode ? '#f1f5f9' : '#1e293b'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="docs" name="Documentos Totales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="tickets" name="Tickets Resueltos" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {deptData.map((d, i) => (
              <div key={i} className={`p-4 rounded-lg border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <h4 className="font-bold text-sm mb-2">{d.name}</h4>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Eficiencia</span>
                  <span className="text-green-500">85%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: '85%' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// DASHBOARD PRINCIPAL (MODULAR)
// ==========================================
export default function Dashboard() {
  // ✅ HOOKS (Must be at top)
  const useRouterHook = useRouter();
  const router = useRouterHook; // Consistent with my usage below
  useIdleTimer(900000); // Auto-logout after 15 mins

  const [darkMode, setDarkMode] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedCategories, setExpandedCategories] = useState<number[]>([0, 1, 2, 3, 4]);
  const [selectedManagement, setSelectedManagement] = useState<string | null>(null);

  // ROLE SELECTOR STATE
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'user'>('admin');

  // Lifted state for documents to share with SecurityModule
  const [documents, setDocuments] = useState<Document[]>(INITIAL_DOCUMENTS);

  // Organizational Structure State
  const [orgStructure, setOrgStructure] = useState<OrgCategory[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('org_structure_data');
    if (saved) {
      setOrgStructure(JSON.parse(saved));
    } else {
      setOrgStructure(DEFAULT_ORG_STRUCTURE);
    }
  }, []);

  useEffect(() => {
    if (orgStructure.length > 0) {
      localStorage.setItem('org_structure_data', JSON.stringify(orgStructure));
    }
  }, [orgStructure]);

  // ✅ AÑADE EL ESTADO PARA EL BOT DE AYUDA
  const [isChatOpen, setIsChatOpen] = useState(false);

  // ESTADO DE ANUNCIOS (Dashboard General)
  const [announcement, setAnnouncement] = useState<AnnouncementData>({
    badge: "Comunicado del Día",
    title: "Actualización de Protocolos de Seguridad 2026",
    description: "Se les informa a todas las gerencias que a partir de las 14:00h se iniciará la migración de los protocolos de firma digital. Por favor, aseguren sus trámites pendientes.",
    status: "Activo",
    urgency: "Alta"
  });

  // Persistencia de anuncios
  useEffect(() => {
    const saved = localStorage.getItem('dashboard_announcement');
    if (saved) {
      try {
        setAnnouncement(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading announcement", e);
      }
    }

    // Check for tab in URL
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
      if (tab === 'seguridad') setActiveSection('dashboard');
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('dashboard_announcement', JSON.stringify(announcement));
    }
  }, [announcement, mounted]);

  const theme = useMemo(() => ({
    bg: darkMode ? 'bg-zinc-950' : 'bg-slate-50',
    header: darkMode ? 'bg-zinc-950/90 border-zinc-800' : 'bg-white/90 border-slate-200',
    sidebar: darkMode ? 'bg-black border-zinc-800' : 'bg-white border-slate-200',
    text: darkMode ? 'text-zinc-200' : 'text-slate-900',
    subtext: darkMode ? 'text-zinc-500' : 'text-slate-400',
    cardBg: darkMode ? 'bg-zinc-900' : 'bg-white'
  }), [darkMode]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      document.documentElement.classList.toggle('dark', darkMode);
    }
  }, [darkMode, mounted]);

  const stats = useMemo(() => {
    if (userRole === 'user') {
      return [
        { title: "Mis Alertas", value: "1", subtext: "Requieren atención", icon: AlertTriangle, trend: "0", trendPositive: true },
        { title: "Mis Tickets", value: "5", subtext: "Asignados a mí", icon: Tag, trend: "+1", trendPositive: true }
      ];
    }
    return [
      { title: "Total Departamentos", value: "23", subtext: "Estructura completa", icon: Building2, trend: "+2", trendPositive: true },
      { title: "Unidades Operativas", value: "6", subtext: "Plantas activas", icon: Factory, trend: "0", trendPositive: true },
      { title: "Alertas Activas", value: "3", subtext: "Requieren atención", icon: AlertTriangle, trend: "-1", trendPositive: true },
      { title: "Disponibilidad", value: "91%", subtext: "Promedio general", icon: TrendingUp, trend: "+2%", trendPositive: true }
    ];
  }, [userRole]);

  if (!mounted) return null;

  const toggleCategory = (index: number) => {
    setExpandedCategories(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'prioridades':
        return <PriorityMatrix darkMode={darkMode} userRole={userRole} />;
      case 'tickets':
        return <TicketSystem darkMode={darkMode} orgStructure={orgStructure} userRole={userRole} currentUser={userRole === 'admin' ? 'Admin. General' : 'Usuario Estándar'} />;
      case 'documentos':
        return <DocumentManager
          darkMode={darkMode}
          userRole={userRole}
          documents={documents}
          setDocuments={setDocuments}
          orgStructure={orgStructure}
        />;
      case 'impresoras':
        return <PrinterControl darkMode={darkMode} />;
      case 'seguridad':
        return <SecurityModule
          darkMode={darkMode}
          announcement={announcement}
          setAnnouncement={setAnnouncement}
          documents={documents}
          setDocuments={setDocuments}
          userRole={userRole}
          orgStructure={orgStructure}
          setOrgStructure={setOrgStructure}
        />;
      case 'graficos':
        return <ChartsModule darkMode={darkMode} />;
      case 'overview':
      default:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* WELCOME SECTION */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className={`text-3xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  ¡Bienvenido de nuevo, {userRole === 'admin' ? 'Admin. General' : 'Usuario Estándar'}!
                </h1>
                <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div className={`px-4 py-2 rounded-lg border ${darkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-slate-200'} flex items-center gap-3`}>
                <div className={`w-2 h-2 rounded-full bg-green-500 animate-pulse`} />
                <span className="text-xs font-medium">Sistema Operativo</span>
              </div>
            </div>

            {/* ANNOUNCEMENT BANNER */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-700 via-red-600 to-orange-600 p-8 shadow-xl shadow-red-900/20">
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="space-y-2">
                  <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                    {announcement.badge}
                  </span>
                  <h2 className="text-2xl font-bold text-white">{announcement.title}</h2>
                  <p className="text-red-100 max-w-xl text-sm leading-relaxed">
                    {announcement.description}
                  </p>
                </div>
                <div className="bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/20 flex items-center gap-4 shrink-0">
                  <div className="text-center px-4 border-r border-white/20">
                    <p className="text-[10px] text-red-200 uppercase font-bold">Estado</p>
                    <p className="text-xl font-bold text-white uppercase">{announcement.status}</p>
                  </div>
                  <div className="text-center px-4">
                    <p className="text-[10px] text-red-200 uppercase font-bold">Urgencia</p>
                    <p className="text-xl font-bold text-white uppercase">{announcement.urgency}</p>
                  </div>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl pointer-events-none" />
            </div>

            {/* MANAGEMENT HISTORY / STRUCTURE GRID */}
            <div className={`rounded-2xl border ${darkMode ? 'bg-zinc-900/30 border-zinc-800' : 'bg-white border-slate-200'} overflow-hidden`}>
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-zinc-800' : 'border-slate-100'} flex justify-between items-center`}>
                <div>
                  <h3 className={`font-bold text-base ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Trazabilidad de Gerencias</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Historial de estructura y departamentos institucionales</p>
                </div>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {orgStructure.map((group: OrgCategory, index: number) => (
                  <DeptCard
                    key={index}
                    group={group}
                    darkMode={darkMode}
                    onToggle={() => toggleCategory(index)}
                    onItemClick={(item) => setSelectedManagement(item)}
                  />
                ))}
              </div>
            </div>

            {/* QUICK ACTIONS & EXTERNAL LINKS */}
            <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="https://workspace.google.com/intl/es-419/gmail/"
                target="_blank"
                rel="noopener noreferrer"
                className={`p-4 rounded-xl border flex items-center gap-4 transition-all group ${darkMode ? 'bg-zinc-900 border-zinc-800 hover:border-red-900/50 hover:bg-zinc-800/50' : 'bg-white border-slate-200 hover:border-red-200 hover:shadow-lg hover:shadow-red-500/5'}`}
              >
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'} group-hover:scale-110 transition-transform`}>
                  <Mail size={24} />
                </div>
                <div>
                  <p className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>Correo Corporativo</p>
                  <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Acceder a Gmail Workspace</p>
                </div>
              </a>

              <a
                href="https://quillbot.com/es/corrector-ortografico"
                target="_blank"
                rel="noopener noreferrer"
                className={`p-4 rounded-xl border flex items-center gap-4 transition-all group ${darkMode ? 'bg-zinc-900 border-zinc-800 hover:border-blue-900/50 hover:bg-zinc-800/50' : 'bg-white border-slate-200 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5'}`}
              >
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-600'} group-hover:scale-110 transition-transform`}>
                  <Sparkles size={24} />
                </div>
                <div>
                  <p className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>Corrector Ortográfico</p>
                  <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Refinar redacción de oficios</p>
                </div>
              </a>

              <button
                onClick={() => router.push('/')}
                className={`p-4 rounded-xl border flex items-center gap-4 transition-all group text-left ${darkMode ? 'bg-zinc-900 border-zinc-800 hover:border-slate-700 hover:bg-zinc-800/50' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-500/5'}`}
              >
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'} group-hover:scale-110 transition-transform`}>
                  <LogOut size={24} />
                </div>
                <div>
                  <p className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>Cerrar Sesión</p>
                  <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Finalizar jornada laboral</p>
                </div>
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} font-sans transition-colors duration-300`}>
      {/* SIDEBAR */}
      <aside className={`
        fixed top-0 left-0 bottom-0 z-50 ${theme.sidebar} border-r transition-all duration-300
        ${collapsed ? 'w-16' : 'w-64'}
      `}>
        <div className="flex flex-col h-full">
          {/* HEADER SIDEBAR */}
          <div className={`h-16 flex items-center ${collapsed ? 'justify-center' : 'px-6'} border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center shrink-0">
                <img src="/logo-rojo.png" alt="Corpoelec" className="w-full h-full object-contain" />
              </div>
              {!collapsed && (
                <div className="flex flex-col leading-none">
                  <span className={`font-bold text-sm tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>CORPOELEC</span>
                  <span className={`text-[10px] font-medium tracking-wider mt-0.5 ${darkMode ? 'text-red-200' : 'text-red-700'}`}>INDUSTRIAL</span>
                </div>
              )}
            </div>
          </div>
          {/* NAVIGATION */}
          <nav className="flex-1 p-3 space-y-1">
            <SidebarItem
              icon={Home}
              label="Dashboard General"
              active={activeSection === 'dashboard' && activeTab === 'overview'}
              collapsed={collapsed}
              darkMode={darkMode}
              onClick={() => {
                setActiveSection('dashboard');
                setActiveTab('overview');
              }}
            />
            <SidebarItem
              icon={Flag}
              label="Matriz de Prioridades"
              active={activeSection === 'dashboard' && activeTab === 'prioridades'}
              collapsed={collapsed}
              darkMode={darkMode}
              onClick={() => {
                setActiveSection('dashboard');
                setActiveTab('prioridades');
              }}
            />
            <SidebarItem
              icon={Tag}
              label="Sistema de Tickets"
              active={activeSection === 'dashboard' && activeTab === 'tickets'}
              collapsed={collapsed}
              darkMode={darkMode}
              onClick={() => {
                setActiveSection('dashboard');
                setActiveTab('tickets');
              }}
            />
            <SidebarItem
              icon={FileText}
              label="Gestor Documental"
              active={activeSection === 'dashboard' && activeTab === 'documentos'}
              collapsed={collapsed}
              darkMode={darkMode}
              onClick={() => {
                setActiveSection('dashboard');
                setActiveTab('documentos');
              }}
            />
            {userRole === 'admin' && (
              <SidebarItem
                icon={Printer}
                label="Control de Impresoras"
                active={activeSection === 'dashboard' && activeTab === 'impresoras'}
                collapsed={collapsed}
                darkMode={darkMode}
                onClick={() => {
                  setActiveSection('dashboard');
                  setActiveTab('impresoras');
                }}
              />
            )}
            {userRole === 'admin' && (
              <SidebarItem
                icon={Shield}
                label="Módulo de Seguridad"
                active={activeSection === 'dashboard' && activeTab === 'seguridad'}
                collapsed={collapsed}
                darkMode={darkMode}
                onClick={() => {
                  setActiveSection('dashboard');
                  setActiveTab('seguridad');
                }}
              />
            )}
            {userRole === 'admin' && (
              <SidebarItem
                icon={BarChart2}
                label="Gráficos"
                active={activeTab === 'graficos'}
                collapsed={collapsed}
                darkMode={darkMode}
                onClick={() => {
                  setActiveSection('dashboard');
                  setActiveTab('graficos');
                }}
              />
            )}
          </nav>
          {/* FOOTER SIDEBAR */}
          <div className={`p-3 border-t ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={`
                w-full flex items-center justify-center h-9 rounded-md transition-colors
                ${darkMode
                  ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }
              `}
            >
              <ChevronRight size={18} className={`transition-transform duration-300 ${!collapsed && 'rotate-180'}`} />
            </button>
          </div>
        </div>
      </aside>
      {/* MAIN CONTENT */}
      <main className={`transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-64'}`}>
        {/* TOP HEADER */}
        <header className={`
          sticky top-0 z-40 h-16 px-6 flex items-center justify-between ${theme.header} border-b
        `}>
          <div className="flex items-center gap-4">
            <h2 className={`font-semibold text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              Sistema de Gestión Institucional <span className="mx-2 text-slate-500">|</span> <span className="text-slate-500 font-normal">Alfa 2026 V-1.0</span>
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle darkMode={darkMode} onToggle={() => setDarkMode(!darkMode)} />
            <div className={`h-6 w-px ${darkMode ? 'bg-slate-800' : 'bg-slate-300'}`} />
            <div className="relative">
              <div
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center gap-3 cursor-pointer hover:bg-slate-100/10 p-1 rounded-md transition-colors"
              >
                <div className="text-right hidden sm:block leading-tight">
                  <p className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                    {userRole === 'admin' ? 'Admin. General' : 'Usuario Estándar'}
                  </p>
                  <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                    {userRole === 'admin' ? 'Gerencia TI' : 'Invitado'}
                  </p>
                </div>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-offset-2 ring-offset-transparent ring-slate-200/20 ${userRole === 'admin' ? 'bg-red-800' : 'bg-blue-600'}`}>
                  {userRole === 'admin' ? 'AG' : 'UE'}
                </div>
              </div>

              {/* DROPDOWN MENU */}
              {roleMenuOpen && (
                <div className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5 focus:outline-none ${darkMode ? 'bg-zinc-900 border border-zinc-700' : 'bg-white border border-slate-200'}`}>
                  <button
                    onClick={() => {
                      setUserRole('admin');
                      setRoleMenuOpen(false);
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm ${userRole === 'admin' ? (darkMode ? 'bg-zinc-800 text-white' : 'bg-slate-100 text-slate-900') : (darkMode ? 'text-slate-300 hover:bg-zinc-800' : 'text-slate-700 hover:bg-slate-100')}`}
                  >
                    Administrador
                  </button>
                  <button
                    onClick={() => {
                      setUserRole('user');
                      setRoleMenuOpen(false);
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm ${userRole === 'user' ? (darkMode ? 'bg-zinc-800 text-white' : 'bg-slate-100 text-slate-900') : (darkMode ? 'text-slate-300 hover:bg-zinc-800' : 'text-slate-700 hover:bg-slate-100')}`}
                  >
                    Usuario
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        {/* WORKSPACE */}
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {/* BREADCRUMB / TITLE */}
          {/* BREADCRUMB / TITLE - Hidden on overview as it has its own welcome header */}
          {activeTab !== 'overview' && (
            <div className="flex justify-between items-center pb-6 border-b border-slate-200/10">
              <div>
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {activeTab === 'prioridades' ? 'Matriz de Prioridades' :
                    activeTab === 'tickets' ? 'Sistema de Tickets' :
                      activeTab === 'documentos' ? 'Gestor Documental' :
                        activeTab === 'seguridad' ? 'Módulo de Seguridad' :
                          activeTab === 'graficos' ? 'Módulo de Estadísticas y Gráficos' :
                            'Control de Impresoras y Toners'}
                </h1>
                <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {activeTab === 'prioridades' ? 'Control y seguimiento de tareas prioritarias por gerencia.' :
                    activeTab === 'tickets' ? 'Gestión de solicitudes técnicas y administrativas.' :
                      activeTab === 'documentos' ? 'Administración de documentos institucionales y firmas.' :
                        activeTab === 'seguridad' ? 'Gestión de usuarios, permisos y auditoría de seguridad.' :
                          activeTab === 'graficos' ? 'Visualización de datos estratégicos y métricas de desempeño.' :
                            'Monitoreo del estado operativo de impresoras y niveles de suministros.'}
                </p>
              </div>
            </div>
          )}
          {/* CONTENT AREA */}
          {renderContent()}
        </div>
      </main>

      {/* ✅ INTEGRA EL BOT DE AYUDA AL FINAL DEL COMPONENTE */}
      <BotButton onOpenChat={() => setIsChatOpen(true)} />
      <ChatWindow isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* MODAL DE DETALLE DE GERENCIA */}
      <DetailModal
        isOpen={!!selectedManagement}
        onClose={() => setSelectedManagement(null)}
        title={selectedManagement || ''}
        functions={selectedManagement && MANAGEMENT_DETAILS[selectedManagement] ? MANAGEMENT_DETAILS[selectedManagement] : (selectedManagement ? getDefaultFunctions(selectedManagement) : [])}
        darkMode={darkMode}
      />
    </div>
  );
}
