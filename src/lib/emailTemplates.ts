const BASE_STYLE = `
  font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;
  border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;
`
const HEADER = `
  <div style="background:#000; padding:24px; text-align:center; border-bottom:3px solid #C9A84C;">
    <h1 style="color:#C9A84C; font-size:28px; font-weight:900; margin:0; letter-spacing:2px;">022RUNNERS</h1>
    <p style="color:#94a3b8; font-size:12px; margin:4px 0 0;">RUNNING COMMUNITY — REGIÃO DOS LAGOS RJ</p>
  </div>
`
const FOOTER = `
  <div style="background:#f9fafb; padding:16px; text-align:center; border-top:1px solid #e5e7eb;">
    <p style="color:#9ca3af; font-size:11px; margin:0;">022runners.com.br · São Pedro da Aldeia, RJ</p>
    <p style="color:#9ca3af; font-size:11px; margin:4px 0 0;">Dúvidas? WhatsApp: (22) 97404-4125</p>
  </div>
`

export interface EmailAtletaConfirmacao {
  athleteName: string
  eventTitle: string
  eventDate: string
  eventCity: string
  distanceName: string
  registrationNumber: string
  amount: string
}

export function emailAtletaConfirmacao(d: EmailAtletaConfirmacao) {
  return {
    subject: `✅ Inscrição confirmada — ${d.eventTitle}`,
    html: `<div style="${BASE_STYLE}">
      ${HEADER}
      <div style="padding:32px 24px;">
        <p style="color:#374151; font-size:16px; margin:0 0 16px;">Olá, <strong>${d.athleteName}</strong>! 🏃</p>
        <p style="color:#374151; font-size:15px; margin:0 0 24px;">Sua inscrição foi confirmada com sucesso. Boa corrida!</p>

        <div style="background:#fffbeb; border:2px solid #C9A84C; border-radius:12px; padding:24px; text-align:center; margin:0 0 24px;">
          <p style="color:#92400e; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:2px; margin:0 0 8px;">Número de Peito</p>
          <p style="color:#C9A84C; font-size:56px; font-weight:900; font-family:monospace; margin:0;">#${d.registrationNumber}</p>
          <p style="color:#92400e; font-size:12px; margin:8px 0 0;">Apresente este email no check-in</p>
        </div>

        <table style="width:100%; border-collapse:collapse; margin:0 0 24px;">
          ${[
            ['Evento', d.eventTitle],
            ['Data', d.eventDate],
            ['Local', d.eventCity],
            ['Distância', d.distanceName],
            ['Valor', `R$ ${d.amount}`],
          ].map(([l, v]) => `
            <tr>
              <td style="padding:10px 0; border-bottom:1px solid #f3f4f6; color:#6b7280; font-size:13px; width:40%;">${l}</td>
              <td style="padding:10px 0; border-bottom:1px solid #f3f4f6; color:#111827; font-size:13px; font-weight:600;">${v}</td>
            </tr>`).join('')}
        </table>

        <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:16px; font-size:13px; color:#166534;">
          <strong>Instruções no dia do evento:</strong><br>
          • Chegue com 30 minutos de antecedência<br>
          • Apresente este email ou número de peito no check-in<br>
          • Boa sorte e boa corrida! 🏆
        </div>
      </div>
      ${FOOTER}
    </div>`,
  }
}

export interface EmailAtletaLembrete {
  athleteName: string
  eventTitle: string
  eventDate: string
  eventTime: string
  eventCity: string
  registrationNumber: string
}

export function emailAtletaLembrete(d: EmailAtletaLembrete) {
  return {
    subject: `⏳ Faltam 3 dias — ${d.eventTitle}`,
    html: `<div style="${BASE_STYLE}">
      ${HEADER}
      <div style="padding:32px 24px;">
        <p style="color:#374151; font-size:16px; margin:0 0 16px;">Olá, <strong>${d.athleteName}</strong>!</p>
        <p style="color:#374151; font-size:15px; margin:0 0 24px;">Faltam apenas <strong>3 dias</strong> para o seu evento. Prepare-se!</p>

        <div style="background:#fffbeb; border:2px solid #C9A84C; border-radius:12px; padding:20px; text-align:center; margin:0 0 24px;">
          <p style="color:#92400e; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:2px; margin:0 0 6px;">Seu Número de Peito</p>
          <p style="color:#C9A84C; font-size:48px; font-weight:900; font-family:monospace; margin:0;">#${d.registrationNumber}</p>
        </div>

        <table style="width:100%; border-collapse:collapse; margin:0 0 24px;">
          ${[
            ['Evento', d.eventTitle],
            ['Data', d.eventDate],
            ['Largada', d.eventTime],
            ['Local', d.eventCity],
          ].map(([l, v]) => `
            <tr>
              <td style="padding:10px 0; border-bottom:1px solid #f3f4f6; color:#6b7280; font-size:13px; width:40%;">${l}</td>
              <td style="padding:10px 0; border-bottom:1px solid #f3f4f6; color:#111827; font-size:13px; font-weight:600;">${v}</td>
            </tr>`).join('')}
        </table>

        <p style="color:#374151; font-size:14px; text-align:center;">Você está preparado! Boa corrida 🏃💨</p>
      </div>
      ${FOOTER}
    </div>`,
  }
}

export interface EmailAtletaResultado {
  athleteName: string
  eventTitle: string
  finishTime: string
  positionGeneral: string
  positionCategory: string
  certificateUrl?: string
}

