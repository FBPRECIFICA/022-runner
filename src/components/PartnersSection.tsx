// Número lido direto da arte enviada (PARCERIA.png) — sem depender de cadastro à parte.
const WHATSAPP_URL = 'https://wa.me/5522981430250';

export function PartnersSection() {
  return (
    <section className="py-12 bg-black">
      <div className="container mx-auto px-4 text-center">
        <p className="text-xs font-semibold tracking-widest mb-6" style={{ color: '#C9A84C' }}>PARCEIROS OFICIAIS</p>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors"
        >
          <img
            src="/images/partner-alianca-cronometragem.png"
            alt="Aliança Cronometragem"
            className="w-20 h-20 object-cover rounded-xl"
          />
          <span className="text-left">
            <span className="block font-semibold text-white">Aliança Cronometragem</span>
            <span className="block text-sm text-gray-400">Corrida · Natação · MTB · Triathlon · Entrega de Kits</span>
            <span className="block text-sm text-[#25D366] font-semibold mt-1">Falar no WhatsApp →</span>
          </span>
        </a>
      </div>
    </section>
  );
}
