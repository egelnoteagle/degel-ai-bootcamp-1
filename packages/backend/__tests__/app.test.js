const request = require('supertest');
const { app, db } = require('../src/app');

afterAll(() => {
  if (db) db.close();
});

describe('API Endpoints', () => {
  describe('GET /api/items', () => {
    it('should return all items', async () => {
      const response = await request(app).get('/api/items');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      const item = response.body[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('created_at');
    });

    it('should return items matching the search term', async () => {
      const response = await request(app).get('/api/items?search=Item 1');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((item) => {
        expect(item.name.toLowerCase()).toContain('item 1');
      });
    });

    it('should return an empty array when no items match the search', async () => {
      const response = await request(app).get('/api/items?search=zzz_no_match_zzz');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return all items when search query is empty', async () => {
      const all = await request(app).get('/api/items');
      const withEmpty = await request(app).get('/api/items?search=');
      expect(withEmpty.status).toBe(200);
      expect(withEmpty.body.length).toBe(all.body.length);
    });
  });

  describe('POST /api/items', () => {
    it('should create a new item', async () => {
      const newItem = { name: 'Test Item' };
      const response = await request(app)
        .post('/api/items')
        .send(newItem)
        .set('Accept', 'application/json');
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newItem.name);
      expect(response.body).toHaveProperty('created_at');
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({})
        .set('Accept', 'application/json');
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Item name is required');
    });

    it('should return 400 if name is empty', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({ name: '' })
        .set('Accept', 'application/json');
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Item name is required');
    });

    it('should return 400 if name is whitespace only', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({ name: '   ' })
        .set('Accept', 'application/json');
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Item name is required');
    });
  });

  describe('PUT /api/items/:id', () => {
    let createdId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/items')
        .send({ name: 'Item to Edit' });
      createdId = res.body.id;
    });

    it('should update an existing item', async () => {
      const response = await request(app)
        .put(`/api/items/${createdId}`)
        .send({ name: 'Updated Item' })
        .set('Accept', 'application/json');
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(createdId);
      expect(response.body.name).toBe('Updated Item');
      expect(response.body).toHaveProperty('created_at');
    });

    it('should return 400 if name is empty', async () => {
      const response = await request(app)
        .put(`/api/items/${createdId}`)
        .send({ name: '' })
        .set('Accept', 'application/json');
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Item name is required');
    });

    it('should return 400 if name is whitespace only', async () => {
      const response = await request(app)
        .put(`/api/items/${createdId}`)
        .send({ name: '   ' })
        .set('Accept', 'application/json');
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Item name is required');
    });

    it('should return 404 for a non-existent item', async () => {
      const response = await request(app)
        .put('/api/items/999999')
        .send({ name: 'Ghost' })
        .set('Accept', 'application/json');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Item not found');
    });

    it('should return 400 for an invalid ID', async () => {
      const response = await request(app)
        .put('/api/items/not-a-number')
        .send({ name: 'Invalid' })
        .set('Accept', 'application/json');
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid item ID');
    });
  });

  describe('DELETE /api/items/:id', () => {
    let createdId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/items')
        .send({ name: 'Item to Delete' });
      createdId = res.body.id;
    });

    it('should delete an existing item', async () => {
      const response = await request(app).delete(`/api/items/${createdId}`);
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Item deleted successfully');

      const all = await request(app).get('/api/items');
      expect(all.body.find((i) => i.id === createdId)).toBeUndefined();
    });

    it('should return 404 for a non-existent item', async () => {
      const response = await request(app).delete('/api/items/999999');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Item not found');
    });

    it('should return 400 for an invalid ID', async () => {
      const response = await request(app).delete('/api/items/not-a-number');
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid item ID');
    });
  });
});
