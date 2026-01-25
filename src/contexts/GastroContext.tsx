"use client";

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import type { Allergen, Dish, MenuHistoryItem } from '@/lib/types';
import useLocalStorage from '@/hooks/use-local-storage';
import { initialAllergens as defaultAllergens } from '@/lib/data';

// Helper to generate a unique ID
const generateId = () => {
    if (typeof window !== 'undefined' && window.crypto) {
        return window.crypto.randomUUID();
    }
    // Fallback for older environments
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const initialAllergensWithIds: Allergen[] = defaultAllergens.map(a => ({ ...a, id: generateId() }));

interface GastroContextType {
  allergens: Allergen[];
  dishes: Dish[];
  currentMenu: Dish[] | null;
  menuHistory: MenuHistoryItem[];
  isLoading: boolean;
  setCurrentMenu: (dishes: Dish[] | null) => void;
  addDish: (dish: Omit<Dish, 'id'>) => void;
  updateDish: (dish: Dish) => void;
  deleteDish: (id: string) => void;
  addAllergen: (allergen: Omit<Allergen, 'id'>) => void;
  updateAllergen: (allergen: Allergen) => void;
  deleteAllergen: (id: string) => void;
  addMenuToHistory: (dishes: Dish[]) => void;
  deleteMenuFromHistory: (id: string) => void;
  isAllergenInUse: (id: string) => boolean;
}

const GastroContext = createContext<GastroContextType | undefined>(undefined);

export const GastroProvider = ({ children }: { children: ReactNode }) => {
  const [allergens, setAllergens] = useLocalStorage<Allergen[]>('allergens', initialAllergensWithIds);
  const [dishes, setDishes] = useLocalStorage<Dish[]>('dishes', []);
  const [menuHistory, setMenuHistory] = useLocalStorage<MenuHistoryItem[]>('menuHistory', []);
  const [currentMenu, setCurrentMenu] = useLocalStorage<Dish[] | null>('currentMenu', null);
  
  const sortedAllergens = useMemo(() => {
    return [...allergens].sort((a, b) => a.number - b.number);
  }, [allergens]);
  
  const sortedMenuHistory = useMemo(() => {
    if (!menuHistory) return [];
    return [...menuHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [menuHistory]);

  const addDish = (dish: Omit<Dish, 'id'>) => {
    setDishes(prev => [...prev, { ...dish, id: generateId() }]);
  };

  const updateDish = (updatedDish: Dish) => {
    setDishes(prev => prev.map(d => d.id === updatedDish.id ? updatedDish : d));
  };

  const deleteDish = (id: string) => {
    setDishes(prev => prev.filter(d => d.id !== id));
  };

  const addAllergen = (allergen: Omit<Allergen, 'id'>) => {
    setAllergens(prev => [...prev, { ...allergen, id: generateId() }]);
  };

  const updateAllergen = (updatedAllergen: Allergen) => {
    setAllergens(prev => prev.map(a => a.id === updatedAllergen.id ? updatedAllergen : a));
  };

  const deleteAllergen = (id: string) => {
    setAllergens(prev => prev.filter(a => a.id !== id));
    // Also remove from dishes
    setDishes(prevDishes => prevDishes.map(dish => ({
        ...dish,
        allergenIds: dish.allergenIds.filter(allergenId => allergenId !== id)
    })));
  };

  const isAllergenInUse = (id: string) => {
    return dishes.some(dish => dish.allergenIds.includes(id));
  };

  const addMenuToHistory = (dishes: Dish[]) => {
    const newHistoryItem: MenuHistoryItem = {
      id: generateId(),
      date: new Date().toISOString(),
      dishes: dishes,
    };
    setMenuHistory(prev => [newHistoryItem, ...(prev || [])]);
  };

  const deleteMenuFromHistory = (id: string) => {
    setMenuHistory(prev => (prev || []).filter(item => item.id !== id));
  };

  const value = {
    allergens: sortedAllergens,
    dishes,
    currentMenu,
    menuHistory: sortedMenuHistory,
    isLoading: false, // Data is loaded synchronously from local storage
    setCurrentMenu,
    addDish,
    updateDish,
    deleteDish,
    addAllergen,
    updateAllergen,
    deleteAllergen,
    addMenuToHistory,
    deleteMenuFromHistory,
    isAllergenInUse
  };

  return (
    <GastroContext.Provider value={value}>
      {children}
    </GastroContext.Provider>
  );
};

export const useGastro = () => {
  const context = useContext(GastroContext);
  if (context === undefined) {
    throw new Error('useGastro must be used within a GastroProvider');
  }
  return context;
};
