process.env.DATABASE_URL ??=
  'postgresql://catalog:catalog@localhost:5434/catalog_test?schema=public';
process.env.JWT_SECRET ??= 'segredo-de-teste';
process.env.MESSAGING_ENABLED = 'false';
process.env.CATALOG_EVENTS_TOPIC_ARN ??=
  'arn:aws:sns:us-east-1:000000000000:oficina-catalog-events.fifo';
process.env.CATALOG_INBOX_QUEUE_URL ??= 'http://localhost:4566/000000000000/oficina-catalog-inbox.fifo';
