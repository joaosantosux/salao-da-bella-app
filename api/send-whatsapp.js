// api/send-whatsapp.js
import twilio from 'twilio';

export default function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Apenas o método POST é permitido' });
    }

    // Pega as credenciais da Twilio e o número do admin das variáveis de ambiente
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioWhatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    const adminWhatsappNumber = process.env.ADMIN_WHATSAPP_NUMBER; // Nossa nova variável!

    const client = twilio(accountSid, authToken);

    // Agora só precisamos do corpo (body) da mensagem vindo do front-end
    const { body } = request.body;

    if (!body || !adminWhatsappNumber) {
        return response.status(400).json({ message: 'Corpo da mensagem e número do admin são obrigatórios.' });
    }

    client.messages
        .create({
            from: twilioWhatsappNumber,
            to: `whatsapp:${adminWhatsappNumber}`, // O destino agora é sempre o admin
            body: body,
        })
        .then((message) => {
            console.log('Notificação para admin enviada com sucesso:', message.sid);
            return response.status(200).json({ success: true, sid: message.sid });
        })
        .catch((error) => {
            console.error('Erro ao enviar notificação para admin:', error);
            return response.status(500).json({ success: false, error: error.message });
        });
}