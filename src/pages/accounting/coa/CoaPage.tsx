import { useMemo, useState } from "react";
import { CoaForm } from "./components/CoaForm";
import { CoaTable } from "./components/CoaTable";
import { useCoa } from "./hooks/useCoa";
import type { CoaFormData, CoaNode } from "./types";

interface CoaPageProps {
  entityId?: string | null;
}

export function CoaPage({ entityId = null }: CoaPageProps) {
  const {
    accounts,
    loading,
    saving,
    error,
    createAccount,
    updateAccount,
    deleteAccount,
  } = useCoa(entityId);

  const [editingAccount, setEditingAccount] = useState<CoaNode | null>(null);
  const [search, setSearch] = useState("");

  const filteredAccounts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return accounts;
    }

    return accounts.filter((account) => {
      return (
        account.code.toLowerCase().includes(keyword) ||
        account.name.toLowerCase().includes(keyword) ||
        (account.category_code ?? "").toLowerCase().includes(keyword) ||
        (account.account_type ?? "").toLowerCase().includes(keyword)
      );
    });
  }, [accounts, search]);

  const handleSubmit = async (payload: CoaFormData) => {
    if (editingAccount) {
      const success = await updateAccount(editingAccount.id, payload);

      if (success) {
        setEditingAccount(null);
      }

      return success;
    }

    return createAccount(payload);
  };

  const handleDelete = async (account: CoaNode) => {
    const confirmed = window.confirm(
      `Hapus akun ${account.code} - ${account.name}?`
    );

    if (!confirmed) {
      return;
    }

    await deleteAccount(account.id);
  };

  return (
    <div className="w-full pr-10 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Chart of Accounts
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Kelola daftar akun akuntansi perusahaan.
          </p>
        </div>

        <div className="w-full md:w-80">
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari kode, nama, kategori..."
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <CoaForm
        accounts={accounts}
        initialValue={editingAccount}
        entityId={entityId}
        saving={saving}
        onSubmit={handleSubmit}
        onCancel={editingAccount ? () => setEditingAccount(null) : undefined}
      />

      <CoaTable
        accounts={filteredAccounts}
        loading={loading}
        onEdit={setEditingAccount}
        onDelete={handleDelete}
      />
    </div>
  );
}

export default CoaPage;