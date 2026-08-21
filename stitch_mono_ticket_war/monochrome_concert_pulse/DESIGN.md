---
name: Monochrome Concert Pulse
colors:
  surface: '#f9f9fb'
  surface-dim: '#d9dadc'
  surface-bright: '#f9f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f5'
  surface-container: '#eeeef0'
  surface-container-high: '#e8e8ea'
  surface-container-highest: '#e2e2e4'
  on-surface: '#1a1c1d'
  on-surface-variant: '#46464a'
  inverse-surface: '#2f3132'
  inverse-on-surface: '#f0f0f2'
  outline: '#77767b'
  outline-variant: '#c7c6ca'
  surface-tint: '#5f5e60'
  primary: '#030304'
  on-primary: '#ffffff'
  primary-container: '#1d1d1f'
  on-primary-container: '#868587'
  inverse-primary: '#c8c6c8'
  secondary: '#5e5e63'
  on-secondary: '#ffffff'
  secondary-container: '#e0dfe4'
  on-secondary-container: '#626267'
  tertiary: '#040302'
  on-tertiary: '#ffffff'
  tertiary-container: '#211c1b'
  on-tertiary-container: '#8c8382'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e4e2e4'
  primary-fixed-dim: '#c8c6c8'
  on-primary-fixed: '#1b1b1d'
  on-primary-fixed-variant: '#474649'
  secondary-fixed: '#e3e2e7'
  secondary-fixed-dim: '#c7c6cb'
  on-secondary-fixed: '#1a1b1f'
  on-secondary-fixed-variant: '#46464b'
  tertiary-fixed: '#ebe0de'
  tertiary-fixed-dim: '#cec4c2'
  on-tertiary-fixed: '#1f1a19'
  on-tertiary-fixed-variant: '#4c4544'
  background: '#f9f9fb'
  on-background: '#1a1c1d'
  surface-variant: '#e2e2e4'
  pure-black: '#000000'
  pure-white: '#FFFFFF'
  system-gray-dark: '#424245'
  system-gray-light: '#E8E8ED'
typography:
  display-ticket-war:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Inter
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 41px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  countdown:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 24px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  margin-mobile: 20px
  gutter-mobile: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system is engineered for high-stakes concert ticket acquisitions, where speed, clarity, and reliability are paramount. The brand personality is "Quiet Authority"—a premium, high-performance interface that fades into the background to let artist imagery and transaction data take center stage. 

The aesthetic adheres to **Apple-inspired Minimalism**, prioritizing a strictly monochrome palette to reduce cognitive load during "ticket wars." By stripping away color distractions, we create a high-contrast environment where urgency is communicated through typography and scale rather than loud alerts. The emotional response is one of calm precision and premium exclusivity, mirroring the experience of securing a front-row seat.

## Colors

The palette is strictly achromatic. **Pure Black (#000000)** is reserved for the most critical interactive elements and primary headings to ensure maximum contrast against **Pure White (#FFFFFF)** backgrounds. 

**Apple Gray (#1D1D1F)** serves as the primary text color, providing a softer reading experience than pure black for long-form content. **#F5F5F7** is used for secondary surfaces and container backgrounds to create subtle depth without relying on borders. In "ticket war" scenarios, depth is signaled by shifting between these grayscale values rather than introducing chromatic accents, maintaining a disciplined, professional atmosphere.

## Typography

This design system utilizes **Inter** as a high-performance alternative to SF Pro, offering exceptional legibility and a systematic, utilitarian feel. 

For the "War Tiket" experience, we introduce a `display-ticket-war` level—an oversized, tight-tracked heading for artist names. All numerical data, especially countdown timers and prices, must use **tabular figures** (`tnum`) to prevent layout jitter as numbers change. Hierarchy is established through aggressive weight hopping (switching from 700 to 400) rather than color shifts.

## Layout & Spacing

The layout follows a strict **4px baseline grid** to ensure vertical rhythm. On mobile, a **20px side margin** provides generous breathing room, pushing content away from the device edges for a premium feel. 

Spacing is used to group related information: use `stack-sm` for internal card content (e.g., Artist Name + Date) and `stack-lg` to separate distinct sections (e.g., Event Details vs. Terms & Conditions). In high-pressure views, the layout remains fluid but centered, ensuring that the "Buy Now" or "Select Seat" actions are always within the natural thumb zone.

## Elevation & Depth

In alignment with modern iOS standards, this design system avoids heavy shadows. Depth is primarily achieved through **Tonal Layering**:
- **Level 0 (Base):** Pure White (#FFFFFF) for the main background.
- **Level 1 (Cards):** Soft Gray (#F5F5F7) or White with a very subtle 1px border (#E8E8ED).
- **Level 2 (Modals/Popovers):** Pure White with a "Large" ambient shadow (0px 10px 30px rgba(0,0,0,0.08)).

Glassmorphism is used sparingly for navigation bars and the "Checkout Bar" at the bottom of the screen, using a 20px backdrop blur to maintain context of the content scrolling beneath it.

## Shapes

The design system uses a **Rounded (0.5rem)** base to mirror the hardware curvature of the iPhone. 
- **Buttons and Primary Containers:** 16px (rounded-lg) for a friendly yet structured appearance.
- **Input Fields:** 12px for a more precise, technical feel.
- **Event Posters:** 24px (rounded-xl) to emphasize the premium nature of the visual assets.

## Components

### Buttons
Primary action buttons are **Pure Black** with **White text**, using a minimum height of 56px for "ticket war" accessibility. High-pressure buttons (like "Join Queue") should feature a subtle 2px inset border when pressed to provide tactile feedback.

### Large Cards
Used for featured concerts. These should be edge-to-edge (minus margins) with high-contrast typography overlaid on a subtle gradient (bottom-up, black to transparent) to ensure legibility over artist imagery.

### Countdown Timers
Housed in a distinct `system-gray-light` pill. Use `countdown` typography with monospaced numbers. During the final 60 seconds, the font weight should increase to Bold to signify urgency.

### Input Fields
Minimalist styling with a 1px `system-gray-light` border. Upon focus, the border transitions to `pure-black`. Labels should use the `label-caps` style for clarity.

### Lists & Selection
Seat selection lists should use `body-lg` for row items with a chevron-right accessory. Selected states are indicated by a `pure-black` background and white text, creating a clear visual confirmation of the user's choice.