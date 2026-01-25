"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import type { Allergen, Dish, MenuHistoryItem } from '@/lib/types';
import { initialAllergens, initialDishes } from '@/lib/data';
import useLocalStorage from '@/hooks/use-local-storage';

interface GastroContextType {
  allergens: Allergen[];
  dishes: Dish[];
  currentMenu: Dish[] | null;
  menuHistory: MenuHistoryItem[];
  setCurrentMenu: (dishes: Dish[] | null) => void;
  addDish: (dish: Omit<Dish, 'id'>) => void;
  updateDish: (dish: Dish) => void;
  deleteDish: (id: string) => void;
  addAllergen: (allergen: Allergen) => void;
  updateAllergen: (allergen: Allergen) => void;
  deleteAllergen: (id: number) => void;
  addMenuToHistory: (dishes: Dish[]) => void;
  isAllergenInUse: (id: number) => boolean;
}

const GastroContext = createContext<GastroContextType | undefined>(undefined);

export const GastroProvider = ({ children }: { children: ReactNode }) => {
  const [allergens, setAllergens] = useLocalStorage<Allergen[]>('allergens', initialAllergens);
  const [dishes, setDishes] = useLocalStorage<Dish[]>('dishes', initialDishes);
  const [currentMenu, setCurrentMenu] = useLocalStorage<Dish[] | null>('currentMenu', null);
  const [menuHistory, setMenuHistory] = useLocalStorage<MenuHistoryItem[]>('menuHistory', []);

  const addDish = (dish: Omit<Dish, 'id'>) => {
    setDishes(prev => [...prev, { ...dish, id: new Date().toISOString() }]);
  };

  const updateDish = (updatedDish: Dish) => {
    setDishes(prev => prev.map(d => d.id === updatedDish.id ? updatedDish : d));
  };

  const deleteDish = (id: string) => {
    setDishes(prev => prev.filter(d => d.id !== id));
  };

  const addAllergen = (allergen: Allergen) => {
    setAllergens(prev => [...prev, allergen].sort((a,b) => a.id - b.id));
  };

  const updateAllergen = (updatedAllergen: Allergen) => {
    setAllergens(prev => prev.map(a => a.id === updatedAllergen.id ? updatedAllergen : a).sort((a,b) => a.id - b.id));
  };

  const deleteAllergen = (id: number) => {
    setAllergens(prev => prev.filter(a => a.id !== id));
  };

  const isAllergenInUse = (id: number) => {
    return dishes.some(dish => dish.allergenIds.includes(id));
  };
  
  const addMenuToHistory = (dishes: Dish[]) => {
    const newHistoryItem: MenuHistoryItem = {
      id: new Date().toISOString(),
      date: new Date().toISOString(),
      dishes: dishes,
    };
    setMenuHistory(prev => [newHistoryItem, ...prev]);
  };

  const value = {
    allergens,
    dishes,
    currentMenu,
    menuHistory,
    setCurrentMenu,
    addDish,
    updateDish,
    deleteDish,
    addAllergen,
    updateAllergen,
    deleteAllergen,
    addMenuToHistory,
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
