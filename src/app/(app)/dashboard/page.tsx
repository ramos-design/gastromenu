"use client";

import { useGastro } from "@/contexts/GastroContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CookingPot, ListPlus, Sprout } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

export default function DashboardPage() {
  const { dishes, allergens } = useGastro();

  const metrics = useMemo(() => {
    const totalDishes = dishes.length;
    const totalSoups = dishes.filter(d => d.type === 'Polévka').length;
    const totalMains = dishes.filter(d => d.type === 'Hlavní jídlo').length;
    const totalAllergens = allergens.length;
    return { totalDishes, totalSoups, totalMains, totalAllergens };
  }, [dishes, allergens]);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Počet jídel</CardTitle>
            <CookingPot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalDishes}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Počet polévek</CardTitle>
            <CookingPot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSoups}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Počet hlavních jídel</CardTitle>
            <CookingPot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalMains}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Počet alergenů</CardTitle>
            <Sprout className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalAllergens}</div>
          </CardContent>
        </Card>
      </div>
      <div className="flex flex-col md:flex-row items-center gap-4">
        <Button asChild size="lg" className="w-full md:w-auto">
          <Link href="/jidla?action=add">
            <CookingPot className="mr-2 h-4 w-4" />
            Přidat jídlo
          </Link>
        </Button>
        <Button asChild variant="secondary" size="lg" className="w-full md:w-auto">
          <Link href="/sestav-menu">
            <ListPlus className="mr-2 h-4 w-4" />
            Sestavit menu
          </Link>
        </Button>
      </div>
    </div>
  );
}
