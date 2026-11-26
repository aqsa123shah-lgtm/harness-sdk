import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { Avatar } from './Avatar.jsx';
import { Icon } from './Icons.jsx';
import { cx } from '../lib.js';

export function StoryBar({ groups = [], onOpen }) {
  const { user } = useApp();
  const navigate = useNavigate();

  return (
    <div className="story-bar" role="list" aria-label="Stories">
      <button
        type="button"
        className="story-item"
        role="listitem"
        onClick={() => navigate('/create?tab=story')}
      >
        <span className="story-thumb story-thumb-add">
          <Avatar user={user} size={58} />
          <span className="story-plus">
            <Icon name="plus" size={13} strokeWidth={2.6} />
          </span>
        </span>
        <span className="story-name">Your story</span>
      </button>

      {groups.map((group) => (
        <button
          key={group.user.id}
          type="button"
          className="story-item"
          role="listitem"
          onClick={() => onOpen?.(group)}
        >
          <span className={cx('story-thumb', !group.seen && 'is-new')}>
            <Avatar user={group.user} size={58} />
          </span>
          <span className="story-name">{group.user.username.split('.')[0]}</span>
        </button>
      ))}
    </div>
  );
}
