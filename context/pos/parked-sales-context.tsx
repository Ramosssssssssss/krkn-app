import { ArticuloDetalle } from '@/types/inventarios';
import React, { createContext, useCallback, useContext, useState } from 'react';

export interface ParkedSale {
  id: string;
  timestamp: string;
  items: ArticuloDetalle[];
  client: any;
  mode: 'cobro' | 'cotizacion';
  total: number;
}

interface ParkedSalesContextType {
  parkedSales: ParkedSale[];
  parkSale: (items: ArticuloDetalle[], client: any, mode: 'cobro' | 'cotizacion', total: number) => void;
  resumeSale: (id: string) => ParkedSale | undefined;
  removeParkedSale: (id: string) => void;
  clearAllParkedSales: () => void;
}

const ParkedSalesContext = createContext<ParkedSalesContextType | undefined>(undefined);

export const ParkedSalesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [parkedSales, setParkedSales] = useState<ParkedSale[]>([]);

  const parkSale = useCallback((items: ArticuloDetalle[], client: any, mode: 'cobro' | 'cotizacion', total: number) => {
    if (items.length === 0) return;
    
    const newParkedSale: ParkedSale = {
      id: `park-${Date.now()}`,
      timestamp: new Date().toISOString(),
      items,
      client,
      mode,
      total,
    };
    
    setParkedSales(prev => [newParkedSale, ...prev]);
  }, []);

  const resumeSale = useCallback((id: string) => {
    const sale = parkedSales.find(s => s.id === id);
    if (sale) {
      setParkedSales(prev => prev.filter(s => s.id !== id));
    }
    return sale;
  }, [parkedSales]);

  const removeParkedSale = useCallback((id: string) => {
    setParkedSales(prev => prev.filter(s => s.id !== id));
  }, []);

  const clearAllParkedSales = useCallback(() => {
    setParkedSales([]);
  }, []);

  return (
    <ParkedSalesContext.Provider value={{
      parkedSales,
      parkSale,
      resumeSale,
      removeParkedSale,
      clearAllParkedSales
    }}>
      {children}
    </ParkedSalesContext.Provider>
  );
};

export const useParkedSales = () => {
  const context = useContext(ParkedSalesContext);
  if (!context) {
    throw new Error('useParkedSales must be used within a ParkedSalesProvider');
  }
  return context;
};
