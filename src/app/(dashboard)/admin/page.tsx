"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldAlert, Trash2, Users } from "lucide-react";
import toast from "react-hot-toast";

import { adminApi } from "@/lib/api";
import { getUser } from "@/lib/auth";
import type { AdminUserSummary } from "@/types";

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = getUser();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.listUsers();
      setUsers(data);
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      toast.error(detail || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => ({
    users: users.length,
    bankAccounts: users.reduce((sum, user) => sum + user.bank_account_count, 0),
  }), [users]);

  const onDelete = async (user: AdminUserSummary) => {
    if (!confirm(`Delete ${user.email} and all their data? This cannot be undone.`)) return;
    try {
      await adminApi.deleteUser(user.id);
      toast.success("User deleted");
      load();
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      toast.error(detail || "Failed to delete user");
    }
  };

  if (!currentUser?.is_admin) {
    return (
      <div className="max-w-3xl bg-surface-card border border-surface-border rounded-2xl p-8 text-center">
        <ShieldAlert className="w-12 h-12 mx-auto text-loss mb-3" />
        <h2 className="text-lg font-semibold text-white">Admin access required</h2>
        <p className="text-sm text-muted mt-2">This area is only available to admin accounts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl animate-fade-up">
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
        <div className="bg-surface-card border border-surface-border rounded-2xl p-4 shadow-card">
          <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-1.5">Registered Users</p>
          <p className="text-2xl font-bold text-white">{totals.users}</p>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-2xl p-4 shadow-card">
          <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-1.5">Bank Accounts Tracked</p>
          <p className="text-2xl font-bold text-brand">{totals.bankAccounts}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !users.length ? (
        <div className="text-center py-20 text-muted bg-surface-card border border-surface-border rounded-2xl">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No users found</p>
        </div>
      ) : (
        <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface/50">
                  {["User", "Created", "Admin", "Stocks", "Funds", "Goals", "Loans", "Bank", "Expenses", ""].map((head) => (
                    <th key={head} className="px-4 py-3 text-left text-[10px] font-semibold text-muted uppercase tracking-widest">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-elevated/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-white">{user.full_name || user.email}</p>
                      <p className="text-xs text-muted">{user.email}</p>
                    </td>
                    <td className="px-4 py-3.5 text-muted text-xs">{user.created_at ? new Date(user.created_at).toLocaleDateString("en-PK") : "-"}</td>
                    <td className="px-4 py-3.5 text-xs">
                      <span className={user.is_admin ? "text-brand font-semibold" : "text-muted"}>{user.is_admin ? "Yes" : "No"}</span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-300">{user.stock_count}</td>
                    <td className="px-4 py-3.5 text-gray-300">{user.mutual_fund_count}</td>
                    <td className="px-4 py-3.5 text-gray-300">{user.goal_count}</td>
                    <td className="px-4 py-3.5 text-gray-300">{user.loan_count}</td>
                    <td className="px-4 py-3.5 text-gray-300">{user.bank_account_count}</td>
                    <td className="px-4 py-3.5 text-gray-300">{user.expense_income_count}</td>
                    <td className="px-4 py-3.5">
                      <button
                        disabled={currentUser?.id === user.id}
                        onClick={() => onDelete(user)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-loss/10 text-loss hover:bg-loss/20 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
