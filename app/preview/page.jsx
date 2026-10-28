"use client";
import React from 'react';
import { AppContent, GlobalErrorBoundary } from '../page';

export default function PreviewPage() {
  return (
    <GlobalErrorBoundary>
      <AppContent isPreview={true} />
    </GlobalErrorBoundary>
  );
}
