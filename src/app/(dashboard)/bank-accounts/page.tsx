"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

import Modal from "@/components/ui/Modal";
import { bankAccountsApi } from "@/lib/api";
import { formatPKR, cn } from "@/lib/utils";
import type { BankAccount } from "@/types";

interface BankAccountForm {
  bank_name: string;
  account_title: string;
  account_type: string;
  account_number_last4: string;
  balance: number;
  notes: string;
}

const inputCls = "w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand focus:shadow-glow-brand-sm transition-all";

const emptyDefaults: BankAccountForm = {
  bank_name: "",
  account_title: "",
  account_type: "",
  account_number_last4: "",
  balance: 0,
  notes: "",
};

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [showModal, setShowModal] = useState(false);
  const form = useForm<BankAccountForm>({ defaultValues: emptyDefaults });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await bankAccountsApi.list();
      setAccounts(data);
    } catch {
      toast.error("Failed to load bank accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    form.reset(emptyDefaults);
    setShowModal(true);
  };

  const openEdit = (account: BankAccount) => {
    setEditing(account);
    form.reset({
      bank_name: account.bank_name,
      account_title: account.account_title || "",
      account_type: account.account_type || "",
      account_number_last4: account.account_number_last4 || "",
      balance: account.balance,
      notes: account.notes || "",
    });
    setShowModal(true);
  };

  const onSubmit = async (values: BankAccountForm) => {
    const payload = {
      ...values,
      account_number_last4: values.account_number_last4?.trim() || undefined,
    };
    try {
      if (editing) {
        await bankAccountsApi.update(editing.id, payload);
        toast.success("Bank account updated");
      } else {
        await bankAccountsApi.create(payload);
        toast.success("Bank account added");
      }
      setShowModal(false);
      setEditing(null);
      form.reset(emptyDefaults);
      load();
    } catch {
      toast.error("Failed to save bank account");
    }
  };

  const onDelete = async (account: BankAccount) => {
    if (!confirm(`Delete ${account.bank_name} account?`)) return;
    try {
      await bankAccountsApi.delete(account.id);
      toast.success("Bank account deleted");
      load();
    } catch {
      toast.error("Failed to delete bank account");
    }
  };

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

  return (
    <div className="space-y-5 max-w-5xl animate-fade-up">
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
        <div className="bg-surface-card border border-surface-border rounded-2xl p-4 relative overflow-hidden shadow-card">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand/30 to-transparent" />
          <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-1.5">Bank Holdings</p>
          <p className="text-lg sm:text-xl font-bold text-brand break-words">{formatPKR(totalBalance)}</p>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-2xl p-4 relative overflow-hidden shadow-card">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand/30 to-transparent" />
          <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-1.5">Accounts</p>
          <p className="text-lg sm:text-xl font-bold text-white break-words">{accounts.length}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-1.5 bg-gradient-brand hover:opacity-90 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-glow-brand-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Add Bank Account
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !accounts.length ? (
        <div className="text-center py-20 text-muted bg-surface-card border border-surface-border rounded-2xl">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No bank accounts added yet</p>
          <p className="text-xs text-muted/60 mt-1">Add cash balances here to include them in your net worth</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((account) => (
            <div key={account.id} className="bg-surface-card border border-surface-border rounded-2xl p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white">{account.bank_name}</p>
                  <p className="text-xs text-muted mt-1">
                    {[account.account_type, account.account_title, account.account_number_last4 ? `...${account.account_number_last4}` : null]
                      .filter(Boolean)
                      .join(" · ") || "Bank account"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(account)} className="p-2 text-muted hover:text-brand hover:bg-brand/10 rounded-lg transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => onDelete(account)} className="p-2 text-muted hover:text-loss hover:bg-loss/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-5 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted font-semibold">Available Balance</p>
                  <p className={cn("mt-1 text-2xl font-bold", account.balance >= 0 ? "text-brand" : "text-loss")}>
                    {formatPKR(account.balance)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-brand" />
                </div>
              </div>
              {account.notes && <p className="mt-4 text-xs text-muted leading-5">{account.notes}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Bank Account" : "Add Bank Account"}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bank Name</label>
              <input {...form.register("bank_name", { required: true })} className={inputCls} placeholder="Meezan Bank" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Balance</label>
              <input type="number" step="0.01" {...form.register("balance", { required: true, valueAsNumber: true })} className={inputCls} placeholder="0.00" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Account Title</label>
              <input {...form.register("account_title")} className={inputCls} placeholder="Personal Savings" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Account Type</label>
              <input {...form.register("account_type")} className={inputCls} placeholder="Savings / Current" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Last 4 Digits</label>
            <input maxLength={4} {...form.register("account_number_last4")} className={inputCls} placeholder="1234" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</label>
            <textarea {...form.register("notes")} rows={3} className={inputCls + " resize-none"} placeholder="Optional note" />
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
            <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-surface-border rounded-xl py-2.5 text-sm text-gray-400 hover:bg-surface-elevated transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-gradient-brand hover:opacity-90 text-white rounded-xl py-2.5 text-sm font-semibold shadow-glow-brand-sm transition-all">
              {editing ? "Save Changes" : "Add Account"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
