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
import { Download, FileText, Globe, Image as ImageIcon, Pilcrow, Loader2, Zap, Layers, Printer, ChevronRight, AlertTriangle, FileWarning, Settings, Cloud } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';
import { DishFormSheet } from '@/components/dishes/dish-form-sheet';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Dish } from '@/lib/types';
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
  type: 'pdf' | 'post' | 'web' | 'bulk-pdf' | null;
  loading: boolean;
  success: boolean;
};

type BulkPdfOutput = {
  soups: string | null;
  mains: string | null;
  weekly: string | null;
};

type PdfSource = 'placid' | 'custom';
type PdfKind = 'image' | 'pdf';
const PDF_TEMPLATES_BUCKET = 'menu-templates';


const MENU_LIMITS: Record<MenuVariant, { soups: number; mains: number }> = {
  soups: { soups: 2, mains: 0 },
  mains: { soups: 0, mains: 5 },
  weekly: { soups: 0, mains: 2 },
};


function ExportPageContent() {
  const { menus, addMenuToHistory, allergens } = useGastro();
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as MenuVariant) || 'weekly';

  const [activeTab, setActiveTab] = useState<MenuVariant>(initialTab);
  const [lang, setLang] = useState<'cz' | 'en'>('cz');
  const [exportMode, setExportMode] = useState<'single' | 'bulk'>('single');
  const [output, setOutput] = useState<MenuOutput>({ type: null, loading: false, success: false });
  const [generatedPdfImage, setGeneratedPdfImage] = useState<string | null>(null);
  const [generatedPdfKind, setGeneratedPdfKind] = useState<PdfKind>('image');
  const [bulkPdfImages, setBulkPdfImages] = useState<BulkPdfOutput>({ soups: null, mains: null, weekly: null });
  const [bulkPdfKind, setBulkPdfKind] = useState<PdfKind>('image');
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [bulkViewIndex, setBulkViewIndex] = useState(0);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [pdfSource, setPdfSource] = useState<PdfSource>('placid');


  useEffect(() => {
    setHasMounted(true);
    try {
      const stored = window.localStorage.getItem('pdfSource');
      if (stored === 'placid' || stored === 'custom') setPdfSource(stored);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    try { window.localStorage.setItem('pdfSource', pdfSource); } catch { /* ignore */ }
  }, [pdfSource, hasMounted]);

  const getTemplateUrl = (variant: MenuVariant): string | null => {
    if (!user) return null;
    const supabase = createClient();
    const { data } = supabase.storage
      .from(PDF_TEMPLATES_BUCKET)
      .getPublicUrl(`${user.id}/${variant}.pdf`);
    if (!data?.publicUrl) return null;
    // Cache-buster: po nahrazení šablony může Cloudflare/Supabase CDN ještě chvíli
    // servírovat starou verzi (i serverovému fetchi v /api/fill-pdf). Unikátní query
    // param vynutí stažení aktuálního souboru.
    const bust = `${Date.now()}`;
    return `${data.publicUrl}${data.publicUrl.includes('?') ? '&' : '?'}t=${bust}`;
  };

  const buildFieldsForVariant = (variant: MenuVariant): Record<string, string> => {
    const menuItems = menus[variant] || [];
    const limit = MENU_LIMITS[variant];
    const sorted = [...menuItems].sort((a, b) => {
      if (a.category === 'Polévka' && b.category !== 'Polévka') return -1;
      if (a.category !== 'Polévka' && b.category === 'Polévka') return 1;
      return 0;
    });
    const mSoups = sorted.filter(d => d.category === 'Polévka').slice(0, limit.soups);
    const mMains = sorted.filter(d => d.category === 'Hlavní jídlo' || d.category === 'Snídaně').slice(0, limit.mains);

    const allergenNumbers = (ids: string[]) =>
      ids.map(id => {
        const a = allergens.find(x => x.id === id);
        return a ? a.number : id;
      }).join(', ');

    const fields: Record<string, string> = {};
    mSoups.forEach((dish, idx) => {
      const i = idx + 1;
      fields[`soup${i}_cz`] = dish.title_cz || '';
      fields[`soup${i}_en`] = dish.title_en || '';
      fields[`soup${i}_price`] = `${dish.price}`;
      fields[`soup${i}_allergens`] = allergenNumbers(dish.allergens);
    });
    mMains.forEach((dish, idx) => {
      const i = idx + 1;
      fields[`main${i}_cz`] = dish.title_cz || '';
      fields[`main${i}_en`] = dish.title_en || '';
      fields[`main${i}_price`] = `${dish.price}`;
      fields[`main${i}_allergens`] = allergenNumbers(dish.allergens);
    });
    return fields;
  };

  const fetchCustomPdfUrl = async (variant: MenuVariant): Promise<string> => {
    const templateUrl = getTemplateUrl(variant);
    if (!templateUrl) throw new Error(`Šablona pro "${variant}" není nahrána. Nahrajte ji v Nastavení.`);

    const fields = buildFieldsForVariant(variant);
    console.log('[fill-pdf client] variant=', variant, 'templateUrl=', templateUrl, 'fields=', fields);

    const resp = await fetch('/api/fill-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateUrl,
        fields,
        filename: `menu-${variant}.pdf`,
      }),
    });

    if (!resp.ok) {
      const ct = resp.headers.get('content-type') || '';
      let detail = '';
      if (ct.includes('application/json')) {
        try {
          const j = await resp.json();
          console.error('[fill-pdf client] server error JSON:', j);
          detail = j.message || JSON.stringify(j);
        } catch { /* ignore */ }
      } else {
        detail = await resp.text().catch(() => '');
        console.error('[fill-pdf client] server error text:', detail);
      }
      throw new Error(detail || `${variant}: Chyba ${resp.status} ${resp.statusText}`);
    }

    const blob = await resp.blob();
    return URL.createObjectURL(blob);
  };

  // Reset output when switching tabs
  useEffect(() => {
    setIsPreviewVisible(true);
    setOutput({ type: null, loading: false, success: false });
    setGeneratedPdfImage(null);
    setBulkPdfImages({ soups: null, mains: null, weekly: null });
  }, [activeTab, exportMode]);


  const currentMenu = menus[activeTab] || [];

  const sortedMenu = useMemo(() => {
    if (!currentMenu) return [];

    const limit = MENU_LIMITS[activeTab];
    const soups = (currentMenu as any[]).filter(d => d.category === 'Polévka').slice(0, limit.soups);
    const mains = (currentMenu as any[]).filter(d => d.category === 'Hlavní jídlo' || d.category === 'Snídaně').slice(0, limit.mains);

    return [...soups, ...mains];
  }, [currentMenu, activeTab]);

  const missingTranslations = useMemo(() => {
    const getMissing = (variant: MenuVariant) => {
      const menuItems = (menus[variant] || []) as any[];
      const limit = MENU_LIMITS[variant];
      const soups = menuItems.filter(d => d.category === 'Polévka').slice(0, limit.soups);
      const mains = menuItems.filter(d => d.category === 'Hlavní jídlo' || d.category === 'Snídaně').slice(0, limit.mains);
      return [...soups, ...mains].filter(d => !d.title_en || d.title_en.trim() === '');
    };

    const soupsMissing = getMissing('soups');
    const mainsMissing = getMissing('mains');
    const weeklyMissing = getMissing('weekly');

    return {
      soups: soupsMissing,
      mains: mainsMissing,
      weekly: weeklyMissing,
      current: activeTab === 'soups' ? soupsMissing : activeTab === 'mains' ? mainsMissing : weeklyMissing,
      hasAny: soupsMissing.length > 0 || mainsMissing.length > 0 || weeklyMissing.length > 0,
      hasCurrent: (activeTab === 'soups' ? soupsMissing : activeTab === 'mains' ? mainsMissing : weeklyMissing).length > 0
    };
  }, [menus, activeTab]);


  const handleGenerate = async (type: 'pdf' | 'post' | 'web' | 'bulk-pdf') => {
    setIsPreviewVisible(false);
    setOutput({ type: type, loading: true, success: false });
    setGeneratedPdfImage(null);

    const onGenerationSuccess = () => {
      if (currentMenu && currentMenu.length > 0) {
        addMenuToHistory(currentMenu, output.type || undefined, activeTab);
      }
    };

    const constructParams = (variant: MenuVariant, target?: string) => {
      const menuItems = menus[variant] || [];
      const limit = MENU_LIMITS[variant];
      const sorted = [...menuItems].sort((a, b) => {
        if (a.category === 'Polévka' && b.category !== 'Polévka') return -1;
        if (a.category !== 'Polévka' && b.category === 'Polévka') return 1;
        return 0;
      });
      const mSoups = sorted.filter(d => d.category === 'Polévka').slice(0, limit.soups);
      const mMains = sorted.filter(d => d.category === 'Hlavní jídlo' || d.category === 'Snídaně').slice(0, limit.mains);

      const params = new URLSearchParams();
      params.append('menuType', variant);
      if (target) params.append('target', target);

      mSoups.forEach((dish, idx) => {
        const i = idx + 1;
        params.append(`soup${i}_cz`, dish.title_cz || '');
        params.append(`soup${i}_en`, dish.title_en || '');
        params.append(`soup${i}_price`, dish.price.toString());
        const dishAllergens = dish.allergens.map(id => {
          const allergen = allergens.find(a => a.id === id);
          return allergen ? allergen.number : id;
        }).join(', ');
        params.append(`soup${i}_allergens`, dishAllergens);
      });

      mMains.forEach((dish, idx) => {
        const i = idx + 1;
        params.append(`main${i}_cz`, dish.title_cz || '');
        params.append(`main${i}_en`, dish.title_en || '');
        params.append(`main${i}_price`, dish.price.toString());
        const dishAllergens = dish.allergens.map(id => {
          const allergen = allergens.find(a => a.id === id);
          return allergen ? allergen.number : id;
        }).join(', ');
        params.append(`main${i}_allergens`, dishAllergens);
      });
      return params;
    };

    if (type === 'pdf' || type === 'bulk-pdf') {
      try {
        const fetchViaPlacid = async (variant: MenuVariant) => {
          const params = constructParams(variant);
          const response = await fetch(`/api/export-menu?${params.toString()}`);
          if (!response.ok) throw new Error(`Chyba u ${variant}: ${response.statusText}`);
          const data = await response.json();
          return data.imageUrl as string;
        };

        const fetchOne = (variant: MenuVariant) =>
          pdfSource === 'custom' ? fetchCustomPdfUrl(variant) : fetchViaPlacid(variant);

        const kind: PdfKind = pdfSource === 'custom' ? 'pdf' : 'image';

        if (exportMode === 'bulk') {
          setOutput({ type: 'bulk-pdf', loading: true, success: false });
          const [soupsImg, mainsImg, weeklyImg] = await Promise.all([
            fetchOne('soups'),
            fetchOne('mains'),
            fetchOne('weekly')
          ]);
          setBulkPdfImages({ soups: soupsImg, mains: mainsImg, weekly: weeklyImg });
          setBulkPdfKind(kind);
          setBulkViewIndex(0);
          setOutput({ type: 'bulk-pdf', loading: false, success: true });

          // Save all dishes to history for bulk export
          const allDishes = [
            ...(menus.soups || []),
            ...(menus.mains || []),
            ...(menus.weekly || [])
          ];
          addMenuToHistory(allDishes, 'bulk-pdf');

          toast({ title: "Hromadný export dokončen", description: "Všechy 3 lístky byly vygenerovány." });
        } else {
          const img = await fetchOne(activeTab);
          setGeneratedPdfImage(img);
          setGeneratedPdfKind(kind);
          setOutput({ type: 'pdf', loading: false, success: true });
          onGenerationSuccess();
          toast({ title: "Úspěšně vygenerováno", description: "Menu pro tisk bylo vygenerováno." });
        }
      } catch (error) {
        console.error("Failed to generate PDF:", error);
        toast({ variant: "destructive", title: "Chyba při generování", description: error instanceof Error ? error.message : 'Chyba' });
        setOutput({ type: type, loading: false, success: false });
      }
    } else if (type === 'web') {
      try {
        if (exportMode !== 'bulk') {
          throw new Error("Export na web je dostupný pouze v hromadném režimu.");
        }

        const bulkParams = new URLSearchParams();
        bulkParams.append('target', 'web');
        bulkParams.append('menuType', 'bulk');

        // Helper to add category data to bulkParams
        const addCategoryToBulk = (variant: MenuVariant, prefix: string) => {
          const menuItems = menus[variant] || [];
          const limit = MENU_LIMITS[variant];
          const sorted = [...menuItems].sort((a, b) => {
            if (a.category === 'Polévka' && b.category !== 'Polévka') return -1;
            if (a.category !== 'Polévka' && b.category === 'Polévka') return 1;
            return 0;
          });
          const mSoups = sorted.filter(d => d.category === 'Polévka').slice(0, limit.soups);
          const mMains = sorted.filter(d => d.category === 'Hlavní jídlo' || d.category === 'Snídaně').slice(0, limit.mains);

          mSoups.forEach((dish, idx) => {
            const i = idx + 1;
            bulkParams.append(`${prefix}_soup${i}_cz`, dish.title_cz || '');
            bulkParams.append(`${prefix}_soup${i}_price`, dish.price.toString());
            const dishAllergens = dish.allergens.map(id => {
              const allergen = allergens.find(a => a.id === id);
              return allergen ? allergen.number : id;
            }).join(', ');
            bulkParams.append(`${prefix}_soup${i}_allergens`, dishAllergens);
          });

          mMains.forEach((dish, idx) => {
            const i = idx + 1;
            bulkParams.append(`${prefix}_main${i}_cz`, dish.title_cz || '');
            bulkParams.append(`${prefix}_main${i}_price`, dish.price.toString());
            const dishAllergens = dish.allergens.map(id => {
              const allergen = allergens.find(a => a.id === id);
              return allergen ? allergen.number : id;
            }).join(', ');
            bulkParams.append(`${prefix}_main${i}_allergens`, dishAllergens);
          });
        };

        // Add all categories
        addCategoryToBulk('soups', 'soups');
        addCategoryToBulk('mains', 'mains');
        addCategoryToBulk('weekly', 'weekly');

        const response = await fetch(`/api/export-menu?${bulkParams.toString()}`);
        if (!response.ok) throw new Error(`Chyba při hromadném exportu: ${response.statusText}`);

        await response.json();

        setOutput({ type: 'web', loading: false, success: true });

        // Save all dishes to history for web export
        const allDishes = [
          ...(menus.soups || []),
          ...(menus.mains || []),
          ...(menus.weekly || [])
        ];
        addMenuToHistory(allDishes, 'web');

        toast({
          title: "Hromadný export na web dokončen",
          description: "Všechny sekce menu (CZ + ceny + alergeny) byly odeslány v jednom balíku.",
        });

      } catch (error) {
        console.error("Failed to export to web:", error);
        const message = error instanceof Error ? error.message : 'Neznámá chyba';
        toast({
          variant: "destructive",
          title: "Chyba při exportu na web",
          description: message,
        });
        setOutput({ type: 'web', loading: false, success: false });
      }
    }

    else {
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

  const handleDownload = (imgUrl?: string, filename?: string) => {
    const url = imgUrl || generatedPdfImage;
    if (!url) return;
    const ext = (imgUrl ? bulkPdfKind : generatedPdfKind) === 'pdf' ? 'pdf' : 'png';
    const finalName = filename || `menu.${ext}`;
    try {
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', finalName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Chyba při stahování:", error);
    }
  };

  const handleDownloadAll = () => {
    const ext = bulkPdfKind === 'pdf' ? 'pdf' : 'png';
    if (bulkPdfImages.soups) handleDownload(bulkPdfImages.soups, `polevky.${ext}`);
    setTimeout(() => {
      if (bulkPdfImages.mains) handleDownload(bulkPdfImages.mains, `hlavni_chod.${ext}`);
    }, 200);
    setTimeout(() => {
      if (bulkPdfImages.weekly) handleDownload(bulkPdfImages.weekly, `tydenni_menu.${ext}`);
    }, 400);
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
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle>Náhled pro tisk</CardTitle>
                  <Button onClick={() => handleDownload()} size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    {generatedPdfKind === 'pdf' ? 'Stáhnout PDF' : 'Stáhnout obrázek'}
                  </Button>
                </CardHeader>
                <CardContent>
                  {generatedPdfKind === 'pdf' ? (
                    <iframe
                      src={generatedPdfImage}
                      title="Vygenerované menu (PDF)"
                      className="rounded-lg border shadow-md w-full"
                      style={{ height: '80vh' }}
                    />
                  ) : (
                    <Image src={generatedPdfImage} alt="Vygenerované menu" width={800} height={1128} className="rounded-lg border shadow-md w-full h-auto" />
                  )}
                </CardContent>
              </Card>
            );
          }
          return null;
        case 'bulk-pdf':
          const bulkItems = [
            { id: 'soups', label: 'Polévky', img: bulkPdfImages.soups },
            { id: 'mains', label: 'Hlavní chod', img: bulkPdfImages.mains },
            { id: 'weekly', label: 'Týdenní menu', img: bulkPdfImages.weekly },
          ].filter(item => item.img);

          const currentItem = bulkItems[bulkViewIndex];

          return (
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
                <div className="space-y-1">
                  <CardTitle>Hromadný náhled ({currentItem?.label})</CardTitle>
                  <CardDescription>Položka {bulkViewIndex + 1} z {bulkItems.length}</CardDescription>
                </div>
                <Button onClick={handleDownloadAll} size="sm" className="bg-primary hover:bg-primary/90">
                  <Download className="mr-2 h-4 w-4" /> Stáhnout vše najednou
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="relative group">
                  {currentItem?.img && (
                    bulkPdfKind === 'pdf' ? (
                      <iframe
                        src={currentItem.img}
                        title={currentItem.label}
                        className="rounded-lg border shadow-xl w-full transition-all duration-300"
                        style={{ height: '80vh' }}
                      />
                    ) : (
                      <Image
                        src={currentItem.img}
                        alt={currentItem.label}
                        width={800}
                        height={1128}
                        className="rounded-lg border shadow-xl w-full h-auto transition-all duration-300"
                      />
                    )
                  )}

                  {/* Carousel Controls */}
                  <div className="flex justify-center gap-2 mt-6">
                    {bulkItems.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setBulkViewIndex(idx)}
                        className={`h-2.5 rounded-full transition-all duration-300 ${bulkViewIndex === idx ? 'w-8 bg-primary' : 'w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                          }`}
                      />
                    ))}
                  </div>

                  {/* Simple prev/next overlay buttons for desktop */}
                  <button
                    onClick={() => setBulkViewIndex(prev => (prev > 0 ? prev - 1 : bulkItems.length - 1))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <button
                    onClick={() => setBulkViewIndex(prev => (prev < bulkItems.length - 1 ? prev + 1 : 0))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
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
            value="soups"
            key="tab-soups-trigger"
            className="w-full justify-start px-4 py-3 text-base bg-muted/20 data-[state=active]:bg-primary data-[state=active]:text-white border border-transparent rounded-lg shadow-sm transition-all"
          >
            Polévky
          </TabsTrigger>
          <TabsTrigger
            value="mains"
            key="tab-mains-trigger"
            className="w-full justify-start px-4 py-3 text-base bg-muted/20 data-[state=active]:bg-primary data-[state=active]:text-white border border-transparent rounded-lg shadow-sm transition-all"
          >
            Hlavní chod
          </TabsTrigger>
          <TabsTrigger
            value="weekly"
            key="tab-weekly-trigger"
            className="w-full justify-start px-4 py-3 text-base bg-muted/20 data-[state=active]:bg-primary data-[state=active]:text-white border border-transparent rounded-lg shadow-sm transition-all"
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
              <div className="space-y-6">
                <Card className="glass-card">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Náhled menu ({activeTab === 'soups' ? 'Polévky' : activeTab === 'mains' ? 'Hlavní chod' : 'Týdenní menu'})</CardTitle>

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
                      <TableBody key={activeTab}>
                        {sortedMenu.map((dish, index) => (
                          <TableRow key={`${activeTab}-${dish.id}-${index}`}>
                            <TableCell>
                              <div className="font-medium">
                                {lang === 'cz' ? (
                                  dish.title_cz
                                ) : (
                                  dish.title_en || <span className="text-orange-500 italic opacity-70">(Chybí anglický překlad)</span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                <span className="text-xs">Alergeny:</span>
                                <div className="flex items-center gap-2">
                                  <div className="flex gap-1">
                                    {dish.allergens.map((id: string) => (
                                      <Badge key={id} variant="secondary" className="px-1 py-0 text-[10px]">
                                        {getAllergenNumber(id)}
                                      </Badge>
                                    ))}
                                  </div>

                                  {(!dish.title_en || dish.title_en.trim() === '') && lang === 'cz' && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] py-0 px-2 h-5 border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer font-bold flex items-center gap-1"
                                      onClick={() => {
                                        setEditingDish(dish);
                                        setIsEditSheetOpen(true);
                                      }}
                                    >
                                      <AlertTriangle className="h-3 w-3" />
                                      Chybí EN texty – doplnit
                                    </Badge>
                                  )}
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
              </div>
            ) : (
              renderOutput()
            )}
          </div>

          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Generovat výstupy</CardTitle>
                <CardDescription>Vytvořte z menu podklady</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {/* PDF Source Switcher */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Zdroj PDF</Label>
                    <Link href="/nastaveni" className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Settings className="h-3 w-3" /> Šablony
                    </Link>
                  </div>
                  <div className="bg-slate-200/50 p-1 rounded-xl flex gap-1 border border-slate-300/50">
                    <button
                      onClick={() => setPdfSource('placid')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${pdfSource === 'placid'
                        ? 'bg-primary text-white shadow'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/30'
                        }`}
                    >
                      <Cloud className="h-3.5 w-3.5" /> Placid (n8n)
                    </button>
                    <button
                      onClick={() => setPdfSource('custom')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${pdfSource === 'custom'
                        ? 'bg-primary text-white shadow'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/30'
                        }`}
                    >
                      <FileText className="h-3.5 w-3.5" /> Vlastní PDF
                    </button>
                  </div>
                  {pdfSource === 'custom' && (
                    <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
                      Vyplní vaši PDF šablonu (AcroForm pole) přímo v appce. Nahrát šablony můžete v{' '}
                      <Link href="/nastaveni" className="text-primary hover:underline">Nastavení</Link>.
                    </p>
                  )}
                </div>

                {/* Mode Switcher */}
                <div className="bg-slate-200/50 p-1 rounded-xl flex gap-1 border border-slate-300/50 mb-3">
                  <button
                    onClick={() => setExportMode('single')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${exportMode === 'single'
                      ? 'bg-primary text-white shadow-lg transform scale-[1.02]'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-white/30'
                      }`}
                  >
                    Jednotlivě
                  </button>
                  <button
                    onClick={() => setExportMode('bulk')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${exportMode === 'bulk'
                      ? 'bg-primary text-white shadow-lg transform scale-[1.02]'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-white/30'
                      }`}
                  >
                    Hromadně
                  </button>
                </div>

                <Button
                  variant="outline"
                  onClick={() => handleGenerate(exportMode === 'bulk' ? 'bulk-pdf' : 'pdf')}
                  disabled={output.loading}
                  className={`h-auto py-6 px-4 flex items-center justify-between gap-4 transition-all border-2 w-full text-left bg-card ${exportMode === 'bulk' ? 'border-primary ring-2 ring-primary/10' : 'hover:bg-muted/50'}`}
                >
                  <div className="flex items-center gap-4">
                    {output.loading && (output.type === 'pdf' || output.type === 'bulk-pdf') ? (
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    ) : (
                      <Printer className="w-8 h-8 text-primary" />
                    )}
                    <div className="space-y-1">
                      <span className="font-bold block flex items-center gap-2">
                        {exportMode === 'bulk'
                          ? 'Generovat vše hromadně'
                          : `Tiskové menu ${activeTab === 'soups' ? 'Polévky' : activeTab === 'mains' ? 'Hlavní chod' : 'Týdenní menu'}`}
                      </span>
                      <span className="text-xs text-muted-foreground font-normal block">
                        {exportMode === 'bulk'
                          ? 'Spustí export pro všechny 3 sekce najednou'
                          : `Vygenerovat ${activeTab === 'soups' ? 'polévkový lístek' : activeTab === 'mains' ? 'nabídku hlavních jídel' : 'kompletní týdenní přehled'}`}
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

                <Button
                  variant="outline"
                  onClick={() => handleGenerate('web')}
                  disabled={output.loading || exportMode === 'single'}
                  className={`h-auto py-6 px-4 flex items-center justify-start gap-4 transition-all border-2 w-full text-left ${exportMode === 'single' ? 'opacity-50 grayscale bg-muted/20' : 'hover:bg-muted/50'}`}
                >
                  <Globe className={`w-8 h-8 ${exportMode === 'single' ? 'text-slate-400' : 'text-blue-500'}`} />
                  <div className="space-y-1">
                    <span className="font-bold block flex items-center gap-2">
                      Webové stránky
                      {exportMode === 'single' && <Badge variant="outline" className="text-[10px] py-0 h-4 border-slate-300">Pouze hromadně</Badge>}
                    </span>
                    <span className="text-xs text-muted-foreground font-normal block">
                      {exportMode === 'single'
                        ? 'Export na web vyžaduje hromadný režim'
                        : 'Propsat všechny 3 sekce menu na web najednou'}
                    </span>
                  </div>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Tabs>

      <DishFormSheet
        isOpen={isEditSheetOpen}
        onClose={() => {
          setIsEditSheetOpen(false);
          setEditingDish(null);
        }}
        dish={editingDish}
        initialTab="en"
      />
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
