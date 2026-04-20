import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { EVENT_PRESET } from '../constants';
import type { EventPreset } from '../types';

interface RankingParticipant {
  entrantIndex: number;
  name: string;
}

interface MatchScoreModalProps {
  visible: boolean;
  title: string;
  participants: RankingParticipant[];
  initialOrder?: number[];
  preset?: EventPreset;
  onClose: () => void;
  onSubmit: (finishingOrder: number[]) => void;
}

function getRankLabel(rank: number) {
  if (rank === 1) {
    return '1st';
  }

  if (rank === 2) {
    return '2nd';
  }

  if (rank === 3) {
    return '3rd';
  }

  return `${rank}th`;
}

export function MatchScoreModal({
  visible,
  title,
  participants,
  initialOrder,
  preset = EVENT_PRESET,
  onClose,
  onSubmit,
}: MatchScoreModalProps) {
  const [selectedOrder, setSelectedOrder] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!visible) {
      return;
    }

    const fallbackOrder = participants.map((participant) => String(participant.entrantIndex));
    const nextOrder =
      initialOrder && initialOrder.length === participants.length
        ? initialOrder.map((entrantIndex) => String(entrantIndex))
        : fallbackOrder;

    setSelectedOrder(nextOrder);
    setErrorMessage('');
  }, [initialOrder, participants, visible]);

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

  if (!visible || participants.length < 2) {
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      selectedOrder.length !== participants.length ||
      selectedOrder.some((value) => !value)
    ) {
      setErrorMessage('Assign every finishing position before saving.');
      return;
    }

    const nextFinishingOrder = selectedOrder.map((value) => Number(value));

    if (
      nextFinishingOrder.some((entrantIndex) => !Number.isInteger(entrantIndex)) ||
      new Set(nextFinishingOrder).size !== nextFinishingOrder.length
    ) {
      setErrorMessage('Each driver can only appear once in the final ranking.');
      return;
    }

    onSubmit(nextFinishingOrder);
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
          <p className="match-score-modal-kicker">{preset.matchModalKicker}</p>
          <h3 id="match-score-modal-title">{title}</h3>
          <button type="button" className="match-score-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="match-score-form match-score-form-ranking" onSubmit={handleSubmit}>
          {selectedOrder.map((selectedEntrantIndex, index) => (
            <label key={`rank-${index + 1}`} className="match-score-field match-score-ranking-field">
              <span className="match-score-player">{getRankLabel(index + 1)}</span>
              <select
                autoFocus={index === 0}
                value={selectedEntrantIndex}
                onChange={(event) =>
                  setSelectedOrder((current) =>
                    current.map((value, currentIndex) =>
                      currentIndex === index ? event.target.value : value,
                    ),
                  )
                }
              >
                {participants.map((participant) => (
                  <option key={participant.entrantIndex} value={participant.entrantIndex}>
                    {participant.name}
                  </option>
                ))}
              </select>
            </label>
          ))}

          {errorMessage ? <p className="match-score-error">{errorMessage}</p> : null}

          <div className="match-score-actions">
            <button type="button" className="match-score-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="match-score-primary">
              Save Ranking
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
