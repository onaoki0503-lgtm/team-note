import { Suspense, useLayoutEffect, useState, type ReactNode } from 'react';
export function ScreenSkeleton({ variant = 'list', label = '画面を読み込み中' }: { variant?: 'home' | 'list' | 'document'; label?: string }) {
  return <div className={`screen-skeleton skeleton-${variant}`} role="status" aria-label={label} data-testid="screen-skeleton">
    <span className="sr-only">{label}</span>
    <div className="skeleton-top" aria-hidden="true"><span className="skeleton-block skeleton-title" /><span className="skeleton-block skeleton-small" /></div>
    {variant === 'home' ? <div className="skeleton-home" aria-hidden="true"><div className="skeleton-block skeleton-bubble" /><div className="skeleton-block skeleton-bubble" /><div className="skeleton-block skeleton-input" /></div> : <div className="skeleton-stack" aria-hidden="true"><div className="skeleton-block skeleton-input" />{[0, 1, 2].map(index => <div className="skeleton-card glass-surface" key={index}><span className="skeleton-block skeleton-line" /><span className="skeleton-block skeleton-line" /><span className="skeleton-block skeleton-line short" /></div>)}</div>}
  </div>;
}
// Prepare the next screen across two paints. No arbitrary loading timer or fake progress.
function ScreenPaint({ children, variant, screenKey }: { children: ReactNode; variant: 'home' | 'list' | 'document'; screenKey: string }) {
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const preparing = readyKey !== screenKey;
  useLayoutEffect(() => { let second = 0; const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => setReadyKey(screenKey)); }); return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); }; }, [screenKey]);
  return <div className="screen-frame" aria-busy={preparing}>
    {preparing && <div className="screen-preparation"><ScreenSkeleton variant={variant} /></div>}
    <div className={preparing ? 'screen-body is-preparing' : 'screen-body screen-enter'} aria-hidden={preparing || undefined} inert={preparing}>{children}</div>
  </div>;
}
export function ScreenLoadingBoundary({ children, screenKey, loading, variant }: { children: ReactNode; screenKey: string; loading: boolean; variant: 'home' | 'list' | 'document' }) {
  if (loading) return <ScreenSkeleton variant={variant} />;
  return <ScreenPaint screenKey={screenKey} variant={variant}><Suspense fallback={<ScreenSkeleton variant={variant} />}>{children}</Suspense></ScreenPaint>;
}
