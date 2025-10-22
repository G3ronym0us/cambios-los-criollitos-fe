"use client";

import { useState, useEffect } from 'react';
import { userService } from '@/services/userService';
import { CommissionUserResponse, CommissionUserUpdate, UserCreate, UserUpdate, UserData } from '@/types/user';
import { Users, Edit, Check, X, UserCheck, UserX } from 'lucide-react';
import CreateUser from '@/components/admin/users/CreateUser';
import EditUser from '@/components/admin/users/EditUser';
import Modal from '@/components/utils/Modal';

export default function UsersPage() {
  const [users, setUsers] = useState<CommissionUserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CommissionUserUpdate>({
    can_receive_commission: false
  });
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const result = await userService.getAllUsers({ active_only: true });

    if (result.success && result.data) {
      // Check if data is an array or has users property
      const usersArray = Array.isArray(result.data) ? result.data : result.data.users;
      setUsers(usersArray || []);
    }
    setLoading(false);
  };

  const handleEdit = (user: CommissionUserResponse) => {
    setEditingId(user.uuid);
    setEditForm({
      can_receive_commission: user.can_receive_commission
    });
  };

  const handleSave = async (userUuid: string) => {
    const result = await userService.updateCommissionSettings(userUuid, editForm);

    if (result.success) {
      setEditingId(null);
      loadUsers();
    } else {
      alert(result.error || 'Error al actualizar configuración');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleCreateUser = () => {
    setShowCreateUser(!showCreateUser);
  };

  const submitCreateUser = async (data: UserCreate) => {
    const result = await userService.createUser(data);
    if (result.success) {
      handleCreateUser();
      loadUsers();
    } else {
      alert(result.error || 'Error al crear usuario');
    }
  };

  const handleOpenEditUser = async (userUuid: string) => {
    // Fetch full user data
    const result = await userService.getUserById(userUuid);
    if (result.success && result.data) {
      setSelectedUser(result.data);
      setShowEditUser(true);
    } else {
      alert(result.error || 'Error al cargar datos del usuario');
    }
  };

  const handleUpdateUser = async (userUuid: string, data: UserUpdate) => {
    const result = await userService.updateUser(userUuid, data);
    if (result.success) {
      setShowEditUser(false);
      setSelectedUser(null);
      loadUsers();
    } else {
      alert(result.error || 'Error al actualizar usuario');
    }
  };

  const handleDeleteUser = async (userUuid: string, userName: string) => {
    const confirmed = confirm(
      `¿Estás seguro que deseas desactivar al usuario "${userName}"? Esta acción se puede revertir más tarde.`
    );
    if (!confirmed) return;

    const result = await userService.deleteUser(userUuid);
    if (result.success) {
      loadUsers();
    } else {
      alert(result.error || 'Error al desactivar usuario');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users size={28} />
          Gestión de Usuarios
        </h1>
        <p className="text-gray-600 text-sm mt-1">
          Administra usuarios, permisos y configuración de comisiones
        </p>
        </div>

        <button className="bg-blue-500 text-white px-4 py-2 rounded-md" onClick={handleCreateUser}> Crear Usuario </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 rounded-full p-3">
              <UserCheck className="text-white" size={20} />
            </div>
            <div>
              <p className="text-sm text-blue-700">Usuarios Comisionistas</p>
              <p className="text-2xl font-bold text-blue-900">
                {users.filter(u => u.can_receive_commission).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-gray-600 rounded-full p-3">
              <Users className="text-white" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-700">Total de Usuarios</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Puede Recibir Comisión
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Creación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.uuid} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">
                          {(user.full_name || user.username).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">
                          {user.full_name || user.username}
                        </p>
                        <p className="text-xs text-gray-500">@{user.username}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {user.email}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === user.uuid ? (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editForm.can_receive_commission}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              can_receive_commission: e.target.checked
                            })
                          }
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">
                          {editForm.can_receive_commission ? 'Sí' : 'No'}
                        </span>
                      </label>
                    ) : (
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.can_receive_commission
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {user.can_receive_commission ? 'Sí' : 'No'}
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(user.created_at)}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {editingId === user.uuid ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSave(user.uuid)}
                          className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700"
                          title="Guardar Comisión"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="p-1.5 bg-gray-600 text-white rounded hover:bg-gray-700"
                          title="Cancelar"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          title="Cambiar Comisión"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenEditUser(user.uuid)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar Usuario"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.uuid, user.full_name || user.username)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="Desactivar Usuario"
                        >
                          <UserX size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="p-12 text-center">
            <Users className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay usuarios</h3>
            <p className="text-gray-600">No se encontraron usuarios en el sistema</p>
          </div>
        )}
      </div>
      <Modal title="Crear Usuario" show={showCreateUser} onClose={() => setShowCreateUser(false)}>
        <CreateUser saveUser={submitCreateUser} />
      </Modal>

      {selectedUser && (
        <Modal
          title="Editar Usuario"
          show={showEditUser}
          onClose={() => {
            setShowEditUser(false);
            setSelectedUser(null);
          }}
        >
          <EditUser
            user={selectedUser}
            onSave={handleUpdateUser}
            onCancel={() => {
              setShowEditUser(false);
              setSelectedUser(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
