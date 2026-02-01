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

  const { control, handleSubmit, reset } = useForm({
    defaultValues
  });

  const { availableSoups, availableMains } = useMemo(() => {
    return {
      availableSoups: dishes.filter(d => d.category === 'Polévka'),
      availableMains: dishes.filter(d => d.category === mainsCategory),
    };
  }, [dishes, mainsCategory]);

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
    const selectedIds = Object.values(data).filter(Boolean) as string[];
    // Maintain order by filtering based on form keys sequence is tricky, 
    // but typically we just pull the IDs. 
    // To respect the slots (soup1, soup2...), we should map them explicitly if order matters.
    // For now, filtering from 'dishes' by ID is safe but loses slot order if user picked specifically.
    // Better: Map ids to objects.

    // We want to reconstruct the array: Soups first, then Mains.
    const orderedDishes: any[] = [];

    // Soups
    for (let i = 1; i <= soupsCount; i++) {
      const id = data[`soup${i}`];
      if (id) {
        const dish = dishes.find(d => d.id === id);
        if (dish) orderedDishes.push(dish);
      }
    }
    // Mains
    for (let i = 1; i <= mainsCount; i++) {
      const id = data[`main${i}`];
      if (id) {
        const dish = dishes.find(d => d.id === id);
        if (dish) orderedDishes.push(dish);
      }
    }

    if (orderedDishes.length === 0) {
      toast({
        variant: "destructive",
        title: "Nevybrali jste žádná jídla",
        description: "Prosím, vyberte alespoň jedno jídlo pro sestavení menu.",
      });
      return;
    }

    saveMenu(variant, orderedDishes);
    toast({ title: "Menu uloženo", description: "Vaše menu bylo uloženo. Nyní můžete přejít k exportu." });

    // Navigate with tab query param to keep context
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
                {Array.from({ length: soupsCount }).map((_, i) => (
                  <Controller
                    key={`soup${i + 1}`}
                    name={`soup${i + 1}`}
                    control={control}
                    render={({ field }) => (
                      <div className="space-y-2">
                        <Label>Polévka {i + 1}</Label>
                        <DishCombobox
                          value={field.value}
                          onChange={field.onChange}
                          options={availableSoups}
                          placeholder="Vyberte polévku"
                        />
                      </div>
                    )}
                  />
                ))}
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
                {Array.from({ length: mainsCount }).map((_, i) => (
                  <Controller
                    key={`main${i + 1}`}
                    name={`main${i + 1}`}
                    control={control}
                    render={({ field }) => (
                      <div className="space-y-2">
                        <Label>{mainsCategory === 'Snídaně' ? `Snídaně ${i + 1}` : `Hlavní jídlo ${i + 1}`}</Label>
                        <DishCombobox
                          value={field.value}
                          onChange={field.onChange}
                          options={availableMains}
                          placeholder={mainsCategory === 'Snídaně' ? "Vyberte snídani" : "Vyberte hlavní jídlo"}
                        />
                      </div>
                    )}
                  />
                ))}
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
            value="breakfast"
            disabled
            className="w-full justify-between px-4 py-3 text-base bg-muted/20 opacity-50 cursor-not-allowed data-[state=active]:bg-orange-100 data-[state=active]:text-orange-900 border border-transparent data-[state=active]:border-orange-200 rounded-lg transition-all"
          >
            <span>Snídaně</span>
            <Badge variant="outline" className="text-[10px] h-5 bg-background/50">Již brzy</Badge>
          </TabsTrigger>
          <TabsTrigger
            value="standard"
            disabled
            className="w-full justify-between px-4 py-3 text-base bg-muted/20 opacity-50 cursor-not-allowed data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900 border border-transparent data-[state=active]:border-blue-200 rounded-lg transition-all"
          >
            <span>Jídelní menu</span>
            <Badge variant="outline" className="text-[10px] h-5 bg-background/50">Již brzy</Badge>
          </TabsTrigger>
          <TabsTrigger
            value="weekly"
            className="w-full justify-start px-4 py-3 text-base bg-muted/20 data-[state=active]:bg-green-100 data-[state=active]:text-green-900 border border-transparent data-[state=active]:border-green-200 rounded-lg transition-all"
          >
            Týdenní menu
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 w-full">
          <TabsContent value="breakfast" className="mt-0">
            <div className="space-y-4">
              <CardDescription>Sestavte snídaňovou nabídku. Můžete vybrat až 4 snídaňová jídla.</CardDescription>
              <MenuForm variant="breakfast" soupsCount={0} mainsCount={4} mainsCategory="Snídaně" />
            </div>
          </TabsContent>

          <TabsContent value="standard" className="mt-0">
            <div className="space-y-4">
              <CardDescription>Sestavte klasické jídelní menu (2 polévky + 4 hlavní jídla).</CardDescription>
              <MenuForm variant="standard" soupsCount={2} mainsCount={4} />
            </div>
          </TabsContent>

          <TabsContent value="weekly" className="mt-0">
            <div className="space-y-4">
              <CardDescription>Sestavte týdenní menu (2 polévky + 6 hlavních jídel).</CardDescription>
              <MenuForm variant="weekly" soupsCount={2} mainsCount={6} />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
