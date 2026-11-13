import React, { useState } from 'react'
import { useStore } from '../state/store.jsx'
import { SEED, DEMO_ZOOM_URL } from '../data/seed.js'
import { Avatar, Btn, Modal } from '../components/ui.jsx'

// Join → the recording consent dialog → the team's real Zoom room in a new tab. There is no mock call.
export default function JoinFlow() {
  const { state, dispatch } = useStore()
  const j = state.join
  if (!j) return null
  const series = SEED.series.find((s) => s.id === j.sid)
  return <ConsentDialog series={series} dispatch={dispatch} />
}

// Shown every time Join is pressed, before the call opens.
function ConsentDialog({ series, dispatch }) {
  const [agreed, setAgreed] = useState(true)
  const close = () => dispatch({ type: 'JOIN_CLOSE' })
  return (
    <Modal onClose={close}>
      <div className="p-5" role="dialog" aria-labelledby="join-consent-title">
        <div className="flex items-center gap-3">
          <Avatar id="ansel" size="md" />
          <div>
            <div id="join-consent-title" className="text-sm font-semibold">Ansel will join this meeting</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{series.title}</div>
          </div>
        </div>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
          <li>Ansel Notetaker joins as a visible participant.</li>
          <li>The meeting is recorded and transcribed.</li>
          <li>Notes, action items and the next Heads-Up are shared only with attendees and people given access.</li>
        </ul>
        <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 p-3 text-sm dark:border-slate-700">
          <input type="checkbox" className="mt-0.5" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>I understand and consent to Ansel recording and transcribing this meeting.</span>
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <Btn variant="secondary" onClick={close}>Leave</Btn>
          <Btn variant="primary" disabled={!agreed} onClick={() => {
            // Open the team's real Zoom room in a new tab, log the join and close the dialog.
            window.open(DEMO_ZOOM_URL, '_blank', 'noopener')
            dispatch({ type: 'JOIN_CONFIRM', keptOut: false })
          }}>Join with Ansel</Btn>
        </div>
      </div>
    </Modal>
  )
}
