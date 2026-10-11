import Card from '../../Components/Common/Card/Card';

function PlaceholderPage({ title }) {
  return (
    <Card>
      <h1 className="card__title">{title}</h1>
      <p style={{ marginTop: 8, color: 'var(--text-muted)' }}>This section is coming soon.</p>
    </Card>
  );
}

export default PlaceholderPage;
