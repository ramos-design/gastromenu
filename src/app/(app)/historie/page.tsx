"use client";

import React from 'react';
import { useGastro } from '@/contexts/GastroContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function HistoriePage() {
  const { menuHistory, allergens, isLoading } = useGastro();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAllergenNumber = (id: string) => {
    const allergen = allergens.find(a => a.id === id);
    return allergen ? allergen.number : id;
  }
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Historie menu</h1>
          <p className="text-muted-foreground">Prohlédněte si historii vygenerovaných menu.</p>
        </div>
         <div className="space-y-4">
          <Skeleton className="w-full h-48" />
          <Skeleton className="w-full h-48" />
          <Skeleton className="w-full h-48" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Historie menu</h1>
        <p className="text-muted-foreground">Prohlédněte si historii vygenerovaných menu.</p>
      </div>

      {menuHistory.length === 0 ? (
        <Card className="glass-card flex flex-col items-center justify-center p-12">
          <History className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold">Žádná historie</h3>
          <p className="text-muted-foreground">Zatím nebylo vygenerováno žádné menu.</p>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-4 pr-4">
            {menuHistory.map(item => (
              <Card key={item.id} className="glass-card">
                <CardHeader>
                  <CardTitle>Menu ze dne: {formatDate(item.date)}</CardTitle>
                  <CardDescription>Počet jídel: {item.dishes.length}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {item.dishes.map(dish => (
                      <div key={dish.id} className="p-3 border rounded-lg bg-background/50">
                        <p className="font-semibold">{dish.name_cz}</p>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-muted-foreground">Cena: {dish.price} Kč</span>
                          <div className="flex items-center gap-1 flex-wrap justify-end">
                            <span className="text-muted-foreground">Alergeny:</span>
                            {dish.allergenIds.map(id => (
                              <Badge key={id} variant="secondary">{getAllergenNumber(id)}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
