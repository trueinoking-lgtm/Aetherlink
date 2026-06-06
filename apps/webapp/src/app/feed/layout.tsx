import { AetherProviders } from '@/components/AetherProviders';

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return <AetherProviders>{children}</AetherProviders>;
}
