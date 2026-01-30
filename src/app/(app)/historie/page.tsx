"use client";

import React, { useState } from 'react';
import type { MenuHistoryItem } from '@/lib/types';
import { useGastro } from '@/contexts/GastroContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Trash2, FileText, Image as ImageIcon, Globe } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/shared/confirm-dialog';


export default function HistoriePage() {
  const { menuHistory, allergens, deleteMenuFromHistory } = useGastro();
  const [itemToDelete, setItemToDelete] = useState<MenuHistoryItem | null>(null);

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

  const handleDeleteClick = (e: React.MouseEvent, item: MenuHistoryItem) => {
    e.stopPropagation(); // prevent accordion from toggling
    setItemToDelete(item);
  };

  const confirmDeletion = () => {
    if (itemToDelete) {
      deleteMenuFromHistory(itemToDelete.id);
      setItemToDelete(null);
    }
  };

  const getExportTypeBadge = (type?: 'pdf' | 'post' | 'web') => {
    switch (type) {
      case 'post':
        return <Badge variant="secondary" className="bg-pink-100 text-pink-700 hover:bg-pink-100 border-0 gap-1"><ImageIcon className="w-3 h-3" /> Social</Badge>;
      case 'web':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 gap-1"><Globe className="w-3 h-3" /> Web</Badge>;
      case 'pdf':
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Historie menu</h1>
        <p className="text-muted-foreground">Prohlédněte si historii vygenerovaných menu.</p>
      </div>

      {!menuHistory || menuHistory.length === 0 ? (
        <Card className="glass-card flex flex-col items-center justify-center p-12">
          <History className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold">Žádná historie</h3>
          <p className="text-muted-foreground">Zatím nebylo vygenerováno žádné menu.</p>
        </Card>
      ) : (
        <>
          <ScrollArea className="h-[calc(100vh-200px)]">
            <Accordion type="single" collapsible className="space-y-4 pr-4">
              {menuHistory.map(item => (
                <AccordionItem value={item.id} key={item.id} className="glass-card border-b-0 rounded-xl overflow-hidden relative group">
                  <AccordionTrigger className="p-6 hover:no-underline">
                    <div className="flex-1 flex items-center justify-between mr-4">
                      <div className="text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-semibold leading-none tracking-tight">
                            {item.variant === 'breakfast' ? 'Snídaně' :
                              item.variant === 'standard' ? 'Jídelní menu' :
                                item.variant === 'weekly' ? 'Týdenní menu' :
                                  'Menu'} ze dne: {formatDate(item.date)}
                          </h3>
                          {getExportTypeBadge(item.exportType)}
                        </div>
                        <p className="text-sm text-muted-foreground">Počet jídel: {item.dishes.length}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-6 right-16 text-muted-foreground hover:text-destructive z-10"
                    onClick={(e) => handleDeleteClick(e, item)}
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="sr-only">Smazat položku historie</span>
                  </Button>
                  <AccordionContent>
                    <div className="px-6 pb-6 pt-0 space-y-2">
                      {item.dishes.map(dish => (
                        <div key={dish.id} className="p-3 border rounded-lg bg-background/50">
                          <p className="font-semibold">{dish.title_cz}</p>
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-muted-foreground">Kategorie: {dish.category} | Cena: {dish.price} Kč</span>
                            <div className="flex items-center gap-1 flex-wrap justify-end">
                              <span className="text-muted-foreground">Alergeny:</span>
                              {dish.allergens && dish.allergens.length > 0 ? dish.allergens.map(id => (
                                <Badge key={id} variant="secondary" className="h-5 px-1">{getAllergenNumber(id)}</Badge>
                              )) : <span className="text-muted-foreground italic text-xs">Bez alergenů</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>
          <ConfirmDialog
            isOpen={!!itemToDelete}
            onClose={() => setItemToDelete(null)}
            onConfirm={confirmDeletion}
            title="Opravdu smazat položku?"
            description={`Tato akce je nevratná. Opravdu si přejete smazat toto menu ze dne ${itemToDelete ? formatDate(itemToDelete.date) : ''}?`}
          />
        </>
      )}
    </div>
  );
}

