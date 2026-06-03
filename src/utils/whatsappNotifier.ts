export function buildWhatsAppLink(phone: string, message: string): string {
  const clean = phone.replace(/\D/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export function confirmationMessage(eventTitle: string, eventDate: string, regNumber: string): string {
  return `✅ Inscrição confirmada!\nEvento: ${eventTitle}\nData: ${eventDate}\nNº: ${regNumber}\nBoa corrida! 🏃`;
}

export function reminderMessage(eventTitle: string, eventDate: string, eventCity: string): string {
  return `⏰ Lembrete: ${eventTitle} é em ${eventDate} em ${eventCity}. Prepare-se! 🏃‍♂️`;
}
