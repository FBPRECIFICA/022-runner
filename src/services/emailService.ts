// Email service via Resend — set VITE_RESEND_API_KEY in .env
// Note: Resend API should be called from a backend/edge function, not the browser.
// These functions generate the payload; in production use a Supabase Edge Function.

const RESEND_KEY = import.meta.env.VITE_RESEND_API_KEY || '';
const FROM = '022 RUNNER <noreply@022runner.com.br>';

function baseHtml(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{font-family:Inter,Arial,sans-serif;background:#111;color:#fff;margin:0;padding:0}
.card{max-width:560px;margin:32px auto;background:#1a1a1a;border-radius:16px;overflow:hidden}
.header{background:#000;padding:24px;text-align:center;border-bottom:3px solid #C9A84C}
.header img{height:48px;object-fit:contain}
.body{padding:32px}.gold{color:#C9A84C;font-weight:700}
.btn{display:inline-block;background:#C9A84C;color:#000;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;margin-top:16px}
.footer{text-align:center;padding:20px;font-size:12px;color:#666;border-top:1px solid #333}
</style></head><body><div class="card">
<div class="header"><img src="https://022runner.com.br/images/logo-022runner.png" alt="022 RUNNER"></div>
<div class="body">${content}</div>
<div class="footer">© ${new Date().getFullYear()} 022 RUNNER — Região dos Lagos, RJ</div>
</div></body></html>`;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_KEY) { console.log('[Email stub]', { to, subject }); return; }
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
}

export async function sendConfirmationEmail(reg: any, event: any) {
  const html = baseHtml(`
    <h2>✅ Inscrição Confirmada!</h2>
    <p>Olá, <span class="gold">${reg.name}</span>!</p>
    <p>Sua inscrição no evento abaixo foi confirmada com sucesso.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      ${[['Evento',event.title],['Data',new Date(event.date).toLocaleDateString('pt-BR')],
         ['Local',event.location+' — '+event.city],['Distância',reg.distance_name],
         ['Nº Inscrição',reg.registration_number]].map(([l,v])=>
        `<tr><td style="padding:8px;color:#999;width:40%">${l}</td><td style="padding:8px;font-weight:600">${v}</td></tr>`
      ).join('')}
    </table>
    <a href="https://022runner.com.br/confirmacao/${reg.id}" class="btn">Ver Comprovante</a>
    <p style="margin-top:24px;color:#888;font-size:14px">Boa corrida! 🏃</p>
  `);
  await sendEmail(reg.email, `✅ Inscrição confirmada — ${event.title}`, html);
}

export async function sendReminderEmail(reg: any, event: any) {
  const html = baseHtml(`
    <h2>⏰ Lembrete: ${event.title} em 3 dias!</h2>
    <p>Olá, <span class="gold">${reg.name}</span>!</p>
    <p>Não esqueça: o evento <strong>${event.title}</strong> acontece em <strong>3 dias</strong>.</p>
    <p>📍 Local: ${event.location} — ${event.city}</p>
    <p>🕐 Horário: ${new Date(event.date).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</p>
    <a href="https://022runner.com.br/evento/${event.slug}" class="btn">Ver Detalhes</a>
  `);
  await sendEmail(reg.email, `⏰ ${event.title} em 3 dias!`, html);
}

export async function sendOrganizerNotification(event: any, reg: any) {
  const html = baseHtml(`
    <h2>🎉 Nova inscrição no seu evento!</h2>
    <p>O atleta <span class="gold">${reg.name}</span> se inscreveu em <strong>${event.title}</strong>.</p>
    <p>Distância: ${reg.distance_name} | Valor: R$ ${Number(reg.amount).toFixed(2)}</p>
    <p>Nº Inscrição: <span class="gold">${reg.registration_number}</span></p>
    <a href="https://022runner.com.br/organizador" class="btn">Ver no Painel</a>
  `);
  const { data: org } = await import('../lib/supabase').then(m =>
    m.supabase.from('users').select('email').eq('id', event.organizer_id).single()
  );
  if (org?.email) await sendEmail(org.email, `🎉 Nova inscrição em ${event.title}`, html);
}

export async function sendWelcomeEmail(user: { name: string; email: string }) {
  const html = baseHtml(`
    <h2>🏁 Bem-vindo à 022 RUNNER!</h2>
    <p>Olá, <span class="gold">${user.name}</span>!</p>
    <p>Sua conta foi criada com sucesso. Explore os eventos esportivos da Região dos Lagos!</p>
    <a href="https://022runner.com.br/eventos" class="btn">Ver Eventos</a>
  `);
  await sendEmail(user.email, '🏁 Bem-vindo à 022 RUNNER!', html);
}
