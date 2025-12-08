import { createContext, useContext, useState, ReactNode } from "react";

// Exchange rates FROM INR to other currencies (API returns INR prices)
export const EXCHANGE_RATES_FROM_INR: Record<string, number> = {
  INR: 1,
  USD: 0.01203, // 1 INR = 0.01203 USD
  EUR: 0.01107, // 1 INR = 0.01107 EUR
  GBP: 0.00951, // 1 INR = 0.00951 GBP
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  INR: "₹",
  GBP: "£",
};

interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => void;
  convertPrice: (priceInINR: number) => number;
  formatPrice: (priceInINR: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrency] = useState("INR");

  // Convert from INR (base currency from API) to selected currency
  const convertPrice = (priceInINR: number) => {
    return priceInINR * EXCHANGE_RATES_FROM_INR[currency];
  };

  const formatPrice = (priceInINR: number) => {
    const converted = convertPrice(priceInINR);
    
    // Use Indian number formatting for INR
    if (currency === "INR") {
      return `${CURRENCY_SYMBOLS[currency]}${converted.toLocaleString('en-IN', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
    }
    
    return `${CURRENCY_SYMBOLS[currency]}${converted.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convertPrice, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return context;
};
