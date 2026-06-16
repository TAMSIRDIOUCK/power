// src/context/OrderContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Interface pour les informations client
export interface CustomerInfo {
  first_name: string;
  last_name: string;
  email?: string | null;
  phone: string;
  address: string;
  city: string;
  region: string;
}

// Type du contexte
interface OrderContextType {
  customerInfo: CustomerInfo | null;
  setCustomerInfo: (info: CustomerInfo) => void;
  clearCustomerInfo: () => void;
}

// Création du contexte
const OrderContext = createContext<OrderContextType | undefined>(undefined);

// Provider du contexte
export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [customerInfo, setCustomerInfoState] = useState<CustomerInfo | null>(null);

  // Sauvegarde les infos client
  const setCustomerInfo = (info: CustomerInfo) => {
    setCustomerInfoState(info);
    localStorage.setItem('customerInfo', JSON.stringify(info));
  };

  // Efface les infos client
  const clearCustomerInfo = () => {
    setCustomerInfoState(null);
    localStorage.removeItem('customerInfo');
  };

  // Charger depuis localStorage au montage
  useEffect(() => {
    const savedInfo = localStorage.getItem('customerInfo');
    if (savedInfo) {
      setCustomerInfoState(JSON.parse(savedInfo));
    }
  }, []);

  return (
    <OrderContext.Provider value={{ customerInfo, setCustomerInfo, clearCustomerInfo }}>
      {children}
    </OrderContext.Provider>
  );
};

// Hook pour utiliser le contexte
export const useOrder = (): OrderContextType => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder doit être utilisé dans un OrderProvider');
  }
  return context;
};