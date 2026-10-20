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
      borderRadius: '14px !important',
      height: '44px !important',
      backgroundColor: '#1C1C1E !important',
      border: '1px solid rgba(255, 255, 255, 0.1) !important',
      color: '#FFFFFF !important',
      boxShadow: 'none !important',
      overflow: 'hidden !important',
    },
    socialButtonsIconButton: {
      borderRadius: '14px !important',
      height: '44px !important',
      backgroundColor: '#1C1C1E !important',
      border: '1px solid rgba(255, 255, 255, 0.1) !important',
      color: '#FFFFFF !important',
      boxShadow: 'none !important',
      overflow: 'hidden !important',
    },
    socialButtonsBlockButton__apple: {
      borderRadius: '14px !important',
    },
    socialButtonsBlockButton__google: {
      borderRadius: '14px !important',
    },
    socialButtonsIconButton__apple: {
      borderRadius: '14px !important',
    },
    socialButtonsIconButton__google: {
      borderRadius: '14px !important',
    },
    socialButtonsBlockButtonText: {
      color: '#FFFFFF !important',
      fontWeight: '600 !important',
      fontSize: '13px !important',
    },
    socialButtonsIconButtonText: {
      color: '#FFFFFF !important',
      fontWeight: '600 !important',
      fontSize: '13px !important',
    },
    socialButtons: {
      display: 'flex !important',
      gap: '10px !important',
      width: '100% !important',
    },
    socialButtonsRoot: {
      width: '100% !important',
    },

    // Inputs & Primary Button
    formFieldInput: {
      borderRadius: '14px !important',
      height: '44px !important',
      backgroundColor: '#1C1C1E !important',
      border: '1px solid rgba(255, 255, 255, 0.1) !important',
      color: '#FFFFFF !important',
      fontSize: '14px !important',
    },
    formButtonPrimary: {
      borderRadius: '14px !important',
      height: '44px !important',
      backgroundColor: '#FFFFFF !important',
      color: '#000000 !important',
      fontWeight: '600 !important',
      fontSize: '14px !important',
      boxShadow: 'none !important',
    },

    // Footer spacing & clean typography
    footerAction: {
      display: 'flex !important',
      alignItems: 'center !important',
      justifyContent: 'center !important',
      gap: '6px !important',
    },
    footerActionText: {
      color: 'rgba(255, 255, 255, 0.5) !important',
      fontSize: '12px !important',
      marginRight: '4px !important',
    },
    footerActionLink: {
      color: '#FFFFFF !important',
      fontWeight: '600 !important',
      fontSize: '12px !important',
    },

    // Identity preview & OTP inputs
    identityPreview: {
      backgroundColor: '#1C1C1E !important',
      border: '1px solid rgba(255, 255, 255, 0.1) !important',
      borderRadius: '14px !important',
    },
    otpCodeFieldInput: {
      backgroundColor: '#1C1C1E !important',
      border: '1px solid rgba(255, 255, 255, 0.15) !important',
      color: '#FFFFFF !important',
      borderRadius: '12px !important',
    },
  },
};
