"use client";

import { useEffect, useState } from 'react';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import type { Dish } from '@/lib/types';
import MultiSelect from '../shared/multi-select';
import { AllergenPicker } from './allergen-picker';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  title_cz: z.string().min(3, { message: 'Název musí mít alespoň 3 znaky.' }),
  title_en: z.string().optional().or(z.literal('')),
  category: z.string().min(1, { message: 'Vyberte kategorii jídla.' }),
  price: z.coerce.number().min(0, { message: 'Cena nesmí být záporná.' }),
  allergens: z.array(z.string()),
});

type DishFormSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  dish: Dish | null;
};

export function DishFormSheet({ isOpen, onClose, dish }: DishFormSheetProps) {
  const { addDish, updateDish, allergens } = useGastro();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title_cz: '',
      title_en: '',
      category: 'Hlavní jídlo',
      price: 0,
      allergens: [],
    },
  });

  useEffect(() => {
    if (dish) {
      form.reset({
        title_cz: dish.title_cz,
        title_en: dish.title_en,
        category: dish.category,
        price: dish.price,
        allergens: dish.allergens,
      });
    } else {
      form.reset({
        title_cz: '',
        title_en: '',
        category: 'Hlavní jídlo',
        price: 0,
        allergens: [],
      });
    }
  }, [dish, form, isOpen]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      if (dish) {
        await updateDish({ ...dish, ...values });
        toast({ title: 'Jídlo upraveno', description: `Jídlo "${values.title_cz}" bylo úspěšně aktualizováno.` });
      } else {
        await addDish(values);
        toast({ title: 'Jídlo přidáno', description: `Jídlo "${values.title_cz}" bylo úspěšně přidáno.` });
      }
      onClose();
    } catch (error) {
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se uložit jídlo. Zkuste to prosím znovu.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full md:max-w-xl overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>{dish ? 'Upravit jídlo' : 'Přidat nové jídlo'}</SheetTitle>
              <SheetDescription>
                {dish ? 'Zde můžete upravit detaily jídla.' : 'Vyplňte detaily nového jídla.'}
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 py-6 space-y-6">
              <Tabs defaultValue="cz">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="cz">Česky</TabsTrigger>
                  <TabsTrigger value="en">English</TabsTrigger>
                </TabsList>
                <TabsContent value="cz" className="pt-4">
                  <FormField
                    control={form.control}
                    name="title_cz"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Název (CZ)</FormLabel>
                        <FormControl>
                          <Input placeholder="Např. Svíčková na smetaně" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                <TabsContent value="en" className="pt-4">
                  <FormField
                    control={form.control}
                    name="title_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Název (EN)</FormLabel>
                        <FormControl>
                          <Input placeholder="E.g. Sirloin in cream sauce" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategorie jídla</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vyberte kategorii" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Polévka">Polévka</SelectItem>
                          <SelectItem value="Hlavní jídlo">Hlavní jídlo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cena (Kč)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="150" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="allergens"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alergeny (klikněte pro výběr)</FormLabel>
                    <FormControl>
                      <AllergenPicker
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <SheetFooter>
              <SheetClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>Zrušit</Button>
              </SheetClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Uložit změny
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
