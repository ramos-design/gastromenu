"use client";

import { useGastro } from "@/contexts/GastroContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CookingPot, FileText, Globe, Image as ImageIcon, ListPlus, Clock } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const { dishes, menuHistory } = useGastro();

  const totalDishes = useMemo(() => dishes.length, [dishes]);

  const lastExports = useMemo(() => {
    if (!menuHistory) return { pdf: null, post: null, web: null };

    // Sort by date desc just in case (though context usually provides sorted)
    const sorted = [...menuHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      pdf: sorted.find(i => i.exportType === 'pdf' || !i.exportType), // Assuming legacy/undefined is PDF
      post: sorted.find(i => i.exportType === 'post'),
      web: sorted.find(i => i.exportType === 'web'),
    };
  }, [menuHistory]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('cs-CZ', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vítejte v Gastro Menu</h1>
        <p className="text-muted-foreground">Přehled vaší administrace.</p>
      </div>

      <div className="flex flex-wrap gap-6">
        {/* Total Dishes Tile */}
        <Card className="glass-card p-0 w-44 h-44 overflow-hidden shadow-lg rounded-2xl flex flex-col items-center justify-center bg-card/50">
          <div className="flex flex-col items-center gap-2 p-4">
            <span className="text-sm font-medium text-muted-foreground text-center uppercase tracking-wide">Celkem jídel</span>
            <div className="flex items-center gap-3">
              <CookingPot className="h-8 w-8 text-primary" />
              <span className="text-5xl font-bold text-foreground">{totalDishes}</span>
            </div>
          </div>
        </Card>

        {/* Add New Dish Button */}
        <Card className="glass-card p-0 w-44 h-44 overflow-hidden hover:scale-[1.05] transition-transform shadow-lg rounded-2xl border-0">
          <Link href="/jidla?action=add" className="flex flex-col items-center justify-center w-full h-full bg-blue-600 text-white hover:bg-blue-700 p-4 gap-2">
            <div className="rounded-full bg-white/20 p-2">
              <ListPlus className="h-8 w-8 text-white" />
            </div>
            <span className="text-lg font-bold text-center leading-tight">Přidat<br />nové jídlo</span>
          </Link>
        </Card>

        {/* Action Shortcuts */}
        <Card className="glass-card p-0 w-44 h-44 overflow-hidden hover:scale-[1.05] transition-transform shadow-lg rounded-2xl">
          <Link href="/sestav-menu" className="flex flex-col items-center justify-center w-full h-full bg-primary text-primary-foreground hover:bg-primary/90 p-4 gap-2">
            <ListPlus className="h-10 w-10" />
            <span className="text-lg font-bold text-center leading-tight">Sestavit menu</span>
          </Link>
        </Card>

        {/* Spacers to fill grid if needed, currently empty */}
      </div>

      <h2 className="text-xl font-semibold mt-8">Poslední aktivity</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">

        {/* Last PDF Export */}
        <Card className="glass-card md:col-span-1 border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Poslední exportované menu</CardTitle>
            </div>
            <CardDescription>Tiskové PDF</CardDescription>
          </CardHeader>
          <CardContent>
            {lastExports.pdf ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <div className="text-2xl font-bold">
                    {lastExports.pdf.variant === 'breakfast' ? 'Snídaně' :
                      lastExports.pdf.variant === 'standard' ? 'Jídelní menu' :
                        lastExports.pdf.variant === 'weekly' ? 'Týdenní menu' :
                          'Menu'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {formatDate(lastExports.pdf.date)}
                  </div>
                </div>

                <Button asChild variant="outline" size="sm" className="w-full mt-2">
                  <Link href="/historie">
                    Zobrazit v historii
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm italic py-4">
                Zatím žádný export.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Last Social Export */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-pink-500" />
              <CardTitle className="text-lg">Sociální sítě</CardTitle>
            </div>
            <CardDescription>Poslední export</CardDescription>
          </CardHeader>
          <CardContent>
            {lastExports.post ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <div className="text-2xl font-bold">
                    {lastExports.post.variant === 'breakfast' ? 'Snídaně' :
                      lastExports.post.variant === 'standard' ? 'Jídelní menu' :
                        lastExports.post.variant === 'weekly' ? 'Týdenní menu' :
                          'Příspěvek'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {formatDate(lastExports.post.date)}
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="w-full mt-2">
                  <Link href="/historie">
                    Zobrazit v historii
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm italic py-8">
                Zatím nebylo exportováno.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Last Web Export */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">Webové stránky</CardTitle>
            </div>
            <CardDescription>Poslední export</CardDescription>
          </CardHeader>
          <CardContent>
            {lastExports.web ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <div className="text-2xl font-bold">
                    {lastExports.web.variant === 'breakfast' ? 'Snídaně' :
                      lastExports.web.variant === 'standard' ? 'Jídelní menu' :
                        lastExports.web.variant === 'weekly' ? 'Týdenní menu' :
                          'Web export'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {formatDate(lastExports.web.date)}
                  </div>
                  <div className="text-xs text-green-600 font-medium mt-1">
                    Odesláno na web
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="w-full mt-2">
                  <Link href="/historie">
                    Zobrazit v historii
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm italic py-8">
                Zatím nebylo exportováno.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>

  );
}
