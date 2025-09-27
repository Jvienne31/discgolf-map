
import React, { createContext, useContext, useState, ReactNode } from 'react';

// Définition des types pour le contexte du parcours
export interface Hole {
  id: string;
  name: string;
  // Autres propriétés d'un trou si nécessaire
}

export interface Course {
  id: string;
  name: string;
  holes: Hole[];
}

interface CourseContextType {
  course: Course | null;
  setCourse: (course: Course | null) => void;
  activeHoleId: string | null;
  setActiveHoleId: (holeId: string | null) => void;
}

// Création du contexte avec une valeur par défaut
const CourseContext = createContext<CourseContextType | undefined>(undefined);

// Hook pour utiliser le contexte
export const useCourse = () => {
  const context = useContext(CourseContext);
  if (context === undefined) {
    throw new Error('useCourse must be used within a CourseProvider');
  }
  return context;
};

// Provider du contexte
interface CourseProviderProps {
  children: ReactNode;
}

export const CourseProvider: React.FC<CourseProviderProps> = ({ children }) => {
  const [course, setCourse] = useState<Course | null>(null);
  const [activeHoleId, setActiveHoleId] = useState<string | null>(null);

  const value = {
    course,
    setCourse,
    activeHoleId,
    setActiveHoleId,
  };

  return (
    <CourseContext.Provider value={value}>
      {children}
    </CourseContext.Provider>
  );
};
