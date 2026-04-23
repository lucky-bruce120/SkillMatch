import React, { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const result = await pb.collection('users').getList(1, 50, {
        sort: '-created',
        $autoCancel: false
      });
      setUsers(result.items);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleStatus = async (user) => {
    const newStatus = user.account_status === 'active' ? 'deactivated' : 'active';
    try {
      await pb.collection('users').update(user.id, { account_status: newStatus }, { $autoCancel: false });
      setUsers(users.map(u => u.id === user.id ? { ...u, account_status: newStatus } : u));
      toast.success(`User ${newStatus}`);
    } catch (error) {
      toast.error("Failed to update user status");
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container space-y-8">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage all platform users.</p>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="font-medium">{user.email}</td>
                <td>{user.name || '-'}</td>
                <td>
                  <Badge variant="outline">{user.role}</Badge>
                </td>
                <td>
                  <Badge variant={user.account_status === 'active' ? 'default' : 'destructive'}>
                    {user.account_status || 'active'}
                  </Badge>
                </td>
                <td>{new Date(user.created).toLocaleDateString()}</td>
                <td className="text-right space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => toggleStatus(user)}
                    className={user.account_status === 'active' ? 'text-destructive hover:bg-destructive/10' : 'text-green-600 hover:bg-green-50'}
                  >
                    {user.account_status === 'active' ? 'Deactivate' : 'Activate'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagementPage;
