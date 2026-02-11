import ModuleScreen, { ModuleScreenConfig } from '@/components/module-screen';
import { API_CONFIG } from '@/config/api';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import React, { useEffect, useMemo, useState } from 'react';

const getCatalogosConfig = (t: (key: string) => string): ModuleScreenConfig => ({
  headerIcon: 'folder-open-outline',
  headerTitle: t('catalogs.title'),
  headerSubtitle: t('catalogs.subtitle'),
  stats: [
    { value: '0', label: t('catalogs.warehouses'), sublabel: t('catalogs.warehousesActive') },
    { value: '0', label: t('catalogs.articles'), sublabel: t('catalogs.articlesRegistered') },
  ],
  sectionLabel: t('catalogs.section'),
  groups: [
    {
      id: 'almacenes',
      title: t('catalogs.warehouses'),
      subtitle: t('catalogs.searchWarehouses'),
      icon: 'business-outline',
      color: '#9D4EDD',
      route: '/(main)/catalogos/almacenes/buscar',
    },
    {
      id: 'articulos',
      title: t('catalogs.articles'),
      subtitle: t('catalogs.searchArticles'),
      icon: 'cube-outline',
      color: '#3B82F6',
      route: '/(main)/catalogos/articulos',
    },
    {
      id: 'precios',
      title: t('catalogs.prices'),
      subtitle: t('catalogs.pricesSubtitle'),
      icon: 'pricetag-outline',
      color: '#10B981',
      route: '/(main)/catalogos/complementos/precios',
    },
    {
      id: 'lineas',
      title: t('catalogs.lines'),
      subtitle: t('catalogs.linesSubtitle'),
      icon: 'list-outline',
      color: '#F59E0B',
      route: '/(main)/catalogos/complementos/lineas',
    },
    {
      id: 'grupolineas',
      title: t('catalogs.lineGroups'),
      subtitle: t('catalogs.lineGroupsSubtitle'),
      icon: 'layers-outline',
      color: '#8B5CF6',
      route: '/(main)/catalogos/complementos/grupolineas',
    },
    {
      id: 'marcas',
      title: t('catalogs.brands'),
      subtitle: t('catalogs.brandsSubtitle'),
      icon: 'ribbon-outline',
      color: '#EC4899',
      route: '/(main)/catalogos/complementos/marcas',
    },
    {
      id: 'clasificadores',
      title: t('catalogs.classifiers'),
      subtitle: t('catalogs.classifiersSubtitle'),
      icon: 'filter-outline',
      color: '#06B6D4',
      route: '/(main)/catalogos/complementos/clasificadores',
    }
  ],
});

export default function CatalogosIndexScreen() {
  const { t } = useLanguage();
  const { selectedDatabase } = useAuth();
  const [stats, setStats] = useState({ articulos: 0, almacenes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [selectedDatabase]);

  const loadStats = async () => {
    if (!selectedDatabase) return;
    setLoading(true);
    try {
      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DASHBOARD_STATS}?databaseId=${selectedDatabase.id}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.ok) {
        setStats({
          articulos: data.articulos || 0,
          almacenes: data.almacenes || 0
        });
      }
    } catch (e) {
      console.error('Error loading catalog stats:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const config = useMemo(() => {
    const base = getCatalogosConfig(t);
    base.stats = [
      { 
        value: loading ? '...' : formatNumber(stats.almacenes), 
        label: t('catalogs.warehouses'), 
        sublabel: t('catalogs.warehousesActive') 
      },
      { 
        value: loading ? '...' : formatNumber(stats.articulos), 
        label: t('catalogs.articles'), 
        sublabel: t('catalogs.articlesRegistered') 
      },
    ];
    return base;
  }, [t, stats, loading]);

  return <ModuleScreen config={config} />;
}
