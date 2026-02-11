export interface Marca {
  id: string;
  nombre: string;
  categorias: string;
  skus: number;
  activa: boolean;
  logo: string | null;
}

export interface Producto {
  id: string;
  nombre: string;
  sku: string;
  stock: number;
  status: 'in stock' | 'low stock';
}

export interface NuevaMarcaData {
  nombre: string;
  sitioWeb: string;
  prefijoSku: string;
  codigo: string;
  almacenPrincipal: string;
  logo: string | null;
}
