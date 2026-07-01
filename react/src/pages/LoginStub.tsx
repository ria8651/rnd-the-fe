import { useNavigate } from 'react-router-dom';
import { Icon } from '@/icons/Icon';
import { Button } from '@/components/Button';
import { ROOT_PATH } from '@/app/chrome/navConfig';

/**
 * Login is out of the chrome spec's scope (chrome only consumes auth state and
 * routes here on logout). This stub stands in for the real login flow so logout
 * has somewhere to land.
 */
export function LoginStub() {
  const navigate = useNavigate();
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--sp-4)',
        height: '100vh',
        background: 'var(--c-surface-base)',
        textAlign: 'center',
      }}
    >
      <Icon name="m-supply-guy" size={72} />
      <h1 style={{ fontSize: 'var(--fs-heading)' }}>open mSupply</h1>
      <p style={{ color: 'var(--c-text-secondary)', maxWidth: 360 }}>
        Login is out of scope for this build. Continue to enter the app (a dev session
        is assumed).
      </p>
      <Button variant="primary" icon="arrow-right" iconTrailing onClick={() => navigate(ROOT_PATH)}>
        Continue
      </Button>
    </div>
  );
}
