import { useEffect, useRef, useState } from 'react';

interface AdminGateModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminGateModal({ visible, onClose, onSuccess }: AdminGateModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible) {
      setPassword('');
      setError(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)'
    }}>
      <div className="panel" style={{ width: '100%', maxWidth: '400px', margin: '16px', boxShadow: '12px 12px 0 rgba(85, 97, 115, 0.4)' }}>
        <h2 style={{ fontSize: '26px' }}>Admin Access</h2>
        <form onSubmit={(e) => {
          e.preventDefault();
          // Hardcoded password as requested by the user
          if (password === 'admin1234') {
            onSuccess();
          } else {
            setError(true);
          }
        }}>
          <label>
            Password required
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="Enter password..."
              style={{ borderColor: error ? 'var(--brand)' : 'var(--black)' }}
            />
          </label>
          {error && <p style={{ color: 'var(--brand)', margin: '8px 0 0', fontSize: '13px', fontWeight: 900 }}>Incorrect password.</p>}
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, background: '#fff', color: 'var(--black)' }}>Cancel</button>
            <button type="submit" style={{ flex: 1 }}>Login</button>
          </div>
        </form>
      </div>
    </div>
  );
}
