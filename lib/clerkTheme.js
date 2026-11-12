import { dark } from '@clerk/themes';

export const clerkLocalization = {
  signIn: {
    start: {
      title: "Welcome back",
      subtitle: "Sign in to pick up where you left off.",
      actionText: "New here?",
      actionLink: "Create an account",
    },
    password: {
      title: "Welcome back",
      subtitle: "Enter your password to continue.",
    },
    emailCode: {
      title: "Check your email",
      subtitle: "Enter the code sent to your email to continue.",
    },
  },
  signUp: {
    start: {
      title: "Create an account",
      subtitle: "Sign up to pick up where you left off.",
      actionText: "Already have an account?",
      actionLink: "Sign in",
    },
  },
  dividerText: "OR",
  formFieldLabel__emailAddress_username: "Email or username",
  formFieldLabel__emailAddress: "Email address",
  formFieldLabel__username: "Username",
  formFieldInputPlaceholder__emailAddress_username: "name@example.com",
  formFieldInputPlaceholder__emailAddress: "name@example.com",
  formFieldInputPlaceholder__username: "username",
  formButtonPrimary__continue: "Continue →",
  socialButtonsBlockButton: "Continue with {{provider|titleize}}",
};

export const clerkAppearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: '#FFFFFF',
    colorBackground: '#0d0d0f',
    colorInputBackground: '#111113',
    colorInputText: '#FFFFFF',
    colorText: '#FFFFFF',
    colorTextSecondary: 'rgba(255, 255, 255, 0.55)',
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
      maxWidth: '380px',
      margin: '0 auto',
    },
    cardBox: {
      width: '100%',
      boxShadow: 'none',
      border: 'none',
      backgroundColor: 'transparent',
    },
    card: {
      backgroundColor: '#0d0d0f',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '28px',
      padding: '32px 28px',
      boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.85)',
      width: '100%',
      maxWidth: '380px',
      overflow: 'hidden',
      position: 'relative',
    },

    // Header Typography (Strictly matches "Welcome back")
    header: {
      marginBottom: '24px',
      textAlign: 'left',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
    headerTitle: {
      color: '#FFFFFF',
      fontWeight: '800',
      letterSpacing: '-0.025em',
      fontSize: '26px',
      lineHeight: '1.2',
      textAlign: 'left',
      fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif',
    },
    headerSubtitle: {
      color: 'rgba(255, 255, 255, 0.55)',
      fontSize: '14px',
      fontWeight: '400',
      marginTop: '6px',
      textAlign: 'left',
      lineHeight: '1.4',
    },

    // 1. Social Buttons (Continue with Google)
    socialButtonsBlockButton: {
      borderRadius: '16px',
      height: '50px',
      backgroundColor: '#141416',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      color: '#FFFFFF',
      boxShadow: 'none',
      boxSizing: 'border-box',
      padding: '0 16px',
      transition: 'all 0.15s ease',
      justifyContent: 'center',
      gap: '10px',
      '&:hover': {
        backgroundColor: '#1c1c1f',
        borderColor: 'rgba(255, 255, 255, 0.2)',
      },
    },
    socialButtonsBlockButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: '14px',
    },
    socialButtonsBlockButtonLogo: {
      marginRight: '6px',
    },
    socialButtons: {
      display: 'flex',
      gap: '10px',
      width: '100%',
    },

    // Divider (Horizontal Line with "OR")
    dividerRow: {
      margin: '22px 0',
    },
    dividerLine: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      height: '1px',
    },
    dividerText: {
      color: 'rgba(255, 255, 255, 0.35)',
      fontSize: '11px',
      textTransform: 'uppercase',
      letterSpacing: '2px',
      fontWeight: '700',
      fontFamily: 'var(--font-space-grotesk), sans-serif',
    },

    // Inputs & Primary Button
    form: {
      gap: '18px',
    },
    formFieldLabel: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: '13px',
      fontWeight: '500',
      marginBottom: '8px',
      textAlign: 'left',
    },
    formFieldInput: {
      borderRadius: '14px',
      height: '50px',
      backgroundColor: '#111113',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      color: '#FFFFFF',
      fontSize: '14px',
      fontFamily: 'var(--font-jetbrains-mono), monospace',
      boxSizing: 'border-box',
      padding: '0 16px',
      transition: 'border-color 0.15s ease',
      '&:focus': {
        borderColor: 'rgba(255, 255, 255, 0.4)',
      },
      '&::placeholder': {
        color: 'rgba(255, 255, 255, 0.25)',
        fontFamily: 'var(--font-jetbrains-mono), monospace',
      },
    },
    formButtonPrimary: {
      borderRadius: '16px',
      height: '50px',
      backgroundColor: '#FFFFFF',
      color: '#000000',
      fontWeight: '700',
      fontSize: '15px',
      boxShadow: 'none',
      boxSizing: 'border-box',
      transition: 'all 0.15s ease',
      marginTop: '8px',
      '&:hover': {
        backgroundColor: '#f2f2f2',
      },
      '&:active': {
        transform: 'scale(0.98)',
      },
    },

    // Footer spacing & clean typography
    footer: {
      marginTop: '22px',
      textAlign: 'center',
    },
    footerAction: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
    },
    footerActionText: {
      color: 'rgba(255, 255, 255, 0.5)',
      fontSize: '13px',
    },
    footerActionLink: {
      color: '#FFFFFF',
      fontWeight: '500',
      fontSize: '13px',
      textDecoration: 'underline',
      textUnderlineOffset: '4px',
      '&:hover': {
        color: 'rgba(255, 255, 255, 0.85)',
      },
    },

    // Modal Specific Overrides (when rendered as modal)
    modalBackdrop: {
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
    },
    modalContent: {
      backgroundColor: 'transparent',
      boxShadow: 'none',
      border: 'none',
      padding: '0px',
      maxWidth: '380px',
      width: '100%',
    },
    modalCloseButton: {
      color: 'rgba(255, 255, 255, 0.55)',
      top: '22px',
      right: '22px',
      transition: 'color 0.15s ease',
      '&:hover': {
        color: '#FFFFFF',
      },
    },

    // Identity preview & OTP inputs
    identityPreview: {
      backgroundColor: '#141416',
      border: '1px solid rgba(255, 255, 255, 0.1)',
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
      backgroundColor: '#141416',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      color: '#FFFFFF',
      borderRadius: '14px',
      height: '52px',
      fontFamily: 'var(--font-jetbrains-mono), monospace',
    },

    // UserButton Popover & Clean Brand
    userButtonPopoverCard: {
      backgroundColor: '#111114',
      border: '1px solid rgba(255, 255, 255, 0.12)',
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
