import { Link } from 'react-router-dom';
import Icon from './Icon';
import { CardThumb } from './Photo';
import { ResultBadge, Stars } from './ui';
import { formatDate } from '../lib/date';

export default function RecordCard({ record }) {
  return (
    <li>
      <Link to={`/records/${record.id}`} className="record-card">
        <CardThumb record={record} />
        <span className="record-card__body">
          <span className="record-card__top">
            <time className="record-card__date" dateTime={record.escape_date}>{formatDate(record.escape_date)}</time>
            <ResultBadge result={record.result} size="sm" />
          </span>
          <strong className="record-card__title">{record.theme_name}</strong>
          <span className="record-card__meta">
            <Icon name="pin" size={15} className="record-card__meta-icon record-card__meta-icon--pin" />
            <span className="truncate">{record.cafe_name}</span>
          </span>
          {record.companions && (
            <span className="record-card__meta">
              <Icon name="people" size={15} className="record-card__meta-icon" />
              <span className="truncate">{record.companions}</span>
            </span>
          )}
          <span className="record-card__difficulty">
            <span className="record-card__difficulty-label">난이도 {record.difficulty}</span>
            <Stars value={record.difficulty} size={13} />
          </span>
        </span>
        <Icon name="chevronRight" size={18} className="record-card__chevron" />
      </Link>
    </li>
  );
}
