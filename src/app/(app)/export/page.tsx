"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useGastro } from '@/contexts/GastroContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Globe, Image as ImageIcon, Pilcrow, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';

type MenuOutput = {
  type: 'pdf' | 'post' | 'web' | null;
  loading: boolean;
  success: boolean;
};

export default function ExportPage() {
  const { currentMenu } = useGastro();
  const { toast } = useToast();
  const [lang, setLang] = useState<'cz' | 'en'>('cz');
  const [output, setOutput] = useState<MenuOutput>({ type: null, loading: false, success: false });

  const handleGenerate = async (type: 'pdf' | 'post' | 'web') => {
    setOutput({ type: type, loading: true, success: false });

    if (type === 'pdf') {
        try {
            const response = await fetch('/api/export-menu', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ menu: currentMenu }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Nastala chyba při odesílání dat.');
            }

            setOutput({ type: type, loading: false, success: true });
            toast({
                title: "Úspěšně odesláno",
                description: "Menu bylo úspěšně odesláno ke generování.",
            });

        } catch (error) {
             console.error("Failed to generate PDF:", error);
             let message = 'Neznámá chyba';
             if (error instanceof Error) {
                 message = error.message;
             }
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
        }, 1500);
    }
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
    
    if (!output.type) {
        return null;
    }

    if (output.success) {
        switch (output.type) {
            case 'pdf':
                return (
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle>Menu odesláno</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center gap-4 p-8 bg-green-500/10 rounded-lg">
                        <CheckCircle2 className="w-16 h-16 text-green-500" />
                        <p className="text-green-600 dark:text-green-400">Data byla úspěšně odeslána ke zpracování.</p>
                    </CardContent>
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

  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-bold tracking-tight">Export menu</h1>
        <p className="text-muted-foreground">Zkontrolujte sestavené menu a vygenerujte výstupy.</p>
      </div>
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
            {currentMenu.map(dish => (
              <div key={dish.id} className="p-4 border rounded-lg bg-background/50">
                <p className="font-semibold">{lang === 'cz' ? dish.name_cz : dish.name_en}</p>
                <div className="flex flex-col text-sm text-muted-foreground mt-2">
                    <div className="flex justify-between items-start mb-2">
                        <span>Cena:</span>
                        <span className="font-medium text-foreground">{dish.price} Kč</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span>Alergeny:</span>
                      <div className="flex items-center gap-2 flex-wrap justify-end max-w-[70%]">
                        {dish.allergenIds.map(id => <Badge key={id} variant="secondary">{id}</Badge>)}
                      </div>
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
