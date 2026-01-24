"use client";

import { useGastro } from "@/contexts/GastroContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CookingPot, ListPlus } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

export default function DashboardPage() {
  const { dishes } = useGastro();

  const totalDishes = useMemo(() => {
    return dishes.length;
  }, [dishes]);

  return (
    <div className="flex flex-col gap-8">
      <div className="max-w-xs">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Celkový počet jídel</CardTitle>
            <CookingPot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDishes}</div>
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
