import { dark } from '@clerk/themes';

export const clerkAppearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: '#FFFFFF',
    colorBackground: '#121215',
    colorInputBackground: '#18181B',
    colorInputText: '#FFFFFF',
    colorText: '#FFFFFF',
    colorTextSecondary: 'rgba(255, 255, 255, 0.6)',
    borderRadius: '16px',
    fontFamily: 'var(--font-space-grotesk), "Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  layout: {
    socialButtonsPlacement: 'top',
    socialButtonsVariant: 'blockButton',
    showOptionalFields: false,
    logoImageUrl: '/logo-transparent.png',
  },
  elements: {
    // 0. Card & Layout Containers
    rootBox: {
      overflow: 'visible',
    },
    cardBox: {
      overflow: 'visible',
    },
    card: {
      background: '#101013',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '24px',
      padding: '32px 28px',
      boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.06)',
      overflow: 'hidden',
    },
    headerTitle: {
      color: '#FFFFFF',
      fontWeight: '800',
      letterSpacing: '-0.02em',
      fontSize: '20px',
    },
    headerSubtitle: {
      color: 'rgba(255, 255, 255, 0.55)',
      fontSize: '13px',
    },

    // 1. Social Buttons (Apple & Google)
    socialButtonsBlockButton: {
      borderRadius: '14px',
      height: '46px',
      backgroundColor: '#18181B',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      color: '#FFFFFF',
      boxShadow: 'none',
      boxSizing: 'border-box',
      padding: '0 16px',
      transition: 'all 0.15s ease',
    },
    socialButtonsIconButton: {
      borderRadius: '14px',
      height: '46px',
      backgroundColor: '#18181B',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      color: '#FFFFFF',
      boxShadow: 'none',
      boxSizing: 'border-box',
      padding: '0 16px',
    },
    socialButtonsBlockButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: '13px',
    },
    socialButtons: {
      display: 'flex',
      gap: '10px',
      width: '100%',
    },

    // Divider
    dividerLine: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    dividerText: {
      color: 'rgba(255, 255, 255, 0.4)',
      fontSize: '11px',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      fontWeight: '700',
    },

    // Inputs & Primary Button
    formFieldLabel: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: '12px',
      fontWeight: '600',
    },
    formFieldInput: {
      borderRadius: '14px',
      height: '46px',
      backgroundColor: '#18181B',
      border: '1px solid rgba(255, 255, 255, 0.14)',
      color: '#FFFFFF',
      fontSize: '15px',
      boxSizing: 'border-box',
      padding: '0 14px',
    },
    formButtonPrimary: {
      borderRadius: '14px',
      height: '46px',
      backgroundColor: '#FFFFFF',
      color: '#000000',
      fontWeight: '700',
      fontSize: '14px',
      boxShadow: 'none',
      boxSizing: 'border-box',
      transition: 'opacity 0.15s ease',
    },

    // Footer spacing & clean typography
    footer: {
      marginTop: '16px',
    },
    footerAction: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
    },
    footerActionText: {
      color: 'rgba(255, 255, 255, 0.5)',
      fontSize: '12px',
    },
    footerActionLink: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: '12px',
      textDecoration: 'underline',
      textUnderlineOffset: '3px',
    },

    // Identity preview & OTP inputs
    identityPreview: {
      backgroundColor: '#18181B',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '14px',
    },
    identityPreviewText: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
    otpCodeFieldInput: {
      backgroundColor: '#18181B',
      border: '1px solid rgba(255, 255, 255, 0.18)',
      color: '#FFFFFF',
      borderRadius: '12px',
    },

    // UserButton Popover & Clean Brand
    userButtonPopoverCard: {
      backgroundColor: '#141416',
      border: '1px solid rgba(255, 255, 255, 0.14)',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.85)',
      borderRadius: '20px',
    },
    userButtonPopoverFooter: {
      backgroundColor: 'transparent',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '10px 16px',
    },
  },
};
