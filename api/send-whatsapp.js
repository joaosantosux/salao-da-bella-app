// api/send-whatsapp.js

// Importa a biblioteca da Twilio
import twilio from 'twilio';

export default function handler(request, response) {
    // Medida de segurança: só permite que esta função seja chamada com o método POST.
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Apenas o método POST é permitido' });
    }

    // Pega as credenciais da Twilio das variáveis de ambiente que vamos configurar na Vercel.
    // Isso mantém nossas chaves seguras e fora do código.
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioWhatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    // Cria um "cliente" da Twilio para podermos fazer chamadas para a API deles.
    const client = twilio(accountSid, authToken);

    // Pega o número do destinatário e a mensagem do corpo da requisição que nosso app React vai enviar.
    const { to, body } = request.body;

    // Validação simples para garantir que os dados necessários foram enviados.
    if (!to || !body) {
        return response.status(400).json({ message: 'Os campos "to" e "body" são obrigatórios.' });
    }

    // Usa o cliente da Twilio para criar e enviar a mensagem.
    client.messages
        .create({
            from: twilioWhatsappNumber, // O número do sandbox da Twilio
            to: `whatsapp:${to}`,       // O número do destinatário (cliente), formatado corretamente
            body: body,                  // O corpo da mensagem
        })
        .then((message) => {
            // Se a mensagem for enviada com sucesso, retorna um status 200 e o ID da mensagem.
            console.log('Mensagem enviada com sucesso:', message.sid);
            return response.status(200).json({ success: true, sid: message.sid });
        })
        .catch((error) => {
            // Se der algum erro, retorna um status 500 e a mensagem de erro.
            console.error('Erro ao enviar mensagem:', error);
            return response.status(500).json({ success: false, error: error.message });
        });
}