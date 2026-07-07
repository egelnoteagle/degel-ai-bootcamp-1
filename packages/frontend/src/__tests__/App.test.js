import React, { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import App from '../App';

const mockItems = [
  { id: 1, name: 'Test Item 1', created_at: '2023-01-01T00:00:00.000Z' },
  { id: 2, name: 'Test Item 2', created_at: '2023-01-02T00:00:00.000Z' },
];

const server = setupServer(
  rest.get('/api/items', (req, res, ctx) => {
    const search = req.url.searchParams.get('search');
    if (search) {
      const filtered = mockItems.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
      );
      return res(ctx.status(200), ctx.json(filtered));
    }
    return res(ctx.status(200), ctx.json(mockItems));
  }),

  rest.post('/api/items', (req, res, ctx) => {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res(ctx.status(400), ctx.json({ error: 'Item name is required' }));
    }
    return res(
      ctx.status(201),
      ctx.json({ id: 3, name, created_at: new Date().toISOString() })
    );
  }),

  rest.put('/api/items/:id', (req, res, ctx) => {
    const id = parseInt(req.params.id, 10);
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res(ctx.status(400), ctx.json({ error: 'Item name is required' }));
    }
    const item = mockItems.find((i) => i.id === id);
    if (!item) {
      return res(ctx.status(404), ctx.json({ error: 'Item not found' }));
    }
    return res(ctx.status(200), ctx.json({ ...item, name }));
  }),

  rest.delete('/api/items/:id', (req, res, ctx) => {
    const id = parseInt(req.params.id, 10);
    const item = mockItems.find((i) => i.id === id);
    if (!item) {
      return res(ctx.status(404), ctx.json({ error: 'Item not found' }));
    }
    return res(ctx.status(200), ctx.json({ message: 'Item deleted successfully' }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('App Component', () => {
  // --- Rendering ---
  test('renders the header', async () => {
    await act(async () => { render(<App />); });
    expect(screen.getByText('Hello World - Derek Egel')).toBeInTheDocument();
    expect(screen.getByText('Connected to in-memory database')).toBeInTheDocument();
  });

  test('renders the Add New Item section', async () => {
    await act(async () => { render(<App />); });
    expect(screen.getByText('Add New Item')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter item name')).toBeInTheDocument();
    expect(screen.getByText('Add Item')).toBeInTheDocument();
  });

  test('renders the search bar', async () => {
    await act(async () => { render(<App />); });
    expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument();
  });

  test('shows loading state initially', async () => {
    await act(async () => { render(<App />); });
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  test('loads and displays items from the API', async () => {
    await act(async () => { render(<App />); });
    await waitFor(() => {
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      expect(screen.getByText('Test Item 2')).toBeInTheDocument();
    });
  });

  test('displays Edit and Delete buttons for each item', async () => {
    await act(async () => { render(<App />); });
    await waitFor(() => {
      expect(screen.getAllByText('Edit')).toHaveLength(2);
      expect(screen.getAllByText('Delete')).toHaveLength(2);
    });
  });

  test('shows empty state when no items exist', async () => {
    server.use(
      rest.get('/api/items', (req, res, ctx) =>
        res(ctx.status(200), ctx.json([]))
      )
    );
    await act(async () => { render(<App />); });
    await waitFor(() => {
      expect(screen.getByText('No items found. Add some!')).toBeInTheDocument();
    });
  });

  test('shows an error message when the API fails on load', async () => {
    server.use(
      rest.get('/api/items', (req, res, ctx) => res(ctx.status(500)))
    );
    await act(async () => { render(<App />); });
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch data/)).toBeInTheDocument();
    });
  });

  // --- Add Item ---
  test('clears the input and refetches after adding an item', async () => {
    const user = userEvent.setup();
    await act(async () => { render(<App />); });
    await waitFor(() =>
      expect(screen.queryByText('Loading data...')).not.toBeInTheDocument()
    );

    await act(async () => {
      await user.type(screen.getByPlaceholderText('Enter item name'), 'New Test Item');
    });
    await act(async () => {
      await user.click(screen.getByText('Add Item'));
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter item name').value).toBe('');
    });
    await waitFor(() => {
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    });
  });

  test('does not submit when the item name is empty', async () => {
    const user = userEvent.setup();
    await act(async () => { render(<App />); });
    await waitFor(() =>
      expect(screen.queryByText('Loading data...')).not.toBeInTheDocument()
    );

    await act(async () => {
      await user.click(screen.getByText('Add Item'));
    });

    expect(screen.getByText('Test Item 1')).toBeInTheDocument();
  });

  test('shows an error when adding an item fails', async () => {
    server.use(
      rest.post('/api/items', (req, res, ctx) => res(ctx.status(500)))
    );
    const user = userEvent.setup();
    await act(async () => { render(<App />); });
    await waitFor(() =>
      expect(screen.queryByText('Loading data...')).not.toBeInTheDocument()
    );

    await act(async () => {
      await user.type(screen.getByPlaceholderText('Enter item name'), 'Fail Item');
    });
    await act(async () => {
      await user.click(screen.getByText('Add Item'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Error adding item/)).toBeInTheDocument();
    });
  });

  // --- Delete Item ---
  test('removes an item from the list after deleting', async () => {
    const user = userEvent.setup();
    await act(async () => { render(<App />); });
    await waitFor(() => {
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getAllByText('Delete')[0]);
    });

    await waitFor(() => {
      expect(screen.queryByText('Test Item 1')).not.toBeInTheDocument();
    });
  });

  test('shows an error when deleting an item fails', async () => {
    server.use(
      rest.delete('/api/items/:id', (req, res, ctx) => res(ctx.status(500)))
    );
    const user = userEvent.setup();
    await act(async () => { render(<App />); });
    await waitFor(() => {
      expect(screen.getAllByText('Delete')).toHaveLength(2);
    });

    await act(async () => {
      await user.click(screen.getAllByText('Delete')[0]);
    });

    await waitFor(() => {
      expect(screen.getByText(/Error deleting item/)).toBeInTheDocument();
    });
  });

  // --- Edit Item ---
  test('enters edit mode showing an input and Save/Cancel buttons', async () => {
    const user = userEvent.setup();
    await act(async () => { render(<App />); });
    await waitFor(() => {
      expect(screen.getAllByText('Edit')).toHaveLength(2);
    });

    await act(async () => {
      await user.click(screen.getAllByText('Edit')[0]);
    });

    expect(screen.getByDisplayValue('Test Item 1')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  test('saves an edited item and exits edit mode', async () => {
    const user = userEvent.setup();
    await act(async () => { render(<App />); });
    await waitFor(() => {
      expect(screen.getAllByText('Edit')).toHaveLength(2);
    });

    await act(async () => {
      await user.click(screen.getAllByText('Edit')[0]);
    });

    const editInput = screen.getByDisplayValue('Test Item 1');
    await act(async () => {
      await user.clear(editInput);
      await user.type(editInput, 'Updated Item 1');
    });
    await act(async () => {
      await user.click(screen.getByText('Save'));
    });

    await waitFor(() => {
      expect(screen.getByText('Updated Item 1')).toBeInTheDocument();
      expect(screen.queryByText('Save')).not.toBeInTheDocument();
    });
  });

  test('cancels edit mode and restores original text', async () => {
    const user = userEvent.setup();
    await act(async () => { render(<App />); });
    await waitFor(() => {
      expect(screen.getAllByText('Edit')).toHaveLength(2);
    });

    await act(async () => {
      await user.click(screen.getAllByText('Edit')[0]);
    });
    await act(async () => {
      await user.click(screen.getByText('Cancel'));
    });

    expect(screen.queryByText('Save')).not.toBeInTheDocument();
    expect(screen.getByText('Test Item 1')).toBeInTheDocument();
  });

  test('saves the edited item when Enter key is pressed', async () => {
    const user = userEvent.setup();
    await act(async () => { render(<App />); });
    await waitFor(() => {
      expect(screen.getAllByText('Edit')).toHaveLength(2);
    });

    await act(async () => {
      await user.click(screen.getAllByText('Edit')[0]);
    });

    const editInput = screen.getByDisplayValue('Test Item 1');
    await act(async () => {
      await user.clear(editInput);
      await user.type(editInput, 'Keyboard Saved{Enter}');
    });

    await waitFor(() => {
      expect(screen.queryByText('Save')).not.toBeInTheDocument();
    });
  });

  test('cancels edit mode when Escape key is pressed', async () => {
    const user = userEvent.setup();
    await act(async () => { render(<App />); });
    await waitFor(() => {
      expect(screen.getAllByText('Edit')).toHaveLength(2);
    });

    await act(async () => {
      await user.click(screen.getAllByText('Edit')[0]);
    });

    const editInput = screen.getByDisplayValue('Test Item 1');
    await act(async () => {
      await user.keyboard('{Escape}');
    });

    expect(screen.queryByText('Save')).not.toBeInTheDocument();
    expect(screen.getByText('Test Item 1')).toBeInTheDocument();
  });

  test('shows an error when saving an edit fails', async () => {
    server.use(
      rest.put('/api/items/:id', (req, res, ctx) => res(ctx.status(500)))
    );
    const user = userEvent.setup();
    await act(async () => { render(<App />); });
    await waitFor(() => {
      expect(screen.getAllByText('Edit')).toHaveLength(2);
    });

    await act(async () => {
      await user.click(screen.getAllByText('Edit')[0]);
    });
    await act(async () => {
      await user.click(screen.getByText('Save'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Error updating item/)).toBeInTheDocument();
    });
  });

  // --- Search ---
  test('filters items via server-side search as user types', async () => {
    const user = userEvent.setup();
    await act(async () => { render(<App />); });
    await waitFor(() => {
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    });

    await act(async () => {
      await user.type(screen.getByPlaceholderText('Search items...'), 'Item 1');
    });

    await waitFor(() => {
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Item 2')).not.toBeInTheDocument();
    });
  });

  test('shows a "no results" message when search has no matches', async () => {
    server.use(
      rest.get('/api/items', (req, res, ctx) => {
        const search = req.url.searchParams.get('search');
        if (search) return res(ctx.status(200), ctx.json([]));
        return res(ctx.status(200), ctx.json(mockItems));
      })
    );
    const user = userEvent.setup();
    await act(async () => { render(<App />); });
    await waitFor(() => {
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    });

    await act(async () => {
      await user.type(screen.getByPlaceholderText('Search items...'), 'zzz');
    });

    await waitFor(() => {
      expect(screen.getByText(/No items match/)).toBeInTheDocument();
    });
  });

  test('shows Clear button when search text is entered', async () => {
    const user = userEvent.setup();
    await act(async () => { render(<App />); });
    await waitFor(() => {
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    });

    await act(async () => {
      await user.type(screen.getByPlaceholderText('Search items...'), 'Item');
    });

    await waitFor(() => {
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });
  });

  test('clears search and restores all items when Clear is clicked', async () => {
    const user = userEvent.setup();
    await act(async () => { render(<App />); });
    await waitFor(() => {
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    });

    await act(async () => {
      await user.type(screen.getByPlaceholderText('Search items...'), 'Item 1');
    });
    await waitFor(() => {
      expect(screen.queryByText('Test Item 2')).not.toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByText('Clear'));
    });

    await waitFor(() => {
      expect(screen.queryByText('Clear')).not.toBeInTheDocument();
      expect(screen.getByText('Test Item 2')).toBeInTheDocument();
    });
  });
});
