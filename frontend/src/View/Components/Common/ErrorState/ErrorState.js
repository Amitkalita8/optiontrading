import Card from '../Card/Card';
import Button from '../Button/Button';
import './ErrorState.css';

function ErrorState({ message = 'Something went wrong while loading this page.', onRetry }) {
  return (
    <Card className="error-state">
      <h2 className="card__title">Couldn&apos;t load data</h2>
      <p>{message}</p>
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </Card>
  );
}

export default ErrorState;
