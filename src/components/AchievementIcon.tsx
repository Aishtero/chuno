import React from 'react';
import { AchievementIconId } from '../core/achievements';

interface AchievementIconProps {
  icon: AchievementIconId;
  className?: string;
}

export const AchievementIcon: React.FC<AchievementIconProps> = React.memo(
  ({ icon, className = 'w-6 h-6' }) => {
    const common = {
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.75,
      strokeLinecap: 'round' as const,
      strokeLinejoin: 'round' as const,
      className,
      'aria-hidden': true,
    };

    switch (icon) {
      case 'card_chair':
        return (
          <svg {...common}>
            <rect x="4" y="3" width="10" height="14" rx="1.8" />
            <path d="M9 7.5l2 2.5-2 2.5-2-2.5z" fill="currentColor" stroke="none" />
            <path d="M16 11h4v5h-4M16 16v5M20 16v5" />
          </svg>
        );
      case 'deck_stack':
        return (
          <svg {...common}>
            <rect x="6" y="3" width="12" height="13" rx="1.5" />
            <path d="M4 7v11a1.5 1.5 0 0 0 1.5 1.5H16" />
            <path d="M2 11v9.5A1.5 1.5 0 0 0 3.5 22H14" />
            <circle cx="12" cy="9.5" r="1.8" fill="currentColor" stroke="none" />
          </svg>
        );
      case 'hourglass':
        return (
          <svg {...common}>
            <path d="M6 2h12M6 22h12" />
            <path d="M7 2v4.5c0 2 2.5 4 5 5.5-2.5 1.5-5 3.5-5 5.5V22" />
            <path d="M17 2v4.5c0 2-2.5 4-5 5.5 2.5 1.5 5 3.5 5 5.5V22" />
            <path d="M9.5 19h5" />
          </svg>
        );
      case 'laurel_crown':
        return (
          <svg {...common}>
            <path d="M5 17c-1.8-3-1.8-7.5 1-11" />
            <path d="M19 17c1.8-3 1.8-7.5-1-11" />
            <path d="M5 14l2.5-1M4.5 10l2.5-.5M19 14l-2.5-1M19.5 10l-2.5-.5" />
            <path d="M8 15l1-5 3 2.5L15 10l1 5H8z" />
            <path d="M7 19.5h10" />
          </svg>
        );
      case 'pawn_star':
        return (
          <svg {...common}>
            <circle cx="10" cy="7.5" r="2.5" />
            <path d="M7.5 11.5h5L13.5 18h-7zM5.5 20.5h9" />
            <path d="M18 4l.9 2.2L21 7l-2.1.8L18 10l-.9-2.2L15 7l2.1-.8z" fill="currentColor" stroke="none" />
          </svg>
        );
      case 'trophy_king':
        return (
          <svg {...common}>
            <path d="M12 2v4M10.2 3.8h3.6" />
            <path d="M7 7h10v4a5 5 0 0 1-10 0V7z" />
            <path d="M7 8.5H4.5a2 2 0 0 0 0 4H7M17 8.5h2.5a2 2 0 0 1 0 4H17" />
            <path d="M12 16v4M8 21h8" />
          </svg>
        );
      case 'obsidian_crown':
        return (
          <svg {...common}>
            <path d="M3 17l2-9 4.5 4L12 5l2.5 7L19 8l2 9H3z" />
            <path d="M4.5 20h15" />
            <path d="M12 11l1.5 2-1.5 2-1.5-2z" fill="currentColor" stroke="none" />
          </svg>
        );
      case 'heart_pulse':
        return (
          <svg {...common}>
            <path d="M12 20.5s-7.5-4.7-9-9.4C1.9 7.5 4.4 4 7.8 4c1.9 0 3.4 1 4.2 2.3C12.8 5 14.3 4 16.2 4c3.4 0 5.9 3.5 4.8 7.1-1.5 4.7-9 9.4-9 9.4z" />
            <path d="M6.5 11.5h2.5l1.5-2.8 2.4 5.2 1.6-2.4h3" />
          </svg>
        );
      case 'red_eyes':
        return (
          <svg {...common}>
            <path d="M2.5 11.5c2.2-2.2 5.2-2.2 7.5 0-2.3 2.2-5.3 2.2-7.5 0z" />
            <path d="M14 11.5c2.3-2.2 5.3-2.2 7.5 0-2.2 2.2-5.2 2.2-7.5 0z" />
            <circle cx="6.25" cy="11.5" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="17.75" cy="11.5" r="1.2" fill="currentColor" stroke="none" />
            <path d="M3.5 7.5l6 1.8M20.5 7.5l-6 1.8" />
          </svg>
        );
      case 'skull_crown':
        return (
          <svg {...common}>
            <path d="M7 7l1.5-3.5L12 5.5l3.5-2L17 7" />
            <path d="M6 12.5a6 5.5 0 1 1 12 0c0 2-.9 3.3-2 4.2V19H8v-2.3c-1.1-.9-2-2.2-2-4.2z" />
            <circle cx="9.6" cy="12.5" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="14.4" cy="12.5" r="1.2" fill="currentColor" stroke="none" />
            <path d="M10 19v2M14 19v2" />
          </svg>
        );
      case 'cracked_skull':
        return (
          <svg {...common}>
            <path d="M5.5 11.5a6.5 6 0 1 1 13 0c0 2.2-1 3.7-2.2 4.6V19H7.7v-2.9c-1.2-.9-2.2-2.4-2.2-4.6z" />
            <path d="M13 5.5l-1.5 2.5 1.5 1.5-1 2" />
            <circle cx="9.3" cy="12" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="14.7" cy="12" r="1.2" fill="currentColor" stroke="none" />
            <path d="M9.5 19v2M12 19v2M14.5 19v2" />
          </svg>
        );
      case 'twin_revolver':
        return (
          <svg {...common}>
            <path d="M3 7h8l1 3H7l-1.5 4H3.5L5 10H3z" />
            <path d="M21 7h-8l-1 3h5l1.5 4h2L19 10h2z" />
            <circle cx="8" cy="8.5" r="1" fill="currentColor" stroke="none" />
            <circle cx="16" cy="8.5" r="1" fill="currentColor" stroke="none" />
            <path d="M8 18l8-4M16 18l-8-4" />
          </svg>
        );
      case 'iron_mask':
        return (
          <svg {...common}>
            <path d="M5 4h14v9c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V4z" />
            <path d="M8 10h3M13 10h3M12 4v18M8.5 15h7" />
          </svg>
        );
      case 'flame_skull':
        return (
          <svg {...common}>
            <path d="M12 2c2 2.4 4.5 4.2 4.5 7.5a4.5 4.5 0 0 1-9 0C7.5 6.2 10 4.4 12 2z" />
            <path d="M7.5 14.5a4.5 4 0 0 1 9 0v3.5h-9v-3.5z" />
            <circle cx="10.2" cy="14.8" r="1" fill="currentColor" stroke="none" />
            <circle cx="13.8" cy="14.8" r="1" fill="currentColor" stroke="none" />
            <path d="M10 18v2.5M14 18v2.5" />
          </svg>
        );
      case 'bullet_skull':
        return (
          <svg {...common}>
            <path d="M12 3c2.5 2 3.5 4.5 3.5 7v8h-7v-8c0-2.5 1-5 3.5-7z" />
            <path d="M8.5 18h7v2.5h-7z" />
            <circle cx="10.7" cy="12" r="0.9" fill="currentColor" stroke="none" />
            <circle cx="13.3" cy="12" r="0.9" fill="currentColor" stroke="none" />
            <path d="M10.5 15h3" />
          </svg>
        );
      case 'cylinder_six':
        return (
          <svg {...common}>
            <circle cx="12" cy="12" r="8.5" />
            <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
            <circle cx="12" cy="7.2" r="1.5" />
            <circle cx="12" cy="16.8" r="1.5" />
            <circle cx="7.8" cy="9.6" r="1.5" />
            <circle cx="16.2" cy="9.6" r="1.5" />
            <circle cx="7.8" cy="14.4" r="1.5" />
            <circle cx="16.2" cy="14.4" r="1.5" />
          </svg>
        );
      case 'coin_wings':
        return (
          <svg {...common}>
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 9.8l1.2 2.2-1.2 2.2-1.2-2.2z" fill="currentColor" stroke="none" />
            <path d="M7.5 10C4.5 9.5 3 8 2 6.5c.8 2.8 2.2 4.5 4.5 5.5-1.5.5-2.5 1-3.5 2 2 .3 3.5-.1 4.8-.8" />
            <path d="M16.5 10c3-.5 4.5-2 5.5-3.5-.8 2.8-2.2 4.5-4.5 5.5 1.5.5 2.5 1 3.5 2-2 .3-3.5-.1-4.8-.8" />
          </svg>
        );
      case 'coin_glow':
        return (
          <svg {...common}>
            <circle cx="12" cy="12" r="5.5" />
            <circle cx="12" cy="12" r="2.8" />
            <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
          </svg>
        );
      case 'clean_king':
        return (
          <svg {...common}>
            <path d="M12 2.5v4.5M10 4.5h4" />
            <path d="M7.5 9h9l-1.2 8.5H8.7L7.5 9z" />
            <path d="M6 20.5h12" />
            <path d="M17.5 4.5l.7 1.5 1.5.7-1.5.7-.7 1.5-.7-1.5-1.5-.7 1.5-.7z" fill="currentColor" stroke="none" />
          </svg>
        );
      case 'sun_pawn':
        return (
          <svg {...common}>
            <circle cx="12" cy="9.5" r="2.6" />
            <path d="M9.5 13h5l1.2 5.5H8.3L9.5 13zM6.5 21h11" />
            <path d="M12 2.5v2M5.5 5l1.4 1.4M18.5 5l-1.4 1.4M3.5 10h2M18.5 10h2" />
          </svg>
        );
      case 'shades_crack':
        return (
          <svg {...common}>
            <path d="M2.5 10h19" />
            <path d="M4 10h6.5v3.5a2.5 2.5 0 0 1-2.5 2.5H6.5A2.5 2.5 0 0 1 4 13.5V10z" />
            <path d="M13.5 10H20v3.5a2.5 2.5 0 0 1-2.5 2.5H16a2.5 2.5 0 0 1-2.5-2.5V10z" />
            <path d="M16.8 10.2l-1.2 2.4 1.1 1.2-.8 2" />
          </svg>
        );
      case 'glasses_owl':
        return (
          <svg {...common}>
            <circle cx="8" cy="12" r="3.5" />
            <circle cx="16" cy="12" r="3.5" />
            <path d="M11.5 12h1M4.5 9l1-3.5L8 7.5M19.5 9l-1-3.5L16 7.5" />
            <circle cx="8" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="16" cy="12" r="1" fill="currentColor" stroke="none" />
            <path d="M12 14.5l-1.2 2h2.4z" fill="currentColor" stroke="none" />
          </svg>
        );
      case 'book_queen':
        return (
          <svg {...common}>
            <path d="M6.5 9.5l1.5-5L12 7.5l4-3 1.5 5H6.5z" />
            <path d="M4 13.5c2.5-1 5.5-1 8 .5 2.5-1.5 5.5-1.5 8-.5v6.5c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5v-6.5z" />
            <path d="M12 14v6.5" />
          </svg>
        );
      case 'fedora_mask':
        return (
          <svg {...common}>
            <path d="M3 12.5c5.5-1.4 12.5-1.4 18 0" />
            <path d="M6.5 11.8L8 6.5c1.5-1 3-.5 4 .5 1-1 2.5-1.5 4-.5l1.5 5.3" />
            <rect x="6" y="14.5" width="4.5" height="3" rx="0.8" />
            <rect x="13.5" y="14.5" width="4.5" height="3" rx="0.8" />
            <path d="M10.5 16h3" />
          </svg>
        );
      case 'compass_four':
        return (
          <svg {...common}>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 4.5l2 5.5 5.5 2-5.5 2-2 5.5-2-5.5-5.5-2 5.5-2z" />
            <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
          </svg>
        );
      case 'flame_card':
        return (
          <svg {...common}>
            <rect x="5" y="4" width="14" height="17" rx="2" />
            <path d="M12 8c1.8 1.8 3 3.4 3 5.2a3 3 0 1 1-6 0c0-1.8 1.2-3.4 3-5.2z" />
          </svg>
        );
      case 'blazing_crown':
        return (
          <svg {...common}>
            <path d="M4 18l1.5-7 4 3L12 7l2.5 7 4-3 1.5 7H4z" />
            <path d="M12 2.5c1 1.3 1.5 2.2 1.5 3.1a1.5 1.5 0 0 1-3 0c0-.9.5-1.8 1.5-3.1z" fill="currentColor" stroke="none" />
            <path d="M5 20.5h14" />
          </svg>
        );
      case 'lightning_king':
        return (
          <svg {...common}>
            <path d="M13 2L6 13h5l-1 9 8-12h-5l0-8z" />
          </svg>
        );
      case 'plus_four':
        return (
          <svg {...common}>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M8.5 9.5v5M6 12h5" />
            <path d="M16.5 15V9l-3 4h4" />
          </svg>
        );
      case 'reverse_arrows':
        return (
          <svg {...common}>
            <path d="M17 4l3 3-3 3" />
            <path d="M20 7H9a4 4 0 0 0-4 4" />
            <path d="M7 20l-3-3 3-3" />
            <path d="M4 17h11a4 4 0 0 0 4-4" />
          </svg>
        );
      case 'wild_prism':
        return (
          <svg {...common}>
            <path d="M12 3l8 15H4L12 3z" />
            <path d="M12 3v15M8 11.5h8" />
          </svg>
        );
      case 'stopwatch_bolt':
        return (
          <svg {...common}>
            <circle cx="12" cy="13" r="7.5" />
            <path d="M9.5 2.5h5M12 2.5v3M18.2 6.8l1.3-1.3" />
            <path d="M12.5 9L9.8 13.5h2.7L11.5 17l2.7-4.5h-2.7z" fill="currentColor" stroke="none" />
          </svg>
        );
    }
  },
);
AchievementIcon.displayName = 'AchievementIcon';
