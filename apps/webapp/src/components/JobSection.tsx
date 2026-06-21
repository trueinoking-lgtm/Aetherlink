'use client';

export default function JobSection({ 
  title, 
  children,
  dataSection
}: { 
  title: string, 
  children: React.ReactNode,
  dataSection?: string
}) {
  return (
    <div className="glass-card p-6" data-section={dataSection}>
      <h2 className="font-display text-xl font-bold text-[var(--text-primary)] mb-4">
        {title}
      </h2>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}