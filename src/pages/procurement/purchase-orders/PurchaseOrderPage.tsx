import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { hasAccess } from "@/lib/hasAccess";
import { usePurchaseOrders } from "./hooks/usePurchaseOrders";
import { getCustomUser } from "@/lib/authUser";
import type {
  PurchaseOrder,
  PurchaseOrderFormData,
  PurchaseOrderLineForm,
  PurchaseOrderStatus,
} from "./types";

type Store = {
  id: string;
  code: string;
  name: string;
  entity_id?: string | null;
  is_active?: boolean;
};

const statusLabels: Record<PurchaseOrderStatus, string> = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  OPEN: "Open",
  PARTIAL_RECEIVED: "Sebagian Diterima",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

const statusClasses: Record<PurchaseOrderStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  APPROVED: "bg-blue-100 text-blue-700",
  OPEN: "bg-green-100 text-green-700",
  PARTIAL_RECEIVED: "bg-yellow-100 text-yellow-700",
  CLOSED: "bg-purple-100 text-purple-700",
  CANCELLED: "bg-red-100 text-red-700",
};

function todayInputValue() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 10);
}

function createEmptyLine(): PurchaseOrderLineForm {
  return {
    item_id: "",
    quantity_ordered: 1,
    unit_price: 0,
    discount_amount: 0,
    tax_amount: 0,
    notes: "",
  };
}

