import { NextResponse } from 'next/server';
import axios from 'axios';
import type { Dish } from '@/lib/types';

const WEBHOOK_URL = 'https://n8n.srv1004354.hstgr.cloud/webhook-test/d27670eb-ad4a-42ed-9b6f-acd4b00f78e6';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const menuData: Dish[] = body.menu;

    if (!menuData || !Array.isArray(menuData)) {
      return NextResponse.json({ message: 'Neplatná data menu.' }, { status: 400 });
    }

    const exportData = menuData.map(dish => ({
        name_cz: dish.name_cz,
        name_en: dish.name_en,
        allergenIds: dish.allergenIds,
        price: dish.price,
    }));

    const response = await axios.post(WEBHOOK_URL, exportData);
    
    if (response.status >= 200 && response.status < 300) {
      return NextResponse.json({ message: 'Menu exported successfully', data: response.data });
    } else {
       return NextResponse.json({ message: `Webhook selhal se stavem: ${response.status}`, error: response.data }, { status: response.status });
    }

  } catch (error) {
    console.error('Error exporting menu:', error);
    let errorMessage = 'Interní chyba serveru';
    if (axios.isAxiosError(error)) {
        if (error.response) {
            console.error('Webhook response error data:', error.response.data);
            errorMessage = 'Chyba při volání webhooku.';
            return NextResponse.json({ message: errorMessage, error: error.response.data }, { status: error.response.status });
        } else if (error.request) {
            console.error('Webhook no response:', error.request);
            errorMessage = 'Na požadavek na webhook nepřišla žádná odpověď.';
        } else {
            errorMessage = error.message;
        }
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ message: 'Chyba při exportu menu', error: errorMessage }, { status: 500 });
  }
}
