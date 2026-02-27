// --- Tipos ---
export interface Parada {
    docto_ve_id: number;
    folio: string;
    cliente: string;
    calle: string;
    latitud: number;
    longitud: number;
    orden: number;
    articulos?: any[];
}

export interface Operador {
    usuario_id: number;
    usuario: string;
    nombre_completo: string;
    id_samsara?: string;
}

export interface OperadorSamsara extends Operador {
    latitud: number | null;
    longitud: number | null;
    velocidad: number;
    distancia_km: number;
    en_linea: boolean;
    ultima_vez: string | null;
    foto: string | null;
    vehiculo?: string;
    ubicacion?: string;
}

// --- Constantes ---
export const STOP_COLORS = [
    "#6C63FF", "#FF6B6B", "#4ECDC4", "#FFE66D",
    "#A8E6CF", "#FF8B94", "#B4A7D6", "#F9CA24",
];

export const GOOGLE_MAPS_KEY = "AIzaSyClQbiCobSmUl3R-RDq8u5stNkPyYVV7pM";

export const CEDIS = { lat: 19.6142927, lon: -98.9685955, nombre: "CEDIS Totolcingo" };

export const MONTHS_ES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export const DAYS_HEADER = ["D", "L", "M", "M", "J", "V", "S"];

// --- Helpers ---
export const isSameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();
