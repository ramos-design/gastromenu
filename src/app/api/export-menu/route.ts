import { NextResponse } from 'next/server';
import axios from 'axios';
import type { Allergen, Dish } from '@/lib/types';

const WEBHOOK_URL = 'https://n8n.srv1004354.hstgr.cloud/webhook-test/d27670eb-ad4a-42ed-9b6f-acd4b00f78e6';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const menuData: Dish[] = body.menu;
    const allergens: Allergen[] = body.allergens;

    if (!menuData || !Array.isArray(menuData)) {
      return NextResponse.json({ message: 'Neplatná data menu.' }, { status: 400 });
    }

    if (!allergens || !Array.isArray(allergens)) {
      return NextResponse.json({ message: 'Neplatná data alergenů.' }, { status: 400 });
    }

    const allergenMap = new Map(allergens.map(a => [a.id, a.number]));

    const sortedMenu = [...menuData].sort((a, b) => {
        if (a.type === 'Polévka' && b.type !== 'Polévka') return -1;
        if (a.type !== 'Polévka' && b.type === 'Polévka') return 1;
        return 0;
    });

    const params: { [key: string]: string | number } = {};
    let soupIndex = 1;
    let mainDishIndex = 1;

    sortedMenu.forEach((dish) => {
        let prefix = '';
        if (dish.type === 'Polévka') {
            prefix = `soup_${soupIndex++}`;
        } else { // 'Hlavní jídlo'
            prefix = `main_${mainDishIndex++}`;
        }
        
        params[`${prefix}_name_cz`] = dish.name_cz;
        params[`${prefix}_name_en`] = dish.name_en;
        params[`${prefix}_price`] = dish.price;
        
        const allergenNumbers = dish.allergenIds.map(id => allergenMap.get(id) || id).join(',');
        params[`${prefix}_allergens`] = allergenNumbers;
    });

    const response = await axios.get(WEBHOOK_URL, { 
        params,
        responseType: 'arraybuffer' // Očekáváme binární data (obrázek)
    });
    
    // Zjistíme content type z odpovědi, pokud není, použijeme výchozí
    const contentType = response.headers['content-type'] || 'image/png';
    const imageBase64 = Buffer.from(response.data, 'binary').toString('base64');
    const imageUrl = `data:${contentType};base64,${imageBase64}`;
    
    return NextResponse.json({ imageUrl });

  } catch (error) {
    console.error('Error exporting menu:', error);
    let errorMessage = 'Interní chyba serveru';
    let status = 500;
    
    if (axios.isAxiosError(error)) {
        if (error.response) {
            status = error.response.status;
            let errorText = `Webhook selhal se stavem: ${status}`;
            if(error.response.data) {
                // Data z chyby budou pravděpodobně ArrayBuffer, tak je převedeme na text
                const responseData = Buffer.from(error.response.data, 'binary').toString('utf8');
                try {
                    const errorJson = JSON.parse(responseData);
                    errorText = errorJson.message || responseData;
                } catch(e) {
                    errorText = responseData;
                }
            }
            console.error('Webhook response error data:', errorText);
            errorMessage = errorText;
        } else if (error.request) {
            errorMessage = 'Na požadavek na webhook nepřišla žádná odpověď.';
            status = 504; // Gateway Timeout
        } else {
            errorMessage = error.message;
        }
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }
    
    return NextResponse.json({ message: errorMessage }, { status: status });
  }
}
