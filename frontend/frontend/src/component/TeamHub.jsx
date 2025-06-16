import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../TeamHub.css';

const TeamHub = ({ user }) => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    skills: '',
    linkedinUrl: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/users', {
        withCredentials: true,
      });
      console.log('Fetched team members:', response.data);
      setTeamMembers(response.data);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error';
      console.error('Error fetching team members:', err);
      setError(`Failed to load team members: ${errorMsg}`);
      if (err.response?.status === 401) {
        window.location.href = '/login';
      }
    }
  };

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
    document.body.classList.toggle('dark-mode');
  };

  const handleConnect = (linkedinUrl, memberName) => {
    setError('');
    if (!linkedinUrl) {
      setError(`${memberName} hasn't added their LinkedIn profile yet.`);
      return;
    }
    let url = linkedinUrl;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    window.open(url, '_blank');
  };

  const handleEdit = (member) => {
    setEditForm({
      name: member.name || '',
      skills: member.skills || '',
      linkedinUrl: member.linkedinUrl || ''
    });
    setIsEditing(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    
    const formData = {
      name: editForm.name.trim(),
      skills: editForm.skills.trim(),
      linkedinUrl: editForm.linkedinUrl.trim() || null
    };

    try {
      const response = await axios.put(
        `http://localhost:5000/api/users/${user.id}`,
        formData,
        { 
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Profile update response:', response.data);
      
      // Update local storage with new user data
      const updatedUser = { ...user, ...formData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update team members list
      setTeamMembers(prevMembers => 
        prevMembers.map(member => 
          member.id === user.id ? { ...member, ...formData } : member
        )
      );
      
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (err) {
      console.error('Profile update error:', err);
      let errorMessage = 'Failed to update profile';
      
      if (err.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const filterMembers = (members) => {
    const query = searchQuery.toLowerCase();
    return members.filter((member) => (
      member.name.toLowerCase().includes(query) ||
      (member.skills && member.skills.toLowerCase().includes(query))
    ));
  };

  // Separate managers (admins) and team members (users)
  const managers = filterMembers(teamMembers.filter(member => member.role === 'admin'));
  const teamMembersList = filterMembers(teamMembers.filter(member => member.role === 'user'));

  const renderMemberCard = (member) => (
    <li key={member.id} className="member-card">
      <div className="member-info">
        <h3>{member.name}</h3>
        <p>Email: {member.email}</p>
        <p>Role: {member.role === 'admin' ? 'Manager' : 'Team Member'}</p>
        <p>Skills: {member.skills || 'None'}</p>
        <div className="button-row">
          {member.id === user.id ? (
            <button 
              className="edit-profile-button" 
              onClick={() => handleEdit(member)}
            >
              Edit
            </button>
          ) : (
            <button 
              className="connect-button"
              onClick={() => handleConnect(member.linkedinUrl, member.name)}
            >
              Connect
            </button>
          )}
        </div>
      </div>
    </li>
  );

  if (!user) {
    window.location.href = '/login';
    return null;
  }

  return (
    <div className={`team-hub ${darkMode ? 'dark-mode' : ''}`}>
      <header>
        <h1>Team Hub</h1>
        <button onClick={toggleDarkMode} className="dark-mode-toggle">
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </header>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="edit-modal">
          <div className="edit-modal-content">
            <h2>Edit Profile</h2>
            {error && <p className="error-message">{error}</p>}
            {success && <p className="success-message">{success}</p>}
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label htmlFor="name">Name:</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={editForm.name}
                  onChange={handleEditChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="skills">Skills (comma-separated):</label>
                <input
                  type="text"
                  id="skills"
                  name="skills"
                  value={editForm.skills}
                  onChange={handleEditChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="linkedinUrl">LinkedIn URL:</label>
                <input
                  type="url"
                  id="linkedinUrl"
                  name="linkedinUrl"
                  value={editForm.linkedinUrl}
                  onChange={handleEditChange}
                  placeholder="https://linkedin.com/in/your-profile"
                />
              </div>
              <div className="button-group">
                <button 
                  type="submit" 
                  className="save-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)} 
                  className="cancel-button"
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="team-members">
        <div className="search-section">
          <input
            type="text"
            placeholder="Search by name or skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-bar"
          />
        </div>

        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}

        {teamMembers.length === 0 ? (
          <p>Loading team members...</p>
        ) : (
          <>
            <div className="managers-section">
              <h2>Managers</h2>
              <ul className="member-list">
                {managers.map(renderMemberCard)}
              </ul>
            </div>

            <div className="team-members-section">
              <h2>Team Members</h2>
              <ul className="member-list">
                {teamMembersList.map(renderMemberCard)}
              </ul>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default TeamHub;
