import { useEffect, useState } from 'react';
import { EVENT_PRESET } from '../constants';
import type { PlayerRecord } from '../types';
import rkWordmark from '../assets/branding/roomingkos/rk-wordmark.png';
import rkPattern from '../assets/branding/roomingkos/rk-pattern-grey.png';
import rkBrandmark from '../assets/branding/roomingkos/rk-brandmark.png';

interface PodiumPopupProps {
  visible: boolean;
  onClose: () => void;
  firstPlace?: PlayerRecord;
  secondPlace?: PlayerRecord;
  thirdPlace?: PlayerRecord;
  onShareResult: () => void;
  shareStatus: string;
  isSharingResult: boolean;
}

export function PodiumPopup({
  visible,
  onClose,
  firstPlace,
  secondPlace,
  thirdPlace,
  onShareResult,
  shareStatus,
  isSharingResult,
}: PodiumPopupProps) {
  const [render, setRender] = useState(false);

  useEffect(() => {
    if (visible) {
      setRender(true);
    } else {
      const timer = setTimeout(() => setRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!render && !visible) return null;

  return (
    <>
      <style>{`
        .podium-overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #fbedf1; /* 옅은 핑크색 (Brand 톤 매칭) */
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }
        .podium-overlay.visible {
          opacity: 1;
          pointer-events: auto;
        }
        .podium-container {
          position: relative;
          width: 90%;
          max-width: 800px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 40px;
        }
        .podium-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 24px;
          transform: translateY(30px) scale(0.9);
          opacity: 0;
        }
        .podium-overlay.visible .podium-header {
          animation: podiumPopUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          animation-delay: 2.8s;
        }
        .podium-rk-logo {
          height: clamp(30px, 6vw, 42px);
          object-fit: contain;
          margin-bottom: 12px;
          filter: drop-shadow(4px 4px 0 var(--brand-alt));
        }
        .podium-title {
          font-size: clamp(2.5rem, 7vw, 4.5rem);
          font-weight: 900;
          color: var(--black);
          text-shadow: 4px 4px 0 var(--brand);
          letter-spacing: -0.03em;
          text-transform: uppercase;
          margin: 0;
          background: #fff;
          padding: 8px 32px;
          border: 4px solid var(--black);
          border-radius: 999px;
          box-shadow: 6px 6px 0 var(--black);
        }
        .podium-stage {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: clamp(8px, 2vw, 24px);
          width: 100%;
          height: 420px;
          padding: 0 16px;
        }
        .podium-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-top: 28px;
        }
        .podium-share {
          min-width: 220px;
          padding: 14px 24px;
          border-radius: 999px;
          border: 4px solid var(--black);
          background: #fff;
          color: var(--black);
          font-size: 1rem;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 4px 4px 0 var(--black);
          transition: transform 0.12s ease, box-shadow 0.12s ease, background-color 0.12s ease;
        }
        .podium-share:hover:not(:disabled) {
          background: #fff4c7;
        }
        .podium-share:active:not(:disabled) {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0 var(--black);
        }
        .podium-share:disabled {
          cursor: wait;
          opacity: 0.72;
        }
        .podium-share-status {
          min-height: 24px;
          margin: 0;
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--black);
          text-align: center;
        }
        .podium-pillar {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 30%;
          opacity: 0;
          transform: translateY(120px);
        }
        .podium-overlay.visible .podium-pillar {
          animation: podiumPopUp 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .podium-overlay.visible .podium-first {
          animation: podiumPopUp 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, floatCute 3s ease-in-out infinite alternate 3.1s;
        }
        .podium-overlay.visible .podium-second {
          animation: podiumPopUp 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, floatCute 3s ease-in-out infinite alternate 1.9s;
        }
        .podium-overlay.visible .podium-third {
          animation: podiumPopUp 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, floatCute 3s ease-in-out infinite alternate 1.1s;
        }
        @keyframes floatCute {
          0% { transform: translateY(0); }
          100% { transform: translateY(-12px); }
        }
        @keyframes podiumPopUp {
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .podium-avatar {
          font-size: clamp(2.5rem, 6vw, 4.5rem);
          margin-bottom: 12px;
          filter: drop-shadow(0 6px 0 rgba(0,0,0,0.15));
        }
        .podium-name {
          font-weight: 800;
          font-size: clamp(0.95rem, 2vw, 1.35rem);
          text-align: center;
          line-height: 1.1;
          color: var(--black);
          background: #fff;
          padding: 8px 20px;
          border: 4px solid var(--black);
          border-radius: 999px;
          margin-bottom: -16px;
          box-shadow: 4px 4px 0 var(--black);
          word-break: break-word;
          max-width: 110%;
          position: relative;
          z-index: 2;
        }
        .podium-meta {
          font-size: clamp(0.75rem, 1.5vw, 0.875rem);
          font-weight: 800;
          color: #fff;
          background: var(--brand);
          border: 3px solid var(--black);
          border-radius: 999px;
          padding: 4px 16px;
          margin-bottom: 24px;
          text-align: center;
          position: relative;
          z-index: 1;
          transform: translateY(12px);
          box-shadow: 3px 3px 0 var(--black);
        }
        .podium-block {
          width: 100%;
          border: 4px solid var(--black);
          border-bottom: none;
          border-radius: 24px 24px 0 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: clamp(3rem, 8vw, 5.5rem);
          font-weight: 900;
          color: var(--black);
          box-shadow: inset 0 12px 0 rgba(255,255,255,0.4);
          position: relative;
          overflow: hidden;
        }
        .podium-block::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url(${rkPattern});
          background-size: 60px;
          opacity: 0.15;
          pointer-events: none;
        }
        .podium-second .podium-block {
          height: 190px;
          background: #E2E8F0;
        }
        .podium-first .podium-block {
          height: 280px;
          background: #FFD700;
        }
        .podium-third .podium-block {
          height: 130px;
          background: #f4a261;
        }
        .podium-brand-badge {
          position: absolute;
          bottom: 24px;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #fff;
          border: 3px solid var(--black);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 4px 4px 0 var(--black);
          animation: spin 12s linear infinite;
        }
        .podium-brand-badge img {
          width: 32px;
          height: auto;
        }
        .podium-close {
          position: absolute;
          top: -12px;
          right: -12px;
          background: var(--brand);
          color: #fff;
          border: 4px solid var(--black);
          border-radius: 50%;
          width: 56px;
          height: 56px;
          font-size: 2rem;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 4px 4px 0 var(--black);
          transition: transform 0.1s, box-shadow 0.1s;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }
        .podium-close:active {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0 var(--black);
        }
        @media (max-width: 640px) {
          .podium-close {
             top: 0px;
             right: 16px;
          }
        }
      `}</style>
      <div className={`podium-overlay ${visible ? 'visible' : ''}`}>
        <div className="podium-container">
          <button type="button" className="podium-close" onClick={onClose} aria-label="Close podium">×</button>
          
          <div className="podium-header">
            <img src={rkWordmark} alt="RoomingKos" className="podium-rk-logo" />
            <h2 className="podium-title">{EVENT_PRESET.championHeading}</h2>
          </div>
          
          <div className="podium-stage">
            {/* 2nd Place */}
            <div className="podium-pillar podium-second" style={{ animationDelay: '1.2s' }}>
              <div className="podium-avatar">🥈</div>
              <div className="podium-name">{secondPlace && !secondPlace.empty ? secondPlace.name : 'TBD'}</div>
              <div className="podium-meta">
                {secondPlace && !secondPlace.empty ? secondPlace.nickname || secondPlace.teamTag || '-' : '-'}
              </div>
              <div className="podium-block">2</div>
            </div>
            
            {/* 1st Place */}
            <div className="podium-pillar podium-first" style={{ animationDelay: '2.4s' }}>
              <div className="podium-avatar">👑</div>
              <div className="podium-name">{firstPlace && !firstPlace.empty ? firstPlace.name : 'TBD'}</div>
              <div className="podium-meta">
                {firstPlace && !firstPlace.empty ? firstPlace.nickname || firstPlace.teamTag || '-' : '-'}
              </div>
              <div className="podium-block">
                1
                <div className="podium-brand-badge">
                  <img src={rkBrandmark} alt="*" />
                </div>
              </div>
            </div>
            
            {/* 3rd Place */}
            <div className="podium-pillar podium-third" style={{ animationDelay: '0.4s' }}>
              <div className="podium-avatar">🥉</div>
              <div className="podium-name">{thirdPlace && !thirdPlace.empty ? thirdPlace.name : 'TBD'}</div>
              <div className="podium-meta">
                {thirdPlace && !thirdPlace.empty ? thirdPlace.nickname || thirdPlace.teamTag || '-' : '-'}
              </div>
              <div className="podium-block">3</div>
            </div>
          </div>

          <div className="podium-actions">
            <button
              type="button"
              className="podium-share"
              onClick={onShareResult}
              disabled={isSharingResult}
            >
              {isSharingResult ? 'Preparing PNG...' : EVENT_PRESET.podiumShareButtonText}
            </button>
            <p className="podium-share-status" aria-live="polite">
              {shareStatus}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
