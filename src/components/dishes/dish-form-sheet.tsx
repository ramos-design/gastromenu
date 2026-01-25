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

const formSchema = z.object({
  name_cz: z.string().min(3, { message: 'Název musí mít alespoň 3 znaky.' }),
  name_en: z.string().min(3, { message: 'Anglický název musí mít alespoň 3 znaky.' }),
  type: z.enum(['Polévka', 'Hlavní jídlo'], { required_error: 'Vyberte typ jídla.' }),
  price: z.coerce.number().min(0, { message: 'Cena nesmí být záporná.' }),
  allergenIds: z.array(z.string()),
});

type DishFormSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  dish: Dish | null;
};

export function DishFormSheet({ isOpen, onClose, dish }: DishFormSheetProps) {
  const { addDish, updateDish, allergens } = useGastro();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name_cz: '',
      name_en: '',
      type: 'Hlavní jídlo',
      price: 0,
      allergenIds: [],
    },
  });

  useEffect(() => {
    if (dish) {
      form.reset(dish);
    } else {
      form.reset({
        name_cz: '',
        name_en: '',
        type: 'Hlavní jídlo',
        price: 0,
        allergenIds: [],
      });
    }
  }, [dish, form, isOpen]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (dish) {
      updateDish({ ...dish, ...values });
      toast({ title: 'Jídlo upraveno', description: `Jídlo "${values.name_cz}" bylo úspěšně aktualizováno.` });
    } else {
      addDish(values);
      toast({ title: 'Jídlo přidáno', description: `Jídlo "${values.name_cz}" bylo úspěšně přidáno.` });
    }
    onClose();
  };

  const allergenOptions = allergens.map(a => ({ value: a.id, label: `${a.number} - ${a.name_cz}` }));

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
                    name="name_cz"
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
                    name="name_en"
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
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Typ jídla</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vyberte typ" />
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
                name="allergenIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alergeny</FormLabel>
                    <FormControl>
                        <MultiSelect
                            options={allergenOptions}
                            selected={field.value}
                            onChange={field.onChange}
                            placeholder="Vyberte alergeny..."
                        />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <SheetFooter>
                <SheetClose asChild>
                    <Button type="button" variant="outline">Zrušit</Button>
                </SheetClose>
                <Button type="submit">Uložit změny</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
