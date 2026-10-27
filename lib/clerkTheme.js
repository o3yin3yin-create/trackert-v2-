import { dark } from '@clerk/themes';

export const clerkAppearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: '#FFFFFF',
    colorBackground: '#111114',
    colorInputBackground: '#18181B',
    colorInputText: '#FFFFFF',
    colorText: '#FFFFFF',
    colorTextSecondary: 'rgba(255, 255, 255, 0.65)',
    borderRadius: '16px',
    fontFamily: 'var(--font-space-grotesk), "Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  layout: {
    socialButtonsPlacement: 'top',
    socialButtonsVariant: 'blockButton',
    showOptionalFields: false,
  },
  elements: {
    // 0. Card & Layout Containers
    rootBox: {
      width: '100%',
      maxWidth: '420px',
      margin: '0 auto',
    },
    cardBox: {
      width: '100%',
      boxShadow: 'none',
      border: 'none',
    },
    card: {
      backgroundColor: '#111114',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '26px',
      padding: '36px 32px',
      boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.05)',
      width: '100%',
      overflow: 'hidden',
    },

    // Modal Specific Overrides (when rendered as modal)
    modalBackdrop: {
      backgroundColor: 'rgba(0, 0, 0, 0.82)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
    },
    modalContent: {
      backgroundColor: '#111114',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '28px',
      boxShadow: '0 30px 80px rgba(0, 0, 0, 0.95)',
      padding: '8px',
      maxWidth: '440px',
      width: '100%',
      overflow: 'visible',
    },
    modalCloseButton: {
      color: 'rgba(255, 255, 255, 0.6)',
      top: '18px',
      right: '18px',
      padding: '6px',
      borderRadius: '9999px',
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      transition: 'all 0.15s ease',
      '&:hover': {
        color: '#FFFFFF',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
      },
    },

    // Header Typography
    header: {
      marginBottom: '22px',
      textAlign: 'center',
    },
    headerTitle: {
      color: '#FFFFFF',
      fontWeight: '800',
      letterSpacing: '-0.025em',
      fontSize: '22px',
      fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif',
    },
    headerSubtitle: {
      color: 'rgba(255, 255, 255, 0.55)',
      fontSize: '13px',
      marginTop: '4px',
    },

    // 1. Social Buttons (Apple & Google)
    socialButtonsBlockButton: {
      borderRadius: '16px',
      height: '48px',
      backgroundColor: '#18181B',
      border: '1px solid rgba(255, 255, 255, 0.14)',
      color: '#FFFFFF',
      boxShadow: 'none',
      boxSizing: 'border-box',
      padding: '0 16px',
      transition: 'all 0.15s ease',
      '&:hover': {
        backgroundColor: '#222226',
        borderColor: 'rgba(255, 255, 255, 0.25)',
      },
    },
    socialButtonsIconButton: {
      borderRadius: '16px',
      height: '48px',
      backgroundColor: '#18181B',
      border: '1px solid rgba(255, 255, 255, 0.14)',
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
    dividerRow: {
      margin: '20px 0',
    },
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
    form: {
      gap: '16px',
    },
    formFieldLabel: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: '12px',
      fontWeight: '600',
      marginBottom: '6px',
    },
    formFieldInput: {
      borderRadius: '16px',
      height: '48px',
      backgroundColor: '#18181B',
      border: '1px solid rgba(255, 255, 255, 0.14)',
      color: '#FFFFFF',
      fontSize: '15px',
      boxSizing: 'border-box',
      padding: '0 16px',
      transition: 'border-color 0.15s ease',
      '&:focus': {
        borderColor: '#FFFFFF',
      },
    },
    formButtonPrimary: {
      borderRadius: '16px',
      height: '48px',
      backgroundColor: '#FFFFFF',
      color: '#000000',
      fontWeight: '700',
      fontSize: '14px',
      boxShadow: '0 4px 14px rgba(255, 255, 255, 0.15)',
      boxSizing: 'border-box',
      transition: 'opacity 0.15s ease, transform 0.1s ease',
      marginTop: '4px',
      '&:hover': {
        opacity: 0.92,
      },
      '&:active': {
        transform: 'scale(0.98)',
      },
    },

    // Footer spacing & clean typography
    footer: {
      marginTop: '20px',
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
      borderRadius: '16px',
      padding: '12px 16px',
    },
    identityPreviewText: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
    identityPreviewEditButton: {
      color: 'rgba(255, 255, 255, 0.6)',
      '&:hover': { color: '#FFFFFF' },
    },
    otpCodeFieldInput: {
      backgroundColor: '#18181B',
      border: '1px solid rgba(255, 255, 255, 0.18)',
      color: '#FFFFFF',
      borderRadius: '14px',
      height: '52px',
    },

    // UserButton Popover & Clean Brand
    userButtonPopoverCard: {
      backgroundColor: '#141416',
      border: '1px solid rgba(255, 255, 255, 0.14)',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.85)',
      borderRadius: '22px',
    },
    userButtonPopoverFooter: {
      backgroundColor: 'transparent',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '10px 16px',
    },
  },
};