export function emailAtletaResultado(d: EmailAtletaResultado) {
  return {
    subject: `🏆 Seu resultado — ${d.eventTitle}`,
    html: `<div style="${BASE_STYLE}">
      ${HEADER}
      <div style="padding:32px 24px; text-align:center;">
        <p style="color:#374151; font-size:16px; margin:0 0 8px;">Parabéns, <strong>${d.athleteName}</strong>! 🎉</p>
        <p style="color:#374151; font-size:14px; margin:0 0 24px;">Você completou o <strong>${d.eventTitle}</strong>!</p>

        <div style="background:#fffbeb; border:2px solid #C9A84C; border-radius:12px; padding:24px; margin:0 0 24px;">
          <p style="color:#92400e; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:2px; margin:0 0 8px;">Seu Tempo</p>
          <p style="color:#C9A84C; font-size:48px; font-weight:900; font-family:monospace; margin:0;">${d.finishTime}</p>
        </div>

        <table style="width:100%; border-collapse:collapse; margin:0 0 24px; text-align:left;">
          ${[
            ['Posição Geral', `${d.positionGeneral}º`],
            ['Posição Categoria', `${d.positionCategory}º`],
          ].map(([l, v]) => `
            <tr>
              <td style="padding:10px 0; border-bottom:1px solid #f3f4f6; color:#6b7280; font-size:13px; width:50%;">${l}</td>
              <td style="padding:10px 0; border-bottom:1px solid #f3f4f6; color:#111827; font-size:13px; font-weight:700;">${v}</td>
            </tr>`).join('')}
        </table>

        ${d.certificateUrl ? `
          <a href="${d.certificateUrl}" style="display:inline-block; background:#C9A84C; color:#000; font-weight:700; padding:14px 28px; border-radius:10px; text-decoration:none; font-size:14px;">
            🏅 Baixar Certificado Digital
          </a>
        ` : ''}
      </div>
      ${FOOTER}
    </div>`,
  }
}

export interface EmailOrganizadorNovaInscricao {
  eventTitle: string
  athleteName: string
  athleteEmail: string
  distanceName: string
  amount: string
  paymentStatus: string
  totalRegistrations: number
}

export function emailOrganizadorNovaInscricao(d: EmailOrganizadorNovaInscricao) {
  return {
    subject: `🔔 Nova inscrição — ${d.eventTitle}`,
    html: `<div style="${BASE_STYLE}">
      ${HEADER}
      <div style="padding:32px 24px;">
        <p style="color:#374151; font-size:16px; margin:0 0 8px;">Nova inscrição recebida em <strong>${d.eventTitle}</strong>!</p>

        <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:16px; margin:0 0 24px;">
          <p style="color:#166534; font-size:20px; font-weight:700; margin:0;">Total de inscritos: ${d.totalRegistrations}</p>
        </div>

        <table style="width:100%; border-collapse:collapse; margin:0 0 24px;">
          ${[
            ['Atleta', d.athleteName],
            ['E-mail', d.athleteEmail],
            ['Distância', d.distanceName],
            ['Valor', `R$ ${d.amount}`],
            ['Pagamento', d.paymentStatus === 'paid' || d.paymentStatus === 'confirmed' ? '✅ Confirmado' : '⏳ Pendente'],
          ].map(([l, v]) => `
            <tr>
              <td style="padding:10px 0; border-bottom:1px solid #f3f4f6; color:#6b7280; font-size:13px; width:40%;">${l}</td>
              <td style="padding:10px 0; border-bottom:1px solid #f3f4f6; color:#111827; font-size:13px; font-weight:600;">${v}</td>
            </tr>`).join('')}
        </table>

        <a href="https://022runners.com.br/organizador" style="display:inline-block; background:#C9A84C; color:#000; font-weight:700; padding:12px 24px; border-radius:10px; text-decoration:none; font-size:14px;">
          Ver painel do organizador
        </a>
      </div>
      ${FOOTER}
    </div>`,
  }
}

export interface EmailOrganizadorResumoDiario {
  eventTitle: string
  newRegistrationsToday: number
  totalRegistrations: number
  totalRevenue: string
  daysUntilEvent: number
}

export function emailOrganizadorResumoDiario(d: EmailOrganizadorResumoDiario) {
  return {
    subject: `📊 Resumo do dia — ${d.eventTitle}`,
    html: `<div style="${BASE_STYLE}">
      ${HEADER}
      <div style="padding:32px 24px;">
        <p style="color:#374151; font-size:16px; margin:0 0 20px;">Resumo de hoje para <strong>${d.eventTitle}</strong></p>

        <div style="display:grid; gap:12px; margin:0 0 24px;">
          ${[
            ['Novas inscrições hoje', String(d.newRegistrationsToday), '#dbeafe', '#1d4ed8'],
            ['Total de inscritos', String(d.totalRegistrations), '#f0fdf4', '#166534'],
            ['Receita acumulada', `R$ ${d.totalRevenue}`, '#fefce8', '#92400e'],
            ['Dias para o evento', `${d.daysUntilEvent} dias`, '#fdf4ff', '#7e22ce'],
          ].map(([l, v, bg, color]) => `
            <div style="background:${bg}; border-radius:8px; padding:16px; display:flex; justify-content:space-between; align-items:center;">
              <span style="color:#374151; font-size:13px;">${l}</span>
              <span style="color:${color}; font-size:20px; font-weight:700;">${v}</span>
            </div>`).join('')}
        </div>

        <a href="https://022runners.com.br/organizador" style="display:inline-block; background:#C9A84C; color:#000; font-weight:700; padding:12px 24px; border-radius:10px; text-decoration:none; font-size:14px;">
          Ver painel completo
        </a>
      </div>
      ${FOOTER}
    </div>`,
  }
}
