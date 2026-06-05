export function RunnerPostsIcon() {
  return (
    <>
      <style>{`
        @keyframes rpi-arm-l { 0%,100%{transform:rotate(-30deg)} 50%{transform:rotate(30deg)} }
        @keyframes rpi-arm-r { 0%,100%{transform:rotate(30deg)} 50%{transform:rotate(-30deg)} }
        @keyframes rpi-leg-l { 0%,100%{transform:rotate(40deg)}  50%{transform:rotate(-40deg)} }
        @keyframes rpi-leg-r { 0%,100%{transform:rotate(-40deg)} 50%{transform:rotate(40deg)}  }
        .rpi-arm-l { transform-origin:54px 18px; animation:rpi-arm-l 0.6s linear infinite; }
        .rpi-arm-r { transform-origin:54px 18px; animation:rpi-arm-r 0.6s linear infinite; }
        .rpi-leg-l { transform-origin:54px 32px; animation:rpi-leg-l 0.6s linear infinite; }
        .rpi-leg-r { transform-origin:54px 32px; animation:rpi-leg-r 0.6s linear infinite; }
        @keyframes rpi-float {
          0%   { transform:translateY(0);    opacity:0; }
          15%  { opacity:1; }
          85%  { opacity:0.8; }
          100% { transform:translateY(-38px); opacity:0; }
        }
        .rpi-ico-1 { animation:rpi-float 2.4s ease-in-out infinite 0s;   }
        .rpi-ico-2 { animation:rpi-float 2.4s ease-in-out infinite 0.8s; }
        .rpi-ico-3 { animation:rpi-float 2.4s ease-in-out infinite 1.6s; }
      `}</style>
      <svg
        width="72" height="52"
        viewBox="0 0 72 52"
        fill="none"
        overflow="visible"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="rpi-ig-grad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%"   stopColor="#f09433" />
            <stop offset="40%"  stopColor="#dc2743" />
            <stop offset="100%" stopColor="#bc1888" />
          </linearGradient>
        </defs>

        {/* Ícone Instagram — flutua para cima */}
        <g className="rpi-ico-1" transform="translate(10,40)">
          <rect x="-7" y="-7" width="14" height="14" rx="3.5" fill="url(#rpi-ig-grad)" />
          <circle cx="0" cy="0" r="3.5" stroke="white" strokeWidth="1.5" fill="none" />
          <circle cx="3.8" cy="-3.8" r="1.2" fill="white" />
        </g>

        {/* Ícone WhatsApp — flutua para cima */}
        <g className="rpi-ico-2" transform="translate(22,42)">
          <circle cx="0" cy="0" r="7" fill="#25D366" />
          <text x="0" y="4" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold" fontFamily="Arial, sans-serif">W</text>
        </g>

        {/* Ícone Facebook — flutua para cima */}
        <g className="rpi-ico-3" transform="translate(8,44)">
          <circle cx="0" cy="0" r="7" fill="#1877F2" />
          <text x="0" y="4.5" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold" fontFamily="Arial, sans-serif">f</text>
        </g>

        {/* Corredor dourado */}
        {/* Cabeça */}
        <circle cx="54" cy="8" r="4.5" fill="#C9A84C" />
        {/* Corpo */}
        <line x1="54" y1="12.5" x2="54" y2="32" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round" />
        {/* Braço esquerdo */}
        <line className="rpi-arm-l" x1="54" y1="18" x2="47" y2="26" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" />
        {/* Braço direito */}
        <line className="rpi-arm-r" x1="54" y1="18" x2="61" y2="26" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" />
        {/* Perna esquerda */}
        <line className="rpi-leg-l" x1="54" y1="32" x2="48" y2="45" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" />
        {/* Perna direita */}
        <line className="rpi-leg-r" x1="54" y1="32" x2="60" y2="45" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </>
  );
}
