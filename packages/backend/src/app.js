const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const Database = require('better-sqlite3');

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Initialize in-memory SQLite database
const db = new Database(':memory:');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// Insert some initial data
const initialItems = ['Item 1', 'Item 2', 'Item 3'];
const insertStmt = db.prepare('INSERT INTO items (name) VALUES (?)');

initialItems.forEach(item => {
  insertStmt.run(item);
});

console.log('In-memory database initialized with sample data');

// API Routes
app.get('/api/items', (req, res) => {
  try {
    const { search } = req.query;
    let items;
    if (search && search.trim()) {
      items = db
        .prepare('SELECT * FROM items WHERE name LIKE ? ORDER BY created_at DESC')
        .all(`%${search.trim()}%`);
    } else {
      items = db.prepare('SELECT * FROM items ORDER BY created_at DESC').all();
    }
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

app.post('/api/items', (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Item name is required' });
    }
    
    const result = insertStmt.run(name);
    const id = result.lastInsertRowid;
    
    const newItem = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

app.put('/api/items/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    db.prepare('UPDATE items SET name = ? WHERE id = ?').run(name.trim(), id);
    const updatedItem = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    res.status(200).json(updatedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

app.delete('/api/items/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    db.prepare('DELETE FROM items WHERE id = ?').run(id);
    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = { app, db, insertStmt };