export type Allergen = {
  id: string; // Changed from number to string to match firestore
  name_cz: string;
  name_en: string;
  number: number;
};

export type DishType = 'Polévka' | 'Hlavní jídlo';

export type Dish = {
  id: string;
  name_cz: string;
  name_en: string;
  price: number;
  type: DishType;
  allergenIds: string[]; // Changed from number[] to string[]
};

export type MenuHistoryItem = {
  id: string;
  date: string; // ISO string
  dishes: Dish[];
};
