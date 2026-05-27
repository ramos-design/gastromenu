"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, Trash2, CheckCircle2, AlertCircle, Loader2, Download, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { MenuVariant } from '@/lib/types';

const BUCKET = 'menu-templates';

const VARIANTS: { id: MenuVariant; label: string; description: string; fields: string[] }[] = [
  {
    id: 'soups',
    label: 'Polévky',
    description: 'Šablona pro lístek polévek (2 položky)',
    fields: ['soup1_cz', 'soup1_en', 'soup1_price', 'soup1_allergens', 'soup2_cz', 'soup2_en', 'soup2_price', 'soup2_allergens'],
  },
  {
    id: 'mains',
    label: 'Hlavní chod',
    description: 'Šablona pro lístek hlavních jídel (5 položek)',
    fields: ['main1_cz', 'main1_en', 'main1_price', 'main1_allergens', '…', 'main5_cz', 'main5_en', 'main5_price', 'main5_allergens'],
  },
  {
    id: 'weekly',
    label: 'Týdenní menu',
    description: 'Šablona pro týdenní přehled (2 hlavní jídla)',
    fields: ['main1_cz', 'main1_en', 'main1_price', 'main1_allergens', 'main2_cz', 'main2_en', 'main2_price', 'main2_allergens'],
  },
];

type TemplateStatus = {
  publicUrl: string | null;
  updatedAt: string | null;
};

export default function NastaveniPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputs = useRef<Record<MenuVariant, HTMLInputElement | null>>({ soups: null, mains: null, weekly: null });
  const [statuses, setStatuses] = useState<Record<MenuVariant, TemplateStatus>>({
    soups: { publicUrl: null, updatedAt: null },
    mains: { publicUrl: null, updatedAt: null },
    weekly: { publicUrl: null, updatedAt: null },
  });
  const [busy, setBusy] = useState<Record<MenuVariant, boolean>>({ soups: false, mains: false, weekly: false });
  const [loading, setLoading] = useState(true);

  const objectPath = useCallback((variant: MenuVariant) => `${user?.id}/${variant}.pdf`, [user]);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const next: Record<MenuVariant, TemplateStatus> = {
      soups: { publicUrl: null, updatedAt: null },
      mains: { publicUrl: null, updatedAt: null },
      weekly: { publicUrl: null, updatedAt: null },
    };

    const { data } = await supabase.storage.from(BUCKET).list(user.id, { limit: 50 });
    if (data) {
      for (const f of data) {
        const variant = f.name.replace(/\.pdf$/i, '') as MenuVariant;
        if (variant === 'soups' || variant === 'mains' || variant === 'weekly') {
          const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(`${user.id}/${f.name}`);
          next[variant] = {
            publicUrl: pub.publicUrl,
            updatedAt: f.updated_at || f.created_at || null,
          };
        }
      }
    }
    setStatuses(next);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleUpload = async (variant: MenuVariant, file: File) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Nejste přihlášen(a)', description: 'Pro nahrávání šablon musíte být přihlášen(a).' });
      return;
    }
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast({ variant: 'destructive', title: 'Neplatný formát', description: 'Nahrajte prosím PDF soubor.' });
      return;
    }
    setBusy(prev => ({ ...prev, [variant]: true }));
    const path = objectPath(variant);
    console.log('[upload] user.id =', user.id, '| path =', path, '| bucket =', BUCKET);

    const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: true,
      contentType: 'application/pdf',
      cacheControl: '0',
    });
    setBusy(prev => ({ ...prev, [variant]: false }));
    if (error) {
      console.error('[upload] error:', error);
      toast({
        variant: 'destructive',
        title: 'Chyba při nahrávání',
        description: `${error.message} (cesta: ${path})`,
      });
      return;
    }
    console.log('[upload] success:', data);
    toast({ title: 'Šablona nahrána', description: `Šablona pro ${variant} byla uložena.` });
    refresh();
  };

  const handleDelete = async (variant: MenuVariant) => {
    if (!user) return;
    if (!confirm(`Smazat šablonu pro ${variant}?`)) return;
    setBusy(prev => ({ ...prev, [variant]: true }));
    const { error } = await supabase.storage.from(BUCKET).remove([objectPath(variant)]);
    setBusy(prev => ({ ...prev, [variant]: false }));
    if (error) {
      toast({ variant: 'destructive', title: 'Chyba při mazání', description: error.message });
      return;
    }
    toast({ title: 'Šablona smazána' });
    refresh();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nastavení</h1>
        <p className="text-muted-foreground">Spravujte PDF šablony pro export menu.</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Jak to funguje</CardTitle>
          <CardDescription>
            Nahrajte PDF šablonu s vyplněnými formulářovými poli (AcroForm). App pak při exportu vyplní pole hodnotami
            z aktuálního menu a vrátí finální PDF k tisku — bez Placid a bez n8n.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="font-medium">Konvence pojmenování polí (case-sensitive):</p>
          <div className="grid gap-2 md:grid-cols-3">
            {VARIANTS.map(v => (
              <div key={v.id} className="rounded-lg border bg-muted/30 p-3">
                <div className="font-semibold mb-1">{v.label}</div>
                <div className="text-xs text-muted-foreground font-mono leading-relaxed">
                  {v.fields.join(', ')}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: pole vytvoříte v Adobe Acrobat (Prepare Form), Affinity Publisher nebo v jiném PDF editoru. Název pole
            musí přesně odpovídat výše uvedeným klíčům.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {VARIANTS.map(v => {
          const status = statuses[v.id];
          const isBusy = busy[v.id];
          const hasTemplate = !!status.publicUrl;
          return (
            <Card key={v.id} className="glass-card flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle>{v.label}</CardTitle>
                    <CardDescription className="mt-1">{v.description}</CardDescription>
                  </div>
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : hasTemplate ? (
                    <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/20 border-green-500/30 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Nahrána
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Chybí
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3">
                <div className="rounded-lg border-2 border-dashed bg-muted/20 p-6 text-center flex flex-col items-center gap-2 flex-1 justify-center">
                  <FileText className="w-10 h-10 text-muted-foreground" />
                  {hasTemplate && status.updatedAt && (
                    <p className="text-xs text-muted-foreground">
                      Naposled: {new Date(status.updatedAt).toLocaleString('cs-CZ')}
                    </p>
                  )}
                  {!hasTemplate && (
                    <p className="text-xs text-muted-foreground">Šablona ještě nebyla nahrána</p>
                  )}
                </div>

                <input
                  ref={el => { fileInputs.current[v.id] = el; }}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(v.id, file);
                    e.target.value = '';
                  }}
                />

                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => fileInputs.current[v.id]?.click()}
                    disabled={isBusy}
                    className="w-full"
                  >
                    {isBusy ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {hasTemplate ? 'Nahradit šablonu' : 'Nahrát šablonu'}
                  </Button>
                  {hasTemplate && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a href={status.publicUrl!} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-2 h-3 w-3" />
                          Otevřít
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(v.id)}
                        disabled={isBusy}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="mr-2 h-3 w-3" />
                        Smazat
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
