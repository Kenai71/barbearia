// supabase/functions/send-push-notification/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';
import webpush from 'https://esm.sh/web-push@3.6.7';
import { format } from 'https://esm.sh/date-fns@3.6.0'; 

// Importa o objeto de localização, o que é mais robusto
import { ptBR } from 'https://esm.sh/date-fns@3.6.0/locale/pt-BR'; 

// Variáveis de ambiente (secrets) e a chave pública
// CORREÇÃO: Busca o valor usando o NOME 'VAPID_PRIVATE_KEY'
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY'); 
const VAPID_PUBLIC_KEY = 'BKRWjdFVvU67xQmv0QXJAuq0fLOytQEHV9aEy9JyUI8iyrvnNd_qtqCWpjVwKSyWYFo4oHK0S_ZJ-tk4TM5P7fg'; 
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT');

if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY || !VAPID_SUBJECT) {
    console.error('Push Notification VAPID keys not configured correctly. Check VAPID_PRIVATE_KEY secret.');
} else {
    webpush.setVapidDetails(
      VAPID_SUBJECT,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
}

Deno.serve(async (req) => {
  // Cria o cliente Supabase com a Service Role Key
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' 
  );

  if (req.method !== 'POST') {
    return new Response('Método não permitido', { status: 405 });
  }

  try {
    const { record: newAppointment } = await req.json();

    if (!newAppointment || !newAppointment.barber_id) {
      console.log('Payload inválido ou sem barber_id.');
      return new Response('Payload inválido', { status: 400 });
    }
    
    // 1. Busca a inscrição do barbeiro
    const { data: subscriptionData } = await supabaseClient
      .from('barber_push_subscriptions')
      .select('subscription')
      .eq('barber_id', newAppointment.barber_id)
      .maybeSingle();

    if (!subscriptionData) {
      console.log('Nenhuma inscrição push encontrada para o barbeiro:', newAppointment.barber_id);
      return new Response('OK - Barbeiro sem inscrição push ativa', { status: 200 });
    }

    // 2. Busca o nome do cliente
    const { data: clientProfile } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('id', newAppointment.client_id)
      .maybeSingle();
      
    const clientName = clientProfile?.full_name || 'Novo Cliente';
    const appointmentDate = new Date(newAppointment.date_time);
    
    const appointmentTime = format(appointmentDate, 'HH:mm', { locale: ptBR });
    const appointmentDay = format(appointmentDate, "dd 'de' MMMM", { locale: ptBR });
    
    // 3. Monta o Payload da notificação
    const payload = JSON.stringify({
      title: '🔔 Novo Agendamento!',
      body: `Cliente: ${clientName} | ${appointmentDay} às ${appointmentTime}`,
      clientName: clientName,
      time: appointmentTime,
      data: { url: '/admin' } 
    });

    // 4. Envia a notificação Push
    await webpush.sendNotification(subscriptionData.subscription, payload);
    console.log('Notificação enviada com sucesso para o barbeiro:', newAppointment.barber_id);

    return new Response('Notificação enviada com sucesso', { status: 200 });
  } catch (e) {
    console.error('Erro ao enviar notificação:', e);
    // Se o erro for VAPID (geralmente 400 ou 403), ele será capturado aqui
    return new Response(`Erro de Push: ${e.message}`, { status: 500 });
  }
});