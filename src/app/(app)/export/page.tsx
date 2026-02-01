"use client";

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useGastro } from '@/contexts/GastroContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import type { MenuVariant } from '@/lib/types';

type MenuOutput = {
  type: 'pdf' | 'post' | 'web' | null;
  loading: boolean;
  success: boolean;
};

function ExportPageContent() {
  const { menus, addMenuToHistory, allergens } = useGastro();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as MenuVariant) || 'weekly';

  const [activeTab, setActiveTab] = useState<MenuVariant>(initialTab);
  const [lang, setLang] = useState<'cz' | 'en'>('cz');
  const [output, setOutput] = useState<MenuOutput>({ type: null, loading: false, success: false });
  const [generatedPdfImage, setGeneratedPdfImage] = useState<string | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Reset output when switching tabs
  useEffect(() => {
    setIsPreviewVisible(true);
    setOutput({ type: null, loading: false, success: false });
    setGeneratedPdfImage(null);
  }, [activeTab]);

  const currentMenu = menus[activeTab] || [];

  const sortedMenu = useMemo(() => {
    if (!currentMenu) return [];
    return [...currentMenu].sort((a, b) => {
      // Polévka first
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
        addMenuToHistory(currentMenu, output.type || undefined, activeTab);
      }
    };

    if (type === 'pdf') {
      try {
        const localProxyUrl = '/api/export-menu';
        const params = new URLSearchParams();

        // Pass menu type if needed, or stick to structure
        params.append('menuType', activeTab);

        // Categorize dishes
        const menuSoups = sortedMenu.filter(d => d.category === 'Polévka');
        // Treat Breakfast items as mains for the prompt structure unless we change backend
        const menuMains = sortedMenu.filter(d => d.category === 'Hlavní jídlo' || d.category === 'Snídaně');

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
    } else if (type === 'web') {
      // Handle web export via API proxy
      try {
        const localProxyUrl = '/api/export-menu';
        const params = new URLSearchParams();
        params.append('menuType', activeTab);
        params.append('target', 'web'); // Specify web target

        // ... (dish mapping will be needed here as well, duplicate logic or refactor)
        const menuSoups = sortedMenu.filter(d => d.category === 'Polévka');
        const menuMains = sortedMenu.filter(d => d.category === 'Hlavní jídlo' || d.category === 'Snídaně');

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

        const response = await fetch(finalUrl, { method: 'GET' });
        if (!response.ok) throw new Error(`Proxy error: ${response.statusText}`);

        // Web webhook typically doesn't return an image we need to display, but we handle the response
        await response.json();

        setOutput({ type: type, loading: false, success: true });
        onGenerationSuccess();
        toast({
          title: "Úspěšně exportováno",
          description: "Menu bylo úspěšně odesláno na web.",
        });

      } catch (error) {
        console.error("Failed to export to web:", error);
        const message = error instanceof Error ? error.message : 'Neznámá chyba';
        toast({
          variant: "destructive",
          title: "Chyba při exportu",
          description: message,
        });
        setOutput({ type: type, loading: false, success: false });
      }
    } else {
      // Simulate other generation types (post)
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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MenuVariant)} className="flex flex-col md:flex-row gap-8 items-start w-full">
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

        <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column - Content (Preview or Result) */}
          <div className="lg:col-span-2 space-y-6">
            {!currentMenu || currentMenu.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-card/50">
                <Pilcrow className="w-12 h-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">Žádné menu pro tuto variantu</h2>
                <p className="text-muted-foreground mb-4">Sestavte nejprve menu v sekci Sestavit menu.</p>
                <Button asChild variant="secondary">
                  <Link href={`/sestav-menu?tab=${activeTab}`}>Sestavit menu</Link>
                </Button>
              </div>
            ) : isPreviewVisible ? (
              <Card className="glass-card">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Náhled menu ({activeTab === 'breakfast' ? 'Snídaně' : activeTab === 'standard' ? 'Jídelní menu' : 'Týdenní menu'})</CardTitle>
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
                  disabled={output.loading || !currentMenu?.length || activeTab !== 'weekly'}
                  className="h-auto py-6 px-4 flex items-center justify-between gap-4 hover:bg-muted/50 transition-all border-2 w-full text-left bg-card"
                >
                  <div className="flex items-center gap-4">
                    {output.loading && output.type === 'pdf' ? (
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    ) : (
                      <FileText className={`w-8 h-8 ${activeTab === 'weekly' ? 'text-primary' : 'text-muted-foreground'}`} />
                    )}
                    <div className="space-y-1">
                      <span className="font-bold block flex items-center gap-2">
                        Tiskové menu
                        {activeTab !== 'weekly' && (
                          <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">Již brzy</Badge>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground font-normal block">
                        {activeTab === 'weekly' ? 'Vygenerovat menu k tisku' : 'Zatím dostupné jen pro Týdenní menu'}
                      </span>
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  disabled={true}
                  className="h-auto py-6 px-4 flex items-center justify-start gap-4 transition-all border-2 w-full text-left opacity-60 cursor-not-allowed"
                >
                  <ImageIcon className="w-8 h-8 text-pink-500/50" />
                  <div className="space-y-1">
                    <span className="font-bold block flex items-center gap-2">
                      Sociální sítě
                      <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">Již brzy</Badge>
                    </span>
                    <span className="text-xs text-muted-foreground font-normal block">Příspěvky pro Instagram/FB</span>
                  </div>
                </Button>

                {activeTab === 'weekly' && (
                  <Button
                    variant="outline"
                    onClick={() => handleGenerate('web')}
                    disabled={output.loading || !currentMenu?.length}
                    className="h-auto py-6 px-4 flex items-center justify-start gap-4 hover:bg-muted/50 transition-all border-2 w-full text-left"
                  >
                    <Globe className="w-8 h-8 text-blue-500" />
                    <div className="space-y-1">
                      <span className="font-bold block">Webové stránky</span>
                      <span className="text-xs text-muted-foreground font-normal block">Propsat na web restaurace</span>
                    </div>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </Tabs>
    </div>
  );
}

export default function ExportPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Loader2 className="w-16 h-16 text-muted-foreground mb-4 animate-spin" />
        <h2 className="text-2xl font-semibold mb-2">Načítání...</h2>
      </div>
    }>
      <ExportPageContent />
    </Suspense>
  );
}
