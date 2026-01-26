"use client";

import { useGastro } from "@/contexts/GastroContext";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AllergenPickerProps {
    value: string[];
    onChange: (value: string[]) => void;
}

export function AllergenPicker({ value, onChange }: AllergenPickerProps) {
    const { allergens } = useGastro();

    const toggleAllergen = (id: string) => {
        if (value.includes(id)) {
            onChange(value.filter((v) => v !== id));
        } else {
            onChange([...value, id]);
        }
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {allergens.map((allergen) => {
                    const isSelected = value.includes(allergen.id);
                    return (
                        <button
                            key={allergen.id}
                            type="button"
                            onClick={() => toggleAllergen(allergen.id)}
                            className={cn(
                                "flex items-center gap-3 p-2 rounded-lg border-2 transition-all text-left group",
                                isSelected
                                    ? "bg-primary/10 border-primary text-primary shadow-sm"
                                    : "bg-background border-muted text-muted-foreground hover:border-primary/50 hover:bg-primary/5"
                            )}
                        >
                            <div className={cn(
                                "flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold shrink-0 transition-colors",
                                isSelected
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                            )}>
                                {allergen.number}
                            </div>
                            <span className="text-[10px] font-medium truncate leading-tight">
                                {allergen.name_cz}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Selection counter */}
            {value.length > 0 && (
                <div className="text-[10px] text-muted-foreground px-1">
                    Vybráno {value.length} {value.length === 1 ? 'alergen' : value.length < 5 ? 'alergeny' : 'alergenů'}
                </div>
            )}
        </div>
    );
}
