"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Dish } from "@/lib/types";
import { DishActions } from "./dish-actions";

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
      return <DishActions dish={dish} onEdit={onEdit} />;
    },
  },
];