function createInitialForm(): PurchaseOrderFormData {
  const entityId = getCustomUser()?.entity_id ?? null;

  return {
    entity_id: entityId,
    order_date: todayInputValue(),
    expected_delivery_date: "",
    supplier_id: "",
    store_id: "",
    payment_term_days: 0,
    notes: "",
    details: [createEmptyLine()],
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(Number(value || 0));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function printPurchaseOrder(
  purchaseOrder: PurchaseOrder,
  details: PurchaseOrderLineForm[]
) {
  const rows = details
    .map((detail, index) => {

      const total =
        Number(detail.quantity_ordered) * Number(detail.unit_price) -
        Number(detail.discount_amount) +
        Number(detail.tax_amount);

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${detail.item_code_snapshot ?? "-"}</td>
          <td>${detail.item_name_snapshot ?? "-"}</td>
          <td class="right">${Number(detail.quantity_ordered)}</td>
          <td>${detail.unit_code_snapshot ?? "-"}</td>
          <td class="right">${formatCurrency(Number(detail.unit_price))}</td>
          <td class="right">${formatCurrency(total)}</td>
        </tr>
      `;
    })
    .join("");

  const printWindow = window.open("", "_blank", "width=1000,height=800");

  if (!printWindow) {
    window.alert("Popup print diblokir browser.");
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>PO ${purchaseOrder.po_number}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            * { box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              color: #111827;
              font-size: 12px;
            }
            h1 { margin: 0; font-size: 22px; }
            h2 { margin: 4px 0 20px; font-size: 14px; font-weight: normal; }
            .header{
                display:grid;
                grid-template-columns:140px 1fr;
                grid-template-rows:auto auto;
                border-bottom:2px solid #111827;
                padding-bottom:10px;
                margin-bottom:20px;
                column-gap:20px;
            }

            .logo{
                width:200px;
                height:auto;
                display:block;
                margin-top:2px;
            }

            .logo-wrap{
                grid-column:1;
                grid-row:1;
            }

            .company{
                grid-column:2;
                grid-row:1;
                width:100%;
                text-align:right;
            }

            .company h1{
                margin:0;
                font-size:24px;
                font-weight:700;
                letter-spacing:2px;
                line-height:1;
            }

            .company h2{
                margin:6px 0 0;
                font-size:13px;
                font-weight:normal;
                color:#666;
            }

            .address{
                grid-column:2;
                grid-row:2;
                width:100%;
                text-align:right;
                white-space:nowrap;
                font-size:11px;
                color:#555;
                margin-top:10px;
            }

            .info-header{
                display:grid;
                grid-template-columns:1fr 230px;
                column-gap:40px;
                align-items:start;
                margin-bottom:18px;
            }

            .info{
                display:grid;
                grid-template-columns:130px 10px 1fr;
                row-gap:6px;
            }

            .info strong{
                font-weight:bold;
            }

            .info .colon{
                text-align:center;
            }

            .po-info{
                display:grid;
                grid-template-columns:80px 10px 1fr;
                row-gap:6px;
                align-self:start;
                justify-self:end;
                width:220px;
            }

            .po-info strong{
                display:block;
                text-align:left;
            }

            .po-info .colon{
                text-align:right;
                padding-right:2px;
            }

            .po-info .value{
                text-align:right;
            }

            thead th{
                background:#dbeafe;
                font-weight:bold;
                text-align:center;
            }

            tbody td{
                height:28px;
            }

            .total{
                margin-top:20px;
                width:340px;
                font-size:13px;
            }

            .total tr:last-child{
                background:#f3f4f6;
                font-size:14px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }
            th, td {
              border: 1px solid #374151;
              padding: 7px;
              vertical-align: top;
            }
            th { background: #e5e7eb; }
            .right { text-align: right; }
            .total {
              width: 320px;
              margin-left: auto;
              margin-top: 14px;
              border-collapse: collapse;
            }
            .total td { border: 1px solid #374151; }
            .notes {
              margin-top: 18px;
              border: 1px solid #9ca3af;
              min-height: 60px;
              padding: 8px;
            }
            .signature {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 80px;
              margin-top: 60px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
                <img src="/logo.png" class="logo">
            </div>
            <div class="company">
                <h1>PURCHASE ORDER</h1>
            </div>

            <div class="address">
                Sendangadi, Mlati, Sleman, Yogyakarta 55285 &nbsp;&nbsp; | &nbsp;&nbsp;
                Purchasing : 0811 2656 028 &nbsp;&nbsp; | &nbsp;&nbsp;
                E-mail : bcb.financeadmin@gmail.com
            </div>
          </div>
            <div class="info-header">
              <div class="info">
                  <strong>Supplier</strong>
                  <span class="colon">:</span>
                  <span>${purchaseOrder.supplier_name_snapshot}</span>

                  <strong>Kode Supplier</strong>
                  <span class="colon">:</span>
                  <span>${purchaseOrder.supplier_code_snapshot}</span>

                  <strong>Estimasi Datang</strong>
                  <span class="colon">:</span>
                  <span>${
                    purchaseOrder.expected_delivery_date
                      ? formatDate(purchaseOrder.expected_delivery_date)
                      : "-"
                  }</span>

                  <strong>Termin</strong>
                  <span class="colon">:</span>
                  <span>${purchaseOrder.payment_term_days} hari</span>
              </div>

              <div class="po-info">

                <strong>No. PO</strong>
                <span class="colon">:</span>
                <span class="value">${purchaseOrder.po_number}</span>

                <strong>Tanggal</strong>
                <span class="colon">:</span>
                <span class="value">${formatDate(purchaseOrder.order_date)}</span>

                <strong>Status</strong>
                <span class="colon">:</span>
                <span class="value">${statusLabels[purchaseOrder.status]}</span>

                <strong>Store Tujuan</strong>
                <span class="colon">:</span>
                <span class="value">${purchaseOrder.store_name ?? "-"}</span>

               </div>
            </div>

        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Kode</th>
              <th>Artikel</th>
              <th>Qty</th>
              <th>Satuan</th>
              <th>Harga</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <table class="total">
          <tr>
            <td><strong>Subtotal</strong></td>
            <td class="right">${formatCurrency(purchaseOrder.subtotal)}</td>
          </tr>
          <tr>
            <td><strong>Diskon</strong></td>
            <td class="right">${formatCurrency(purchaseOrder.discount_amount)}</td>
          </tr>
          <tr>
            <td><strong>Pajak</strong></td>
            <td class="right">${formatCurrency(purchaseOrder.tax_amount)}</td>
          </tr>
          <tr>
            <td><strong>Grand Total</strong></td>
            <td class="right"><strong>${formatCurrency(
              purchaseOrder.grand_total
            )}</strong></td>
          </tr>
        </table>

        <div class="notes">
          <strong>Catatan:</strong><br />
          ${purchaseOrder.notes || "-"}
        </div>

        <div class="signature">
          <div>
            Dibuat Oleh,<br /><br /><br /><br /><br /><br />
            ______________________
          </div>
          <div>
            Mengetahui,<br /><br /><br /><br /><br /><br />
            ______________________
          </div>
        </div>

        <script>
          window.onload = () => {
            window.print();
            window.onafterprint = () => window.close();
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
}

export function PurchaseOrderPage() {
  const {
    purchaseOrders,
    suppliers,
    items,
    loading,
    loadingMasters,
    saving,
    error,
    createPurchaseOrder,
    updatePurchaseOrderDraft,
    deletePurchaseOrderDraft,
    fetchPurchaseOrderDetails,
    openPurchaseOrder,
    cancelPurchaseOrder,
    closePurchaseOrderOutstanding,
  } = usePurchaseOrders();

  const [showForm, setShowForm] = useState(false);
  const [editingPurchaseOrder, setEditingPurchaseOrder] =
    useState<PurchaseOrder | null>(null);
  const [access, setAccess] = useState({
    create: false,
    editDraft: false,
    deleteDraft: false,
    open: false,
    cancel: false,
    closeOutstanding: false,
    print: false,
    export: false,
  });
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState<PurchaseOrderFormData>(() =>
    createInitialForm()
  );

  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    const loadStores = async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, code, name, entity_id, is_active")
        .eq("is_active", true)
        .order("code");

      if (error) {
        console.error("Gagal memuat store:", error);
        return;
      }

      setStores((data ?? []) as Store[]);
    };

    loadStores();
  }, []);

  useEffect(() => {
    async function loadAccess() {
      const [
        create,
        editDraft,
        deleteDraft,
        open,
        cancel,
        closeOutstanding,
        print,
        exportExcel,
      ] = await Promise.all([
        hasAccess("purchase_order.create"),
        hasAccess("purchase_order.edit_draft"),
        hasAccess("purchase_order.delete_draft"),
        hasAccess("purchase_order.open"),
        hasAccess("purchase_order.cancel"),
        hasAccess("purchase_order.close_outstanding"),
        hasAccess("purchase_order.print"),
        hasAccess("purchase_order.export"),
      ]);

      setAccess({
        create,
        editDraft,
        deleteDraft,
        open,
        cancel,
        closeOutstanding,
        print,
        export: exportExcel,
      });
    }

    loadAccess();
  }, []);
  

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === formData.supplier_id),
    [suppliers, formData.supplier_id]
  );

  const formSubtotal = useMemo(() => {
    return formData.details.reduce((total, line) => {
      return total + Number(line.quantity_ordered || 0) * Number(line.unit_price || 0);
    }, 0);
  }, [formData.details]);

  const formDiscount = useMemo(() => {
    return formData.details.reduce(
      (total, line) => total + Number(line.discount_amount || 0),
      0
    );
  }, [formData.details]);

  const formTax = useMemo(() => {
    return formData.details.reduce(
      (total, line) => total + Number(line.tax_amount || 0),
      0
    );
  }, [formData.details]);

  const formGrandTotal = formSubtotal - formDiscount + formTax;

  const filteredPurchaseOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return purchaseOrders;

    return purchaseOrders.filter((purchaseOrder) => {
      return (
        purchaseOrder.po_number.toLowerCase().includes(keyword) ||
        purchaseOrder.supplier_code_snapshot
          .toLowerCase()
          .includes(keyword) ||
        purchaseOrder.supplier_name_snapshot
          .toLowerCase()
          .includes(keyword) ||
        purchaseOrder.status.toLowerCase().includes(keyword)
      );
    });
  }, [purchaseOrders, search]);

  const openCreateForm = () => {
    setEditingPurchaseOrder(null);
    setFormData(createInitialForm());
    setShowForm(true);
  };

  const cancelCreateForm = () => {
    setEditingPurchaseOrder(null);
    setFormData(createInitialForm());
    setShowForm(false);
  };

  const handleSupplierChange = (supplierId: string) => {
    const supplier = suppliers.find((row) => row.id === supplierId);

    setFormData((previous) => ({
      ...previous,
      supplier_id: supplierId,
      payment_term_days: supplier?.default_payment_term_days ?? 0,
    }));
  };

  const addLine = () => {
    setFormData((previous) => ({
      ...previous,
      details: [...previous.details, createEmptyLine()],
    }));
  };

  const removeLine = (index: number) => {
    setFormData((previous) => ({
      ...previous,
      details: previous.details.filter((_, lineIndex) => lineIndex !== index),
    }));
  };

  const updateLine = (
    index: number,
    field: keyof PurchaseOrderLineForm,
    value: string | number
  ) => {
    setFormData((previous) => ({
      ...previous,
      details: previous.details.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              [field]: value,
            }
          : line
      ),
    }));
  };

  const handleItemChange = (index: number, itemId: string) => {
    const item = items.find((row) => row.id === itemId);

    setFormData((previous) => ({
      ...previous,
      details: previous.details.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              item_id: itemId,
              unit_price: Number(item?.standard_cost || 0),
            }
          : line
      ),
    }));
  };

  const handleEditDraft = async (purchaseOrder: PurchaseOrder) => {
    const details = await fetchPurchaseOrderDetails(purchaseOrder.id);

    if (!details) {
      return;
    }

    setEditingPurchaseOrder(purchaseOrder);

    setFormData({
      entity_id: purchaseOrder.entity_id,
      order_date: purchaseOrder.order_date,
      expected_delivery_date:
        purchaseOrder.expected_delivery_date ?? "",
      supplier_id: purchaseOrder.supplier_id,
      store_id: purchaseOrder.store_id ?? "",
      payment_term_days: Number(
        purchaseOrder.payment_term_days || 0
      ),
      notes: purchaseOrder.notes ?? "",
      details,
    });

    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteDraft = async (purchaseOrder: PurchaseOrder) => {
    const confirmed = window.confirm(
      `Hapus Draft PO ${purchaseOrder.po_number}?`
    );

    if (!confirmed) {
      return;
    }

    const result = await deletePurchaseOrderDraft(purchaseOrder.id);

    if (result?.success) {
      window.alert(`Draft PO ${result.po_number} berhasil dihapus.`);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.supplier_id) {
      window.alert("Supplier wajib dipilih.");
      return;
    }

    if (!formData.store_id) {
      window.alert("Store/Gudang tujuan wajib dipilih.");
      return;
    }

    if (formData.details.length === 0) {
      window.alert("Purchase Order minimal memiliki satu item.");
      return;
    }

    for (let index = 0; index < formData.details.length; index += 1) {
      const line = formData.details[index];

      if (!line.item_id) {
        window.alert(`Item pada baris ${index + 1} wajib dipilih.`);
        return;
      }

      if (Number(line.quantity_ordered) <= 0) {
        window.alert(`Kuantitas pada baris ${index + 1} harus lebih dari nol.`);
        return;
      }

      if (
        Number(line.unit_price) < 0 ||
        Number(line.discount_amount) < 0 ||
        Number(line.tax_amount) < 0
      ) {
        window.alert(
          `Harga, diskon, dan pajak pada baris ${index + 1} tidak boleh negatif.`
        );
        return;
      }
    }

    const result = editingPurchaseOrder
      ? await updatePurchaseOrderDraft(editingPurchaseOrder.id, formData)
      : await createPurchaseOrder(formData);

    if (result?.success) {
      window.alert(
        editingPurchaseOrder
          ? `Draft PO ${result.po_number} berhasil diperbarui.`
          : `Purchase Order ${result.po_number} berhasil dibuat sebagai Draft.`
      );

      cancelCreateForm();
    }
  };

  const handleOpenPurchaseOrder = async (purchaseOrder: PurchaseOrder) => {
    const confirmed = window.confirm(
      `Buka PO ${purchaseOrder.po_number} agar dapat diproses Receiving?`
    );

    if (!confirmed) return;

    const success = await openPurchaseOrder(purchaseOrder.id);

    if (success) {
      window.alert(
        `PO ${purchaseOrder.po_number} sudah berstatus Open dan siap untuk Receiving.`
      );
    }
  };

  const handleCancelPurchaseOrder = async (
    purchaseOrder: PurchaseOrder
  ) => {
    const reason = window.prompt(
      `Alasan Cancel PO ${purchaseOrder.po_number}:`
    );

    if (!reason?.trim()) {
      return;
    }

    const result = await cancelPurchaseOrder(
      purchaseOrder.id,
      reason.trim()
    );

    if (result?.success) {
      window.alert(`PO ${result.po_number} berhasil dibatalkan.`);
    }
  };

  const handleCloseOutstanding = async (
    purchaseOrder: PurchaseOrder
  ) => {
    const reason = window.prompt(
      `Alasan Close Outstanding PO ${purchaseOrder.po_number}:`
    );

    if (!reason?.trim()) {
      return;
    }

    const result = await closePurchaseOrderOutstanding(
      purchaseOrder.id,
      reason.trim()
    );

    if (result?.success) {
      window.alert(`PO ${result.po_number} berhasil ditutup.`);
    }
  };

  const handlePrintPurchaseOrder = async (
    purchaseOrder: PurchaseOrder
  ) => {
    const details = await fetchPurchaseOrderDetails(purchaseOrder.id);

    if (!details) {
      return;
    }

    printPurchaseOrder(purchaseOrder, details);
  };

  const exportPurchaseOrders = () => {
    const rows = filteredPurchaseOrders.map((purchaseOrder) => ({
      "Nomor PO": purchaseOrder.po_number,
      Tanggal: purchaseOrder.order_date,
      Supplier: purchaseOrder.supplier_name_snapshot,
      "Kode Supplier": purchaseOrder.supplier_code_snapshot,
      Termin: `${purchaseOrder.payment_term_days} hari`,
      Subtotal: Number(purchaseOrder.subtotal),
      Diskon: Number(purchaseOrder.discount_amount),
      Pajak: Number(purchaseOrder.tax_amount),
      "Grand Total": Number(purchaseOrder.grand_total),
      Status: statusLabels[purchaseOrder.status],
      "Store Tujuan": purchaseOrder.store_name ?? "",
      Catatan: purchaseOrder.notes ?? "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 14 },
      { wch: 30 },
      { wch: 16 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 40 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Purchase Order"
    );

    const file = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    saveAs(
      new Blob([file], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `Purchase-Order-${todayInputValue()}.xlsx`
    );
  };

  return (
    <div className="w-full pr-10 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Purchase Order
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Buat pesanan pembelian dari supplier sebelum proses receiving.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm md:w-80"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nomor PO atau supplier..."
          />

          {access.export && (
            <button
              type="button"
              onClick={exportPurchaseOrders}
              className="rounded-md border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
            >
              Export Excel
            </button>
          )}

          {access.create && (
            <button
              type="button"
              onClick={openCreateForm}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Buat PO
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loadingMasters && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Memuat supplier dan artikel barang...
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {editingPurchaseOrder
                  ? `Edit Draft PO ${editingPurchaseOrder.po_number}`
                  : "Buat Purchase Order"}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {editingPurchaseOrder
                  ? "Draft masih dapat diubah sebelum PO dibuka."
                  : "Nomor PO dibuat otomatis saat Draft disimpan."}
              </p>
            </div>

            <button
              type="button"
              onClick={cancelCreateForm}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Batal
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Tanggal PO
              </label>
              <input
                type="date"
                value={formData.order_date}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    order_date: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Estimasi Tanggal Datang
              </label>
              <input
                type="date"
                value={formData.expected_delivery_date}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    expected_delivery_date: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Supplier
              </label>
              <select
                value={formData.supplier_id}
                onChange={(event) => handleSupplierChange(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Pilih supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.code} - {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Store / Gudang Tujuan
              </label>

              <select
                value={formData.store_id}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    store_id: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Pilih Store/Gudang Tujuan</option>

                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.code} - {store.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Termin Pembayaran (hari)
              </label>
              <input
                type="number"
                min="0"
                value={formData.payment_term_days}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    payment_term_days: Number(event.target.value || 0),
                  }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              {selectedSupplier && (
                <p className="mt-1 text-xs text-gray-500">
                  Default supplier:{" "}
                  {selectedSupplier.default_payment_term_days} hari.
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Catatan
              </label>
              <textarea
                value={formData.notes}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    notes: event.target.value,
                  }))
                }
                rows={2}
                placeholder="Catatan Purchase Order (opsional)"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-[1100px] w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left font-medium text-gray-600">
                    Item
                  </th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600">
                    Qty
                  </th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600">
                    Satuan
                  </th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600">
                    Harga
                  </th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600">
                    Diskon
                  </th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600">
                    Pajak
                  </th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600">
                    Total
                  </th>
                  <th className="px-3 py-3 text-center font-medium text-gray-600">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {formData.details.map((line, index) => {
                  const selectedItem = items.find(
                    (item) => item.id === line.item_id
                  );

                  const lineTotal =
                    Number(line.quantity_ordered || 0) *
                      Number(line.unit_price || 0) -
                    Number(line.discount_amount || 0) +
                    Number(line.tax_amount || 0);

                  return (
                    <tr key={index}>
                      <td className="px-3 py-3">
                        <select
                          value={line.item_id}
                          onChange={(event) =>
                            handleItemChange(index, event.target.value)
                          }
                          className="w-72 rounded-md border border-gray-300 px-2 py-2 text-sm"
                        >
                          <option value="">Pilih item</option>
                          {items.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.code} - {item.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0.0001"
                          step="0.0001"
                          value={line.quantity_ordered}
                          onChange={(event) =>
                            updateLine(
                              index,
                              "quantity_ordered",
                              Number(event.target.value || 0)
                            )
                          }
                          className="w-24 rounded-md border border-gray-300 px-2 py-2 text-right text-sm"
                        />
                      </td>

                      <td className="px-3 py-3 text-gray-700">
                        {selectedItem?.unit?.code ?? "-"}
                      </td>

                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unit_price}
                          onChange={(event) =>
                            updateLine(
                              index,
                              "unit_price",
                              Number(event.target.value || 0)
                            )
                          }
                          className="w-32 rounded-md border border-gray-300 px-2 py-2 text-right text-sm"
                        />
                      </td>

                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.discount_amount}
                          onChange={(event) =>
                            updateLine(
                              index,
                              "discount_amount",
                              Number(event.target.value || 0)
                            )
                          }
                          className="w-28 rounded-md border border-gray-300 px-2 py-2 text-right text-sm"
                        />
                      </td>

                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.tax_amount}
                          onChange={(event) =>
                            updateLine(
                              index,
                              "tax_amount",
                              Number(event.target.value || 0)
                            )
                          }
                          className="w-28 rounded-md border border-gray-300 px-2 py-2 text-right text-sm"
                        />
                      </td>

                      <td className="px-3 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(lineTotal)}
                      </td>

                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          disabled={formData.details.length === 1}
                          onClick={() => removeLine(index)}
                          className="text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={addLine}
            className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            + Tambah Baris Item
          </button>

          <div className="ml-auto w-full rounded-lg bg-gray-50 p-4 md:w-96">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(formSubtotal)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm text-gray-600">
              <span>Diskon</span>
              <span>{formatCurrency(formDiscount)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm text-gray-600">
              <span>Pajak</span>
              <span>{formatCurrency(formTax)}</span>
            </div>
            <div className="mt-3 flex justify-between border-t border-gray-300 pt-3 text-base font-semibold text-gray-900">
              <span>Total PO</span>
              <span>{formatCurrency(formGrandTotal)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={cancelCreateForm}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
              ? "Menyimpan..."
              : editingPurchaseOrder
                ? "Simpan Perubahan Draft"
                : "Simpan Draft PO"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="font-semibold text-gray-900">Daftar Purchase Order</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">
                  Nomor PO
                </th>
                <th className="px-4 py-3 font-medium text-gray-600">
                  Tanggal
                </th>
                <th className="px-4 py-3 font-medium text-gray-600">
                  Supplier
                </th>
                <th className="px-4 py-3 font-medium text-gray-600">
                  Total
                </th>
                <th className="px-4 py-3 font-medium text-gray-600">
                  Status
                </th>
                <th className="px-4 py-3 font-medium text-gray-600">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    Memuat Purchase Order...
                  </td>
                </tr>
              ) : filteredPurchaseOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    Belum ada Purchase Order.
                  </td>
                </tr>
              ) : (
                filteredPurchaseOrders.map((purchaseOrder) => (
                  <tr key={purchaseOrder.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {purchaseOrder.po_number}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {purchaseOrder.order_date}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div>{purchaseOrder.supplier_name_snapshot}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        {purchaseOrder.supplier_code_snapshot}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatCurrency(purchaseOrder.grand_total)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${statusClasses[purchaseOrder.status]}`}
                      >
                        {statusLabels[purchaseOrder.status]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {access.print && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handlePrintPurchaseOrder(purchaseOrder)}
                          className="mr-3 text-gray-700 hover:text-gray-900 disabled:opacity-50"
                        >
                          Print A4
                        </button>
                      )}

                      {purchaseOrder.status === "DRAFT" && (
                        <>
                          {access.editDraft && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleEditDraft(purchaseOrder)}
                              className="mr-3 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            >
                              Edit
                            </button>
                          )}

                          {access.open && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleOpenPurchaseOrder(purchaseOrder)}
                              className="mr-3 text-green-600 hover:text-green-800 disabled:opacity-50"
                            >
                              Buka PO
                            </button>
                          )}

                          {access.deleteDraft && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleDeleteDraft(purchaseOrder)}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50"
                            >
                              Hapus
                            </button>
                          )}
                        </>
                      )}

                      {purchaseOrder.status === "OPEN" && (
                        <>
                          {access.cancel && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleCancelPurchaseOrder(purchaseOrder)}
                              className="mr-3 text-red-600 hover:text-red-800 disabled:opacity-50"
                            >
                              Cancel PO
                            </button>
                          )}

                          {access.closeOutstanding && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleCloseOutstanding(purchaseOrder)}
                              className="text-orange-600 hover:text-orange-800 disabled:opacity-50"
                            >
                              Close Outstanding
                            </button>
                          )}
                        </>
                      )}

                      {purchaseOrder.status === "PARTIAL_RECEIVED" &&
                        access.closeOutstanding && (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleCloseOutstanding(purchaseOrder)}
                            className="text-orange-600 hover:text-orange-800 disabled:opacity-50"
                          >
                            Close Outstanding
                          </button>
                        )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        Total saat ini: {formatNumber(filteredPurchaseOrders.length)} PO.
      </div>
    </div>
  );
}

export default PurchaseOrderPage;