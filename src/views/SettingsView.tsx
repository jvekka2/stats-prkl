import { useRef, useState } from 'react';
import { exportJson, importJson } from '../lib/store';
import { setLang, useLang, useT } from '../lib/i18n';
import { downloadBlob } from '../lib/share';

export default function SettingsView() {
  const t = useT();
  const lang = useLang();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [msg, setMsg] = useState('');

  const doExport = () => {
    const d = new Date().toISOString().slice(0, 10);
    downloadBlob(new Blob([exportJson()], { type: 'application/json' }), `stats-prkl-${d}.json`);
  };

  const pick = (m: 'merge' | 'replace') => {
    if (m === 'replace' && !confirm(t.confirmReplace)) return;
    setMode(m);
    fileRef.current?.click();
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      importJson(await f.text(), mode);
      setMsg(t.importDone);
    } catch (e) {
      setMsg(t.importFailed + (e as Error).message);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <>
      <h1>{t.settings}</h1>
      <div className="card">
        <h2>{t.language}</h2>
        <div className="seg">
          <button className={lang === 'fi' ? 'on' : ''} onClick={() => setLang('fi')}>Suomi</button>
          <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>English</button>
        </div>
      </div>
      <div className="card">
        <h2>{t.backup}</h2>
        <p className="muted small">{t.storageNote}</p>
        <div className="row wrap">
          <button className="primary" onClick={doExport}>⬇ {t.exportData}</button>
          <button onClick={() => pick('merge')}>⬆ {t.importMerge}</button>
          <button className="danger" onClick={() => pick('replace')}>{t.importReplace}</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={e => onFile(e.target.files?.[0])} />
        {msg && <p>{msg}</p>}
      </div>
      <p className="muted small center">Stats PRKL v{__APP_VERSION__}</p>
    </>
  );
}
