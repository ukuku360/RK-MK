import type { FormEvent } from 'react';
import { useState } from 'react';

interface RegistrationPanelProps {
  buttonText: string;
  disabled: boolean;
  onSubmit: (input: { name: string; aura: string; unitNumber: string }) => Promise<boolean>;
}

export function RegistrationPanel({
  buttonText,
  disabled,
  onSubmit,
}: RegistrationPanelProps) {
  const [name, setName] = useState('');
  const [aura, setAura] = useState('');
  const [unitNumber, setUnitNumber] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await onSubmit({ name, aura, unitNumber });

    if (!saved) {
      return;
    }

    setName('');
    setAura('');
    setUnitNumber('');
  }

  return (
    <section className="panel user-card registration-panel">
      <h2>Player Registration</h2>
      <form onSubmit={handleSubmit}>
        <label>
          <span>Name</span>
          <input
            name="name"
            type="text"
            placeholder="e.g. Minji"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          <span>Aura Skill</span>
          <input
            name="aura"
            type="text"
            placeholder="e.g. Quick reflex"
            required
            value={aura}
            onChange={(event) => setAura(event.target.value)}
          />
        </label>
        <label>
          <span>Unit Number</span>
          <input
            name="unitNumber"
            type="text"
            placeholder="e.g. 1207"
            required
            value={unitNumber}
            onChange={(event) => setUnitNumber(event.target.value)}
          />
        </label>
        <button id="addButton" type="submit" disabled={disabled}>
          {buttonText}
        </button>
      </form>
    </section>
  );
}
