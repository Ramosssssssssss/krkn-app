import ModuleScreen, { ModuleScreenConfig } from '@/components/module-screen';
import React from 'react';

const tablerosConfig: ModuleScreenConfig = {
  headerIcon: 'easel-outline',
  headerTitle: 'Tableros',
  headerSubtitle: 'Visualización de datos',
  stats: [
    { value: '0', label: 'Activos', sublabel: 'hoy' },
    { value: '0', label: 'Pendientes' },
  ],
  sectionLabel: 'TABLEROS',
  groups: [
    {
      id: 'ordenes-compra',
      title: 'Órdenes de Compra',
      subtitle: 'Gestión de órdenes',
      icon: 'cart-outline',
      color: '#3B82F6',
      route: '/(main)/tableros/oct/ordenes-compra',
    },
  ],
};

export default function TablerosIndexScreen() {
  return <ModuleScreen config={tablerosConfig} />;
}
