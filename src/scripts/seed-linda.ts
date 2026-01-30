
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env vars manually
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
} catch (e) {
    console.log('No .env.local found or error reading it');
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const USER_EMAIL = 'linda.kovarikova1@gmail.com';
const USER_PASSWORD = 'LowCarb26';

const DISHES = [
    {
        title_cz: 'Kuřecí vývar s masem a zeleninou',
        title_en: 'Chicken broth with meat and vegetables',
        price: 70,
        category: 'Polévka'
    },
    {
        title_cz: 'Česneková s uzeným masem, krutony, sýr',
        title_en: 'Garlic soup with smoked meat, croutons, cheese',
        price: 80,
        category: 'Polévka'
    },
    {
        title_cz: '200g Medailonky z vepřové panenky na tymiánu, dýňová omáčka, pečené batáty',
        title_en: '200g Pork tenderloin medallions with thyme, pumpkin sauce, baked sweet potatoes',
        price: 255,
        category: 'Hlavní jídlo'
    },
    {
        title_cz: 'Bezlepkové těstoviny s omáčkou bolognese, parmezán',
        title_en: 'Gluten-free pasta with bolognese sauce, parmesan',
        price: 245,
        category: 'Hlavní jídlo'
    },
    {
        title_cz: 'Trhané kachní maso, červené dušené zelí, batátové placky',
        title_en: 'Pulled duck meat, red braised cabbage, sweet potato pancakes',
        price: 270,
        category: 'Hlavní jídlo'
    },
    {
        title_cz: 'Domácí sekaná plněná anglickou slaninou a vejcem, šťouchané brambory, zelný salát s koprem',
        title_en: 'Homemade meatloaf stuffed with bacon and egg, mashed potatoes, cabbage salad with dill',
        price: 255,
        category: 'Hlavní jídlo'
    },
    {
        title_cz: 'Bezlepkový burger s trhaným krůtím masem, slanina, sýr cheddar, římský salát, americké brambory, dip z pečených paprik',
        title_en: 'Gluten-free burger with pulled turkey, bacon, cheddar cheese, romaine lettuce, american potatoes, roasted pepper dip',
        price: 275,
        category: 'Hlavní jídlo'
    },
    {
        title_cz: '200g Krůtí medailonky z grilu na italském rizotu, pesto z baby špenátu, parmezánové hoblinky',
        title_en: '200g Grilled turkey medallions on Italian risotto, baby spinach pesto, parmesan shavings',
        price: 260,
        category: 'Hlavní jídlo'
    }
];

async function seed() {
    console.log('Authenticating...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: USER_EMAIL,
        password: USER_PASSWORD,
    });

    if (authError || !authData.user) {
        console.error('Authentication failed:', authError);
        return;
    }

    console.log(`Authenticated as ${authData.user.email} (${authData.user.id})`);

    console.log('Inserting dishes...');

    for (const dish of DISHES) {
        const { error } = await supabase
            .from('menu_items')
            .insert({
                user_id: authData.user.id,
                title_cz: dish.title_cz,
                title_en: dish.title_en,
                price: dish.price,
                category: dish.category,
                allergens: [] // Empty as requested
            });

        if (error) {
            console.error(`Failed to insert "${dish.title_cz}":`, error.message);
        } else {
            console.log(`Inserted: ${dish.title_cz}`);
        }
    }

    console.log('Seeding complete!');
}

seed();
