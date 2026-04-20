import type { FormEvent } from 'react';
import { useState } from 'react';
import { EVENT_PRESET } from '../constants';
import type { EventPreset } from '../types';

interface RegistrationPanelProps {
  buttonText: string;
  disabled: boolean;
  statusMessage?: string;
  preset?: EventPreset;
  onSubmit: (input: { name: string; nickname: string; teamTag: string }) => Promise<boolean>;
}

export function RegistrationPanel({
  buttonText,
  disabled,
  statusMessage = '',
  preset = EVENT_PRESET,
  onSubmit,
}: RegistrationPanelProps) {
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [teamTag, setTeamTag] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await onSubmit({ name, nickname, teamTag });

    if (!saved) {
      return;
    }

    setName('');
    setNickname('');
    setTeamTag('');
  }

  return (
    <section className="panel user-card registration-panel">
      <h2>{preset.registrationTitle}</h2>
      <form onSubmit={handleSubmit}>
        <label>
          <span>{preset.registrationFields.nameLabel}</span>
          <input
            name="name"
            type="text"
            placeholder={preset.registrationFields.namePlaceholder}
            required
            disabled={disabled}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          <span>{preset.registrationFields.nicknameLabel}</span>
          <input
            name="nickname"
            type="text"
            placeholder={preset.registrationFields.nicknamePlaceholder}
            disabled={disabled}
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
          />
        </label>
        <label>
          <span>{preset.registrationFields.teamTagLabel}</span>
          <input
            name="teamTag"
            type="text"
            placeholder={preset.registrationFields.teamTagPlaceholder}
            disabled={disabled}
            value={teamTag}
            onChange={(event) => setTeamTag(event.target.value)}
          />
        </label>
        <button id="addButton" type="submit" disabled={disabled}>
          {buttonText}
        </button>
        {statusMessage ? <p className="registration-status-note">{statusMessage}</p> : null}
      </form>
    </section>
  );
}
