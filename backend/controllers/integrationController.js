import db from '../config/db.js';

export const getIntegrations = (req, res) => {
  db.all('SELECT * FROM api_integrations ORDER BY id ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Error fetching integrations', error: err.message });
    res.json(rows);
  });
};

export const createIntegration = (req, res) => {
  const { name, key_value, status } = req.body;
  if (!name || !key_value) {
    return res.status(400).json({ message: 'Name and key_value are required' });
  }
  db.run(
    'INSERT INTO api_integrations (name, key_value, status) VALUES (?, ?, ?)',
    [name.toLowerCase().trim(), key_value.trim(), status || 'online'],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ message: 'An integration with this name already exists' });
        }
        return res.status(500).json({ message: 'Error creating integration', error: err.message });
      }
      res.status(201).json({ id: this.lastID, name, key_value, status: status || 'online' });
    }
  );
};

export const updateIntegration = (req, res) => {
  const { id } = req.params;
  const { name, key_value, status } = req.body;
  
  db.run(
    'UPDATE api_integrations SET name=?, key_value=?, status=? WHERE id=?',
    [name.toLowerCase().trim(), key_value.trim(), status, id],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ message: 'An integration with this name already exists' });
        }
        return res.status(500).json({ message: 'Error updating integration', error: err.message });
      }
      if (this.changes === 0) return res.status(404).json({ message: 'Integration not found' });
      res.json({ message: 'Integration updated successfully' });
    }
  );
};

export const deleteIntegration = (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM api_integrations WHERE id=?', [id], function (err) {
    if (err) return res.status(500).json({ message: 'Error deleting integration', error: err.message });
    if (this.changes === 0) return res.status(404).json({ message: 'Integration not found' });
    res.json({ message: 'Integration deleted successfully' });
  });
};
