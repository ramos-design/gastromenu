export type Allergen = {
  id: string;
  name_cz: string;
  name_en: string;
  number: number;
};

export type DishType = 'Polévka' | 'Hlavní jídlo';

export type Dish = {
  id: string;
  user_id?: string;
  title_cz: string;
  title_en?: string;
  price: number;
  category: string; // Changed from 'type' to 'category'
  allergens: string[]; // Changed from 'allergenIds' to 'allergens'
  created_at?: string;
  updated_at?: string;
};

export type MenuHistoryItem = {
  id: string;
  date: string; // ISO string
  dishes: Dish[];
  exportType?: 'pdf' | 'post' | 'web';
};
