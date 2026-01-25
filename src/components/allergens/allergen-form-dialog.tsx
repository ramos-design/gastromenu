"use client";

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useGastro } from '@/contexts/GastroContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { Allergen } from '@/lib/types';

type AllergenFormDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  allergen: Allergen | null;
};

export function AllergenFormDialog({ isOpen, onClose, allergen }: AllergenFormDialogProps) {
  const { addAllergen, updateAllergen, allergens } = useGastro();
  const { toast } = useToast();

  const formSchema = z.object({
    number: z.coerce.number().min(1, 'Číslo musí být větší než 0.')
      .refine(num => !allergens.some(a => a.number === num && a.id !== allergen?.id), {
        message: 'Toto číslo alergenu již existuje.',
      }),
    name_cz: z.string().min(3, 'Název musí mít alespoň 3 znaky.'),
    name_en: z.string().min(3, 'Anglický název musí mít alespoň 3 znaky.'),
  });
  
  type FormValues = Omit<Allergen, 'id'>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      number: 0,
      name_cz: '',
      name_en: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (allergen) {
        form.reset(allergen);
      } else {
        const nextId = allergens.length > 0 ? Math.max(...allergens.map(a => a.number)) + 1 : 1;
        form.reset({
          number: nextId,
          name_cz: '',
          name_en: '',
        });
      }
    }
  }, [allergen, allergens, form, isOpen]);

  const onSubmit = (values: FormValues) => {
    if (allergen) {
      updateAllergen({ ...allergen, ...values });
      toast({ title: 'Alergen upraven', description: `Alergen "${values.name_cz}" byl úspěšně aktualizován.` });
    } else {
      addAllergen(values);
      toast({ title: 'Alergen přidán', description: `Alergen "${values.name_cz}" byl úspěšně přidán.` });
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <DialogHeader>
              <DialogTitle>{allergen ? 'Upravit alergen' : 'Přidat nový alergen'}</DialogTitle>
              <DialogDescription>
                {allergen ? 'Zde můžete upravit detaily alergenu.' : 'Vyplňte detaily nového alergenu.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Číslo alergenu</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name_cz"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Název (CZ)</FormLabel>
                    <FormControl>
                      <Input placeholder="Např. Lepek" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name_en"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Název (EN)</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g. Gluten" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Zrušit</Button>
              <Button type="submit">Uložit</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
