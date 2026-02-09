"use client";

import { useGastro } from "@/contexts/GastroContext";
import { Card, CardContent } from "@/components/ui/card";
import { CookingPot, ListPlus, Calendar, FileText, Clock, Sparkles, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

export default function DashboardPage() {
  const { dishes, menus } = useGastro();

  const totalDishes = useMemo(() => dishes.length, [dishes]);

  // Current date info
  const today = useMemo(() => {
    const now = new Date();
    const dayName = now.toLocaleDateString('cs-CZ', { weekday: 'long' });
    const formattedDate = now.toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    // Capitalize first letter of dayName
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);

    return { day: capitalizedDay, date: formattedDate };
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Vítej v No Gluten No Problem</h1>
          <p className="text-muted-foreground mt-1">Přehled tvojí menu administrace.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Date Card */}
        <Card className="glass-card p-0 h-44 overflow-hidden shadow-lg rounded-2xl flex flex-col items-center justify-center bg-card/50 border-0">
          <div className="flex flex-col items-center gap-2 p-4 text-center">
            <Calendar className="h-6 w-6 text-orange-500 mb-1" />
            <span className="text-2xl font-black text-slate-800 leading-tight">{today.day}</span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{today.date}</span>
          </div>
        </Card>

        {/* Total Dishes Tile */}
        <Card className="glass-card p-0 h-44 overflow-hidden shadow-lg rounded-2xl flex flex-col items-center justify-center bg-card/50 border-0">
          <div className="flex flex-col items-center gap-2 p-4">
            <span className="text-[10px] font-bold text-muted-foreground text-center uppercase tracking-widest">Jídel v databázi</span>
            <div className="flex items-center gap-3">
              <CookingPot className="h-8 w-8 text-primary" />
              <span className="text-5xl font-black text-slate-800">{totalDishes}</span>
            </div>
          </div>
        </Card>

        {/* Add New Dish Button */}
        <Card className="glass-card p-0 h-44 overflow-hidden hover:scale-[1.02] transition-transform shadow-lg rounded-2xl border-0">
          <Link href="/jidla?action=add" className="flex flex-col items-center justify-center w-full h-full bg-blue-600 text-white hover:bg-blue-700 p-4 gap-2 text-center px-6">
            <div className="rounded-full bg-white/20 p-2">
              <ListPlus className="h-8 w-8 text-white" />
            </div>
            <span className="text-lg font-bold leading-tight">Přidat nové jídlo</span>
          </Link>
        </Card>

        {/* Action Shortcuts */}
        <Card className="glass-card p-0 h-44 overflow-hidden hover:scale-[1.02] transition-transform shadow-lg rounded-2xl border-0">
          <Link href="/sestav-menu" className="flex flex-col items-center justify-center w-full h-full bg-primary text-primary-foreground hover:bg-primary/90 p-4 gap-2 text-center px-6">
            <div className="rounded-full bg-white/20 p-2">
              <ListPlus className="h-8 w-8" />
            </div>
            <span className="text-lg font-bold leading-tight">Sestavit nové menu</span>
          </Link>
        </Card>
      </div>


      <div className="flex items-center justify-between mt-8">
        <h2 className="text-2xl font-black tracking-tight flex items-center gap-3 text-slate-800">
          <ListPlus className="h-6 w-6 text-primary" />
          Aktuálně sestavené menu
        </h2>
      </div>

      <Card className="glass-card border-0 shadow-2xl overflow-hidden bg-white/40 backdrop-blur-xl ring-1 ring-black/5 rounded-3xl">
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Polévky Column */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b-2 border-orange-100">
                <div className="bg-orange-500 text-white p-2 rounded-xl shadow-lg ring-4 ring-orange-50">
                  <CookingPot className="h-5 w-5" />
                </div>
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Polévky</h3>
              </div>
              <div className="space-y-4">
                {menus.soups && menus.soups.length > 0 ? (
                  menus.soups.map((dish: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start group p-2 rounded-lg hover:bg-orange-50/50 transition-colors">
                      <span className="text-slate-700 font-bold text-sm leading-tight group-hover:text-orange-600 transition-colors">{dish.title_cz}</span>
                      <span className="text-slate-900 font-black text-sm ml-4 whitespace-nowrap">{dish.price} Kč</span>
                    </div>
                  ))
                ) : (
                  <div className="py-4 px-2 text-slate-400 text-sm italic">Žádná polévka vybrána</div>
                )}
              </div>
            </div>

            {/* Hlavní chody Column */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b-2 border-blue-100">
                <div className="bg-blue-500 text-white p-2 rounded-xl shadow-lg ring-4 ring-blue-50">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Hlavní chody</h3>
              </div>
              <div className="space-y-4">
                {menus.mains && menus.mains.length > 0 ? (
                  menus.mains.map((dish: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start group p-2 rounded-lg hover:bg-blue-50/50 transition-colors">
                      <span className="text-slate-700 font-bold text-sm leading-tight group-hover:text-blue-600 transition-colors">{dish.title_cz}</span>
                      <span className="text-slate-900 font-black text-sm ml-4 whitespace-nowrap">{dish.price} Kč</span>
                    </div>
                  ))
                ) : (
                  <div className="py-4 px-2 text-slate-400 text-sm italic">Žádné hlavní jídlo vybráno</div>
                )}
              </div>
            </div>

            {/* Týdenní menu Column */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b-2 border-green-100">
                <div className="bg-green-500 text-white p-2 rounded-xl shadow-lg ring-4 ring-green-50">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Týdenní menu</h3>
              </div>
              <div className="space-y-4">
                {menus.weekly && menus.weekly.length > 0 ? (
                  menus.weekly.map((dish: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start group p-2 rounded-lg hover:bg-green-50/50 transition-colors">
                      <span className="text-slate-700 font-bold text-sm leading-tight group-hover:text-green-600 transition-colors">{dish.title_cz}</span>
                      <span className="text-slate-900 font-black text-sm ml-4 whitespace-nowrap">{dish.price} Kč</span>
                    </div>
                  ))
                ) : (
                  <div className="py-4 px-2 text-slate-400 text-sm italic">Žádná týdenní jídla vybrána</div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
