import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { criarApp } from '../helpers/app';

describe('Health (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => (app = await criarApp()));
  afterAll(() => app.close());

  it('GET /api/catalog/health é público', async () => {
    await request(app.getHttpServer()).get('/api/catalog/health').expect(200, { status: 'ok' });
  });

  it('Swagger publicado em /api/catalog/docs', async () => {
    await request(app.getHttpServer()).get('/api/catalog/docs').expect(200);
  });
});
