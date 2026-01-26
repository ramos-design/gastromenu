"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useGastro } from '@/contexts/GastroContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Globe, Image as ImageIcon, Pilcrow, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';

type MenuOutput = {
  type: 'pdf' | 'post' | 'web' | null;
  loading: boolean;
  success: boolean;
};

export default function ExportPage() {
  const { currentMenu, addMenuToHistory, allergens } = useGastro();
  const { toast } = useToast();
  const [lang, setLang] = useState<'cz' | 'en'>('cz');
  const [output, setOutput] = useState<MenuOutput>({ type: null, loading: false, success: false });
  const [generatedPdfImage, setGeneratedPdfImage] = useState<string | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const sortedMenu = useMemo(() => {
    if (!currentMenu) return [];
    return [...currentMenu].sort((a, b) => {
      if (a.category === 'Polévka' && b.category !== 'Polévka') return -1;
      if (a.category !== 'Polévka' && b.category === 'Polévka') return 1;
      return 0;
    });
  }, [currentMenu]);

  const handleGenerate = async (type: 'pdf' | 'post' | 'web') => {
    setIsPreviewVisible(false);
    setOutput({ type: type, loading: true, success: false });
    setGeneratedPdfImage(null);

    const onGenerationSuccess = () => {
      if (currentMenu && currentMenu.length > 0) {
        addMenuToHistory(currentMenu);
      }
    };

    if (type === 'pdf') {
      try {
        const localProxyUrl = '/api/export-menu';
        const params = new URLSearchParams();

        // Categorize dishes
        const menuSoups = sortedMenu.filter(d => d.category === 'Polévka');
        const menuMains = sortedMenu.filter(d => d.category === 'Hlavní jídlo');

        // Map soups
        menuSoups.forEach((dish, index) => {
          const i = index + 1;
          params.append(`soup${i}_cz`, dish.title_cz || '');
          params.append(`soup${i}_en`, dish.title_en || '');
          params.append(`soup${i}_price`, dish.price.toString());

          const dishAllergenNumbers = dish.allergens.map(id => {
            const allergen = allergens.find(a => a.id === id);
            return allergen ? allergen.number : id;
          }).join(', ');

          params.append(`soup${i}_allergens`, dishAllergenNumbers);
        });

        // Map main dishes
        menuMains.forEach((dish, index) => {
          const i = index + 1;
          params.append(`main${i}_cz`, dish.title_cz || '');
          params.append(`main${i}_en`, dish.title_en || '');
          params.append(`main${i}_price`, dish.price.toString());

          const dishAllergenNumbers = dish.allergens.map(id => {
            const allergen = allergens.find(a => a.id === id);
            return allergen ? allergen.number : id;
          }).join(', ');

          params.append(`main${i}_allergens`, dishAllergenNumbers);
        });

        const finalUrl = `${localProxyUrl}?${params.toString()}`;

        const response = await fetch(finalUrl, {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error(`Proxy error: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.imageUrl) {
          throw new Error('Webhook nevrátil obrázek.');
        }

        setGeneratedPdfImage(data.imageUrl);
        setOutput({ type: type, loading: false, success: true });
        onGenerationSuccess();
        toast({
          title: "Úspěšně vygenerováno",
          description: "Menu pro tisk bylo vygenerováno přímo v aplikaci.",
        });

      } catch (error) {
        console.error("Failed to generate PDF:", error);
        const message = error instanceof Error ? error.message : 'Neznámá chyba';
        toast({
          variant: "destructive",
          title: "Chyba při generování",
          description: message,
        });
        setOutput({ type: type, loading: false, success: false });
      }
    } else {
      // Simulate other generation types
      setTimeout(() => {
        setOutput({ type: type, loading: false, success: true });
        onGenerationSuccess();
        toast({
          title: "Úspěšně vygenerováno",
          description: "Menu bylo úspěšně uloženo do historie.",
        });
      }, 1500);
    }
  }

  const handleDownload = () => {
    if (!generatedPdfImage) return;
    try {
      const link = document.createElement('a');
      link.href = generatedPdfImage;
      link.setAttribute('download', 'menu.png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Chyba při stahování obrázku:", error);
      toast({
        variant: "destructive",
        title: "Chyba při stahování",
        description: "Obrázek se nepodařilo stáhnout. Zkuste to prosím znovu.",
      });
    }
  };

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
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-10 w-1/3" />
          </CardContent>
        </Card>
      );
    }

    if (!output.type) {
      return null;
    }

    if (output.success) {
      switch (output.type) {
        case 'pdf':
          if (generatedPdfImage) {
            return (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Náhled pro tisk</CardTitle>
                </CardHeader>
                <CardContent>
                  <Image src={generatedPdfImage} alt="Vygenerované menu pro tisk" width={800} height={1128} className="rounded-lg border shadow-md w-full h-auto" />
                </CardContent>
                <CardFooter>
                  <Button onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" /> Stáhnout obrázek
                  </Button>
                </CardFooter>
              </Card>
            );
          }
          return (
            <Card className="glass-card">
              <CardHeader><CardTitle>Chyba</CardTitle></CardHeader>
              <CardContent><p>Obrázek se nepodařilo načíst.</p></CardContent>
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
          );
        default:
          return null;
      }
    }

    return null;
  }

  if (!hasMounted) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Loader2 className="w-16 h-16 text-muted-foreground mb-4 animate-spin" />
        <h2 className="text-2xl font-semibold mb-2">Načítání...</h2>
        <p className="text-muted-foreground">Kontroluji aktuální menu.</p>
      </div>
    );
  }

  if (!currentMenu || currentMenu.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Pilcrow className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Žádné menu k exportu</h2>
        <p className="text-muted-foreground mb-4">Nejprve prosím sestavte menu.</p>
        <Button asChild>
          <Link href="/sestav-menu">Sestavit menu</Link>
        </Button>
      </div>
    );
  }

  const getAllergenNumber = (id: string) => {
    const allergen = allergens.find(a => a.id === id);
    return allergen ? allergen.number : id;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Export menu</h1>
        <p className="text-muted-foreground">Zkontrolujte sestavené menu a vygenerujte výstupy.</p>
      </div>
      {isPreviewVisible && (
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
              {sortedMenu.map(dish => (
                <div key={dish.id} className="p-4 border rounded-lg bg-background/50">
                  <p className="font-semibold">{lang === 'cz' ? dish.title_cz : dish.title_en}</p>
                  <div className="flex flex-col text-sm text-muted-foreground mt-2">
                    <div className="flex justify-between items-start mb-2">
                      <span>Cena:</span>
                      <span className="font-medium text-foreground">{dish.price} Kč</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span>Alergeny:</span>
                      <div className="flex items-center gap-2 flex-wrap justify-end max-w-[70%]">
                        {dish.allergens.map(id => <Badge key={id} variant="secondary">{getAllergenNumber(id)}</Badge>)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold">Generovat výstupy</h3>
          <p className="text-muted-foreground">Vytvořte z menu podklady pro tisk, sociální sítě nebo web.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          <Button variant="outline" onClick={() => handleGenerate('pdf')} disabled={output.loading}>
            {output.loading && output.type === 'pdf' ? 'Generuji...' : <><FileText className="mr-2 h-4 w-4" /> Vygenerovat k tisku</>}
          </Button>
          <Button variant="outline" onClick={() => handleGenerate('post')} disabled={output.loading}>
            {output.loading && output.type === 'post' ? 'Generuji...' : <><ImageIcon className="mr-2 h-4 w-4" /> Vygenerovat jako příspěvek</>}
          </Button>
          <Button variant="outline" onClick={() => handleGenerate('web')} disabled={output.loading}>
            {output.loading && output.type === 'web' ? 'Odesílám...' : <><Globe className="mr-2 h-4 w-4" /> Odeslat na web</>}
          </Button>
        </div>
        <div className="pt-4">{renderOutput()}</div>
      </div>
    </div>
  );
}
