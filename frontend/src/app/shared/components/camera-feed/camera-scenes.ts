// SVG scene geometry for camera feed placeholders (matches WilCam.html design exactly)
export const SCENES: Record<string, string> = {
  parking: `
    <path d="M0 60 L200 60 L200 120 L0 120 Z" fill="oklch(0.16 0.012 245)"/>
    <g stroke="oklch(0.72 0.05 240 / 0.35)" stroke-width="0.6">
      <line x1="20" y1="68" x2="0" y2="120"/><line x1="60" y1="68" x2="40" y2="120"/>
      <line x1="100" y1="68" x2="100" y2="120"/><line x1="140" y1="68" x2="160" y2="120"/>
      <line x1="180" y1="68" x2="200" y2="120"/>
      <line x1="0" y1="85" x2="200" y2="85" stroke-dasharray="3 3"/>
    </g>
    <rect x="46" y="75" width="22" height="12" rx="2" fill="oklch(0.30 0.04 245)"/>
    <rect x="76" y="73" width="22" height="12" rx="2" fill="oklch(0.34 0.06 30)"/>
    <rect x="120" y="74" width="22" height="12" rx="2" fill="oklch(0.28 0.03 220)"/>
    <rect x="0" y="0" width="200" height="60" fill="oklch(0.20 0.02 240)"/>
    <path d="M0 60 L0 40 L30 40 L30 30 L60 30 L60 45 L100 45 L100 35 L140 35 L140 50 L200 50 L200 60 Z" fill="oklch(0.14 0.012 245)"/>
    <g fill="oklch(0.74 0.13 90 / 0.5)">
      <rect x="8" y="44" width="3" height="4"/><rect x="16" y="44" width="3" height="4"/>
      <rect x="34" y="34" width="3" height="4"/><rect x="46" y="34" width="3" height="4"/>
      <rect x="105" y="38" width="3" height="4"/><rect x="118" y="38" width="3" height="4"/>
    </g>`,

  entrance: `
    <rect width="200" height="120" fill="oklch(0.17 0.015 245)"/>
    <path d="M0 80 L200 80 L200 120 L0 120 Z" fill="oklch(0.14 0.012 245)"/>
    <rect x="70" y="20" width="60" height="68" fill="oklch(0.20 0.02 245)"/>
    <rect x="80" y="32" width="40" height="56" rx="20" fill="oklch(0.28 0.04 90 / 0.4)"/>
    <rect x="79" y="32" width="2" height="56" fill="oklch(0.72 0.04 240 / 0.5)"/>
    <rect x="119" y="32" width="2" height="56" fill="oklch(0.72 0.04 240 / 0.5)"/>
    <circle cx="116" cy="60" r="1" fill="oklch(0.82 0.16 200)"/>
    <g stroke="oklch(0.30 0.03 240 / 0.4)" stroke-width="0.4">
      <line x1="0" y1="92" x2="200" y2="92"/><line x1="0" y1="104" x2="200" y2="104"/>
      <line x1="50" y1="80" x2="40" y2="120"/><line x1="100" y1="80" x2="100" y2="120"/>
      <line x1="150" y1="80" x2="160" y2="120"/>
    </g>`,

  hallway: `
    <rect width="200" height="120" fill="oklch(0.16 0.013 245)"/>
    <path d="M0 0 L100 50 L100 70 L0 120 Z" fill="oklch(0.20 0.018 245)"/>
    <path d="M200 0 L100 50 L100 70 L200 120 Z" fill="oklch(0.20 0.018 245)"/>
    <path d="M0 120 L100 70 L200 120 L0 120 Z" fill="oklch(0.13 0.012 245)"/>
    <g fill="oklch(0.85 0.10 90 / 0.55)">
      <rect x="60" y="32" width="20" height="3"/><rect x="120" y="32" width="20" height="3"/>
      <rect x="75" y="50" width="14" height="2.5"/><rect x="111" y="50" width="14" height="2.5"/>
      <rect x="92" y="60" width="6" height="1.5"/>
    </g>
    <rect x="14" y="36" width="14" height="32" fill="oklch(0.24 0.02 245)"/>
    <rect x="172" y="36" width="14" height="32" fill="oklch(0.24 0.02 245)"/>`,

  office: `
    <rect width="200" height="120" fill="oklch(0.18 0.015 245)"/>
    <rect width="200" height="50" fill="oklch(0.16 0.012 245)"/>
    <g fill="oklch(0.65 0.16 220 / 0.4)" stroke="oklch(0.30 0.03 240)" stroke-width="0.5">
      <rect x="20" y="60" width="30" height="20"/><rect x="60" y="60" width="30" height="20"/>
      <rect x="110" y="60" width="30" height="20"/><rect x="150" y="60" width="30" height="20"/>
    </g>
    <g fill="oklch(0.22 0.02 245)">
      <rect x="14" y="80" width="42" height="8"/><rect x="54" y="80" width="42" height="8"/>
      <rect x="104" y="80" width="42" height="8"/><rect x="144" y="80" width="42" height="8"/>
    </g>
    <g fill="oklch(0.18 0.015 245)">
      <rect x="28" y="92" width="14" height="12" rx="2"/><rect x="68" y="92" width="14" height="12" rx="2"/>
      <rect x="118" y="92" width="14" height="12" rx="2"/><rect x="158" y="92" width="14" height="12" rx="2"/>
    </g>`,

  warehouse: `
    <rect width="200" height="120" fill="oklch(0.15 0.013 245)"/>
    <g fill="oklch(0.22 0.018 245)" stroke="oklch(0.32 0.03 240)" stroke-width="0.4">
      <rect x="6" y="20" width="54" height="80"/><rect x="68" y="20" width="54" height="80"/>
      <rect x="130" y="20" width="54" height="80"/>
    </g>
    <g stroke="oklch(0.42 0.04 240 / 0.5)" stroke-width="0.6">
      <line x1="6" y1="38" x2="60" y2="38"/><line x1="6" y1="58" x2="60" y2="58"/>
      <line x1="6" y1="80" x2="60" y2="80"/>
      <line x1="68" y1="38" x2="122" y2="38"/><line x1="68" y1="58" x2="122" y2="58"/>
      <line x1="68" y1="80" x2="122" y2="80"/>
      <line x1="130" y1="38" x2="184" y2="38"/><line x1="130" y1="58" x2="184" y2="58"/>
      <line x1="130" y1="80" x2="184" y2="80"/>
    </g>
    <g fill="oklch(0.40 0.07 60 / 0.4)">
      <rect x="10" y="42" width="10" height="14"/><rect x="24" y="42" width="10" height="14"/>
      <rect x="40" y="42" width="14" height="14"/><rect x="72" y="62" width="14" height="16"/>
      <rect x="88" y="62" width="10" height="16"/><rect x="134" y="42" width="12" height="14"/>
      <rect x="150" y="42" width="12" height="14"/><rect x="166" y="42" width="12" height="14"/>
    </g>`,

  street: `
    <rect width="200" height="120" fill="oklch(0.18 0.02 240)"/>
    <rect y="60" width="200" height="60" fill="oklch(0.13 0.012 245)"/>
    <g stroke="oklch(0.80 0.06 90 / 0.45)" stroke-width="0.8" stroke-dasharray="6 6">
      <line x1="0" y1="90" x2="200" y2="90"/>
    </g>
    <path d="M0 60 L0 30 L40 30 L40 22 L60 22 L60 32 L80 32 L80 60 Z" fill="oklch(0.14 0.013 245)"/>
    <path d="M80 60 L80 38 L120 38 L120 28 L140 28 L140 60 Z" fill="oklch(0.16 0.013 245)"/>
    <path d="M140 60 L140 34 L170 34 L170 24 L200 24 L200 60 Z" fill="oklch(0.13 0.012 245)"/>
    <g fill="oklch(0.80 0.13 80 / 0.55)">
      <rect x="8" y="40" width="3" height="4"/><rect x="18" y="40" width="3" height="4"/>
      <rect x="44" y="32" width="3" height="4"/><rect x="92" y="46" width="3" height="4"/>
      <rect x="152" y="42" width="3" height="4"/><rect x="180" y="36" width="3" height="4"/>
    </g>
    <rect x="86" y="92" width="28" height="10" rx="2" fill="oklch(0.32 0.05 30)"/>
    <rect x="92" y="86" width="16" height="8" rx="2" fill="oklch(0.34 0.05 30)"/>
    <circle cx="92" cy="103" r="2" fill="oklch(0.12 0.01 240)"/>
    <circle cx="108" cy="103" r="2" fill="oklch(0.12 0.01 240)"/>`,

  reception: `
    <rect width="200" height="120" fill="oklch(0.19 0.015 245)"/>
    <rect y="70" width="200" height="50" fill="oklch(0.14 0.013 245)"/>
    <rect x="40" y="62" width="120" height="36" fill="oklch(0.22 0.025 245)"/>
    <rect x="40" y="62" width="120" height="4" fill="oklch(0.30 0.03 240)"/>
    <rect x="80" y="14" width="40" height="26" fill="oklch(0.20 0.02 245)" stroke="oklch(0.42 0.04 240)" stroke-width="0.3"/>
    <circle cx="100" cy="27" r="6" fill="oklch(0.70 0.18 250 / 0.55)"/>
    <g fill="oklch(0.30 0.03 245)">
      <circle cx="100" cy="50" r="5"/>
      <rect x="92" y="54" width="16" height="14" rx="3"/>
    </g>
    <g stroke="oklch(0.28 0.03 240 / 0.3)" stroke-width="0.4">
      <line x1="0" y1="85" x2="200" y2="85"/>
      <line x1="0" y1="100" x2="200" y2="100"/>
    </g>`,

  loading: `
    <rect width="200" height="120" fill="oklch(0.17 0.015 245)"/>
    <rect y="84" width="200" height="36" fill="oklch(0.13 0.012 245)"/>
    <g fill="oklch(0.20 0.02 245)" stroke="oklch(0.34 0.03 240)" stroke-width="0.4">
      <rect x="10" y="20" width="50" height="64"/><rect x="70" y="20" width="50" height="64"/>
      <rect x="130" y="20" width="50" height="64"/>
    </g>
    <g stroke="oklch(0.30 0.03 240 / 0.5)" stroke-width="0.3">
      <line x1="10" y1="28" x2="180" y2="28"/><line x1="10" y1="37" x2="180" y2="37"/>
      <line x1="10" y1="46" x2="180" y2="46"/><line x1="10" y1="55" x2="180" y2="55"/>
      <line x1="10" y1="64" x2="180" y2="64"/><line x1="10" y1="73" x2="180" y2="73"/>
    </g>
    <rect x="120" y="58" width="50" height="26" fill="oklch(0.32 0.04 30)"/>
    <rect x="166" y="60" width="14" height="20" fill="oklch(0.28 0.03 220)"/>
    <circle cx="135" cy="86" r="3" fill="oklch(0.10 0.01 240)"/>
    <circle cx="156" cy="86" r="3" fill="oklch(0.10 0.01 240)"/>`,

  rooftop: `
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="oklch(0.24 0.03 250)"/>
        <stop offset="1" stop-color="oklch(0.16 0.015 245)"/>
      </linearGradient>
    </defs>
    <rect width="200" height="120" fill="url(#sky)"/>
    <path d="M0 80 L20 80 L20 60 L40 60 L40 50 L60 50 L60 70 L80 70 L80 40 L100 40 L100 55 L120 55 L120 35 L140 35 L140 65 L160 65 L160 45 L180 45 L180 70 L200 70 L200 120 L0 120 Z" fill="oklch(0.13 0.012 245)"/>
    <g fill="oklch(0.82 0.14 90 / 0.5)">
      <rect x="28" y="64" width="2" height="3"/><rect x="84" y="46" width="2" height="3"/>
      <rect x="124" y="42" width="2" height="3"/><rect x="168" y="52" width="2" height="3"/>
    </g>
    <rect x="60" y="98" width="30" height="14" fill="oklch(0.22 0.02 245)"/>
    <rect x="64" y="100" width="3" height="3" fill="oklch(0.42 0.04 240)"/>
    <rect x="70" y="100" width="3" height="3" fill="oklch(0.42 0.04 240)"/>`,
};
