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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
        addMenuToHistory(currentMenu, output.type || undefined);
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
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle>Náhled pro tisk</CardTitle>
                  <Button onClick={handleDownload} size="sm">
                    <Download className="mr-2 h-4 w-4" /> Stáhnout obrázek
                  </Button>
                </CardHeader>
                <CardContent>
                  <Image src={generatedPdfImage} alt="Vygenerované menu pro tisk" width={800} height={1128} className="rounded-lg border shadow-md w-full h-auto" />
                </CardContent>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column - Content (Preview or Result) */}
        <div className="lg:col-span-2 space-y-6">
          {isPreviewVisible ? (
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[70%]">Název jídla</TableHead>
                      <TableHead className="text-right">Cena</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedMenu.map((dish) => (
                      <TableRow key={dish.id}>
                        <TableCell>
                          <div className="font-medium">
                            {lang === 'cz' ? dish.title_cz : dish.title_en}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                            <span className="text-xs">Alergeny:</span>
                            <div className="flex gap-1">
                              {dish.allergens.map(id => (
                                <Badge key={id} variant="secondary" className="px-1 py-0 text-[10px]">
                                  {getAllergenNumber(id)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right align-top pt-4 font-bold">
                          {dish.price} Kč
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            renderOutput()
          )}
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Generovat výstupy</CardTitle>
              <CardDescription>Vytvořte z menu podklady</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Button
                variant="outline"
                onClick={() => handleGenerate('pdf')}
                disabled={output.loading}
                className="h-auto py-6 px-4 flex items-center justify-start gap-4 hover:bg-muted/50 transition-all border-2 w-full text-left"
              >
                {output.loading && output.type === 'pdf' ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : (
                  <FileText className="w-8 h-8 text-primary" />
                )}
                <div className="space-y-1">
                  <span className="font-bold block">Tiskové menu</span>
                  <span className="text-xs text-muted-foreground font-normal block">Vygenerovat menu k tisku</span>
                </div>
              </Button>

              <Button
                variant="outline"
                onClick={() => handleGenerate('post')}
                disabled={output.loading}
                className="h-auto py-6 px-4 flex items-center justify-start gap-4 hover:bg-muted/50 transition-all border-2 w-full text-left"
              >
                <ImageIcon className="w-8 h-8 text-pink-500" />
                <div className="space-y-1">
                  <span className="font-bold block">Sociální sítě</span>
                  <span className="text-xs text-muted-foreground font-normal block">Příspěvky pro Instagram/FB</span>
                </div>
              </Button>

              <Button
                variant="outline"
                onClick={() => handleGenerate('web')}
                disabled={output.loading}
                className="h-auto py-6 px-4 flex items-center justify-start gap-4 hover:bg-muted/50 transition-all border-2 w-full text-left"
              >
                <Globe className="w-8 h-8 text-blue-500" />
                <div className="space-y-1">
                  <span className="font-bold block">Webové stránky</span>
                  <span className="text-xs text-muted-foreground font-normal block">Propsat na web restaurace</span>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
