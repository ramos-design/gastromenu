import type { Allergen, Dish } from '@/lib/types';

export const initialAllergens: Allergen[] = [
  { id: 3, name_cz: 'Vejce a výrobky z nich', name_en: 'Eggs and products thereof' },
  { id: 8, name_cz: 'Skořápkové plody', name_en: 'Nuts' },
  { id: 9, name_cz: 'Celer a výrobky z něj', name_en: 'Celery and products thereof' },
  { id: 12, name_cz: 'Oxid siřičitý a siřičitany', name_en: 'Sulphur dioxide and sulphites' },
];

export const initialDishes: Dish[] = [
  {
    id: '1',
    name_cz: 'Slepičí vývar s masem a zeleninou',
    name_en: 'Chicken broth with meat and vegetables',
    price: 70,
    type: 'Polévka',
    allergenIds: [9],
  },
  {
    id: '2',
    name_cz: 'Trhané kachní maso, červené dušené zelí, batátové placky',
    name_en: 'Pulled duck, braised red cabbage, sweet potato pancakes',
    price: 255,
    type: 'Hlavní jídlo',
    allergenIds: [3, 8, 12],
  },
  {
    id: '3',
    name_cz: 'Kulajda s houbami a ztraceným vejcem',
    name_en: 'Kulajda soup with mushrooms and poached egg',
    price: 85,
    type: 'Polévka',
    allergenIds: [3],
  },
  {
    id: '4',
    name_cz: 'Svíčková na smetaně s houskovým knedlíkem',
    name_en: 'Svíčková with cream sauce and bread dumplings',
    price: 265,
    type: 'Hlavní jídlo',
    allergenIds: [9],
  },
];
