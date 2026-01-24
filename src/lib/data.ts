import type { Allergen, Dish } from '@/lib/types';

export const initialAllergens: Allergen[] = [
  { id: 1, name_cz: 'Obiloviny obsahující lepek', name_en: 'Cereals containing gluten' },
  { id: 2, name_cz: 'Korýši a výrobky z nich', name_en: 'Crustaceans and products thereof' },
  { id: 3, name_cz: 'Vejce a výrobky z nich', name_en: 'Eggs and products thereof' },
  { id: 4, name_cz: 'Ryby a výrobky z nich', name_en: 'Fish and products thereof' },
  { id: 5, name_cz: 'Podzemnice olejná (arašídy) a výrobky z ní', name_en: 'Peanuts and products thereof' },
  { id: 6, name_cz: 'Sójové boby (sója) a výrobky z nich', name_en: 'Soybeans and products thereof' },
  { id: 7, name_cz: 'Mléko a výrobky z něj (včetně laktózy)', name_en: 'Milk and products thereof (including lactose)' },
  { id: 8, name_cz: 'Skořápkové plody', name_en: 'Nuts' },
  { id: 9, name_cz: 'Celer a výrobky z něj', name_en: 'Celery and products thereof' },
  { id: 10, name_cz: 'Hořčice a výrobky z ní', name_en: 'Mustard and products thereof' },
  { id: 11, name_cz: 'Sezamová semena (sezam) a výrobky z nich', name_en: 'Sesame seeds and products thereof' },
  { id: 12, name_cz: 'Oxid siřičitý a siřičitany', name_en: 'Sulphur dioxide and sulphites' },
  { id: 13, name_cz: 'Vlčí bob (lupina) a výrobky z něj', name_en: 'Lupin and products thereof' },
  { id: 14, name_cz: 'Měkkýši a výrobky z nich', name_en: 'Molluscs and products thereof' },
];

export const initialDishes: Dish[] = [
  {
    id: '1',
    name_cz: 'Slepičí vývar s masem a zeleninou',
    name_en: 'Chicken broth with meat and vegetables',
    price: 70,
    type: 'Polévka',
    allergenIds: [1, 9],
  },
  {
    id: '2',
    name_cz: 'Trhané kachní maso, červené dušené zelí, batátové placky',
    name_en: 'Pulled duck, braised red cabbage, sweet potato pancakes',
    price: 255,
    type: 'Hlavní jídlo',
    allergenIds: [1, 3, 12],
  },
  {
    id: '3',
    name_cz: 'Kulajda s houbami a ztraceným vejcem',
    name_en: 'Kulajda soup with mushrooms and poached egg',
    price: 85,
    type: 'Polévka',
    allergenIds: [1, 3, 7],
  },
  {
    id: '4',
    name_cz: 'Svíčková na smetaně s houskovým knedlíkem',
    name_en: 'Svíčková with cream sauce and bread dumplings',
    price: 265,
    type: 'Hlavní jídlo',
    allergenIds: [1, 3, 7, 9, 10],
  },
];
