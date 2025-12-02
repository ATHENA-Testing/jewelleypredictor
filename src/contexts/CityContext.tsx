import { createContext, useContext, useState, ReactNode } from "react";

export const INDIAN_CITIES = [
  { value: "all-india", label: "All India" },
  { value: "mumbai", label: "Mumbai" },
  { value: "delhi", label: "Delhi" },
  { value: "bangalore", label: "Bangalore" },
  { value: "chennai", label: "Chennai" },
  { value: "kolkata", label: "Kolkata" },
  { value: "hyderabad", label: "Hyderabad" },
];

interface CityContextType {
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  getCityLabel: (value: string) => string;
}

const CityContext = createContext<CityContextType | undefined>(undefined);

export const CityProvider = ({ children }: { children: ReactNode }) => {
  const [selectedCity, setSelectedCity] = useState("all-india");

  const getCityLabel = (value: string) => {
    return INDIAN_CITIES.find(city => city.value === value)?.label || "All India";
  };

  return (
    <CityContext.Provider value={{ selectedCity, setSelectedCity, getCityLabel }}>
      {children}
    </CityContext.Provider>
  );
};

export const useCity = () => {
  const context = useContext(CityContext);
  if (!context) {
    throw new Error("useCity must be used within CityProvider");
  }
  return context;
};
