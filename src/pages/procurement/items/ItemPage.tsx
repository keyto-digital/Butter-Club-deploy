import { useEffect, useMemo, useState } from "react";
import { useItems } from "./hooks/useItems";
import type { Item, ItemFormData, ItemType } from "./types";
import { getCustomUser } from "@/lib/authUser";

const itemTypeLabels: Record<ItemType, string> = {
  STOCK: "Stok / Persediaan",
  NON_STOCK: "Non-Stok / Beban",
  SERVICE: "Jasa",
};

const initialForm: ItemFormData = {
  entity_id: null,

  code: "",
  name: "",
  description: "",
  item_type: "STOCK",

  category_id: "",
  subcategory_id: "",
  unit_id: "",

  inventory_account_id: "",
  expense_account_id: "",
  cogs_account_id: "",
  stock_adjustment_account_id: "",

  minimum_stock: 0,
  standard_cost: 0,
  is_active: true,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function ItemPage() {
  const {
    items,
    categories,
    subcategories,
    units,
    accounts,
    loading,
    loadingMasters,
    saving,
    error,
    createItem,
    updateItem,
    deleteItem,
  } = useItems();


  const currentUser = getCustomUser();
    if (!currentUser?.entity_id) {
      alert("Entity user tidak ditemukan.");
      return;
    }

  const entityId = currentUser?.entity_id ?? null;
  const [formData, setFormData] = useState<ItemFormData>(initialForm);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!editingItem) {
      setFormData({
        ...initialForm,
        entity_id: currentUser.entity_id,
      });
      return;
    }

    setFormData({
      entity_id: editingItem.entity_id,

      code: editingItem.code,
      name: editingItem.name,
      description: editingItem.description ?? "",
      item_type: editingItem.item_type,

      category_id: editingItem.category_id,
      subcategory_id: editingItem.subcategory_id ?? "",
      unit_id: editingItem.unit_id,

      inventory_account_id: editingItem.inventory_account_id ?? "",
      expense_account_id: editingItem.expense_account_id ?? "",
      cogs_account_id: editingItem.cogs_account_id ?? "",
      stock_adjustment_account_id:
        editingItem.stock_adjustment_account_id ?? "",

      minimum_stock: Number(editingItem.minimum_stock || 0),
      standard_cost: Number(editingItem.standard_cost || 0),
      is_active: editingItem.is_active,
    });
  }, [editingItem, entityId]);

  const availableSubcategories = useMemo(() => {
    if (!formData.category_id) return [];

    return subcategories.filter(
      (subcategory) => subcategory.category_id === formData.category_id
    );
  }, [formData.category_id, subcategories]);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return items;

    return items.filter((item) => {
      return (
        item.code.toLowerCase().includes(keyword) ||
        item.name.toLowerCase().includes(keyword) ||
        item.item_type.toLowerCase().includes(keyword) ||
        (item.category?.name ?? "").toLowerCase().includes(keyword) ||
        (item.subcategory?.name ?? "").toLowerCase().includes(keyword)
      );
    });
  }, [items, search]);

  const updateField = (
    field: keyof ItemFormData,
    value: string | number | boolean
  ) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleCategoryChange = (categoryId: string) => {
    setFormData((previous) => ({
      ...previous,
      category_id: categoryId,
      subcategory_id: "",
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.code.trim() || !formData.name.trim()) {
      window.alert("Kode dan nama artikel wajib diisi.");
      return;
    }

    if (!formData.category_id) {
      window.alert("Kategori barang wajib dipilih.");
      return;
    }

    if (!formData.unit_id) {
      window.alert("Satuan wajib dipilih.");
      return;
    }

    if (Number(formData.minimum_stock) < 0) {
      window.alert("Minimum stok tidak boleh negatif.");
      return;
    }

    if (Number(formData.standard_cost) < 0) {
      window.alert("Harga standar tidak boleh negatif.");
      return;
    }

    const success = editingItem
      ? await updateItem(editingItem.id, formData)
      : await createItem(formData);

    if (success) {
      setEditingItem(null);
      setFormData({
        ...initialForm,
        entity_id: currentUser.entity_id,
      });
    }
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (item: Item) => {
    const confirmed = window.confirm(
      `Hapus artikel ${item.code} - ${item.name}?`
    );

    if (!confirmed) return;

    await deleteItem(item.id);
  };

  return (
    <div className="w-full pr-10 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Master Item / Artikel Barang
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Hubungkan artikel dengan kategori, COA, satuan, dan perlakuan stok.
          </p>
        </div>

        <div className="w-full md:w-80">
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari kode, artikel, kategori..."
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loadingMasters && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Memuat kategori, subkategori, satuan, dan akun COA...
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {editingItem ? "Edit Artikel Barang" : "Tambah Artikel Barang"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Kosongkan akun override agar item mengikuti akun kategori atau
              subkategorinya.
            </p>
          </div>

          {editingItem && (
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Batal Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Kode Artikel
            </label>
            <input
              value={formData.code}
              onChange={(event) => updateField("code", event.target.value)}
              placeholder="Contoh: 210001"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nama Artikel
            </label>
            <input
              value={formData.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Contoh: Milk UHT 1 Liter"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tipe Artikel
            </label>
            <select
              value={formData.item_type}
              onChange={(event) =>
                updateField("item_type", event.target.value)
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {Object.entries(itemTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Satuan
            </label>
            <select
              value={formData.unit_id}
              onChange={(event) => updateField("unit_id", event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Pilih satuan</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.code} - {unit.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Kategori Barang
            </label>
            <select
              value={formData.category_id}
              onChange={(event) => handleCategoryChange(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Pilih kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.code} - {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Subkategori Barang
            </label>
            <select
              value={formData.subcategory_id}
              onChange={(event) =>
                updateField("subcategory_id", event.target.value)
              }
              disabled={!formData.category_id}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
            >
              <option value="">Tanpa subkategori</option>
              {availableSubcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>
                  {subcategory.code} - {subcategory.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Minimum Stok
            </label>
            <input
              type="number"
              min="0"
              step="0.0001"
              value={formData.minimum_stock}
              onChange={(event) =>
                updateField(
                  "minimum_stock",
                  Number(event.target.value || 0)
                )
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Harga Standar
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.standard_cost}
              onChange={(event) =>
                updateField(
                  "standard_cost",
                  Number(event.target.value || 0)
                )
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Keterangan
            </label>
            <textarea
              value={formData.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              rows={2}
              placeholder="Keterangan artikel (opsional)"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Override Akun Persediaan
            </label>
            <select
              value={formData.inventory_account_id}
              onChange={(event) =>
                updateField("inventory_account_id", event.target.value)
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Ikuti kategori / subkategori</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} - {account.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Override Akun Beban Non-Stok
            </label>
            <select
              value={formData.expense_account_id}
              onChange={(event) =>
                updateField("expense_account_id", event.target.value)
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Ikuti kategori / subkategori</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} - {account.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Override Akun HPP
            </label>
            <select
              value={formData.cogs_account_id}
              onChange={(event) =>
                updateField("cogs_account_id", event.target.value)
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Ikuti kategori / subkategori</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} - {account.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Override Akun Selisih Stok
            </label>
            <select
              value={formData.stock_adjustment_account_id}
              onChange={(event) =>
                updateField(
                  "stock_adjustment_account_id",
                  event.target.value
                )
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Ikuti kategori / subkategori</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} - {account.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex h-[42px] cursor-pointer items-center gap-2 rounded-md border border-gray-300 px-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(event) =>
                  updateField("is_active", event.target.checked)
                }
                className="h-4 w-4"
              />
              Artikel aktif
            </label>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? "Menyimpan..."
              : editingItem
                ? "Simpan Perubahan"
                : "Simpan Artikel"}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="font-semibold text-gray-900">
            Daftar Item / Artikel Barang
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Kode
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Artikel
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Tipe
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Kategori
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Satuan
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">
                  Harga Standar
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Status
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    Memuat artikel barang...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    Belum ada artikel barang.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {item.code}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div>{item.name}</div>
                      {item.description && (
                        <div className="mt-1 text-xs text-gray-500">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {itemTypeLabels[item.item_type]}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div>{item.category?.name ?? "-"}</div>
                      {item.subcategory?.name && (
                        <div className="mt-1 text-xs text-gray-500">
                          {item.subcategory.name}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {item.unit?.code ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatCurrency(item.standard_cost)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          item.is_active
                            ? "rounded-full bg-green-100 px-2 py-1 text-xs text-green-700"
                            : "rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600"
                        }
                      >
                        {item.is_active ? "Aktif" : "Tidak Aktif"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="mr-3 text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ItemPage;