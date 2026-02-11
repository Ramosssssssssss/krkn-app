import { CaratulaInvfis, DetalleArticulo } from './inventarios';

interface AuditData {
    caratula: CaratulaInvfis | null;
    detalles: DetalleArticulo[];
    signature: string | null;
}

let lastAuditData: AuditData = {
    caratula: null,
    detalles: [],
    signature: null
};

export const saveAuditData = (data: AuditData) => {
    lastAuditData = data;
};

export const getAuditData = () => {
    return lastAuditData;
};

export const clearAuditData = () => {
    lastAuditData = {
        caratula: null,
        detalles: [],
        signature: null
    };
};
