"use client";

import React, { createContext, useContext, ReactNode, useMemo, useEffect, useState, useCallback } from 'react';
import type { Allergen, Dish, MenuHistoryItem, MenuVariant } from '@/lib/types';
import useLocalStorage from '@/hooks/use-local-storage';
import { initialAllergens as defaultAllergens } from '@/lib/data';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

// Helper to generate a unique ID
const generateId = () => {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const initialAllergensWithIds: Allergen[] = defaultAllergens.map(a => ({ ...a, id: a.number.toString() }));

interface GastroContextType {
  allergens: Allergen[];
  dishes: Dish[];
  menus: Record<MenuVariant, Dish[]>;
  saveMenu: (variant: MenuVariant, dishes: Dish[]) => void;
  menuHistory: MenuHistoryItem[];
  isLoading: boolean;
  addDish: (dish: Omit<Dish, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateDish: (dish: Dish) => Promise<void>;
  deleteDish: (id: string) => Promise<void>;
  addAllergen: (allergen: Omit<Allergen, 'id'>) => void;
  updateAllergen: (allergen: Allergen) => void;
  deleteAllergen: (id: string) => void;
  addMenuToHistory: (dishes: Dish[], exportType?: 'pdf' | 'post' | 'web') => Promise<void>;
  deleteMenuFromHistory: (id: string) => Promise<void>;
  isAllergenInUse: (id: string) => boolean;
}

const GastroContext = createContext<GastroContextType | undefined>(undefined);

export const GastroProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const supabase = createClient();

  const storagePrefix = user ? `user_${user.id}_` : 'guest_';

  // Allergens stay in localStorage (static EU list) - per user to allow custom modifications
  const [allergens, setAllergens] = useLocalStorage<Allergen[]>(`${storagePrefix}allergens`, initialAllergensWithIds);

  // Migration: Ensure standard allergens use numeric IDs
  useEffect(() => {
    const hasUuidInStandard = allergens.some(a => a.number <= 14 && a.id.length > 2);
    if (hasUuidInStandard) {
      setAllergens(initialAllergensWithIds);
    }
  }, [allergens, setAllergens]);

  // Dishes come from Supabase
  const [dishes, setDishes] = useState<Dish[]>([]);

  // History also comes from Supabase now
  const [menuHistory, setMenuHistory] = useState<MenuHistoryItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  // Still use local storage for currentMenu (draft state) - NOW SPLIT
  const [currentBreakfast, setCurrentBreakfast] = useLocalStorage<Dish[]>(`${storagePrefix}menu_breakfast`, []);
  const [currentStandard, setCurrentStandard] = useLocalStorage<Dish[]>(`${storagePrefix}menu_standard`, []);
  const [currentWeekly, setCurrentWeekly] = useLocalStorage<Dish[]>(`${storagePrefix}menu_weekly`, []);

  const saveMenu = useCallback((variant: MenuVariant, dishes: Dish[]) => {
    switch (variant) {
      case 'breakfast':
        setCurrentBreakfast(dishes);
        break;
      case 'standard':
        setCurrentStandard(dishes);
        break;
      case 'weekly':
        setCurrentWeekly(dishes);
        break;
    }
  }, [setCurrentBreakfast, setCurrentStandard, setCurrentWeekly]);

  const sortedAllergens = useMemo(() => {
    return [...allergens].sort((a, b) => a.number - b.number);
  }, [allergens]);

  const sortedMenuHistory = useMemo(() => {
    if (!menuHistory) return [];
    // Already sorted from DB usually, but safe to keep
    return [...menuHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [menuHistory]);

  const fetchDishes = useCallback(async () => {
    if (!user) {
      setDishes([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching dishes:', error);
    } else {
      const mappedDishes: Dish[] = (data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        title_cz: item.title_cz,
        title_en: item.title_en || '',
        price: parseFloat(item.price),
        category: item.category,
        allergens: item.allergens || [],
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
      setDishes(mappedDishes);
    }

    // Fetch History
    const { data: historyData, error: historyError } = await supabase
      .from('menu_history')
      .select('*')
      .order('created_at', { ascending: false });

    if (historyError) {
      console.error('Error fetching history:', historyError);
    } else if (historyData) {
      const mappedHistory: MenuHistoryItem[] = historyData.map(item => ({
        id: item.id,
        date: item.created_at,
        dishes: item.dishes as Dish[],
        exportType: item.export_type
      }));
      setMenuHistory(mappedHistory);
    }

    setIsLoading(false);
  }, [user, supabase]);

  // Initial fetch
  useEffect(() => {
    fetchDishes();
    // Realtime subscription removed to prevent app freezing issues on delete.
    // relying on window.location.reload() in actions for now.
  }, [fetchDishes]);


  const addDish = useCallback(async (dishData: Omit<Dish, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    // Create a temporary optimistic dish
    const tempId = generateId();
    const optimisticDish: Dish = {
      ...dishData,
      id: tempId,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Update local state immediately
    setDishes(prev => [optimisticDish, ...prev]);

    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        user_id: user.id,
        title_cz: dishData.title_cz,
        title_en: dishData.title_en,
        price: dishData.price,
        category: dishData.category,
        allergens: dishData.allergens,
      })
      .select()
      .single();

    if (error) {
      // Rollback by refetching
      console.error('Error adding dish:', error);
      fetchDishes();
      throw error;
    }

    if (data) {
      // Replace optimistic dish with the real one from DB (to get correct ID/timestamps)
      const newDish: Dish = {
        id: data.id,
        user_id: data.user_id,
        title_cz: data.title_cz,
        title_en: data.title_en || undefined,
        price: typeof data.price === 'string' ? parseFloat(data.price) : data.price,
        category: data.category,
        allergens: data.allergens || [],
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
      setDishes(prev => prev.map(d => d.id === tempId ? newDish : d));
    }
  }, [user, supabase, fetchDishes]);

  const updateDish = useCallback(async (updatedDish: Dish) => {
    if (!user) return;

    // Update local state immediately
    setDishes(prev => prev.map(d => d.id === updatedDish.id ? updatedDish : d));

    const { error } = await supabase
      .from('menu_items')
      .update({
        title_cz: updatedDish.title_cz,
        title_en: updatedDish.title_en,
        price: updatedDish.price,
        category: updatedDish.category,
        allergens: updatedDish.allergens,
      })
      .eq('id', updatedDish.id);

    if (error) {
      // Rollback by refetching
      console.error('Error updating dish:', error);
      fetchDishes();
      throw error;
    }
  }, [user, supabase, fetchDishes]);

  const deleteDish = useCallback(async (id: string) => {
    if (!user) return;

    // We intentionally SKIP optimistic updates (setDishes/setCurrentMenu) here
    // to prevent React render cycles/freezes that were happening on delete.
    // The calling component is expected to trigger a reload or refetch.

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting dish:', error);
      throw error;
    }
  }, [user, supabase]);

  const addAllergen = useCallback((allergen: Omit<Allergen, 'id'>) => {
    setAllergens(prev => [...prev, { ...allergen, id: generateId() }]);
  }, []);

  const updateAllergen = useCallback((updatedAllergen: Allergen) => {
    setAllergens(prev => prev.map(a => a.id === updatedAllergen.id ? updatedAllergen : a));
  }, []);

  const deleteAllergen = useCallback((id: string) => {
    setAllergens(prev => prev.filter(a => a.id !== id));
    // Also remove from dishes
    setDishes(prevDishes => prevDishes.map(dish => ({
      ...dish,
      allergens: dish.allergens.filter(allergenId => allergenId !== id)
    })));
  }, []);

  const isAllergenInUse = useCallback((id: string) => {
    return dishes.some(dish => dish.allergens.includes(id));
  }, [dishes]);

  const addMenuToHistory = useCallback(async (dishes: Dish[], exportType?: 'pdf' | 'post' | 'web') => {
    if (!user) return;

    const tempId = generateId();
    const newHistoryItem: MenuHistoryItem = {
      id: tempId,
      date: new Date().toISOString(),
      dishes: dishes,
      exportType,
    };

    // Optimistic update
    setMenuHistory(prev => [newHistoryItem, ...(prev || [])]);

    const { data, error } = await supabase.from('menu_history').insert({
      user_id: user.id,
      dishes: dishes, // Supabase handles JSON serialization
      export_type: exportType
    }).select().single();

    if (error) {
      console.error('Error adding to history:', error);
      // Rollback
      setMenuHistory(prev => prev.filter(i => i.id !== tempId));
    } else if (data) {
      // Replace temp ID with real ID
      setMenuHistory(prev => prev.map(i => i.id === tempId ? { ...i, id: data.id, date: data.created_at } : i));
    }

  }, [user, supabase]);

  const deleteMenuFromHistory = useCallback(async (id: string) => {
    if (!user) return;

    // Optimistic
    setMenuHistory(prev => (prev || []).filter(item => item.id !== id));

    const { error } = await supabase.from('menu_history').delete().eq('id', id);

    if (error) {
      console.error('Error deleting history:', error);
      fetchDishes(); // Rollback via refetch
    }
  }, [user, supabase, fetchDishes]);

  const value = useMemo(() => ({
    allergens: sortedAllergens,
    dishes,
    menus: {
      breakfast: currentBreakfast,
      standard: currentStandard,
      weekly: currentWeekly,
    },
    menuHistory: sortedMenuHistory,
    isLoading,
    saveMenu,
    addDish,
    updateDish,
    deleteDish,
    addAllergen,
    updateAllergen,
    deleteAllergen,
    addMenuToHistory,
    deleteMenuFromHistory,
    isAllergenInUse
  }), [
    sortedAllergens,
    dishes,
    currentBreakfast,
    currentStandard,
    currentWeekly,
    sortedMenuHistory,
    isLoading,
    saveMenu,
    addDish,
    updateDish,
    deleteDish,
    addAllergen,
    updateAllergen,
    deleteAllergen,
    addMenuToHistory,
    deleteMenuFromHistory,
    isAllergenInUse
  ]);

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
