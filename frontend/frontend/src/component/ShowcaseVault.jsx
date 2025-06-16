import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../ShowcaseVault.css';

const ShowcaseVault = ({ user }) => {
  const [projects, setProjects] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    techStack: '',
    imageUrl: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [commentInputs, setCommentInputs] = useState({});

  const isAdmin = user?.role === 'admin';

  // Fetch projects from server
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/projects', {
        withCredentials: true,
      });
      setProjects(Array.isArray(response.data) ? response.data : []);
      setError('');
    } catch (err) {
      const errMsg = err.response?.data?.error || `Failed to fetch projects: ${err.message}`;
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.id || !user?.role) {
      setError('Please log in to access Showcase Vault.');
      return;
    }
    fetchProjects();
  }, [user, fetchProjects]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle project publishing (admin only)
  const handlePublishProject = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isAdmin) {
      setError('Only admins can publish projects.');
      return;
    }
    if (!formData.title.trim() || !formData.description.trim() || !formData.techStack.trim()) {
      setError('Title, description, and tech stack are required.');
      return;
    }

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      techStack: formData.techStack.trim(),
      imageUrl: formData.imageUrl.trim() || `https://picsum.photos/300/200?random=${Date.now()}`,
      adminId: user.id,
    };

    try {
      setLoading(true);
      await axios.post('http://localhost:5000/api/projects', payload, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });
      setFormData({ title: '', description: '', techStack: '', imageUrl: '' });
      setSuccess('Project published successfully!');
      fetchProjects();
    } catch (err) {
      const errMsg = err.response?.data?.error || `Failed to publish project: ${err.message}`;
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle liking/unliking a project
  const handleLikeToggle = async (projectId) => {
    try {
      await axios.post(
        'http://localhost:5000/api/projects/like',
        { projectId, userId: user.id },
        { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
      );
      fetchProjects();
    } catch (err) {
      setError(err.response?.data?.error || `Failed to toggle like: ${err.message}`);
    }
  };

  // Handle comment input change
  const handleCommentChange = (projectId, value) => {
    setCommentInputs((prev) => ({ ...prev, [projectId]: value }));
  };

  // Handle comment submission
  const handleCommentSubmit = async (projectId) => {
    const content = commentInputs[projectId]?.trim();
    if (!content) {
      setError('Comment cannot be empty.');
      return;
    }

    try {
      await axios.post(
        'http://localhost:5000/api/projects/comment',
        { projectId, userId: user.id, content },
        { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
      );
      setCommentInputs((prev) => ({ ...prev, [projectId]: '' }));
      fetchProjects();
    } catch (err) {
      setError(err.response?.data?.error || `Failed to add comment: ${err.message}`);
    }
  };

  // Handle project deletion (admin only)
  const handleDeleteProject = async (projectId) => {
    if (!isAdmin) {
      setError('Only admins can delete projects.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await axios.delete(`http://localhost:5000/api/projects/${projectId}`, {
        withCredentials: true
      });
      setSuccess('Project deleted successfully!');
      fetchProjects();
    } catch (err) {
      const errMsg = err.response?.data?.error || `Failed to delete project: ${err.message}`;
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="showcase-vault-container">
      <div className="showcase-header">
        <h2>Showcase Vault</h2>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      {/* Admin project publishing form */}
      {isAdmin && (
        <form onSubmit={handlePublishProject} className="project-form">
          <h3>
            <i className="fas fa-plus-circle"></i>
            Publish a Project
          </h3>
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              name="title"
              placeholder="e.g., AI Dashboard"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              placeholder="Project details..."
              value={formData.description}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="techStack">Tech Stack</label>
            <input
              type="text"
              id="techStack"
              name="techStack"
              placeholder="e.g., React, Node.js, Python"
              value={formData.techStack}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="imageUrl">Image URL (optional)</label>
            <input
              type="text"
              id="imageUrl"
              name="imageUrl"
              placeholder="e.g., https://example.com/image.jpg"
              value={formData.imageUrl}
              onChange={handleChange}
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Publishing...' : 'Publish Project'}
          </button>
        </form>
      )}

      {/* Project Gallery */}
      <div className="project-gallery">
        <h3>
          <i className="fas fa-project-diagram"></i>
          Projects
        </h3>
        {loading && <p className="loading">Loading projects...</p>}
        {!loading && projects.length === 0 && <p className="error">No projects available.</p>}
        {projects.map(({ id, title, description, techStack, imageUrl, adminName, likes, comments, hasLiked }) => (
          <div key={id} className="project-card">
            <div className="project-content">
              <div className="project-image-container">
                <img src={imageUrl} alt={title} className="project-image" />
              </div>
              <div className="project-details">
                <h4>{title}</h4>
                <p>{description}</p>
                <p><strong>Tech Stack:</strong></p>
                <div className="tech-stack">
                  {techStack.split(',').map((tech, index) => (
                    <span key={index} className="tech-tag">{tech.trim()}</span>
                  ))}
                </div>
                <p><strong>Published by:</strong> {adminName}</p>
                {comments.length > 0 && (
                  <div className="comments-list">
                    <h5>Comments ({comments.length})</h5>
                    <ul>
                      {comments.map(({ id: commentId, content, userName }) => (
                        <li key={commentId}>
                          <strong>{userName}:</strong> {content}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <div className="project-actions">
              <div className="project-actions-left">
                <button
                  className={`like-button ${hasLiked ? 'liked' : ''}`}
                  onClick={() => handleLikeToggle(id)}
                  disabled={loading}
                >
                  <i className={`fas ${hasLiked ? 'fa-heart' : 'fa-heart'}`}></i>
                  {hasLiked ? 'Unlike' : 'Like'} ({likes.length})
                </button>
                <div className="comment-section">
                  <input
                    type="text"
                    placeholder="Comment..."
                    value={commentInputs[id] || ''}
                    onChange={(e) => handleCommentChange(id, e.target.value)}
                  />
                  <button
                    onClick={() => handleCommentSubmit(id)}
                    disabled={loading || !commentInputs[id]?.trim()}
                  >
                    <i className="fas fa-comment"></i>
                    Comment
                  </button>
                </div>
              </div>
              {isAdmin && (
                <div className="project-actions-right">
                  <button
                    className="delete-project-button"
                    onClick={() => handleDeleteProject(id)}
                    disabled={loading}
                  >
                    <i className="fas fa-trash-alt"></i>
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShowcaseVault;