import ModuleScreen, { ModuleScreenConfig } from '@/components/module-screen';
import React from 'react';

const masivosConfig: ModuleScreenConfig = {
  headerIcon: 'layers-outline',
  headerTitle: 'Masivos',
  headerSubtitle: 'Operaciones en lote',
  stats: [
    { value: '0', label: 'Procesos', sublabel: 'hoy' },
    { value: '0', label: 'Pendientes' },
  ],
  sectionLabel: 'MÓDULOS',
  groups: [
    {
      id: 'imagenes-masivas',
      title: 'Imágenes Masivas',
      subtitle: 'Carga masiva de imágenes',
      icon: 'images-outline',
      color: '#3B82F6',
      route: '/(main)/masivos/catalogos/imagenes',
    },
    {
      id: 'ubicaciones-masivas',
      title: 'Ubicaciones Masivas',
      subtitle: 'Asignación masiva de ubicaciones',
      icon: 'location-outline',
      color: '#10B981',
      route: '/(main)/masivos/inventarios/ubicaciones',
    },
  ],
};

export default function MasivosIndexScreen() {
  return <ModuleScreen config={masivosConfig} />;
}
