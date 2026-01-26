"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Allergen } from "@/lib/types";
import { useState, useEffect } from "react";
import { useGastro } from "@/contexts/GastroContext";
import ConfirmDialog from "../shared/confirm-dialog";
import { Skeleton } from "../ui/skeleton";

type ColumnsProps = {
  onEdit: (allergen: Allergen) => void;
};

export const columns = ({ onEdit }: ColumnsProps): ColumnDef<Allergen>[] => [
  {
    accessorKey: "number",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Číslo
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="font-bold">{row.getValue("number")}</div>,
  },
  {
    accessorKey: "name_cz",
    header: "Název (CZ)",
  },
  {
    accessorKey: "name_en",
    header: "Název (EN)",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const allergen = row.original;
      const { deleteAllergen, isAllergenInUse } = useGastro();
      const [isConfirmOpen, setConfirmOpen] = useState(false);
      const [mounted, setMounted] = useState(false);

      useEffect(() => {
        setMounted(true);
      }, []);

      if (!mounted) {
        return <Skeleton className="h-8 w-8" />;
      }

      const inUse = isAllergenInUse(allergen.id);
      const description = inUse
        ? "Tento alergen je použit u jednoho nebo více jídel. Opravdu ho chcete smazat? Tímto krokem bude alergen odstraněn i ze všech jídel."
        : "Tato akce je nevratná. Opravdu si přejete smazat tento alergen?";

      return (
        <>
          <ConfirmDialog
            isOpen={isConfirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={() => {
              // Delay to allow dialog to close before row unmount
              setTimeout(() => deleteAllergen(allergen.id), 100);
            }}
            title={`Smazat alergen: ${allergen.name_cz}?`}
            description={description}
            warning={inUse ? "Alergen je používán!" : undefined}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Otevřít menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(allergen)}>
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
    },
  },
];
