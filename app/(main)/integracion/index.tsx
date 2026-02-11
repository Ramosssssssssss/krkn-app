import ModuleScreen, { ModuleScreenConfig } from '@/components/module-screen';
import React from 'react';

const integracionConfig: ModuleScreenConfig = {
  headerIcon: 'git-network-outline',
  headerTitle: 'Integraciones',
  headerSubtitle: 'Conecta con servicios externos',
  stats: [
    { value: '5', label: 'Servicios', sublabel: 'disponibles' },
    { value: '0', label: 'Activos' },
  ],
  sectionLabel: 'SERVICIOS',
  groups: [
    {
      id: 'skydropx',
      title: 'SKYDROPX',
      subtitle: 'Envíos y logística',
      icon: 'airplane-outline',
      color: '#3B82F6',
      route: '/(main)/integracion/skydropx',
    },
    {
      id: 'mercadopago',
      title: 'MERCADO PAGO',
      subtitle: 'Pagos y cobros',
      icon: 'card-outline',
      color: '#00B1EA',
      route: '/(main)/integracion/mercadopago',
    },
    {
      id: 'samsara',
      title: 'SAMSARA',
      subtitle: 'Rastreo de flotas',
      icon: 'car-outline',
      color: '#10B981',
      route: '/(main)/integracion/samsara',
    },
    {
      id: 'stripe',
      title: 'STRIPE',
      subtitle: 'Pagos internacionales',
      icon: 'logo-usd',
      color: '#6366F1',
      route: '/(main)/integracion/stripe',
    },
    {
      id: 'zkteco',
      title: 'ZKTECO',
      subtitle: 'Control de acceso',
      icon: 'finger-print-outline',
      color: '#F59E0B',
      route: '/(main)/integracion/zkteco',
    },
    {
      id: 'api-docs',
      title: 'API DOCS',
      subtitle: 'Documentación de APIs',
      icon: 'code-slash-outline',
      color: '#EC4899',
      route: '/(main)/integracion/api-docs/endpoints',
    },
  ],
};

export default function IntegracionIndexScreen() {
  return <ModuleScreen config={integracionConfig} />;
}
