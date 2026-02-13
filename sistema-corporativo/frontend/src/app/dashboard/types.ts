
export interface OrgCategory {
    category: string;
    icon: string;
    items: string[];
    expanded?: boolean;
}

export interface Document {
    id: number;
    idDoc: string;
    name: string;
    type: 'pdf' | 'word' | 'excel' | 'powerpoint';
    category: string;
    size: string;
    uploadedBy: string;
    receivedBy: string;
    uploadDate: string;
    uploadTime: string;
    signatureStatus: 'pendiente' | 'aprobado' | 'rechazado' | 'omitido' | 'en-proceso';
    department: string;
    targetDepartment: string;
    receptor_gerencia_nombre?: string;
    correlativo?: string;
    fileUrl?: string;
}

// Re-export Ticket type if needed or define common shared types here
export type { Ticket } from '@/components/TicketSystem';
