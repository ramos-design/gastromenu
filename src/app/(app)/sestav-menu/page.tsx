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
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

type MenuFormValues = {
  soup1?: string;
  soup2?: string;
  main1?: string;
  main2?: string;
  main3?: string;
  main4?: string;
};

export default function SestavMenuPage() {
  const { dishes, setCurrentMenu } = useGastro();
  const { toast } = useToast();
  const { control, handleSubmit } = useForm<MenuFormValues>();
  const router = useRouter();

  const { soups, mainDishes } = useMemo(() => {
    return {
      soups: dishes.filter(d => d.type === 'Polévka'),
      mainDishes: dishes.filter(d => d.type === 'Hlavní jídlo'),
    };
  }, [dishes]);

  const onSubmit = (data: MenuFormValues) => {
    const selectedIds = Object.values(data).filter(Boolean);
    const selectedDishes = dishes.filter(d => selectedIds.includes(d.id));
    
    if (selectedDishes.length === 0) {
      toast({
        variant: "destructive",
        title: "Nevybrali jste žádná jídla",
        description: "Prosím, vyberte alespoň jedno jídlo pro sestavení menu.",
      });
      return;
    }

    setCurrentMenu(selectedDishes);
    toast({ title: "Menu uloženo", description: "Nyní můžete přejít k exportu." });
    router.push('/export');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sestavit týdenní menu</h1>
        <p className="text-muted-foreground">Vyberte jídla pro sestavení týdenního menu.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="glass-card">
          <CardHeader><CardTitle>Výběr jídel</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Polévky</h3>
              {[1, 2].map(i => (
                <Controller
                  key={`soup${i}`}
                  name={`soup${i}` as keyof MenuFormValues}
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label>Polévka {i}</Label>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger><SelectValue placeholder="Vyberte polévku" /></SelectTrigger>
                        <SelectContent>
                          {soups.map(soup => (
                            <SelectItem key={soup.id} value={soup.id}>{soup.name_cz}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
              ))}
            </div>
            <div className="space-y-4 lg:col-span-2">
              <h3 className="font-semibold text-lg">Hlavní jídla</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <Controller
                    key={`main${i}`}
                    name={`main${i}` as keyof MenuFormValues}
                    control={control}
                    render={({ field }) => (
                      <div className="space-y-2">
                        <Label>Hlavní jídlo {i}</Label>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger><SelectValue placeholder="Vyberte hlavní jídlo" /></SelectTrigger>
                          <SelectContent>
                            {mainDishes.map(dish => (
                              <SelectItem key={dish.id} value={dish.id}>{dish.name_cz}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit">Uložit a přejít na export</Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
