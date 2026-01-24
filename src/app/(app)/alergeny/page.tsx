"use client";

import React, { useState, useMemo } from 'react';
import { PlusCircle } from 'lucide-react';
import { useGastro } from '@/contexts/GastroContext';
import { Button } from '@/components/ui/button';
import type { Allergen } from '@/lib/types';
import { AllergensDataTable } from '@/components/allergens/data-table';
import { columns } from '@/components/allergens/columns';
import { AllergenFormDialog } from '@/components/allergens/allergen-form-dialog';
import { Card } from '@/components/ui/card';

export default function AlergenyPage() {
  const { allergens } = useGastro();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingAllergen, setEditingAllergen] = useState<Allergen | null>(null);

  const handleAddClick = () => {
    setEditingAllergen(null);
    setDialogOpen(true);
  };

  const handleEdit = (allergen: Allergen) => {
    setEditingAllergen(allergen);
    setDialogOpen(true);
  };

  const tableColumns = useMemo(() => columns({ onEdit: handleEdit }), [handleEdit]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alergeny</h1>
          <p className="text-muted-foreground">Spravujte seznam alergenů.</p>
        </div>
        <Button onClick={handleAddClick} className="w-full md:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          Přidat alergen
        </Button>
      </div>

      <Card className="glass-card p-4 sm:p-6">
        <AllergensDataTable columns={tableColumns} data={allergens} />
      </Card>

      <AllergenFormDialog
        isOpen={isDialogOpen}
        onClose={() => setDialogOpen(false)}
        allergen={editingAllergen}
      />
    </div>
  );
}
