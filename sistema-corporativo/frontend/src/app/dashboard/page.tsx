"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import TicketSystem, { Ticket } from '@/components/TicketSystem';
import MasterPermissionPanel from '@/components/MasterPermissionPanel';
import { logDocumentActivity } from '@/app/dashboard/security/actions';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { UserRole, User } from '@/context/AuthContext';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import { DepartmentGrid } from './components/DepartmentGrid';
import { DepartmentDetailView } from './components/DepartmentDetailView';
import { OrgCategory, Document } from './types';
import { RoleGuard } from '@/components/RoleGuard';
import { PERMISSIONS_MASTER } from '@/permissions/constants';
import {
  getDocumentos,
  uploadDocumento,
  updateDocumentStatus as apiUpdateStatus,
  getAllUsers,
  getGerencias
} from '../../lib/api';
import { ApiDocument, ApiUser } from '@/lib/api';

// ==========================================
// TIPOS Y INTERFACES
// ==========================================

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
// Mapping icons for serialization support
const ORG_ICONS: Record<string, React.ElementType> = {
  Shield,
  Briefcase,
  Zap,
  Users,
  Factory
};

const DEFAULT_ORG_STRUCTURE: OrgCategory[] = [
  {
    category: "I. Alta Dirección y Control",
    icon: "Shield",
    items: ["Gerencia General", "Auditoria Interna", "Consultoria Juridica", "Gerencia Nacional de Planificacion y presupuesto"]
  },
  {
    category: "II. Gestión Administrativa",
    icon: "Briefcase",
    items: ["Gerencia Nacional de Administracion", "Gerencia Nacional de Gestion Humana", "Gerencia Nacional de Tecnologias de la informacion y la comunicacion", "Gerencia nacional de tecnologias de proyectos"]
  },
  {
    category: "III. Gestión Operativa y ASHO",
    icon: "Zap",
    items: ["Gerencia Nacional de Adecuaciones y Mejoras", "Gerencia Nacional de Asho", "Gerencia Nacional de Atencion al Ciudadano", "Gerencia de Comercializacion"]
  },
  {
    category: "IV. Energía y Comunidad",
    icon: "Users",
    items: ["Gerencia Nacional de energia alternativa y eficiencia energetica", "Gerencia Nacional de gestion comunical"]
  },
  {
    category: "V. Filiales y Unidades",
    icon: "Factory",
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
  ],
  "Gestión Directa": [
    "Acceso a la terminal de comandos del servidor.",
    "Monitoreo de procesos en tiempo real.",
    "Ajuste de variables de entorno críticas.",
    "Gestión de certificados SSL y seguridad perimetral."
  ],
  "Bypass de Sistema": [
    "Activación de protocolos de emergencia.",
    "Salto de validación MFA para soporte técnico.",
    "Recuperación forzada de cuentas administrativas.",
    "Desactivación temporal de firewalls de aplicación."
  ],
  "Logs de Auditoría": [
    "Consulta de trazas de base de datos a bajo nivel.",
    "Historial completo de intentos de intrusión.",
    "Seguimiento de cambios en esquemas de permisos.",
    "Exportación de logs en formato raw JSON/CSV."
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

const INITIAL_TICKETS: Ticket[] = [
  {
    id: 1,
    title: "Mantenimiento Preventivo Servidores",
    description: "Revisión mensual de racks y sistemas de enfriamiento en el centro de datos.",
    status: 'EN-PROCESO',
    priority: 'ALTA',
    area: 'Gerencia Nacional de Tecnologias de la informacion y la comunicacion',
    createdAt: "01/02/2026",
    owner: "Admin. General"
  },
  {
    id: 2,
    title: "Soporte Técnico Usuario RRHH",
    description: "Falla en el software de nómina, no permite procesar pagos.",
    status: 'ABIERTO',
    priority: 'MEDIA',
    area: 'Gerencia Nacional de Gestion Humana',
    createdAt: "02/02/2026",
    owner: "Usuario Estándar"
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
          {(() => {
            const IconComp = ORG_ICONS[group.icon] || Shield;
            return <IconComp size={16} className={darkMode ? 'text-slate-400' : 'text-slate-500'} />;
          })()}
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
const PriorityMatrix: React.FC<{
  darkMode: boolean;
  userRole: UserRole;
  isReadOnly?: boolean;
  hasPermission: (permission: string) => boolean;
}> = ({ darkMode, userRole, isReadOnly, hasPermission }) => {
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

  const filteredPriorities = hasPermission(PERMISSIONS_MASTER.PRIORITIES_VIEW_ALL)
    ? PRIORITY_MATRIX
    : PRIORITY_MATRIX.filter(item =>
      item.responsible.includes('TIC') || item.responsible === 'Gerencia TI'
    );

  return (
    <div className="space-y-4 pt-2">
      {hasPermission(PERMISSIONS_MASTER.PRIORITIES_EXPORT) && (
        <div className="flex justify-end mb-2">
          <button className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}>
            <Download size={16} className="inline mr-2" />
            Exportar
          </button>
        </div>
      )}
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
  userRole: UserRole;
  userDept: string;
  documents: Document[];
  setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
  orgStructure: OrgCategory[];
  isReadOnly?: boolean;
  hasPermission: (permission: string) => boolean;
  user: User | null;
  users: any[];
  gerencias: any[];
  refreshDocs: () => void;
}> = ({ darkMode, userRole, userDept, documents, setDocuments, orgStructure, isReadOnly, hasPermission, user, users, gerencias, refreshDocs }) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [docView, setDocView] = useState<'inbox' | 'sent'>('inbox');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docName, setDocName] = useState('');
  const [sentBy, setSentBy] = useState('Maria Rodríguez');
  const [docCategory, setDocCategory] = useState('Informe');
  const [targetDeptId, setTargetDeptId] = useState<string>('');
  const [correlativo, setCorrelativo] = useState('');

  // Extract unique departments for filter
  const departments = useMemo(() => {
    return orgStructure.flatMap(group => group.items);
  }, [orgStructure]);

  useEffect(() => {
    if (gerencias.length > 0 && !targetDeptId) {
      setTargetDeptId(gerencias[0].id.toString());
    }
  }, [gerencias, targetDeptId]);

  const MY_DEPT = "Gerencia Nacional de Tecnologias de la informacion y la comunicacion";

  const filteredDocs = documents.filter(doc => {
    const myDept = userDept;

    // LOGICA CORREGIDA DE FILTRADO (ID + STRICT MATCH)
    const canViewAll = hasPermission(PERMISSIONS_MASTER.DOCS_VIEW_ALL);
    const canViewDept = hasPermission(PERMISSIONS_MASTER.DOCS_VIEW_DEPT);

    if (docView === 'inbox') {
      // BANDEJA DE ENTRADA: Documentos donde SOY EL RECEPTOR o MI GERENCIA es la RECEPTORA
      // Si soy admin (canViewAll), veo todo.
      if (!canViewAll) {
         // Si tengo permiso de ver mi DEPTO, veo docs donde targetDept == myUserDept
         if (canViewDept) {
             // Normalizamos strings para comparar
             const docTarget = (doc.targetDepartment || "").toLowerCase().trim();
             const userTarget = (user?.gerencia_depto || "").toLowerCase().trim();
             // Coincidencia laxa por nombre
             if (docTarget !== userTarget) return false; 
         } else {
             // Si soy usuario raso, solo veo donde YO soy el receptor directo
             // TODO: Verificar si backend envía 'receptor_id' o nombre. Por ahora comparamos nombre.
             const docReceiver = (doc.receivedBy || "").toLowerCase();
             const userName = (user?.nombre + " " + user?.apellido).toLowerCase();
             
             // Fail safe: si no coincide nombre exacto, ocultar.
             if (!docReceiver.includes(userName)) return false;
         }
      }
    } else {
      // ENVIADOS: Documentos donde YO soy el REMITENTE
      if (!canViewAll) {
          const docSender = (doc.uploadedBy || "").toLowerCase();
          const userName = (user?.nombre + " " + user?.apellido).toLowerCase();
          if (!docSender.includes(userName)) return false;
      }
    }

    if (filterStatus !== 'all' && doc.signatureStatus !== filterStatus) return false;
    // Fix: usar filtro de gerencia solo si es admin
    if (hasPermission(PERMISSIONS_MASTER.VIEW_SECURITY) && filterDept !== 'all') {
        const docOrigin = (doc.department || "").toLowerCase();
        const docTarget = (doc.targetDepartment || "").toLowerCase();
        const filter = filterDept.toLowerCase();
        if (docOrigin !== filter && docTarget !== filter) return false;
    }
    
    if (searchTerm && !doc.name.toLowerCase().includes(searchTerm.toLowerCase()) && !doc.idDoc.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const updateDocumentStatus = async (id: number, newStatus: Document['signatureStatus']) => {
    try {
      await apiUpdateStatus(id, newStatus);
      refreshDocs();
      await logDocumentActivity({
        username: userRole === 'CEO' ? "Admin. General" : "Usuario Estándar",
        evento: 'FLUJO DOCUMENTAL',
        detalles: `Cambio de estado en documento ID ${id} a ${newStatus.toUpperCase()}`,
        estado: newStatus === 'aprobado' ? 'success' : newStatus === 'rechazado' ? 'danger' : 'info'
      });
    } catch (e) {
      console.error("Error updating status", e);
      alert("Error al actualizar el estado del documento.");
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Hardened Validation: Only PDF allowed
    if (file.type !== 'application/pdf') {
      alert("Error: Solo se permiten archivos en formato PDF.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
    setDocName(file.name);
    setShowUploadModal(true);
  };

  const confirmUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('titulo', docName);
    formData.append('correlativo', correlativo);
    formData.append('tipo_documento', docCategory);
    formData.append('prioridad', 'media'); // Default
    formData.append('receptor_gerencia_id', targetDeptId);
    // formData.append('receptor_id', targetUser); // Removed in favor of Gerencia
    formData.append('archivo', selectedFile);

    try {
      await uploadDocumento(formData);
      refreshDocs();

      await logDocumentActivity({
        username: hasPermission(PERMISSIONS_MASTER.VIEW_SECURITY) ? "Admin. General" : "Usuario Estándar",
        evento: 'GESTIÓN DOCUMENTAL',
        detalles: `Subida de documento real: "${docName}"`,
        estado: 'success'
      });

      setShowUploadModal(false);
      setSelectedFile(null);
      setDocName('');
      setCorrelativo('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      alert(`Documento "${docName}" subido con éxito.`);
    } catch (e) {
      console.error("Error uploading document:", e);
      alert("Error al subir el documento al servidor.");
    }
  };

  const myDept = userDept;

  const viewDocument = (doc: Document) => {
    if (doc.fileUrl) {
      window.open(doc.fileUrl, '_blank');
    } else {
      alert("Este es un documento de ejemplo sin archivo físico.");
    }
  };

  const getFileIcon = (type: string) => {
    // Only PDF icons after hardening
    return <FileText size={18} className="text-red-500" />;
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
        accept=".pdf"
      />

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
            <div className="p-6 border-b flex justify-between items-center bg-green-700 text-white">
              <h2 className="font-bold flex items-center gap-2 uppercase tracking-tight text-white">
                <FileCheck size={20} />
                REGISTRAR DOCUMENTO
              </h2>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">Fecha / Hora de Registro</label>
                  <div className={`w-full px-4 py-2.5 rounded-lg border text-sm opacity-70 ${darkMode ? 'bg-slate-950 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                    {new Date().toLocaleDateString('es-ES')} {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">Correlativo (Máx 15 chars)</label>
                  <input
                    required
                    maxLength={15}
                    value={correlativo}
                    onChange={(e) => setCorrelativo(e.target.value)}
                    placeholder="Ej: COR-2026-001"
                    className={`w-full px-4 py-2.5 rounded-lg border outline-none text-sm ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
              </div>
              {/* Department Selection */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Gerencia Receptora (Destinatario)
                </label>
                <div className="relative">
                  <Building2 className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} size={18} />
                  <select
                    className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm font-medium transition-colors appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                    value={targetDeptId}
                    onChange={(e) => setTargetDeptId(e.target.value)}
                  >
                    {gerencias.map(g => (
                      <option key={g.id} value={g.id}>{g.nombre}</option>
                    ))}
                  </select>
                  <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowUploadModal(false); setSelectedFile(null); }}
                  className={`flex-1 py-3 rounded-lg font-bold text-xs tracking-widest border transition-all ${darkMode ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
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
        <div className={`flex p-1 rounded-lg border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
          <button
            onClick={() => setDocView('inbox')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${docView === 'inbox' ? 'bg-red-700 text-white' : (darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')}`}
          >
            <Inbox size={14} />
            BANDEJA DE ENTRADA
          </button>
          <button
            onClick={() => setDocView('sent')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${docView === 'sent' ? 'bg-red-700 text-white' : (darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')}`}
          >
            <Send size={14} />
            ENVIADOS
          </button>
        </div>
        <div className="flex gap-2">
          {hasPermission(PERMISSIONS_MASTER.DOCS_UPLOAD) && (
            <button
              onClick={handleUploadClick}
              className={`px-4 py-2 rounded-md text-sm font-medium ${darkMode ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-green-700 text-white hover:bg-green-800'}`}
            >
              + Nuevo Documento
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className={`p-4 rounded-lg flex flex-wrap gap-4 items-end ${darkMode ? 'bg-slate-900/50 border border-slate-800' : 'bg-slate-50 border border-slate-200'}`}>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Búsqueda</label>
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
        <div className="w-48">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estado</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`w-full px-3 py-2 rounded-md border text-sm outline-none cursor-pointer ${darkMode ? 'bg-slate-950 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'}`}
          >
            <option value="all">Todos los Estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="en-proceso">En Proceso</option>
            <option value="aprobado">Aprobados</option>
            <option value="rechazado">Rechazados</option>
            <option value="omitido">Omitidos</option>
          </select>
        </div>
        {hasPermission(PERMISSIONS_MASTER.VIEW_SECURITY) && (
          <div className="w-48">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Gerencia</label>
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
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200/20">
        <table className={`w-full ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
          <thead className={`${darkMode ? 'bg-slate-950/50' : 'bg-slate-50'} border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Documento</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Correlativo</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Fecha / Hora</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Gerencia Receptora</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Estado</th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Acciones</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
            {filteredDocs.map((doc) => {
              const statusInfo = getSignatureStatus(doc.signatureStatus);
              const StatusIcon = statusInfo.icon;
              return (
                <tr key={doc.id} className={`transition-colors ${darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 p-2 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        {getFileIcon(doc.type)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-200">{doc.name}</div>
                        <div className="text-xs text-slate-500">{doc.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-400">
                    {doc.correlativo || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {doc.uploadDate} {doc.uploadTime}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-full mr-3 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <Building2 size={16} className={darkMode ? 'text-indigo-400' : 'text-indigo-600'} />
                      </div>
                      <div>
                        {/* Mostrar Gerencia Destino + Nombre Receptor si existe (o 'Pendiente') */}
                        <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {doc.receptor_gerencia_nombre || doc.targetDepartment || "Sin Asignar"}
                        </div>
                        <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {doc.receivedBy !== "Pendiente" ? doc.receivedBy : "Por Asignar"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${statusInfo.color}`}>
                      <StatusIcon size={12} />
                      {statusInfo.label.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {docView === 'inbox' && doc.signatureStatus === 'pendiente' && hasPermission(PERMISSIONS_MASTER.DOCS_ACTION_RECEIVE) && (
                        <button onClick={() => updateDocumentStatus(doc.id, 'en-proceso')} className="p-1.5 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/40" title="Recibir"><Inbox size={14} /></button>
                      )}
                      {docView === 'inbox' && doc.signatureStatus === 'en-proceso' && (
                        <>
                          {hasPermission(PERMISSIONS_MASTER.DOCS_ACTION_APPROVE) && (
                            <button onClick={() => updateDocumentStatus(doc.id, 'aprobado')} className="p-1.5 rounded bg-green-600/20 text-green-400 hover:bg-green-600/40" title="Aprobar"><CheckCircle size={14} /></button>
                          )}
                          {hasPermission(PERMISSIONS_MASTER.DOCS_ACTION_REJECT) && (
                            <button onClick={() => updateDocumentStatus(doc.id, 'rechazado')} className="p-1.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/40" title="Rechazar"><X size={14} /></button>
                          )}
                        </>
                      )}
                      <button onClick={() => viewDocument(doc)} className="p-1.5 rounded hover:bg-slate-800 text-slate-400" title="Ver"><Eye size={16} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredDocs.length === 0 && (
          <div className="p-10 text-center text-slate-500 italic">No se encontraron documentos</div>
        )}
      </div>
    </div>
  );
};


// Módulo importado de forma dinámica para evitar errores de hidratación y mejorar carga de chunks
import dynamic from 'next/dynamic';
const SecurityModule = dynamic(() => import('./security/SecurityModule'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-20"><div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>
});

const ChartsModule: React.FC<{
  darkMode: boolean;
  documents: Document[];
  tickets: Ticket[];
  orgStructure: OrgCategory[];
}> = ({ darkMode, documents, tickets, orgStructure }) => {
  const [view, setView] = useState<'overview' | 'drilldown'>('overview');
  const [selectedDetailDept, setSelectedDetailDept] = useState<string | null>(null);

  // Dynamic data for Documents Status (Existing chart)
  const docStatusData = useMemo(() => {
    const counts = {
      aprobado: 0,
      pendiente: 0,
      'en-proceso': 0,
      rechazado: 0,
      omitido: 0
    };
    documents.forEach(doc => {
      if (counts.hasOwnProperty(doc.signatureStatus)) {
        counts[doc.signatureStatus]++;
      }
    });
    return [
      { name: 'Aprobados', value: counts.aprobado, color: '#10b981' },
      { name: 'Pendientes', value: counts.pendiente, color: '#f59e0b' },
      { name: 'En Proceso', value: counts['en-proceso'], color: '#3b82f6' },
      { name: 'Rechazados', value: counts.rechazado, color: '#ef4444' }
    ].filter(d => d.value > 0);
  }, [documents]);

  // Dynamic data for Ticket Priority (Existing chart)
  const ticketPriorityData = useMemo(() => {
    const counts = { ALTA: 0, MEDIA: 0, BAJA: 0 };
    tickets.forEach(t => {
      if (counts.hasOwnProperty(t.priority)) {
        counts[t.priority]++;
      }
    });
    return [
      { name: 'Alta', value: counts.ALTA, color: '#ef4444' },
      { name: 'Media', value: counts.MEDIA, color: '#f59e0b' },
      { name: 'Baja', value: counts.BAJA, color: '#10b981' }
    ].filter(t => t.value > 0);
  }, [tickets]);

  // Get all departments list
  const allDepartments = useMemo(() => {
    return orgStructure.flatMap(group => group.items);
  }, [orgStructure]);

  const handleDeptSelect = (dept: string) => {
    setSelectedDetailDept(dept);
    // Ya estamos en drilldown, pero aseguramos
    setView('drilldown');
  };

  const handleBackToGrid = () => {
    setSelectedDetailDept(null);
  };

  const handleMainViewChange = (newView: 'overview' | 'drilldown') => {
    setView(newView);
    if (newView === 'overview') {
      setSelectedDetailDept(null);
    }
  };

  return (
    <div className="space-y-6">
      {!selectedDetailDept && (
        <div className="flex justify-between items-center pb-4 border-b border-slate-200/10">
          <div>
            {view === 'overview' ? (
              <>
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Módulo de Estadísticas y Gráficos
                </h1>
                <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Visualización de datos estratégicos y métricas de desempeño.
                </p>
              </>
            ) : (
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Desglose por Departamento
              </h1>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleMainViewChange('overview')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${view === 'overview' ? 'bg-red-700 text-white' : (darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}`}
            >
              Vista General
            </button>
            <button
              onClick={() => handleMainViewChange('drilldown')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${view === 'drilldown' ? 'bg-red-700 text-white' : (darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}`}
            >
              Seleccionar Gerencia
            </button>
          </div>
        </div>
      )}

      {view === 'overview' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
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
        // Drill-down View Logic
        selectedDetailDept ? (
          <DepartmentDetailView
            departmentName={selectedDetailDept}
            allDepartments={allDepartments}
            documents={documents}
            tickets={tickets}
            darkMode={darkMode}
            onBack={handleBackToGrid}
            onDepartmentChange={handleDeptSelect}
          />
        ) : (
          <DepartmentGrid
            orgStructure={orgStructure}
            darkMode={darkMode}
            onSelectDepartment={handleDeptSelect}
          />
        )
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

  const { user, logout, switchRole, hasPermission } = useAuth();
  const userRole = user?.role || 'Usuario';
  const isDev = userRole === 'Desarrollador';

  // Granular Access Controls base on hasPermission (Permisos del Sistema Alfa 2026)
  const canAccessSecurity = hasPermission(PERMISSIONS_MASTER.VIEW_SECURITY);
  const canAccessStats = hasPermission(PERMISSIONS_MASTER.VIEW_STATS);
  const canAccessTickets = hasPermission(PERMISSIONS_MASTER.VIEW_TICKETS);
  const canAccessPriorities = hasPermission(PERMISSIONS_MASTER.VIEW_PRIORITIES);

  // Action specific check
  const isReadOnly = !hasPermission(PERMISSIONS_MASTER.DOCS_UPLOAD);

  // Lifted state for documents to share with SecurityModule
  const [documents, setDocuments] = useState<Document[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [gerencias, setGerencias] = useState<any[]>([]);

  const fetchDocuments = useCallback(async () => {
    try {
      const data = await getDocumentos();
      // Map backend fields to frontend props
      const mappedDocs = data.map((d: any) => ({
        id: d.id,
        idDoc: d.correlativo || `DOC-${d.id}`,
        name: d.titulo,
        category: d.tipo_documento,
        type: 'pdf' as const,
        size: "N/A",
        uploadedBy: d.remitente_nombre || "Desconocido",
        receivedBy: d.receptor_nombre || "Pendiente",
        uploadDate: new Date(d.fecha_creacion).toLocaleDateString('es-ES'),
        uploadTime: new Date(d.fecha_creacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        signatureStatus: d.estado as any,
        department: d.remitente_nombre ? d.remitente_nombre.split(' - ')[1] : "N/A",
        targetDepartment: d.receptor_nombre ? d.receptor_nombre.split(' - ')[1] : "N/A",
        correlativo: d.correlativo,
        fileUrl: d.url_archivo ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${d.url_archivo}` : undefined
      }));
      setDocuments(mappedDocs);
    } catch (e) {
      console.error("Error fetching documents", e);
    }
  }, []);

  const fetchGerencias = useCallback(async () => {
    try {
      const data = await getGerencias();
      setGerencias(data);
    } catch (e) {
      console.error("Error fetching gerencias", e);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    const data = await getAllUsers();
    setUsers(data);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchDocuments();
      fetchUsers();
      fetchGerencias();
    }
  }, [mounted, fetchDocuments, fetchUsers, fetchGerencias]);

  // Lifted state for tickets
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // Organizational Structure State
  const [orgStructure, setOrgStructure] = useState<OrgCategory[]>([]);

  useEffect(() => {
    // ✅ REGLA DE VISIBILIDAD DE ESTRUCTURA
    // Siempre partimos de la base completa para evitar quedarnos en un estado "recortado" (sliced)
    let data = JSON.parse(JSON.stringify(DEFAULT_ORG_STRUCTURE));

    // Si el usuario es Desarrollador, añadimos un canal exclusivo de categorías dev
    if (userRole === 'Desarrollador') {
      data.push({
        category: "VI. Módulo de Desarrollo y Control Raíz",
        icon: "Shield",
        items: ["Gestión Directa", "Bypass de Sistema", "Logs de Auditoría", "Control de Dominios"]
      });
    }

    // Hardened Constraint REMOVED: Allow full view based on seeded DB
    // if (hasPermission(PERMISSIONS_MASTER.ORG_VIEW_LIMITED) && !hasPermission(PERMISSIONS_MASTER.ORG_VIEW_FULL)) {
    //   data = data.slice(0, 4);
    // }

    setOrgStructure(data);
  }, [userRole, user]);

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

    // Check for tab in URL and VALIDATE role permissions
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) {
      // Security Validation: Only allow access if role permitted
      let isAllowed = true;
      if (tab === 'seguridad' && !canAccessSecurity) isAllowed = false;
      if (tab === 'graficos' && !canAccessStats) isAllowed = false;
      if (tab === 'prioridades' && !canAccessPriorities) isAllowed = false;
      if (tab === 'tickets' && !canAccessTickets) isAllowed = false;

      if (isAllowed) {
        setActiveTab(tab);
        if (tab === 'seguridad') setActiveSection('dashboard');
      } else {
        console.warn(`Intento de acceso no autorizado a la pestaña: ${tab}`);
        setActiveTab('overview');
        // Clean URL from malicious tab
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [userRole]); // Re-run if userRole changes

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('dashboard_announcement', JSON.stringify(announcement));
    }
  }, [announcement, mounted]);

  // Documents Persistence REMOVED: Always fetch fresh from API
  // useEffect(() => {
  //   const saved = localStorage.getItem('dashboard_documents');
  //   if (saved) {
  //     try {
  //       setDocuments(JSON.parse(saved));
  //     } catch (e) {
  //       console.error("Error loading documents", e);
  //     }
  //   }
  // }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('dashboard_documents', JSON.stringify(documents));
    }
  }, [documents, mounted]);

  // Tickets Persistence
  useEffect(() => {
    const saved = localStorage.getItem('tickets_react_kamban');
    if (saved) {
      try {
        setTickets(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading tickets", e);
      }
    } else {
      setTickets(INITIAL_TICKETS);
    }
  }, []);

  useEffect(() => {
    if (mounted && tickets.length > 0) {
      localStorage.setItem('tickets_react_kamban', JSON.stringify(tickets));
    }
  }, [tickets, mounted]);

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
    if (userRole === 'Usuario') {
      return [
        { title: "Mis Tickets", value: "3", subtext: "2 Abiertos / 1 Resuelto", icon: Tag, trend: "Limite: 3 activos" },
        { title: "Mis Documentos", value: "12", subtext: "5 Recibidos / 7 Enviados", icon: FileText, trend: "+2 hoy" },
        { title: "Mensajes Bot", value: "15", subtext: "Historial de chat", icon: Bell, trend: "Soporte activo" },
        { title: "Nivel de Acceso", value: "Estándar", subtext: "Usuario TIC", icon: Shield, trend: "Verificado" }
      ];
    }

    // Role check for full stats access
    if (userRole === 'CEO' || userRole === 'Desarrollador') {
      return [
        { title: "Consumo Eléctrico", value: "1,245 MW", subtext: "Total Nacional", icon: Zap, trend: "+5.2%", trendPositive: false },
        { title: "Personal Activo", value: "4,820", subtext: "En 12 plantas", icon: Users, trend: "+12", trendPositive: true },
        { title: "Disponibilidad", value: "94.8%", subtext: "Media industrial", icon: Activity, trend: "+0.3%", trendPositive: true },
        { title: "Presupuesto", value: "$2.4M", subtext: "Ejecución Q1 2026", icon: TrendingUp, trend: "75%", trendPositive: true }
      ];
    }

    // Default for Administrativo
    return [
      { title: "Tickets Totales", value: "124", subtext: "García asigned", icon: Tag, trend: "+15 hoy" },
      { title: "Docs. Pendientes", value: "45", subtext: "Requieren firma", icon: FileText, trend: "Urgente" },
      { title: "Incidentes", value: "3", subtext: "Reportados hoy", icon: AlertTriangle, trend: "-50%", trendPositive: true }
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
        return canAccessPriorities ? <PriorityMatrix darkMode={darkMode} userRole={userRole} isReadOnly={isReadOnly} hasPermission={hasPermission} /> : <div className="text-center p-20 font-bold text-red-500">Acceso Restringido</div>;
      case 'tickets':
        return canAccessTickets ? <TicketSystem darkMode={darkMode} orgStructure={orgStructure} userRole={userRole} userDept={user?.gerencia_depto || ""} currentUser={user?.nombre + ' ' + user?.apellido} tickets={tickets} setTickets={setTickets} hasPermission={hasPermission} /> : <div className="text-center p-20 font-bold text-red-500">Acceso Restringido</div>;
      case 'documentos':
        return <DocumentManager
          darkMode={darkMode}
          userRole={userRole}
          userDept={user?.gerencia_depto || 'Usuario'}
          documents={documents}
          setDocuments={setDocuments}
          orgStructure={orgStructure}
          hasPermission={hasPermission}
          user={user}
          users={users}
          gerencias={gerencias}
          refreshDocs={fetchDocuments}
        />;
      case 'seguridad':
        return canAccessSecurity ? (
          <SecurityModule
            darkMode={darkMode}
            announcement={announcement}
            setAnnouncement={setAnnouncement}
            documents={documents}
            setDocuments={setDocuments}
            userRole={userRole}
            orgStructure={orgStructure}
            setOrgStructure={setOrgStructure}
          />
        ) : <div className="text-center p-20 font-bold text-red-500">Acceso Restringido</div>;
      case 'graficos':
        return canAccessStats ? (
          <ChartsModule darkMode={darkMode} documents={documents} tickets={tickets} orgStructure={orgStructure} />
        ) : <div className="text-center p-20 font-bold text-red-500">Acceso Restringido</div>;
      case 'permisos-dev':
        return isDev ? <MasterPermissionPanel darkMode={darkMode} /> : <div className="text-center p-20 font-bold text-red-500">Acceso Restringido</div>;
      case 'overview':
      default:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* WELCOME SECTION */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className={`text-3xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  ¡Bienvenido de nuevo, {user?.nombre || 'Usuario'}!
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
    <RoleGuard allowedRoles={['CEO', 'Administrativo', 'Usuario', 'Desarrollador']} redirectTo="/login">
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
              {canAccessPriorities && (
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
              )}
              {canAccessTickets && (
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
              )}
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
              {canAccessSecurity && (
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
              {canAccessStats && (
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

              {hasPermission(PERMISSIONS_MASTER.SYS_DEV_TOOLS) && (
                <SidebarItem
                  icon={Shield}
                  label="Configuración Maestra"
                  active={activeTab === 'permisos-dev'}
                  collapsed={collapsed}
                  darkMode={darkMode}
                  onClick={() => {
                    setActiveSection('dashboard');
                    setActiveTab('permisos-dev');
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
        <main className={`transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-64'} min-h-screen ${theme.bg} flex flex-col`}>
          {/* TOP HEADER */}
          <header className={`
          sticky top-0 z-40 h-16 px-6 flex items-center justify-between ${theme.header} border-b shrink-0
        `}>
            <div className="flex items-center gap-4">
              <h2 className={`font-semibold text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                Sistema de Gestión Institucional <span className="mx-2 text-slate-500">|</span> <span className="text-slate-500 font-normal">Alfa 2026 V-1.0</span>
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle darkMode={darkMode} onToggle={() => setDarkMode(!darkMode)} />
              <div className={`h-6 w-px ${darkMode ? 'bg-slate-800' : 'bg-slate-300'}`} />
              <div
                className="flex items-center gap-3 cursor-pointer hover:bg-slate-100/10 p-1 rounded-md transition-colors"
                onClick={() => {
                  if (confirm('¿Desea cerrar sesión?')) {
                    logout();
                  }
                }}
              >
                <div className="text-right hidden sm:block leading-tight">
                  <p className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                    {user?.nombre} {user?.apellido}
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    {userRole === 'Desarrollador' && (
                      <span className="text-[10px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded animate-pulse">
                        DEV MODE
                      </span>
                    )}
                    <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                      {userRole.toUpperCase()}
                    </p>
                  </div>
                </div>

                {/* ROLE SWITCHER dropdown - visible for admins and persona-switchers */}
                {hasPermission(PERMISSIONS_MASTER.SYS_SWITCH_ROLE) && (
                  <div className="flex items-center gap-1 border-l pl-3 border-slate-700 ml-1" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={userRole}
                      onChange={(e) => switchRole(e.target.value as UserRole)}
                      className={`bg-transparent text-[10px] font-bold border rounded px-1 outline-none transition-colors ${darkMode ? 'border-zinc-700 text-zinc-400 focus:border-red-500' : 'border-slate-300 text-slate-600 focus:border-red-600'}`}
                    >
                      <option value="Usuario">USR</option>
                      <option value="Administrativo">ADM</option>
                      <option value="CEO">CEO</option>
                      <option value="Desarrollador">DEV</option>
                    </select>
                  </div>
                )}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-offset-2 ring-offset-transparent ring-slate-200/20 ${userRole === 'CEO' ? 'bg-red-800' : userRole === 'Administrativo' ? 'bg-amber-600' : 'bg-blue-600'}`}>
                  {user?.nombre?.substring(0, 1)}{user?.apellido?.substring(0, 1)}
                </div>
              </div>
            </div>
          </header>
          {/* WORKSPACE */}
          <div className="p-8 w-full max-w-[1600px] mx-auto space-y-8 flex-1">
            {/* BREADCRUMB / TITLE */}
            {/* BREADCRUMB / TITLE - Hidden on overview as it has its own welcome header, and on graficos as it has internal headers */}
            {activeTab !== 'overview' && activeTab !== 'graficos' && activeTab !== 'permisos-dev' && (
              <div className="flex justify-between items-center pb-6 border-b border-slate-200/10">
                <div>
                  <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {activeTab === 'prioridades' ? 'Matriz de Prioridades' :
                      activeTab === 'tickets' ? 'Sistema de Tickets' :
                        activeTab === 'documentos' ? 'Gestor Documental' :
                          activeTab === 'seguridad' ? 'Módulo de Seguridad' :
                            activeTab === 'impresoras' ? 'Control de Impresoras y Toners' :
                              'Panel Detalle'}
                  </h1>
                  <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {activeTab === 'prioridades' ? 'Control y seguimiento de tareas prioritarias por gerencia.' :
                      activeTab === 'tickets' ? 'Gestión de solicitudes técnicas y administrativas.' :
                        activeTab === 'documentos' ? 'Administración de documentos institucionales y firmas.' :
                          activeTab === 'seguridad' ? 'Gestión de usuarios, permisos y auditoría de seguridad.' :
                            activeTab === 'impresoras' ? 'Monitoreo del estado operativo de impresoras y niveles de suministros.' :
                              'Vista de detalles del módulo seleccionado.'}
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
        <ChatWindow isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} userRole={userRole} />

        {/* MODAL DE DETALLE DE GERENCIA */}
        <DetailModal
          isOpen={!!selectedManagement}
          onClose={() => setSelectedManagement(null)}
          title={selectedManagement || ''}
          functions={selectedManagement && MANAGEMENT_DETAILS[selectedManagement] ? MANAGEMENT_DETAILS[selectedManagement] : (selectedManagement ? getDefaultFunctions(selectedManagement) : [])}
          darkMode={darkMode}
        />
      </div>
    </RoleGuard>
  );
}
