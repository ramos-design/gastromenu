// Using use client to allow for state management and interactivity
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { PlusCircle } from 'lucide-react';
import { useGastro } from '@/contexts/GastroContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { Dish, DishType } from '@/lib/types';
import { DishFormSheet } from '@/components/dishes/dish-form-sheet';
import { DishesDataTable } from '@/components/dishes/data-table';
import { columns } from '@/components/dishes/columns';
import { Card } from '@/components/ui/card';

type FilterType = 'vše' | DishType;

export default function JidlaPage() {
  const { dishes } = useGastro();
  const searchParams = useSearchParams();

  const [isSheetOpen, setSheetOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('vše');

  // Effect to handle opening the sheet from URL query param
  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setEditingDish(null);
      setSheetOpen(true);
    }
  }, [searchParams]);


  const handleAddClick = () => {
    setEditingDish(null);
    setSheetOpen(true);
  };

  const handleEdit = (dish: Dish) => {
    setEditingDish(dish);
    setSheetOpen(true);
  };
  
  const handleSheetClose = () => {
    setSheetOpen(false);
    // clean up URL
    const newPath = window.location.pathname;
    window.history.replaceState({...window.history.state, as: newPath, url: newPath}, '', newPath);
  }

  const filteredDishes = useMemo(() => {
    return dishes
      .filter(dish => {
        if (filter === 'vše') return true;
        return dish.type === filter;
      })
      .filter(dish => {
        const query = searchQuery.toLowerCase();
        return (
          dish.name_cz.toLowerCase().includes(query) ||
          dish.name_en.toLowerCase().includes(query)
        );
      });
  }, [dishes, filter, searchQuery]);

  // Pass handleEdit to the columns
  const tableColumns = useMemo(() => columns({ onEdit: handleEdit }), [handleEdit]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Jídla</h1>
            <p className="text-muted-foreground">Spravujte svá jídla a recepty.</p>
        </div>
        <Button onClick={handleAddClick} className="w-full md:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          Přidat jídlo
        </Button>
      </div>

      <Card className="glass-card p-4 sm:p-6">
        <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
          <Input
            placeholder="Hledat jídlo (CZ/EN)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <ToggleGroup
            type="single"
            defaultValue="vše"
            value={filter}
            onValueChange={(value: FilterType) => value && setFilter(value)}
            className="w-full md:w-auto"
          >
            <ToggleGroupItem value="vše" className="flex-1">Vše</ToggleGroupItem>
            <ToggleGroupItem value="Polévka" className="flex-1">Polévky</ToggleGroupItem>
            <ToggleGroupItem value="Hlavní jídlo" className="flex-1">Hlavní jídla</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <DishesDataTable columns={tableColumns} data={filteredDishes} />
      </Card>

      <DishFormSheet
        isOpen={isSheetOpen}
        onClose={handleSheetClose}
        dish={editingDish}
      />
    </div>
  );
}
