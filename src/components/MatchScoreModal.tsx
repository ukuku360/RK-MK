import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import type { MatchScore } from '../types';

interface MatchScoreModalProps {
  visible: boolean;
  title: string;
  leftPlayerName: string;
  rightPlayerName: string;
  initialScore?: MatchScore;
  onClose: () => void;
  onSubmit: (leftScore: number, rightScore: number) => void;
}

export function MatchScoreModal({
  visible,
  title,
  leftPlayerName,
  rightPlayerName,
  initialScore,
  onClose,
  onSubmit,
}: MatchScoreModalProps) {
  const [leftScore, setLeftScore] = useState('');
  const [rightScore, setRightScore] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!visible) {
      return;
    }

    setLeftScore(initialScore ? String(initialScore.left) : '');
    setRightScore(initialScore ? String(initialScore.right) : '');
    setErrorMessage('');
  }, [initialScore, visible]);

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

  if (!visible) {
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextLeftScore = Number(leftScore);
    const nextRightScore = Number(rightScore);

    if (
      !Number.isInteger(nextLeftScore) ||
      !Number.isInteger(nextRightScore) ||
      nextLeftScore < 0 ||
      nextRightScore < 0
    ) {
      setErrorMessage('Enter whole-number scores of 0 or higher.');
      return;
    }

    if (nextLeftScore === nextRightScore) {
      setErrorMessage('Scores cannot be tied.');
      return;
    }

    onSubmit(nextLeftScore, nextRightScore);
  }

  return (
    <div className="match-score-modal-backdrop" onClick={onClose} role="presentation">
      <section
        className="match-score-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-score-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="match-score-modal-header">
          <p className="match-score-modal-kicker">Match Result</p>
          <h3 id="match-score-modal-title">{title}</h3>
          <button type="button" className="match-score-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="match-score-form" onSubmit={handleSubmit}>
          <label className="match-score-field">
            <span className="match-score-player">{leftPlayerName}</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              autoFocus
              value={leftScore}
              onChange={(event) => setLeftScore(event.target.value)}
            />
          </label>

          <div className="match-score-divider">:</div>

          <label className="match-score-field">
            <span className="match-score-player">{rightPlayerName}</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={rightScore}
              onChange={(event) => setRightScore(event.target.value)}
            />
          </label>

          {errorMessage ? <p className="match-score-error">{errorMessage}</p> : null}

          <div className="match-score-actions">
            <button type="button" className="match-score-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="match-score-primary">
              Save Score
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
