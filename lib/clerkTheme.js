import { dark } from '@clerk/themes';

export const clerkAppearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: '#FFFFFF',
    colorBackground: '#121214',
    colorInputBackground: '#1C1C1E',
    colorInputText: '#FFFFFF',
    colorText: '#FFFFFF',
    colorTextSecondary: 'rgba(255, 255, 255, 0.65)',
    borderRadius: '14px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
  },
  layout: {
    socialButtonsPlacement: 'top',
    socialButtonsVariant: 'blockButton',
    showOptionalFields: false,
    logoImageUrl: '/logo-transparent.png',
  },
  elements: {
    // Social Buttons - strictly 14px squircle Apple curves
    socialButtonsBlockButton: {
      borderRadius: '14px',
      height: '44px',
      backgroundColor: '#1C1C1E',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      color: '#FFFFFF',
      boxShadow: 'none',
      overflow: 'hidden',
    },
    socialButtonsIconButton: {
      borderRadius: '14px',
      height: '44px',
      backgroundColor: '#1C1C1E',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      color: '#FFFFFF',
      boxShadow: 'none',
      overflow: 'hidden',
    },
    socialButtonsBlockButton__apple: {
      borderRadius: '14px',
    },
    socialButtonsBlockButton__google: {
      borderRadius: '14px',
    },
    socialButtonsIconButton__apple: {
      borderRadius: '14px',
    },
    socialButtonsIconButton__google: {
      borderRadius: '14px',
    },
    socialButtonsBlockButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: '13px',
    },
    socialButtonsIconButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: '13px',
    },
    socialButtons: {
      display: 'flex',
      gap: '10px',
      width: '100%',
    },
    socialButtonsRoot: {
      width: '100%',
    },

    // Inputs & Primary Button
    formFieldInput: {
      borderRadius: '14px',
      height: '44px',
      backgroundColor: '#1C1C1E',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      color: '#FFFFFF',
      fontSize: '14px',
    },
    formButtonPrimary: {
      borderRadius: '14px',
      height: '44px',
      backgroundColor: '#FFFFFF',
      color: '#000000',
      fontWeight: '600',
      fontSize: '14px',
      boxShadow: 'none',
    },

    // Footer spacing & clean typography
    footerAction: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
    },
    footerActionText: {
      color: 'rgba(255, 255, 255, 0.5)',
      fontSize: '12px',
      marginRight: '4px',
    },
    footerActionLink: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: '12px',
    },

    // Identity preview & OTP inputs
    identityPreview: {
      backgroundColor: '#1C1C1E',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '14px',
    },
    otpCodeFieldInput: {
      backgroundColor: '#1C1C1E',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      color: '#FFFFFF',
      borderRadius: '12px',
    },
  },
};
