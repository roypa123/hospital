import React, { useEffect, useState } from 'react';
import { api } from '@/api/endpoints';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users as UsersIcon, 
  Search, 
  RefreshCw, 
  ShieldAlert,
  UserX,
  ShieldCheck,
  Layers,
  Edit2
} from 'lucide-react';
import { toast } from 'sonner';

export const Users: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Search & Filter
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 7;

  // Role Edit Modal
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [updatingRole, setUpdatingRole] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.users.list();
      setUsers(res.data || []);
    } catch (e: any) {
      toast.error('Failed to load user accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user: any) => {
    const nextStatus = !user.is_active;
    try {
      await api.users.updateStatus(user.id, nextStatus);
      toast.success(`Account status for ${user.first_name} updated successfully!`);
      // Snap update local state
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: nextStatus } : u));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleOpenRoleModal = (user: any) => {
    setEditingUser(user);
    setSelectedRole(user.roles_list?.split(',')[0] || 'PATIENT');
  };

  const handleRoleChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !selectedRole) return;
    setUpdatingRole(true);
    try {
      await api.users.updateRole(editingUser.id, selectedRole);
      toast.success(`Access level for ${editingUser.first_name} updated to ${selectedRole}`);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change user role');
    } finally {
      setUpdatingRole(false);
    }
  };

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter]);

  // Filtering logic
  const filteredUsers = users.filter(u => {
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    const email = (u.email || '').toLowerCase();
    const searchMatch = fullName.includes(search.toLowerCase()) || email.includes(search.toLowerCase());

    const roles = (u.roles_list || '').toUpperCase();
    const roleMatch = !roleFilter || roles.includes(roleFilter.toUpperCase());

    const statusMatch = !statusFilter || 
      (statusFilter === 'active' && u.is_active) || 
      (statusFilter === 'inactive' && !u.is_active);

    return searchMatch && roleMatch && statusMatch;
  });

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Summary Metrics
  const totalAccounts = users.length;
  const staffAccounts = users.filter(u => {
    const r = u.roles_list || '';
    return r.includes('ADMIN') || r.includes('DOCTOR') || r.includes('PHARMACIST') || r.includes('LAB_TECHNICIAN') || r.includes('NURSE');
  }).length;
  const inactiveAccounts = users.filter(u => !u.is_active).length;

  return (
    <div className="space-y-6">
      {/* Title & Refresh */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">System Accounts Ledger</h2>
          <p className="text-xs text-slate-500 dark:text-slate-450 mt-0.5">Control staff access privileges, grant credentials, and audit active directories.</p>
        </div>
        <Button 
          onClick={fetchUsers} 
          disabled={loading}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl px-3 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Sync Registry
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Total Accounts</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalAccounts}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <UsersIcon className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Clinical & Operations Staff</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">{staffAccounts}</h3>
            </div>
            <div className="p-3 bg-teal-500/10 text-teal-500 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Suspended Access</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">{inactiveAccounts}</h3>
            </div>
            <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
              <UserX className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Ledger */}
      <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">User Directory Roster</CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-450">Review security roles, modify staff privileges, and change status.</CardDescription>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
            <div className="relative flex-1 md:flex-initial md:w-60">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs rounded-xl"
              />
            </div>
            
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 text-xs rounded-xl focus:outline-none"
            >
              <option value="">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="DOCTOR">Doctor</option>
              <option value="PHARMACIST">Pharmacist</option>
              <option value="LAB_TECHNICIAN">Lab Tech</option>
              <option value="NURSE">Nurse</option>
              <option value="CASHIER">Cashier</option>
              <option value="PATIENT">Patient</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 text-xs rounded-xl focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Suspended</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading && users.length === 0 ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500">
              No matching user records located in database.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-150 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">User Profile Details</th>
                      <th className="py-3 px-4">Assigned Role</th>
                      <th className="py-3 px-4">Account Status</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4 text-right">Access Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {paginatedUsers.map((u) => {
                      const rolesList = u.roles_list || 'PATIENT';
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 font-bold font-mono">
                                {u.first_name?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">{u.first_name} {u.last_name}</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-0.5">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide uppercase
                              ${rolesList.includes('ADMIN') 
                                ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' 
                                : rolesList.includes('DOCTOR')
                                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                  : rolesList.includes('PHARMACIST')
                                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                    : rolesList.includes('LAB_TECHNICIAN')
                                      ? 'bg-teal-500/10 text-teal-500 border border-teal-500/20'
                                      : 'bg-slate-100 dark:bg-slate-800/60 text-slate-655 dark:text-slate-400'}`}>
                              {rolesList}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {u.is_active ? (
                              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-500">
                                <ShieldCheck className="w-3.5 h-3.5" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 font-bold text-rose-500">
                                <ShieldAlert className="w-3.5 h-3.5" /> Suspended
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                onClick={() => handleOpenRoleModal(u)}
                                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] h-7 px-2.5 rounded-lg cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" /> Role
                              </Button>
                              <Button
                                onClick={() => handleToggleStatus(u)}
                                className={`text-[10px] h-7 px-2.5 rounded-lg cursor-pointer font-bold transition-all
                                  ${u.is_active 
                                    ? 'bg-rose-500/10 hover:bg-rose-500/25 text-rose-500 border border-rose-500/10' 
                                    : 'bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-500 border border-emerald-500/10'}`}
                              >
                                {u.is_active ? 'Suspend' : 'Activate'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination bar */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-150 dark:border-slate-800 text-xs">
                  <span className="text-slate-500 dark:text-slate-450">
                    Showing <span className="font-bold text-slate-800 dark:text-slate-200">{Math.min(filteredUsers.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}</span> to{' '}
                    <span className="font-bold text-slate-800 dark:text-slate-200">{Math.min(filteredUsers.length, currentPage * ITEMS_PER_PAGE)}</span> of{' '}
                    <span className="font-bold text-slate-800 dark:text-slate-200">{filteredUsers.length}</span> accounts
                  </span>
                  
                  <div className="flex gap-1">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-350 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPage(idx + 1)}
                        className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer transition-all
                          ${currentPage === idx + 1
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850'
                          }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-350 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* MODAL: ASSIGN ACCESS ROLE */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <Card className="w-full max-w-sm bg-slate-900 border-slate-800 rounded-2xl shadow-2xl relative">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Assign Account Privileges</CardTitle>
              <CardDescription className="text-xs text-slate-400">Change role assignments for {editingUser.first_name} {editingUser.last_name}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRoleChangeSubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-350">Select Target Role</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  >
                    <option value="PATIENT">Patient</option>
                    <option value="DOCTOR">Doctor</option>
                    <option value="PHARMACIST">Pharmacist</option>
                    <option value="LAB_TECHNICIAN">Lab Technician</option>
                    <option value="NURSE">Nurse</option>
                    <option value="CASHIER">Cashier</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="ADMIN">System Admin</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-850">
                  <Button 
                    type="button" 
                    onClick={() => setEditingUser(null)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-2 cursor-pointer font-bold"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={updatingRole}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2 cursor-pointer font-bold shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-1.5"
                  >
                    {updatingRole ? 'Updating...' : 'Assign Role'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
