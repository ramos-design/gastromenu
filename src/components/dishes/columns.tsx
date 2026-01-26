"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Dish } from "@/lib/types";
import { DishActions } from "./dish-actions";
import { useGastro } from "@/contexts/GastroContext";

type ColumnsProps = {
  onEdit: (dish: Dish) => void;
};

export const columns = ({ onEdit }: ColumnsProps): ColumnDef<Dish>[] => [
  {
    accessorKey: "title_cz",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 hover:bg-transparent px-4"
        >
          Název
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-medium max-w-[200px] lg:max-w-[350px] line-clamp-2 leading-tight py-1 px-0" title={row.getValue("title_cz")}>
        {row.getValue("title_cz")}
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: () => <div className="text-left w-[110px]">Kategorie</div>,
    cell: ({ row }) => <div className="text-left w-[110px] truncate">{row.getValue("category")}</div>,
  },
  {
    accessorKey: "price",
    header: () => <div className="text-left w-[90px]">Cena</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("price"));
      const formatted = new Intl.NumberFormat("cs-CZ", {
        style: "currency",
        currency: "CZK",
      }).format(amount);
      return <div className="text-left font-medium w-[90px]">{formatted}</div>;
    },
  },
  {
    accessorKey: "allergens",
    header: () => <div className="text-left w-[120px]">Alergeny</div>,
    cell: ({ row }) => {
      const { allergens } = useGastro();
      const allergenIds = row.getValue("allergens") as string[];
      return (
        <div className="flex flex-wrap gap-1 w-[120px]">
          {allergenIds.map(id => {
            const allergen = allergens.find(a => a.id === id);
            if (!allergen) return null;
            return (
              <Badge key={id} variant="secondary" className="w-6 h-6 p-0 flex items-center justify-center rounded-full text-xs font-bold shrink-0">
                {allergen.number}
              </Badge>
            )
          })}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const dish = row.original;
      return <div className="text-right"><DishActions dish={dish} onEdit={onEdit} /></div>;
    },
  },
];
