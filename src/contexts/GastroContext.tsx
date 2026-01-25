"use client";

import React, { createContext, useState, useContext, ReactNode } from 'react';
import type { Allergen, Dish, DishType } from '@/lib/types';
import { initialAllergens, initialDishes } from '@/lib/data';

interface GastroContextType {
  allergens: Allergen[];
  dishes: Dish[];
  currentMenu: Dish[] | null;
  setCurrentMenu: (dishes: Dish[]) => void;
  addDish: (dish: Omit<Dish, 'id'>) => void;
  updateDish: (dish: Dish) => void;
  deleteDish: (id: string) => void;
  addAllergen: (allergen: Allergen) => void;
  updateAllergen: (allergen: Allergen) => void;
  deleteAllergen: (id: number) => void;
  isAllergenInUse: (id: number) => boolean;
}

const GastroContext = createContext<GastroContextType | undefined>(undefined);

export const GastroProvider = ({ children }: { children: ReactNode }) => {
  const [allergens, setAllergens] = useState<Allergen[]>(initialAllergens);
  const [dishes, setDishes] = useState<Dish[]>(initialDishes);
  const [currentMenu, setCurrentMenu] = useState<Dish[] | null>(null);

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
    setAllergens(prev => [...prev, allergen]);
  };

  const updateAllergen = (updatedAllergen: Allergen) => {
    setAllergens(prev => prev.map(a => a.id === updatedAllergen.id ? updatedAllergen : a));
  };

  const deleteAllergen = (id: number) => {
    setAllergens(prev => prev.filter(a => a.id !== id));
  };

  const isAllergenInUse = (id: number) => {
    return dishes.some(dish => dish.allergenIds.includes(id));
  };

  const value = {
    allergens,
    dishes,
    currentMenu,
    setCurrentMenu,
    addDish,
    updateDish,
    deleteDish,
    addAllergen,
    updateAllergen,
    deleteAllergen,
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
