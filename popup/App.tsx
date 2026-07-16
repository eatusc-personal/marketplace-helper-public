import React, { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import AuthWrapper from './components/AuthWrapper';
import CreateListingForm from './components/CreateListingForm';
import ViewListings from './components/ViewListings';
import DebugPanel from './components/DebugPanel';
import { Listing } from './types';
import { useAuth } from './contexts/AuthContext';
import { signOut } from '../src/auth';

type TabType = 'create' | 'view';

const AppContent: React.FC = () => {
  const { user, setError } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('view');
  const [isEditing, setIsEditing] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setDebugLogs(prev => [...prev.slice(-50), logEntry]); // Keep last 50 logs
    console.log(message); // Also log to browser console
  };






  const handleEditListing = (listing: Listing) => {
    console.log('🔍 APP.TSX: handleEditListing called with:', listing);
    addDebugLog(`🔍 APP.TSX: handleEditListing called with: ${listing.title}`);
    addDebugLog(`🔍 APP.TSX: Setting editingListing with fb_category_id=${listing.fb_category_id}, nd_category_id=${listing.nd_category_id}, condition_id=${listing.condition_id}`);
    setEditingListing(listing);
    setIsEditing(true);
    setActiveTab('create');
  };

  const handleSuccess = () => {
    // This will be called when a listing is created or updated successfully
    setIsEditing(false);
    setEditingListing(null);
    setActiveTab('view'); // Switch back to View Listings tab
    addDebugLog('Listing operation completed successfully');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingListing(null);
    setActiveTab('view'); // Switch back to View Listings tab
    addDebugLog('Edit operation cancelled');
  };

  const handleClearLogs = () => {
    setDebugLogs([]);
  };

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        setError(error.message);
      }
    } catch (err) {
      console.error('Sign out error:', err);
      setError('Failed to sign out');
    }
  };

  return (
    <div className="container">
      <div className="header">
        <div className="header-content">
          <div className="header-left">
            <img src="../img/p-logo.png" alt="Marketplace Helper Logo" className="header-logo" />
          </div>
          <div className="header-right">
            <div className="user-info">
              <span className="user-email">{user?.email}</span>
              <button
                className="sign-out-button"
                onClick={handleSignOut}
                title="Sign out"
              >
                Sign Out
              </button>
            </div>
            <button
              className="debug-toggle"
              onClick={() => setShowDebugPanel(!showDebugPanel)}
            >
              {showDebugPanel ? '🔽 Hide Debug' : '🔼 Show Debug'}
            </button>
          </div>
        </div>
      </div>

      {showDebugPanel && (
        <DebugPanel
          debugLogs={debugLogs}
          onClearLogs={handleClearLogs}
        />
      )}



      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          {isEditing ? 'Edit Listing' : 'Create Listing'}
        </button>
        <button
          className={`tab-button ${activeTab === 'view' ? 'active' : ''}`}
          onClick={() => setActiveTab('view')}
        >
          View Listings
        </button>
      </div>

      {/* Tab Content - Takes remaining space */}
      <div className="tab-content">
        {/* Create/Edit Tab */}
        {activeTab === 'create' && (
          <CreateListingForm
            isEditing={isEditing}
            editingListing={editingListing}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            addDebugLog={addDebugLog}
          />
        )}

        {/* View Listings Tab */}
        {activeTab === 'view' && (
          <ViewListings onEditListing={handleEditListing} addDebugLog={addDebugLog} />
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthWrapper>
        <AppContent />
      </AuthWrapper>
    </AuthProvider>
  );
};

export default App;