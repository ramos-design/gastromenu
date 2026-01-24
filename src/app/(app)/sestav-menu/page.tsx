"use client";

import React, { useState, useMemo } from 'react';
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { Dish } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Globe, Image as ImageIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

type MenuFormValues = {
  soup1?: string;
  soup2?: string;
  main1?: string;
  main2?: string;
  main3?: string;
  main4?: string;
};

type MenuOutput = {
  type: 'pdf' | 'post' | 'web' | null;
  loading: boolean;
};

export default function SestavMenuPage() {
  const { dishes } = useGastro();
  const { toast } = useToast();
  const { control, handleSubmit, getValues } = useForm<MenuFormValues>();

  const [previewMenu, setPreviewMenu] = useState<Dish[] | null>(null);
  const [lang, setLang] = useState<'cz' | 'en'>('cz');
  const [output, setOutput] = useState<MenuOutput>({ type: null, loading: false });

  const { soups, mainDishes } = useMemo(() => {
    return {
      soups: dishes.filter(d => d.type === 'Polévka'),
      mainDishes: dishes.filter(d => d.type === 'Hlavní jídlo'),
    };
  }, [dishes]);

  const onSubmit = (data: MenuFormValues) => {
    const selectedIds = Object.values(data).filter(Boolean);
    const selectedDishes = dishes.filter(d => selectedIds.includes(d.id));
    setPreviewMenu(selectedDishes);
    toast({ title: "Menu uloženo", description: "Náhled menu byl vygenerován." });
  };
  
  const handleGenerate = (type: 'pdf' | 'post' | 'web') => {
    setOutput({ type: type, loading: true });
    setTimeout(() => {
      setOutput({ type: type, loading: false });
    }, 1500);
  }

  const czPostImage = PlaceHolderImages.find(p => p.id === 'cz-post-placeholder');
  const enPostImage = PlaceHolderImages.find(p => p.id === 'en-post-placeholder');

  const renderOutput = () => {
    if (output.loading) {
      return (
        <Card className="glass-card">
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-1/3" />
          </CardContent>
        </Card>
      );
    }

    switch (output.type) {
      case 'pdf':
        return (
          <Card className="glass-card">
            <CardHeader><CardTitle>Výstup: PDF</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center justify-center gap-4 p-8 bg-muted/30 rounded-lg">
                <FileText className="w-16 h-16 text-muted-foreground" />
                <p className="text-muted-foreground">Náhled PDF souboru</p>
            </CardContent>
            <CardFooter className="pt-6">
                <Button><Download className="mr-2 h-4 w-4" /> Stáhnout PDF</Button>
            </CardFooter>
          </Card>
        );
      case 'post':
        return (
          <Card className="glass-card">
            <CardHeader><CardTitle>Výstup: Příspěvky na sociální sítě</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              {czPostImage && (
                <div className="space-y-2">
                    <Image data-ai-hint="food post" src={czPostImage.imageUrl} alt="CZ post" width={600} height={600} className="rounded-lg aspect-square object-cover" />
                    <Button className="w-full"><Download className="mr-2 h-4 w-4" /> Stáhnout CZ post</Button>
                </div>
              )}
              {enPostImage && (
                <div className="space-y-2">
                    <Image data-ai-hint="food post" src={enPostImage.imageUrl} alt="EN post" width={600} height={600} className="rounded-lg aspect-square object-cover" />
                    <Button className="w-full"><Download className="mr-2 h-4 w-4" /> Stáhnout EN post</Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      case 'web':
        return (
          <Card className="glass-card">
            <CardHeader><CardTitle>Nahráno na web</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center justify-center gap-4 p-8 bg-green-500/10 rounded-lg">
                <Globe className="w-16 h-16 text-green-500" />
                <p className="text-green-600 dark:text-green-400">Menu bylo úspěšně propsáno na web.</p>
                <Button variant="link">Otevřít náhled</Button>
            </CardContent>
          </Card>
        )
      default:
        return null;
    }
  }

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
            <Button type="submit">Uložit menu a zobrazit náhled</Button>
          </CardFooter>
        </Card>
      </form>

      {previewMenu && (
        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Náhled menu</CardTitle>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="lang-switch">CZ</Label>
                  <Switch id="lang-switch" checked={lang === 'en'} onCheckedChange={(checked) => setLang(checked ? 'en' : 'cz')} />
                  <Label htmlFor="lang-switch">EN</Label>
                </div>
              </div>
              <CardDescription>Zkontrolujte sestavené menu.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {previewMenu.map(dish => (
                  <div key={dish.id} className="p-4 border rounded-lg bg-background/50">
                    <p className="font-semibold">{lang === 'cz' ? dish.name_cz : dish.name_en}</p>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <p>{dish.price} Kč</p>
                      <div className="flex items-center gap-2">
                        <span>Alergeny:</span>
                        {dish.allergenIds.map(id => <Badge key={id} variant="secondary">{id}</Badge>)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Separator />

          <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-xl font-semibold">Generovat výstupy</h3>
                <p className="text-muted-foreground">Vytvořte z menu podklady pro tisk, sociální sítě nebo web.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <Button variant="outline" onClick={() => handleGenerate('pdf')} disabled={output.loading && output.type !== 'pdf'}>
                  {output.loading && output.type === 'pdf' ? 'Generuji...' : <><FileText className="mr-2 h-4 w-4" /> Vygenerovat k tisku</>}
              </Button>
              <Button variant="outline" onClick={() => handleGenerate('post')} disabled={output.loading && output.type !== 'post'}>
                  {output.loading && output.type === 'post' ? 'Generuji...' : <><ImageIcon className="mr-2 h-4 w-4" /> Vygenerovat jako příspěvek</>}
              </Button>
              <Button variant="outline" onClick={() => handleGenerate('web')} disabled={output.loading && output.type !== 'web'}>
                  {output.loading && output.type === 'web' ? 'Odesílám...' : <><Globe className="mr-2 h-4 w-4" /> Odeslat na web</>}
              </Button>
            </div>
            <div className="pt-4">{renderOutput()}</div>
          </div>
        </div>
      )}
    </div>
  );
}
