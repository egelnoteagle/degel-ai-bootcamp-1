import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newItem, setNewItem] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const fetchData = useCallback(async (searchTerm = '') => {
    try {
      setLoading(true);
      const url = searchTerm.trim()
        ? `/api/items?search=${encodeURIComponent(searchTerm.trim())}`
        : '/api/items';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError('Failed to fetch data: ' + err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchData]);

  const handleEditStart = (item) => {
    setEditingId(item.id);
    setEditValue(item.name);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleEditSave = async (id) => {
    if (!editValue.trim()) return;
    try {
      const response = await fetch(`/api/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editValue }),
      });

      if (!response.ok) {
        throw new Error('Failed to update item');
      }

      const updated = await response.json();
      setData(data.map((item) => (item.id === id ? updated : item)));
      setEditingId(null);
      setEditValue('');
    } catch (err) {
      setError('Error updating item: ' + err.message);
      console.error('Error updating item:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`/api/items/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      setData(data.filter((item) => item.id !== id));
    } catch (err) {
      setError('Error deleting item: ' + err.message);
      console.error('Error deleting item:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newItem }),
      });

      if (!response.ok) {
        throw new Error('Failed to add item');
      }

      await response.json();
      setNewItem('');
      fetchData(search);
    } catch (err) {
      setError('Error adding item: ' + err.message);
      console.error('Error adding item:', err);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Hello World - Derek Egel</h1>
        <p>Connected to in-memory database</p>
      </header>
      
      <main>
        <section className="add-item-section">
          <h2>Add New Item</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Enter item name"
            />
            <button type="submit">Add Item</button>
          </form>
        </section>

        <section className="items-section">
          <h2>Items from Database</h2>
          <div className="search-bar">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
            />
            {search && (
              <button className="clear-filter-btn" onClick={() => setSearch('')}>Clear</button>
            )}
          </div>
          {loading && <p>Loading data...</p>}
          {error && <p className="error">{error}</p>}
          {!loading && !error && (() => {
            return (
              <ul>
                {data.length > 0 ? (
                  data.map((item) => (
                    <li key={item.id}>
                      {editingId === item.id ? (
                        <>
                          <input
                            className="edit-input"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditSave(item.id);
                              if (e.key === 'Escape') handleEditCancel();
                            }}
                            autoFocus
                          />
                          <span className="item-actions">
                            <button onClick={() => handleEditSave(item.id)} className="save-btn">Save</button>
                            <button onClick={handleEditCancel} className="cancel-btn">Cancel</button>
                          </span>
                        </>
                      ) : (
                        <>
                          <span>{item.name}</span>
                          <span className="item-actions">
                            <button onClick={() => handleEditStart(item)} className="edit-btn">Edit</button>
                            <button onClick={() => handleDelete(item.id)} className="delete-btn">Delete</button>
                          </span>
                        </>
                      )}
                    </li>
                  ))
                ) : (
                  <p>{search ? `No items match "${search}".` : 'No items found. Add some!'}</p>
                )}
              </ul>
            );
          })()}
        </section>
      </main>
    </div>
  );
}

export default App;