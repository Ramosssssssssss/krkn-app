import { Marca, Producto } from './types';

// Datos de ejemplo de marcas
export const MARCAS_DATA: Marca[] = [
  { id: '1', nombre: 'Nike', categorias: 'Calzado, Ropa deportiva', skus: 245, activa: true, logo: null },
  { id: '2', nombre: 'Adidas', categorias: 'Performance, Originals', skus: 189, activa: true, logo: null },
  { id: '3', nombre: 'Puma', categorias: 'Lifestyle, Running', skus: 132, activa: true, logo: null },
  { id: '4', nombre: 'Under Armour', categorias: 'Training, Gym', skus: 78, activa: true, logo: null },
  { id: '5', nombre: 'Reebok', categorias: 'Classic, CrossFit', skus: 56, activa: false, logo: null },
];

// Datos de productos de ejemplo para el detalle
export const PRODUCTOS_EJEMPLO: Producto[] = [
  { id: '1', nombre: 'MacBook Pro 14"', sku: 'APP-MBP-14-SIL', stock: 450, status: 'in stock' },
  { id: '2', nombre: 'iPhone 15 Pro', sku: 'APP-IP15P-TI', stock: 8, status: 'low stock' },
  { id: '3', nombre: 'AirPods Max', sku: 'APP-APM-SPACE', stock: 45, status: 'in stock' },
  { id: '4', nombre: 'iPad Air 5', sku: 'APP-IPA5-BLU', stock: 820, status: 'in stock' },
];
