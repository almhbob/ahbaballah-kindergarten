// cleaned global version (no country-specific defaults)
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface SchoolRegistration {
  id: string;
  name: string;
  primaryColor: string;
  accentColor: string;
  adminPhone: string;
  tier: 'trial' | 'basic' | 'professional' | 'enterprise';
  status: 'active' | 'trial' | 'suspended';
  createdAt: string;
}

interface ContextType {
  schools: SchoolRegistration[];
  activeSchoolId: string;
  setActiveSchoolId: (id: string) => void;
}

const SchoolContext = createContext<ContextType | null>(null);

export function useSchoolTheme() {
  const ctx = useContext(SchoolContext);
  if (!ctx) throw new Error('useSchoolTheme must be used inside provider');
  return ctx;
}

export function SchoolThemeProvider({ children }: { children: ReactNode }) {
  const [schools, setSchools] = useState<SchoolRegistration[]>([]);
  const [activeSchoolId, setActiveSchoolId] = useState('');

  useEffect(() => {
    // no hardcoded country / region
    setSchools([]);
  }, []);

  return (
    <SchoolContext.Provider value={{ schools, activeSchoolId, setActiveSchoolId }}>
      {children}
    </SchoolContext.Provider>
  );
}
