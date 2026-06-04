export type Allergen = {
  id: string;
  name_cz: string;
  name_en: string;
  number: number;
};

export type DishType = 'Polévka' | 'Hlavní jídlo' | 'Snídaně';

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
  exportType?: 'pdf' | 'post' | 'web' | 'bulk-pdf';
  variant?: MenuVariant;
};

export type MenuVariant = 'soups' | 'mains' | 'weekly';

export type PdfTemplate = {
  variant: MenuVariant;
  fileName: string;
  publicUrl: string;
  uploadedAt: string;
};

// Jedna položka pro sociální export (vstup do /api/social-image).
export type SocialItem = {
  name: string;
  price: string;
  allergens: string;
};

export type SocialLang = 'cz' | 'en';

// Jeden vygenerovaný obrázek pro sociální sítě (náhled + stažení).
export type SocialImage = {
  key: string; // unikátní klíč varianta-jazyk, např. "mains-cz"
  variant: MenuVariant;
  lang: SocialLang;
  label: string; // popisek do náhledu, např. "Hlavní chod · CZ"
  url: string; // objectURL PNG blobu
};


