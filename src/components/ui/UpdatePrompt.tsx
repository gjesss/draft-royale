import { useRegisterSW } from 'virtual:pwa-register/react'
import Icon from './Icon'

/** Floating "new version available" banner. With registerType:'prompt', a newly
 *  deployed build waits until the user taps Update — no more stale open tabs. */
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="fixed left-0 right-0 z-50 flex justify-center px-4"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 76px)' }}>
      <div className="card flex items-center gap-3 shadow-neon border-cyan-500/50 max-w-sm w-full animate-slide-up">
        <Icon name="sparkle" size={18} className="text-cyan-400 shrink-0" />
        <p className="text-sm text-white flex-1">A new version is ready.</p>
        <button className="text-xs text-gray-400 px-2" onClick={() => setNeedRefresh(false)}>Later</button>
        <button className="btn-primary text-xs py-2 px-3" onClick={() => updateServiceWorker(true)}>Update</button>
      </div>
    </div>
  )
}
