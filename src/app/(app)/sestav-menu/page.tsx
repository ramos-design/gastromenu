"use client";

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { useGastro } from '@/contexts/GastroContext';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { DishCombobox } from '@/components/features/menu/dish-combobox';
import type { MenuVariant } from '@/lib/types';

type MenuFormProps = {
  variant: MenuVariant;
  soupsCount: number;
  mainsCount: number;
  mainsCategory?: string; // 'Hlavní jídlo' or 'Snídaně'
};

function MenuForm({ variant, soupsCount, mainsCount, mainsCategory = 'Hlavní jídlo' }: MenuFormProps) {
  const { dishes, saveMenu, menus } = useGastro();
  const { toast } = useToast();
  const router = useRouter();

  // Load saved values if available
  const defaultValues = useMemo(() => {
    const saved = menus[variant] || [];
    const values: Record<string, string> = {};

    // Attempt to map back to form fields roughly
    const savedSoups = saved.filter(d => d.category === 'Polévka');
    const savedMains = saved.filter(d => d.category === mainsCategory);

    savedSoups.forEach((d, i) => { if (i < soupsCount) values[`soup${i + 1}`] = d.id; });
    savedMains.forEach((d, i) => { if (i < mainsCount) values[`main${i + 1}`] = d.id; });

    return values;
  }, [menus, variant, soupsCount, mainsCount, mainsCategory]);

  const { control, handleSubmit, reset, watch } = useForm({
    defaultValues
  });

  const selectedValues = watch();

  // Intermediate save to context whenever values change (without redirection)
  React.useEffect(() => {
    const orderedDishes: any[] = [];
    // Soups
    for (let i = 1; i <= soupsCount; i++) {
      const id = selectedValues[`soup${i}`];
      if (id) {
        const dish = dishes.find(d => d.id === id);
        if (dish) orderedDishes.push(dish);
      }
    }
    // Mains
    for (let i = 1; i <= mainsCount; i++) {
      const id = selectedValues[`main${i}`];
      if (id) {
        const dish = dishes.find(d => d.id === id);
        if (dish) orderedDishes.push(dish);
      }
    }

    // Safety check to prevent infinite loop: Only save if data actually changed
    const currentDishes = menus[variant] || [];
    const currentIds = currentDishes.map(d => d.id).join(',');
    const newIds = orderedDishes.map(d => d.id).join(',');

    if (currentIds !== newIds) {
      saveMenu(variant, orderedDishes);
    }
  }, [selectedValues, variant, soupsCount, mainsCount, dishes, saveMenu, menus]);


  const { availableSoups, availableMains } = useMemo(() => {
    // Collect titles of dishes used in OTHER tabs/variants
    const occupiedTitlesInOtherTabs = new Set<string>();
    Object.entries(menus).forEach(([key, menuDishes]) => {
      if (key !== variant) {
        (menuDishes || []).forEach(d => {
          if (d.title_cz) occupiedTitlesInOtherTabs.add(d.title_cz);
        });
      }
    });

    // Filter soups: unique by title AND not used in other tabs
    const soupMap = new Map();
    dishes
      .filter(d => d.category === 'Polévka')
      .forEach(d => {
        if (!soupMap.has(d.title_cz) && !occupiedTitlesInOtherTabs.has(d.title_cz)) {
          soupMap.set(d.title_cz, d);
        }
      });

    // Filter mains: unique by title AND not used in other tabs
    const mainMap = new Map();
    dishes
      .filter(d => d.category === mainsCategory)
      .forEach(d => {
        if (!mainMap.has(d.title_cz) && !occupiedTitlesInOtherTabs.has(d.title_cz)) {
          mainMap.set(d.title_cz, d);
        }
      });

    return {
      availableSoups: Array.from(soupMap.values()),
      availableMains: Array.from(mainMap.values()),
    };
  }, [dishes, mainsCategory, menus, variant]);




  const handleReset = () => {
    const resetValues: Record<string, string> = {};
    for (let i = 1; i <= soupsCount; i++) resetValues[`soup${i}`] = "";
    for (let i = 1; i <= mainsCount; i++) resetValues[`main${i}`] = "";

    reset(resetValues);
    saveMenu(variant, []);

    toast({
      title: "Menu resetováno",
      description: "Formulář byl vymazán a uložené menu odstraněno.",
    });
  };

  const onSubmit = (data: any) => {
    // Collect dishes one last time for validation
    const currentDishes = menus[variant] || [];

    if (currentDishes.length === 0) {
      toast({
        variant: "destructive",
        title: "Nevybrali jste žádná jídla",
        description: "Prosím, vyberte alespoň jedno jídlo pro sestavení menu.",
      });
      return;
    }

    toast({ title: "Menu připraveno k exportu", description: "Vaše menu bylo finálně uloženo." });
    router.push(`/export?tab=${variant}`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-8 items-start">
      <div className="space-y-8">
        {/* Soups Section */}
        {soupsCount > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Polévky</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: soupsCount }).map((_, i) => {
                  const fieldName = `soup${i + 1}`;
                  const otherSelectedIds = Object.entries(selectedValues)
                    .filter(([name, val]) => name !== fieldName && val)
                    .map(([_, val]) => val as string);

                  const filteredOptions = availableSoups.filter(d => !otherSelectedIds.includes(d.id));

                  return (
                    <Controller
                      key={fieldName}
                      name={fieldName}
                      control={control}
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Label>Polévka {i + 1}</Label>
                          <DishCombobox
                            value={field.value}
                            onChange={field.onChange}
                            options={filteredOptions}
                            placeholder="Vyberte polévku"
                          />
                        </div>
                      )}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Dishes Section */}
        {mainsCount > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>{mainsCategory === 'Snídaně' ? 'Snídaňová nabídka' : 'Hlavní jídla'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: mainsCount }).map((_, i) => {
                  const fieldName = `main${i + 1}`;
                  const otherSelectedIds = Object.entries(selectedValues)
                    .filter(([name, val]) => name !== fieldName && val)
                    .map(([_, val]) => val as string);

                  const filteredOptions = availableMains.filter(d => !otherSelectedIds.includes(d.id));

                  return (
                    <Controller
                      key={fieldName}
                      name={fieldName}
                      control={control}
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Label>{mainsCategory === 'Snídaně' ? `Snídaně ${i + 1}` : `Hlavní jídlo ${i + 1}`}</Label>
                          <DishCombobox
                            value={field.value}
                            onChange={field.onChange}
                            options={filteredOptions}
                            placeholder={mainsCategory === 'Snídaně' ? "Vyberte snídani" : "Vyberte hlavní jídlo"}
                          />
                        </div>
                      )}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Actions Column */}
      <div className="space-y-4 xl:sticky xl:top-4">
        <Card className="glass-card border-l-4 border-l-primary/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Akce</CardTitle>
            <CardDescription>Možnosti menu</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">1. Uložit</Label>
              <Button type="submit" size="lg" className="w-full shadow-md font-bold text-md h-12">
                Uložit a přejít na export
              </Button>
            </div>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Nebo</span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">2. Reset</Label>
              <Button type="button" variant="outline" onClick={handleReset} className="w-full hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors">
                Resetovat menu
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

export default function SestavMenuPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sestavit menu</h1>
        <p className="text-muted-foreground">Vyberte variantu menu, kterou chcete sestavit.</p>
      </div>

      <Tabs defaultValue="weekly" className="flex flex-col md:flex-row gap-8 items-start w-full">
        <TabsList className="flex flex-col w-full md:w-64 h-auto p-1 gap-2 bg-transparent shrink-0">
          <TabsTrigger
            value="soups"
            className="w-full justify-start px-4 py-3 text-base bg-muted/20 data-[state=active]:bg-primary data-[state=active]:text-white border border-transparent rounded-lg shadow-sm transition-all"
          >
            Polévky
          </TabsTrigger>
          <TabsTrigger
            value="mains"
            className="w-full justify-start px-4 py-3 text-base bg-muted/20 data-[state=active]:bg-primary data-[state=active]:text-white border border-transparent rounded-lg shadow-sm transition-all"
          >
            Hlavní chod
          </TabsTrigger>
          <TabsTrigger
            value="weekly"
            className="w-full justify-start px-4 py-3 text-base bg-muted/20 data-[state=active]:bg-primary data-[state=active]:text-white border border-transparent rounded-lg shadow-sm transition-all"
          >
            Týdenní menu
          </TabsTrigger>

        </TabsList>

        <div className="flex-1 w-full">
          <TabsContent value="soups" className="mt-0">
            <div className="space-y-4">
              <CardDescription>Sestavte nabídku polévek. Můžete vybrat 2 varianty polévek.</CardDescription>
              <MenuForm variant="soups" soupsCount={2} mainsCount={0} />
            </div>
          </TabsContent>

          <TabsContent value="mains" className="mt-0">
            <div className="space-y-4">
              <CardDescription>Sestavte nabídku hlavních chodů. Můžete vybrat 5 jídel.</CardDescription>
              <MenuForm variant="mains" soupsCount={0} mainsCount={5} />
            </div>
          </TabsContent>

          <TabsContent value="weekly" className="mt-0">
            <div className="space-y-4">
              <CardDescription>Sestavte týdenní menu (2 hlavní jídla).</CardDescription>
              <MenuForm variant="weekly" soupsCount={0} mainsCount={2} />
            </div>
          </TabsContent>


        </div>
      </Tabs>
    </div>
  );
}
