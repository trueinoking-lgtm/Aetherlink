import { AetherProviders } from '@/components/AetherProviders';

export default function TrackerLayout({ children }: { children: React.ReactNode }) {
  return <AetherProviders>{children}</AetherProviders>;
}
