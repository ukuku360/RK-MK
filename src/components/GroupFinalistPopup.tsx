import { useEffect, useState } from 'react';
import type { PlayerRecord } from '../types';

interface GroupFinalistPopupProps {
  visible: boolean;
  stageTitle: string;
  finalistName: string;
  finalist?: PlayerRecord;
  onClose: () => void;
}

function getFinalistMeta(finalist?: PlayerRecord) {
  if (!finalist || finalist.empty) {
    return '';
  }

  return finalist.nickname || finalist.teamTag || '';
}

export function GroupFinalistPopup({
  visible,
  stageTitle,
  finalistName,
  finalist,
  onClose,
}: GroupFinalistPopupProps) {
  const [render, setRender] = useState(false);
  const [display, setDisplay] = useState({
    stageTitle,
    finalistName,
    finalist,
  });
  const finalistMeta = getFinalistMeta(display.finalist);

  useEffect(() => {
    if (visible) {
      setDisplay({
        stageTitle,
        finalistName,
        finalist,
      });
    }
  }, [finalist, finalistName, stageTitle, visible]);

  useEffect(() => {
    if (visible) {
      setRender(true);
      return;
    }

    const timer = window.setTimeout(() => setRender(false), 240);
    return () => window.clearTimeout(timer);
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, visible]);

  if (!render && !visible) {
    return null;
  }

  return (
    <div
      className={`group-finalist-popup-backdrop${visible ? ' visible' : ''}`}
      onClick={onClose}
      role="presentation"
    >
      <section
        className="group-finalist-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-finalist-popup-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="group-finalist-popup-close"
          onClick={onClose}
          aria-label="Close group finalist announcement"
        >
          x
        </button>

        <div className="group-finalist-popup-badge" aria-hidden="true">
          Final
        </div>
        <p className="group-finalist-popup-kicker">{display.stageTitle} winner</p>
        <h2 id="group-finalist-popup-title">{display.finalistName}</h2>
        {finalistMeta ? <p className="group-finalist-popup-meta">{finalistMeta}</p> : null}
        <p className="group-finalist-popup-message">
          {display.finalistName} is going to the Final.
        </p>

        <button type="button" className="group-finalist-popup-action" onClick={onClose}>
          Keep racing
        </button>
      </section>
    </div>
  );
}
