import type { Allergen } from '@/lib/types';

// This is the official list of 14 allergens that must be declared in the EU.
export const initialAllergens: Omit<Allergen, 'id'>[] = [
  { number: 1, name_cz: 'Obiloviny obsahující lepek', name_en: 'Cereals containing gluten' },
  { number: 2, name_cz: 'Korýši a výrobky z nich', name_en: 'Crustaceans and products thereof' },
  { number: 3, name_cz: 'Vejce a výrobky z nich', name_en: 'Eggs and products thereof' },
  { number: 4, name_cz: 'Ryby a výrobky z nich', name_en: 'Fish and products thereof' },
  { number: 5, name_cz: 'Podzemnice olejná (arašídy) a výrobky z ní', name_en: 'Peanuts and products thereof' },
  { number: 6, name_cz: 'Sójové boby (sója) a výrobky z nich', name_en: 'Soybeans and products thereof' },
  { number: 7, name_cz: 'Mléko a výrobky z něj (včetně laktózy)', name_en: 'Milk and products thereof (including lactose)' },
  { number: 8, name_cz: 'Skořápkové plody', name_en: 'Nuts' },
  { number: 9, name_cz: 'Celer a výrobky z něj', name_en: 'Celery and products thereof' },
  { number: 10, name_cz: 'Hořčice a výrobky z ní', name_en: 'Mustard and products thereof' },
  { number: 11, name_cz: 'Sezamová semena (sezam) a výrobky z nich', name_en: 'Sesame seeds and products thereof' },
  { number: 12, name_cz: 'Oxid siřičitý a siřičitany', name_en: 'Sulphur dioxide and sulphites' },
  { number: 13, name_cz: 'Vlčí bob (lupina) a výrobky z něj', name_en: 'Lupin and products thereof' },
  { number: 14, name_cz: 'Měkkýši a výrobky z nich', name_en: 'Molluscs and products thereof' },
];
