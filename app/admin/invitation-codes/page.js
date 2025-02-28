'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/AuthContext';
import { useRouter } from 'next/navigation';

export default function InvitationCodesPage() {
  const [codes, setCodes] = useState([]);
  const [newCode, setNewCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const router = useRouter();

  // Fetch codes on component mount
  useEffect(() => {
    if (!user) {
      router.push('/admin/login');
      return;
    }
    fetchCodes();
  }, [user]);

  const fetchCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('invitation_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data);
    } catch (error) {
      console.error('Error fetching codes:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    // Generate a random 8-character code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(result);
  };

  const createCode = async () => {
    if (!newCode) return;

    try {
      const { error } = await supabase
        .from('invitation_codes')
        .insert([{ code: newCode, created_by: user.id }]);

      if (error) throw error;

      setNewCode('');
      fetchCodes();
    } catch (error) {
      console.error('Error creating code:', error);
      setError(error.message);
    }
  };

  const deleteCode = async (codeId) => {
    try {
      const { error } = await supabase
        .from('invitation_codes')
        .delete()
        .eq('id', codeId);

      if (error) throw error;
      fetchCodes();
    } catch (error) {
      console.error('Error deleting code:', error);
      setError(error.message);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Invitation Codes</h1>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
            {error}
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Create New Code</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="Enter code or generate one"
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <button
              onClick={generateCode}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Generate
            </button>
            <button
              onClick={createCode}
              disabled={!newCode}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Used By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {codes.map((code) => (
                <tr key={code.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {code.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(code.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {code.used_by || 'Not used'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => deleteCode(code.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 