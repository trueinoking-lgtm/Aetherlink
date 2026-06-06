import { AetherProviders } from '@/components/AetherProviders';

export default function JobLayout({ children }: { children: React.ReactNode }) {
  return <AetherProviders>{children}</AetherProviders>;
}
