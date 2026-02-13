'use client';

import { useState, useEffect } from 'react';
import { workspaces, api } from '@/lib/api';

interface StaffMember {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  permissions: {
    inbox: boolean;
    bookings: boolean;
    forms: boolean;
    inventory: boolean;
  };
  created_at: string;
}

export default function TeamPage() {
  const [workspace, setWorkspace] = useState<any>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [inviteData, setInviteData] = useState({
    email: '',
    name: '',
    permissions: {
      inbox: true,
      bookings: true,
      forms: true,
      inventory: false
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const wsList = await workspaces.list();
      if (!wsList.length) return;
      const ws = wsList[0];
      setWorkspace(ws);
      
      const staffData = await api.get(`/api/workspaces/${ws.id}/staff`);
      setStaff(staffData.data);
    } catch (err) {
      setError('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;
    
    setInviting(true);
    setError('');
    
    try {
      await api.post(`/api/workspaces/${workspace.id}/staff`, inviteData);
      setSuccessMsg('Team member invited successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      setShowInviteModal(false);
      setInviteData({
        email: '',
        name: '',
        permissions: { inbox: true, bookings: true, forms: true, inventory: false }
      });
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to invite team member');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdatePermissions = async (memberId: string, permissions: any) => {
    if (!workspace) return;
    
    try {
      await api.patch(`/api/workspaces/${workspace.id}/staff/${memberId}`, { permissions });
      setStaff(staff.map(m => m.id === memberId ? { ...m, permissions } : m));
      setEditingId(null);
      setSuccessMsg('Permissions updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError('Failed to update permissions');
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!workspace || !confirm('Are you sure you want to remove this team member?')) return;
    
    try {
      await api.delete(`/api/workspaces/${workspace.id}/staff/${memberId}`);
      setStaff(staff.filter(m => m.id !== memberId));
      setSuccessMsg('Team member removed successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError('Failed to remove team member');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Notifications */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {successMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Team Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage staff members and their permissions</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Invite Team Member
        </button>
      </div>

      {/* Team Members List */}
      {staff.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-600">No team members yet</p>
            <p className="text-xs text-slate-400 mt-1">Click "Invite Team Member" to get started</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map((member) => {
            const isEditing = editingId === member.id;
            const [editPerms, setEditPerms] = useState(member.permissions);

            return (
              <div key={member.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-base font-bold flex-shrink-0">
                      {(member.full_name || member.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-800">{member.full_name || 'Staff Member'}</p>
                      <p className="text-sm text-slate-500">{member.email}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Joined {new Date(member.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {!isEditing && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingId(member.id);
                          setEditPerms(member.permissions);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemove(member.id)}
                        className="inline-flex items-center gap-1.5 text-xs bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* Permissions */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Permissions</p>
                  
                  {isEditing ? (
                    <div className="space-y-2">
                      {Object.entries(editPerms).map(([key, value]) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => setEditPerms({ ...editPerms, [key]: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-700 capitalize">{key}</span>
                        </label>
                      ))}
                      
                      <div className="flex gap-2 pt-3 mt-3 border-t border-slate-200">
                        <button
                          onClick={() => handleUpdatePermissions(member.id, editPerms)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 rounded-lg font-medium transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Save Changes
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-2 rounded-lg font-medium transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(member.permissions).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          {value ? (
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                          <span className={`text-sm capitalize ${value ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                            {key}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowInviteModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Invite Team Member</h3>
              <button onClick={() => setShowInviteModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleInvite} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address *</label>
                <input
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="staff@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={inviteData.name}
                  onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Permissions</label>
                <div className="space-y-2">
                  {Object.entries(inviteData.permissions).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setInviteData({
                          ...inviteData,
                          permissions: { ...inviteData.permissions, [key]: e.target.checked }
                        })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700 capitalize">{key}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-900">
                  <strong>Note:</strong> The invited user will receive login credentials via email and can start working immediately.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inviting ? 'Inviting...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}