import campaignLight from '../../Assets/Image/Light/campaign - nav bar - collapsed.png';
import screenersLight from '../../Assets/Image/Light/ai screeners - menu - nav bar.png';
import tradeApproachLight from '../../Assets/Image/Light/material-symbols-light_chess-pawn-outline-rounded.png';
import watchlistLight from '../../Assets/Image/Light/Vector.png';
import opportunitiesLight from '../../Assets/Image/Light/opportunities - nav bar - collapsed.png';
import positionsLight from '../../Assets/Image/Light/Existing positions - nav bar - collapsed.png';
import notificationsLight from '../../Assets/Image/Light/notifications - nav bar - collapsed.png';
import settingsLight from '../../Assets/Image/Light/settings - nav bar - collapsed.png';

import campaignDark from '../../Assets/Image/Dark/basil_bullhorn-solid.png';
import screenersDark from '../../Assets/Image/Dark/fluent_sparkle-20-filled.png';
import tradeApproachDark from '../../Assets/Image/Dark/material-symbols-light_chess-pawn-rounded.png';
import opportunitiesDark from '../../Assets/Image/Dark/fluent_task-list-square-sparkle-20-filled.png';
import positionsDark from '../../Assets/Image/Dark/bi_layers-fill.png';
import homeDark from '../../Assets/Image/Dark/ic_round-home.png';

import { BookIcon, HomeIcon, TradeLogIcon } from '../Icons/FallbackIcons';

// Icon fields are documented in Icons/NavIcon.js.
export const mainNav = [
  {
    label: 'Dashboard',
    labelKey: 'nav.dashboard',
    path: '/dashboard',
    // No light home PNG yet: outline SVG when idle, dark PNG when active.
    icon: { Svg: HomeIcon, dark: homeDark },
  },
  { label: 'Campaigns',
    labelKey: 'nav.campaigns', path: '/campaigns', icon: { light: campaignLight, dark: campaignDark } },
  {
    // Group: expands to its children; active when one of them is.
    label: 'AI Screeners',
    labelKey: 'nav.aiScreeners',
    icon: { light: screenersLight, dark: screenersDark },
    children: [
      {
        label: 'Trade Approach',
    labelKey: 'nav.tradeApproach',
        path: '/trade-approaches',
        icon: { light: tradeApproachLight, dark: tradeApproachDark, tight: true },
      },
      {
        label: 'Watchlists',
    labelKey: 'nav.watchlists',
        path: '/watchlist',
        // No filled book PNG yet: filled SVG when active.
        icon: { light: watchlistLight, Svg: BookIcon, tight: true },
      },
      {
        // Rate a stock good / medium / poor for option selling (Groq via the backend).
        label: 'Ask AI',
    labelKey: 'nav.askAi',
        path: '/ask-ai',
        icon: { light: screenersLight, dark: screenersDark, tight: true },
      },
    ],
  },
  { label: 'Opportunities',
    labelKey: 'nav.opportunities', path: '/opportunities', icon: { light: opportunitiesLight, dark: opportunitiesDark } },
  { label: 'Existing Positions',
    labelKey: 'nav.positions', path: '/positions', icon: { light: positionsLight, dark: positionsDark } },
  { label: 'Trade Log',
    labelKey: 'nav.tradeLog', path: '/trade-log', icon: { Svg: TradeLogIcon } },
];

export const footerNav = [
  { label: 'Notifications',
    labelKey: 'nav.notifications', path: '/notifications', icon: { light: notificationsLight }, hasBadge: true },
  { label: 'Settings',
    labelKey: 'nav.settings', path: '/settings', icon: { light: settingsLight } },
];
