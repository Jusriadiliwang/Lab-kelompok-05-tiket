// Design System: Monochrome Concert Pulse
// Source: stitch_mono_ticket_war/monochrome_concert_pulse/DESIGN.md

export const Colors = {
  // Backgrounds
  background:               '#f9f9fb',
  surface:                  '#f9f9fb',
  surfaceContainerLowest:   '#ffffff',
  surfaceContainerLow:      '#f3f3f5',
  surfaceContainer:         '#eeeef0',
  surfaceContainerHigh:     '#e8e8ea',
  surfaceContainerHighest:  '#e2e2e4',
  surfaceDim:               '#d9dadc',

  // Text
  onBackground:             '#1a1c1d',
  onSurface:                '#1a1c1d',
  onSurfaceVariant:         '#46464a',
  outline:                  '#77767b',
  outlineVariant:           '#c7c6ca',

  // Primary (pure black)
  primary:                  '#030304',
  onPrimary:                '#ffffff',
  primaryContainer:         '#1d1d1f',
  onPrimaryContainer:       '#868587',

  // Secondary
  secondary:                '#5e5e63',
  onSecondary:              '#ffffff',
  secondaryContainer:       '#e0dfe4',

  // Error
  error:                    '#ba1a1a',
  onError:                  '#ffffff',
  errorContainer:           '#ffdad6',

  // Misc
  pureBlack:                '#000000',
  pureWhite:                '#FFFFFF',
  systemGrayDark:           '#424245',
  systemGrayLight:          '#E8E8ED',

  // Semantic (used in app)
  cardBackground:           '#ffffff',
  cardBorder:               '#E8E8ED',
  tabBarBackground:         '#ffffff',
  headerBackground:         '#ffffff',
  placeholderText:          '#77767b',
  divider:                  '#E8E8ED',
  queueProgress:            '#000000',
  countdownBackground:      '#E8E8ED',
  successGreen:             '#1a7a1a',
} as const;

export const Typography = {
  // display-ticket-war: artist name, huge heading
  displayTicketWar: {
    fontFamily: 'Inter_700Bold',
    fontSize: 34,
    lineHeight: 41,
    letterSpacing: -0.8,
  },
  // headline-lg-mobile
  headlineLg: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  // headline-md
  headlineMd: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
  },
  // body-lg
  bodyLg: {
    fontFamily: 'Inter_400Regular',
    fontSize: 17,
    lineHeight: 24,
  },
  // body-sm
  bodySm: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 20,
  },
  // label-caps
  labelCaps: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
  // countdown
  countdown: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    lineHeight: 24,
  },
  // price
  price: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    lineHeight: 24,
  },
} as const;

export const Spacing = {
  unit:          4,
  stackSm:       8,
  stackMd:       16,
  stackLg:       32,
  marginMobile:  20,
  gutterMobile:  16,
} as const;

export const Radius = {
  sm:      4,
  DEFAULT: 8,
  md:      12,
  lg:      16,   // buttons, primary containers
  xl:      24,   // event posters / hero
  full:    9999,
} as const;

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 10,
  },
} as const;
