"use client";

import React, { createContext, useContext, ReactNode, useMemo, useEffect } from 'react';
import type { Allergen, Dish, MenuHistoryItem } from '@/lib/types';
import {
  useCollection,
  useFirebase,
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  setDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import useLocalStorage from '@/hooks/use-local-storage';
import { initialAllergens } from '@/lib/data';

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
  isAllergenInUse: (id: string) => boolean;
}

const GastroContext = createContext<GastroContextType | undefined>(undefined);

export const GastroProvider = ({ children }: { children: ReactNode }) => {
  const { firestore } = useFirebase();

  const allergensRef = useMemoFirebase(() => firestore && collection(firestore, 'allergens'), [firestore]);
  const dishesRef = useMemoFirebase(() => firestore && collection(firestore, 'foods'), [firestore]);
  const menuHistoryRef = useMemoFirebase(() => firestore && collection(firestore, 'weekly_menus'), [firestore]);

  const { data: allergens, isLoading: allergensLoading } = useCollection<Allergen>(allergensRef);
  const { data: dishes, isLoading: dishesLoading } = useCollection<Dish>(dishesRef);
  const { data: menuHistory, isLoading: menuHistoryLoading } = useCollection<MenuHistoryItem>(menuHistoryRef);

  const [currentMenu, setCurrentMenu] = useLocalStorage<Dish[] | null>('currentMenu', null);

  const isLoading = useMemo(() => allergensLoading || dishesLoading || menuHistoryLoading, [allergensLoading, dishesLoading, menuHistoryLoading]);

  // Seed initial allergens if the collection is empty
  useEffect(() => {
    if (firestore && !allergensLoading && allergens && allergens.length === 0) {
      const batch = writeBatch(firestore);
      const allergensCol = collection(firestore, 'allergens');
      initialAllergens.forEach((allergen) => {
        const docRef = doc(allergensCol); // Create a new doc with a generated id
        batch.set(docRef, { ...allergen, createdAt: serverTimestamp() });
      });
      batch.commit().catch(error => {
        console.error("Error seeding allergens: ", error);
      });
    }
  }, [firestore, allergens, allergensLoading]);

  const addDish = (dish: Omit<Dish, 'id'>) => {
    if (!dishesRef) return;
    addDocumentNonBlocking(dishesRef, { ...dish, createdAt: serverTimestamp() });
  };

  const updateDish = (updatedDish: Dish) => {
    if (!firestore) return;
    const dishRef = doc(firestore, 'foods', updatedDish.id);
    const { id, ...data } = updatedDish;
    updateDocumentNonBlocking(dishRef, data);
  };

  const deleteDish = (id: string) => {
    if (!firestore) return;
    const dishRef = doc(firestore, 'foods', id);
    deleteDocumentNonBlocking(dishRef);
  };

  const addAllergen = (allergen: Omit<Allergen, 'id'>) => {
    if (!allergensRef) return;
    addDocumentNonBlocking(allergensRef, { ...allergen, createdAt: serverTimestamp() });
  };

  const updateAllergen = (updatedAllergen: Allergen) => {
    if (!firestore) return;
    const allergenRef = doc(firestore, 'allergens', updatedAllergen.id);
    const { id, ...data } = updatedAllergen;
    updateDocumentNonBlocking(allergenRef, data);
  };

  const deleteAllergen = async (id: string) => {
    if (!firestore || !dishes) return;
    const allergenRef = doc(firestore, 'allergens', id);
    deleteDocumentNonBlocking(allergenRef);

    // Also remove the allergen from all dishes
    const batch = writeBatch(firestore);
    const dishesToUpdate = dishes.filter(d => d.allergenIds.includes(id));
    dishesToUpdate.forEach(dish => {
      const dishRef = doc(firestore, 'foods', dish.id);
      const newAllergenIds = dish.allergenIds.filter(allergenId => allergenId !== id);
      batch.update(dishRef, { allergenIds: newAllergenIds });
    });
    await batch.commit();
  };

  const isAllergenInUse = (id: string) => {
    return dishes?.some(dish => dish.allergenIds.includes(id)) ?? false;
  };

  const addMenuToHistory = (dishes: Dish[]) => {
    if (!menuHistoryRef) return;
    const newHistoryItem = {
      date: new Date().toISOString(),
      dishes: dishes,
    };
    addDocumentNonBlocking(menuHistoryRef, newHistoryItem);
  };

  const value = {
    allergens: allergens || [],
    dishes: dishes || [],
    currentMenu,
    menuHistory: menuHistory || [],
    isLoading,
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
