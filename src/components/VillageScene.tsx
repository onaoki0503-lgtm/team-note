import { community } from '../lib/community';
interface VillageSceneProps { type?: 'courtyard' | 'commons'; isPaused?: boolean; isInteractionPaused?: boolean; onTogglePause?: () => void; showPauseButton?: boolean; }
export function VillageScene({ type = 'courtyard', isPaused = false, isInteractionPaused = false }: VillageSceneProps) {
  return <div className={`village-scene-bg ${isPaused || isInteractionPaused ? 'animation-paused' : ''}`} aria-hidden="true"><img src={community.scenes[type]} alt="" className="village-scene-photo" /><div className="scene-whitewash" /><div className="scene-liquid scene-liquid-one" /><div className="scene-liquid scene-liquid-two" /></div>;
}
