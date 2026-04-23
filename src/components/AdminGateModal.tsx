import { useEffect, useRef, useState } from 'react';

interface AdminGateModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmitPin: (pin: string) => Promise<void>;
}

export function AdminGateModal({ visible, onClose, onSubmitPin }: AdminGateModalProps) {
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible) {
      setPassword('');
      setErrorMessage('');
      setIsSubmitting(false);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="panel"
        style={{
          width: '100%',
          maxWidth: '400px',
          margin: '16px',
          boxShadow: '12px 12px 0 rgba(85, 97, 115, 0.4)',
        }}
      >
        <h2 style={{ fontSize: '26px' }}>Race Control Access</h2>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setIsSubmitting(true);
            setErrorMessage('');

            try {
              await onSubmitPin(password);
            } catch (error) {
              setErrorMessage(
                error instanceof Error ? error.message : 'Unable to verify the PIN.',
              );
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <label>
            Password required
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrorMessage('');
              }}
              disabled={isSubmitting}
              placeholder="Enter password..."
              style={{ borderColor: errorMessage ? 'var(--brand)' : 'var(--black)' }}
            />
          </label>
          {errorMessage ? (
            <p style={{ color: 'var(--brand)', margin: '8px 0 0', fontSize: '13px', fontWeight: 900 }}>
              {errorMessage}
            </p>
          ) : null}
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ flex: 1, background: '#fff', color: 'var(--black)' }}
            >
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} style={{ flex: 1 }}>
              {isSubmitting ? 'Verifying...' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
