import { AetherProviders } from '@/components/AetherProviders';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <AetherProviders>{children}</AetherProviders>;
}
