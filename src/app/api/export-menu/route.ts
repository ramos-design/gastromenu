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

    // Axios will throw an error for non-2xx responses
    const response = await axios.get(WEBHOOK_URL, { params: { menu: exportData } });
    
    return NextResponse.json({ message: 'Menu exported successfully', data: response.data });

  } catch (error) {
    console.error('Error exporting menu:', error);
    let errorMessage = 'Interní chyba serveru';
    let status = 500;
    
    if (axios.isAxiosError(error)) {
        if (error.response) {
            // Webhook responded with an error
            status = error.response.status;
            console.error('Webhook response error data:', error.response.data);
            // Try to use a message from the webhook response, otherwise fall back to a generic one
            const responseData = error.response.data as any;
            if (responseData && typeof responseData === 'object' && 'message' in responseData) {
                errorMessage = responseData.message;
            } else if (typeof responseData === 'string' && responseData.length > 0) {
                errorMessage = responseData;
            } else {
                errorMessage = `Webhook selhal se stavem: ${status}`;
            }

        } else if (error.request) {
            // No response from webhook
            errorMessage = 'Na požadavek na webhook nepřišla žádná odpověď.';
            status = 504; // Gateway Timeout
        } else {
            // Error setting up the request
            errorMessage = error.message;
        }
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }
    
    return NextResponse.json({ message: errorMessage }, { status: status });
  }
}
