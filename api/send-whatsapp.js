// api/send-whatsapp.js
import twilio from 'twilio';

export default function handler(request, response) {
    // --- INÍCIO DO BLOCO DE CORS (A PEÇA QUE FALTAVA) ---
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    response.setHeader('Access-Control-Allow-Origin', '*'); // Em produção, é melhor restringir ao seu domínio
    response.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Se for o pedido de permissão (preflight), apenas respondemos com sucesso e paramos.
    if (request.method === 'OPTIONS') {
        return response.status(204).send('');
    }
    // --- FIM DO BLOCO DE CORS ---

    // Garante que só aceitamos o método 'POST'
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Apenas requisições POST são permitidas' });
    }

    // Pega as credenciais e números das variáveis de ambiente
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioWhatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    const adminWhatsappNumber = process.env.ADMIN_WHATSAPP_NUMBER;

    const client = twilio(accountSid, authToken);

    // Pega o corpo da mensagem da requisição
    const { body } = request.body;

    if (!body || !adminWhatsappNumber) {
        return response.status(400).json({ message: 'Corpo da mensagem e número do admin são obrigatórios.' });
    }

    // Tenta enviar a mensagem para o admin
    client.messages
        .create({
            from: twilioWhatsappNumber,
            to: `whatsapp:${adminWhatsappNumber}`,
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