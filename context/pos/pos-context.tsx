import React, { createContext, ReactNode, useContext, useState } from 'react';

interface CajaItem {
  CAJA_ID: number;
  NOMBRE: string;
  ALMACEN_ID: number;
  ALMACEN_NOMBRE: string;
}

interface CajeroItem {
  CAJERO_ID: number;
  NOMBRE: string;
}

interface POSContextType {
  selectedCaja: CajaItem | null;
  selectedCajero: CajeroItem | null;
  sucursalId: number | null; // Podriamos derivarlo o pedirlo
  sessionActive: boolean;
  setSession: (caja: CajaItem, cajero: CajeroItem) => void;
  endSession: () => void;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export const POSProvider = ({ children }: { children: ReactNode }) => {
  const [selectedCaja, setSelectedCaja] = useState<CajaItem | null>(null);
  const [selectedCajero, setSelectedCajero] = useState<CajeroItem | null>(null);
  const [sessionActive, setSessionActive] = useState(false);

  const setSession = (caja: CajaItem, cajero: CajeroItem) => {
    setSelectedCaja(caja);
    setSelectedCajero(cajero);
    setSessionActive(true);
  };

  const endSession = () => {
    setSelectedCaja(null);
    setSelectedCajero(null);
    setSessionActive(false);
  };

  // Por ahora hardcoding sucursalId o podriamos obtenerlo de la caja/almacen si tuviéramos el mapeo
  // En el backend, Totolcingo es sucursal 384, almacen 19.
  // Vamos a intentar obtenerlo dinámicamente o dejar un placeholder de confianza.
  const sucursalId = selectedCaja ? (selectedCaja.ALMACEN_ID === 19 ? 384 : 9606947) : null; 

  return (
    <POSContext.Provider value={{
      selectedCaja,
      selectedCajero,
      sucursalId,
      sessionActive,
      setSession,
      endSession
    }}>
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (context === undefined) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};
