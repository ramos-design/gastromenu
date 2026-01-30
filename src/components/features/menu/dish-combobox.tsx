"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import type { Dish } from "@/lib/types";

interface DishComboboxProps {
    value?: string;
    onChange: (value: string) => void;
    options: Dish[];
    placeholder?: string;
    className?: string;
}

export function DishCombobox({
    value,
    onChange,
    options,
    placeholder = "Vyberte jídlo...",
    className,
}: DishComboboxProps) {
    const [open, setOpen] = React.useState(false);

    const selectedDish = options.find((dish) => dish.id === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between h-auto py-3 px-3 min-h-[44px]", !value && "text-muted-foreground", className)}
                >
                    {selectedDish ? (
                        <div className="flex flex-col items-start gap-1 text-left w-full overflow-hidden">
                            <span className="font-medium truncate w-full">{selectedDish.title_cz}</span>
                            {selectedDish.price && <span className="text-xs text-muted-foreground">{selectedDish.price} Kč</span>}
                        </div>
                    ) : (
                        placeholder
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Hledat jídlo..." />
                    <CommandList>
                        <CommandEmpty>Žádné jídlo nenalezeno.</CommandEmpty>
                        <CommandGroup>
                            {options.map((dish) => (
                                <CommandItem
                                    key={dish.id}
                                    value={`${dish.title_cz} ${dish.id}`} // Hack for search to work on title + allows uniqueness
                                    onSelect={(currentValue) => {
                                        // Extract ID or just map back via find logic if value stored matches
                                        // CommandItem value is normalized by cmk lower case usually.
                                        // We simply pass the original ID we mapped.
                                        onChange(dish.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === dish.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span>{dish.title_cz}</span>
                                        <span className="text-xs text-muted-foreground">{dish.price} Kč</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
