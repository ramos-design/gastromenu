import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const target = body.target || 'pdf';

        // TEST Webhook for PDF/Debug
        let n8nWebhookUrl = 'https://n8n.srv1004354.hstgr.cloud/webhook-test/d27670eb-ad4a-42ed-9b6f-acd4b00f78e6';

        if (target === 'web') {
            n8nWebhookUrl = 'https://n8n.srv1004354.hstgr.cloud/webhook/d27670eb-ad4a-42ed-9b6f-acd4b00f78e6'; // Production (Web)
        }

        // Call n8n from the server to bypass CORS
        // Using POST to send data in body, avoiding URL length limits
        const response = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            return NextResponse.json(
                { message: `n8n webhook error: ${response.statusText}` },
                { status: response.status }
            );
        }

        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            // Handle n8n returning an array (common behavior)
            const responseData = Array.isArray(data) ? data[0] : data;

            // If targeting 'web' (test webhook), provide fallback image if missing to prevent frontend crash
            if (target === 'web' && !responseData.imageUrl) {
                responseData.imageUrl = "https://placehold.co/600x800?text=Web+Export+Sent";
                responseData.success = true;
            }

            return NextResponse.json(responseData);
        } else if (contentType && contentType.includes('image/')) {
            // Handle binary image response
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64Image = buffer.toString('base64');
            const dataUrl = `data:${contentType};base64,${base64Image}`;
            return NextResponse.json({ imageUrl: dataUrl });
        } else {
            // Fallback for text/plain (e.g. "Workflow executed successfully")
            const text = await response.text();
            try {
                const data = JSON.parse(text);
                const responseData = Array.isArray(data) ? data[0] : data;

                // If targeting 'web', provide fallback
                if (target === 'web' && !responseData.imageUrl) {
                    responseData.imageUrl = "https://placehold.co/600x800?text=Web+Export+Sent";
                }

                return NextResponse.json(responseData);
            } catch (e) {
                // If it's just text, return it with a placeholder image for web target
                if (target === 'web') {
                    return NextResponse.json({
                        imageUrl: "https://placehold.co/600x800?text=Web+Export+Sent",
                        message: text
                    });
                }
                throw new Error(`Unexpected content type: ${contentType}`);
            }
        }
    } catch (error) {
        console.error('Error proxying to n8n:', error);
        return NextResponse.json(
            { message: 'Internal server error while calling webhook' },
            { status: 500 }
        );
    }
}
