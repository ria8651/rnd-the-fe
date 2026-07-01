import type { RefObject } from 'react';
import { Icon } from '@/icons/Icon';
import { Popover } from '@/components/Popover';
import { Button } from '@/components/Button';
import { useAuth } from '@/app/auth/AuthContext';
import './selectors.css';

/**
 * User details + logout popover (spec/chrome/01-behaviours.md#user-details--logout):
 * shows username, email, job title; logout requires confirmation (handled by caller).
 */
interface UserMenuProps {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export function UserMenu({ anchorRef, open, onClose, onLogout }: UserMenuProps) {
  const { user } = useAuth();
  return (
    <Popover
      anchorRef={anchorRef}
      open={open}
      onClose={onClose}
      placement="top-start"
      role="dialog"
      className="oms-selector oms-selector--user"
    >
      <div className="oms-user">
        <div className="oms-user__avatar">
          <Icon name="user-circle" size={40} />
        </div>
        <div className="oms-user__details">
          <p className="oms-user__name">
            {user.firstName} {user.lastName}
          </p>
          <p className="oms-user__row">{user.username}</p>
          <p className="oms-user__row">{user.email}</p>
          <p className="oms-user__row">{user.jobTitle}</p>
        </div>
      </div>
      <div className="oms-selector__footer">
        <Button
          variant="ghost"
          icon="power"
          onClick={() => {
            onClose();
            onLogout();
          }}
        >
          Log out
        </Button>
      </div>
    </Popover>
  );
}
