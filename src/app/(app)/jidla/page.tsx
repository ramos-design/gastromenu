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
import { useIsMobile } from '@/hooks/use-mobile';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { DishActions } from '@/components/dishes/dish-actions';
import { Skeleton } from '@/components/ui/skeleton';

type FilterType = 'vše' | DishType;

export default function JidlaPage() {
  const { dishes } = useGastro();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

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
    window.history.replaceState({ ...window.history.state, as: newPath, url: newPath }, '', newPath);
  }

  const filteredDishes = useMemo(() => {
    return dishes
      .filter(dish => {
        if (filter === 'vše') return true;
        return dish.category === filter;
      })
      .filter(dish => {
        const query = searchQuery.toLowerCase();
        return (
          dish.title_cz.toLowerCase().includes(query) ||
          dish.title_en.toLowerCase().includes(query)
        );
      });
  }, [dishes, filter, searchQuery]);

  // Pass handleEdit to the columns
  const tableColumns = useMemo(() => columns({ onEdit: handleEdit }), [handleEdit]);

  const formattedPrice = (price: number) => new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
  }).format(price);

  const renderDishes = () => {
    if (!hasMounted) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      );
    }

    if (isMobile) {
      if (filteredDishes.length === 0) {
        return <p className="text-center text-muted-foreground py-10">Žádná jídla nenalezena.</p>;
      }
      return (
        <Accordion type="single" collapsible className="w-full">
          {filteredDishes.map((dish) => (
            <AccordionItem value={dish.id} key={dish.id}>
              <AccordionTrigger className="text-left font-medium">
                {dish.title_cz}
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cena:</span>
                    <span className="font-medium">{formattedPrice(dish.price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kategorie:</span>
                    <span>{dish.category}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-muted-foreground pt-1">Alergeny:</span>
                    <div className="flex flex-wrap gap-1 justify-end max-w-[70%]">
                      {dish.allergens.map(id => (
                        <Badge key={id} variant="secondary">{id}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <DishActions dish={dish} onEdit={handleEdit} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      );
    }

    return <DishesDataTable columns={tableColumns} data={filteredDishes} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Seznam jídel</h1>
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
            <ToggleGroupItem value="vše">Vše</ToggleGroupItem>
            <ToggleGroupItem value="Polévka">Polévky</ToggleGroupItem>
            <ToggleGroupItem value="Hlavní jídlo">Hlavní jídla</ToggleGroupItem>
          </ToggleGroup>
        </div>

        {renderDishes()}
      </Card>

      <DishFormSheet
        isOpen={isSheetOpen}
        onClose={handleSheetClose}
        dish={editingDish}
      />
    </div>
  );
}
