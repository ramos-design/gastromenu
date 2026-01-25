export type Allergen = {
  id: number;
  name_cz: string;
  name_en: string;
};

export type DishType = 'Polévka' | 'Hlavní jídlo';

export type Dish = {
  id: string;
  name_cz: string;
  name_en: string;
  price: number;
  type: DishType;
  allergenIds: number[];
};

export type MenuHistoryItem = {
  id: string;
  date: string;
  dishes: Dish[];
};
