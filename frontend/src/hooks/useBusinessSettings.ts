'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface PublicBusinessSettings {
  businessName: string;
  businessAddress: string | null;
  businessPhone: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  aboutStory: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  mapEmbedUrl: string | null;
  businessHours: string | null;
  // Consumer protection
  selfCancelCutoffHr: number;
  allowSelfCancel: boolean;
  cancellationPolicyText: string | null;
  refundPolicyText: string | null;
}

// Uses the PUBLIC endpoint, works for unauthed visitors.
// The axios instance only adds Authorization when a token exists in localStorage,
// so unauthed visitors send no auth header — server treats it as public.
export function useBusinessSettings() {
  return useQuery<PublicBusinessSettings>({
    queryKey: ['public-settings'],
    queryFn: async () => (await api.get('/business-settings/public')).data,
    staleTime: 5 * 60_000,
    retry: false,
  });
}
