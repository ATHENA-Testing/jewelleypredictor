import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export const INDIAN_CITIES = [
  { value: "all-india", label: "All India" },
  { value: "mumbai", label: "Mumbai" },
  { value: "delhi", label: "Delhi" },
  { value: "bangalore", label: "Bangalore" },
  { value: "chennai", label: "Chennai" },
  { value: "kolkata", label: "Kolkata" },
  { value: "hyderabad", label: "Hyderabad" },
];

// Map Indian states/UTs → nearest supported city
const STATE_TO_CITY: Record<string, string> = {
  // Hyderabad
  "telangana": "hyderabad",
  "andhra pradesh": "hyderabad",
  // Chennai
  "tamil nadu": "chennai",
  "puducherry": "chennai",
  "pondicherry": "chennai",
  // Bangalore
  "karnataka": "bangalore",
  "kerala": "bangalore",
  "goa": "bangalore",
  // Mumbai
  "maharashtra": "mumbai",
  "gujarat": "mumbai",
  "dadra and nagar haveli and daman and diu": "mumbai",
  // Delhi
  "delhi": "delhi",
  "national capital territory of delhi": "delhi",
  "haryana": "delhi",
  "punjab": "delhi",
  "uttar pradesh": "delhi",
  "uttarakhand": "delhi",
  "himachal pradesh": "delhi",
  "rajasthan": "delhi",
  "jammu and kashmir": "delhi",
  "ladakh": "delhi",
  "chandigarh": "delhi",
  // Kolkata
  "west bengal": "kolkata",
  "odisha": "kolkata",
  "bihar": "kolkata",
  "jharkhand": "kolkata",
  "assam": "kolkata",
  "sikkim": "kolkata",
  "meghalaya": "kolkata",
  "manipur": "kolkata",
  "mizoram": "kolkata",
  "nagaland": "kolkata",
  "tripura": "kolkata",
  "arunachal pradesh": "kolkata",
  "chhattisgarh": "kolkata",
  "madhya pradesh": "kolkata",
};

const CITY_NAME_DIRECT: Record<string, string> = {
  "hyderabad": "hyderabad",
  "secunderabad": "hyderabad",
  "chennai": "chennai",
  "madras": "chennai",
  "bengaluru": "bangalore",
  "bangalore": "bangalore",
  "mumbai": "mumbai",
  "bombay": "mumbai",
  "navi mumbai": "mumbai",
  "thane": "mumbai",
  "pune": "mumbai",
  "new delhi": "delhi",
  "delhi": "delhi",
  "gurgaon": "delhi",
  "gurugram": "delhi",
  "noida": "delhi",
  "kolkata": "kolkata",
  "calcutta": "kolkata",
};

interface CityContextType {
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  getCityLabel: (value: string) => string;
  isAutoDetected: boolean;
}

const CityContext = createContext<CityContextType | undefined>(undefined);

const STORAGE_KEY = "selected_city";
const AUTO_FLAG_KEY = "city_auto_detected";

export const CityProvider = ({ children }: { children: ReactNode }) => {
  const [selectedCity, setSelectedCityState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || "all-india";
  });
  const [isAutoDetected, setIsAutoDetected] = useState<boolean>(
    () => localStorage.getItem(AUTO_FLAG_KEY) === "true"
  );

  const setSelectedCity = (city: string) => {
    setSelectedCityState(city);
    localStorage.setItem(STORAGE_KEY, city);
    // user manually changed → clear auto flag
    localStorage.removeItem(AUTO_FLAG_KEY);
    setIsAutoDetected(false);
  };

  const getCityLabel = (value: string) => {
    return INDIAN_CITIES.find(city => city.value === value)?.label || "All India";
  };

  // Auto-detect on first load (only if user has not chosen one)
  useEffect(() => {
    const userHasPicked = localStorage.getItem(STORAGE_KEY);
    if (userHasPicked && userHasPicked !== "all-india") return;
    if (!("geolocation" in navigator)) return;

    let cancelled = false;

    const resolveCity = async (lat: number, lon: number) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=8&addressdetails=1`,
          { headers: { "Accept": "application/json" } }
        );
        if (!res.ok) return;
        const data = await res.json();
        const addr = data?.address || {};
        const cityName = (addr.city || addr.town || addr.village || addr.county || "").toLowerCase();
        const stateName = (addr.state || "").toLowerCase();

        let mapped = CITY_NAME_DIRECT[cityName];
        if (!mapped) mapped = STATE_TO_CITY[stateName];

        if (mapped && !cancelled) {
          setSelectedCityState(mapped);
          localStorage.setItem(STORAGE_KEY, mapped);
          localStorage.setItem(AUTO_FLAG_KEY, "true");
          setIsAutoDetected(true);
        }
      } catch {
        // silent
      }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => resolveCity(pos.coords.latitude, pos.coords.longitude),
      () => {/* permission denied – stay on All India */},
      { timeout: 8000, maximumAge: 1000 * 60 * 60 * 24 }
    );

    return () => { cancelled = true; };
  }, []);

  return (
    <CityContext.Provider value={{ selectedCity, setSelectedCity, getCityLabel, isAutoDetected }}>
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
