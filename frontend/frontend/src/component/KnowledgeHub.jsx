import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../KnowledgeHub.css';

const learningPaths = [
  {
    id: 1,
    name: 'AI Model Training',
    steps: [
      'Basics of Machine Learning',
      'Data Preparation',
      'Model Selection',
      'Training & Evaluation',
      'Deployment',
    ],
  },
];

const KnowledgeHub = ({ user }) => {
  const [resources, setResources] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    type: '',
    tags: '',
    link: '',
    description: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Clear error/success messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Fetch resources from server
  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      console.log('KnowledgeHub: Fetching resources', { userId: user?.id });
      const response = await axios.get('http://localhost:5000/api/resources', {
        withCredentials: true,
      });
      console.log('KnowledgeHub: Fetch success', { count: response.data.length });
      setResources(Array.isArray(response.data) ? response.data : []);
      setError('');
    } catch (err) {
      const errMsg = err.response?.data?.error || `Failed to fetch resources: ${err.message} (Status: ${err.response?.status})`;
      console.error('KnowledgeHub: Fetch error', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setError('Please log in to access Knowledge Hub.');
      return;
    }
    fetchResources();
  }, [user, fetchResources]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle resource publishing
  const handlePublishResource = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.title.trim() || !formData.type.trim() || (!formData.link.trim() && !formData.description.trim())) {
      setError('Title, type, and either link or description are required.');
      console.error('KnowledgeHub: Missing fields', formData);
      return;
    }

    const tags = formData.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag);

    if (tags.length === 0) {
      setError('At least one tag is required.');
      console.error('KnowledgeHub: No tags provided');
      return;
    }

    const payload = {
      title: formData.title.trim(),
      type: formData.type.trim(),
      tags,
      link: formData.link.trim() || null,
      description: formData.description.trim() || null,
      userId: user.id,
    };
    console.log('KnowledgeHub: POST /api/resources', payload);

    try {
      setLoading(true);
      await axios.post('http://localhost:5000/api/resources', payload, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });
      setFormData({ title: '', type: '', tags: '', link: '', description: '' });
      setSuccess('Resource published successfully!');
      await fetchResources();
    } catch (err) {
      const errMsg = err.response?.data?.error || `Failed to publish resource: ${err.message} (Status: ${err.response?.status})`;
      console.error('KnowledgeHub: POST /api/resources error', {
        status: err.response?.status,
        data: err.response?.data,
      });
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle resource deletion
  const handleDeleteResource = async (resourceId, resourceTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${resourceTitle}"?`)) {
      return;
    }

    try {
      setLoading(true);
      console.log('KnowledgeHub: DELETE /api/resources', { resourceId, userId: user.id });
      await axios.delete(`http://localhost:5000/api/resources/${resourceId}`, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });
      setSuccess('Resource deleted successfully!');
      await fetchResources();
    } catch (err) {
      const errMsg = err.response?.data?.error || `Failed to delete resource: ${err.message} (Status: ${err.response?.status})`;
      console.error('KnowledgeHub: DELETE /api/resources error', {
        status: err.response?.status,
        data: err.response?.data,
      });
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="knowledge-hub">
      {/* Resource Publishing Form */}
      <div className="resource-form-container">
        <h2 className="section-title">Share a Resource</h2>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
        <form onSubmit={handlePublishResource} className="resource-form">
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              name="title"
              placeholder="e.g., AI Model Training Tutorial"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="type">Type</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
            >
              <option value="">Select type</option>
              <option value="Tutorial">Tutorial</option>
              <option value="API Doc">API Doc</option>
              <option value="Whitepaper">Whitepaper</option>
              <option value="Article">Article</option>
              <option value="Video">Video</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="tags">Tags (comma-separated)</label>
            <input
              type="text"
              id="tags"
              name="tags"
              placeholder="e.g., AI, Training, Beginner"
              value={formData.tags}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="link">Link (optional)</label>
            <input
              type="url"
              id="link"
              name="link"
              placeholder="e.g., https://example.com"
              value={formData.link}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description (optional)</label>
            <textarea
              id="description"
              name="description"
              placeholder="Brief description of the resource..."
              value={formData.description}
              onChange={handleChange}
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Publishing...' : 'Publish Resource'}
          </button>
        </form>
      </div>

      {/* Resource Library */}
      <div className="resource-library">
        <h2 className="section-title">Resource Library</h2>
        {loading && <p className="loading">Loading resources...</p>}
        <div className="resource-grid">
          {resources.map(({ id, title, type, tags, link, description, userName, userId }) => (
            <div key={id} className="resource-card">
              <h3 className="resource-title">{title}</h3>
              <p className="resource-type">{type}</p>
              {description && <p className="resource-description">{description}</p>}
              {link && (
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="resource-link"
                >
                  View Resource
                </a>
              )}
              <p className="resource-contributor">Contributed by: {userName}</p>
              <div className="resource-tags">
                {tags.map((tag) => (
                  <span key={tag} className="resource-tag">
                    {tag}
                  </span>
                ))}
              </div>
              {(user.id === userId || user.role === 'admin') && (
                <button
                  className="delete-button"
                  onClick={() => handleDeleteResource(id, title)}
                  disabled={loading}
                >
                  Delete
                </button>
              )}
            </div>
          ))}
          {!loading && resources.length === 0 && (
            <p className="no-results">No resources found.</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default KnowledgeHub;
