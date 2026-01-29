"use client";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Dish } from "@/lib/types";
import { useState, useEffect } from "react";
import { useGastro } from "@/contexts/GastroContext";
import ConfirmDialog from "../shared/confirm-dialog";

type DishActionsProps = {
  dish: Dish;
  onEdit: (dish: Dish) => void;
};

export function DishActions({ dish, onEdit }: DishActionsProps) {
  const { deleteDish } = useGastro();
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-8 h-8" />;
  }

  return (
    <>
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          try {
            await deleteDish(dish.id);
          } catch (error) {
            console.error("Failed to delete dish:", error);
          }
        }}
        title={`Smazat jídlo: ${dish.title_cz}?`}
        description="Tato akce je nevratná. Opravdu si přejete smazat toto jídlo?"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Otevřít menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(dish)}>
            Upravit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setConfirmOpen(true)}
            className="text-red-600"
          >
            Smazat
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
