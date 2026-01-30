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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Dishes Tile */}
        <Card className="glass-card lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Celkový počet jídel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <CookingPot className="h-8 w-8 text-primary" />
              <div className="text-4xl font-bold">{totalDishes}</div>
            </div>
            <div className="mt-4">
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link href="/jidla?action=add">
                  Přidat nové jídlo
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Action Shortcuts (Optional, reusing space if needed, otherwise kept simple) */}
        <Card className="glass-card lg:col-span-1 flex flex-col justify-center items-center p-6 space-y-4">
          <Button asChild className="w-full h-auto py-4 text-lg" variant="default">
            <Link href="/sestav-menu">
              <ListPlus className="mr-2 h-6 w-6" /> Sestavit menu
            </Link>
          </Button>
        </Card>

        {/* Spacers or other stats could go here, currently using 2 cols for "Last Export" */}
      </div>

      <h2 className="text-xl font-semibold mt-8">Poslední aktivity</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Last PDF Export (Detailed) */}
        <Card className="glass-card md:col-span-2 lg:col-span-1 border-primary/20 bg-primary/5">
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
                <div className="iflex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Clock className="h-4 w-4" />
                  {formatDate(lastExports.pdf.date)}
                </div>
                <div className="space-y-2">
                  {lastExports.pdf.dishes.slice(0, 3).map((dish) => (
                    <div key={dish.id} className="text-sm border-b pb-1 last:border-0 truncate">
                      {dish.title_cz}
                    </div>
                  ))}
                  {lastExports.pdf.dishes.length > 3 && (
                    <div className="text-xs text-muted-foreground italic">
                      + {lastExports.pdf.dishes.length - 3} dalších jídel
                    </div>
                  )}
                </div>
                <Badge variant="outline" className="mt-2">
                  {lastExports.pdf.dishes.length} položek
                </Badge>
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
              <div className="flex flex-col gap-2">
                <div className="text-2xl font-bold">
                  {new Date(lastExports.post.date).toLocaleDateString('cs-CZ')}
                </div>
                <div className="text-muted-foreground text-sm">
                  {new Date(lastExports.post.date).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  Obsah: {lastExports.post.dishes.length} jídel
                </div>
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
              <div className="flex flex-col gap-2">
                <div className="text-2xl font-bold">
                  {new Date(lastExports.web.date).toLocaleDateString('cs-CZ')}
                </div>
                <div className="text-muted-foreground text-sm">
                  {new Date(lastExports.web.date).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  Status: <span className="text-green-600 font-medium">Odesláno</span>
                </div>
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
