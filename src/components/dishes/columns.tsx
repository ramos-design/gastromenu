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
import { Badge } from "@/components/ui/badge";
import type { Dish } from "@/lib/types";
import { useState } from "react";
import { useGastro } from "@/contexts/GastroContext";
import ConfirmDialog from "../shared/confirm-dialog";

type ColumnsProps = {
  onEdit: (dish: Dish) => void;
};

export const columns = ({ onEdit }: ColumnsProps): ColumnDef<Dish>[] => [
  {
    accessorKey: "name_cz",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Název
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="font-medium">{row.getValue("name_cz")}</div>,
  },
  {
    accessorKey: "type",
    header: "Typ",
  },
  {
    accessorKey: "price",
    header: () => <div className="text-right">Cena</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("price"));
      const formatted = new Intl.NumberFormat("cs-CZ", {
        style: "currency",
        currency: "CZK",
      }).format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "allergenIds",
    header: "Alergeny",
    cell: ({ row }) => {
      const allergenIds = row.getValue("allergenIds") as number[];
      return (
        <div className="flex flex-wrap gap-1">
          {allergenIds.map(id => (
            <Badge key={id} variant="secondary">{id}</Badge>
          ))}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const dish = row.original;
      const { deleteDish } = useGastro();
      const [isConfirmOpen, setConfirmOpen] = useState(false);

      return (
        <>
          <ConfirmDialog
            isOpen={isConfirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={() => deleteDish(dish.id)}
            title={`Smazat jídlo: ${dish.name_cz}?`}
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
    },
  },
];
