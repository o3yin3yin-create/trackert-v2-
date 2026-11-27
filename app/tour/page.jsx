"use client";

import React from 'react';
import { NotificationGateModal, PreLoginWelcomeTourModal } from '@/components/OnboardingFlowModals';

export default function TourPage() {
  return (
    <>
      <NotificationGateModal isSignedIn={false} />
      <PreLoginWelcomeTourModal />
    </>
  );
}
