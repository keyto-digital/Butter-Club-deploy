// ======================= JURNAL.tsx =======================
// FULL ADAPTASI DARI KAS_HARIAN (SIMPLIFIED UNTUK JURNAL)

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { FiEdit, FiTrash2, FiPlus } from "react-icons/fi";
import { DateRangePicker } from "react-date-range";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { createPortal } from "react-dom";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import type { Range } from "react-date-range";
import { toWIBDateString, getWIBTimestampFromUTC, toWIBTimeString } from "../utils/time";
import { FiDownload, FiPrinter } from "react-icons/fi";
import { getCustomUser, getCustomUserId} from "@/lib/authUser";
import {createPaginationMeta,} from "../lib/pagination/types";  
import {usePagination,} from "../lib/pagination/usePagination";
import Pagination from "../components/common/Pagination";
import { printReport } from "@/utils/printReport";
import { exportReport,formatReportDateRange } from "@/utils/exportReport";
import { number as formatNumber } from "@/pages/procurement/utils/format";

// ================= TYPES =================
type Journal = {
  id: string;
  tanggal: string;
  waktu: string;
  reference: string;
  description: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  entity_id: string;
  source_table?: string | null;
  source_id?: string | null;

  journal_details?: {
    id: string;
    debit: number;
    credit: number;
    description: string;
    account: {
      id: string;
      code: string;
      name: string;
    };
  }[];
};

// ================= PAGE =================
export default function Jurnal() {
  const [data, setData] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const {
    page,
    pageSize,
    from,
    to,
    setPage,
    setPageSize,
    resetPage,
  } = usePagination();

  const [q, setQ] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");

  const [filterBy, setFilterBy] = useState("reference");

  const [selectedEntity, setSelectedEntity] = useState("");

    type Entity = {
    id: string;
    kode: string;
    nama: string;
  };

  type Account = {
    id: string;
    code: string;
    name: string;
  };

  const [entities, setEntities] = useState<Entity[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [editId, setEditId] = useState<string | null>(null);

  const today = new Date();

  const firstDayOfCurrentMonth = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );

  const [range, setRange] = useState<Range[]>([
    {
      startDate: firstDayOfCurrentMonth,
      endDate: today,
      key: "selection",
    },
  ]);

  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [pickerStyle, setPickerStyle] = useState({ top: 0, left: 0 });

  const [showForm, setShowForm] = useState(false);

  const [tanggal, setTanggal] = useState("");
  const [reference, setReference] = useState("");

  type RowType = {
    account_id: string;
    search: string;
    selectedLabel: string; // 🔥 TAMBAHAN
    desc: string;
    debit: number;
    credit: number;
    open: boolean;
    highlightIndex: number;
  };

  const defaultRows: RowType[] = [
    {
      account_id: "",
      search: "",
      selectedLabel: "", // 🔥
      desc: "",
      debit: 0,
      credit: 0,
      open: false,
      highlightIndex: 0,
    },
    {
      account_id: "",
      search: "",
      selectedLabel: "", // 🔥
      desc: "",
      debit: 0,
      credit: 0,
      open: false,
      highlightIndex: 0,
    },
  ];

  const [rows, setRows] = useState<RowType[]>(defaultRows);

  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;

      setRows((prev) =>
        prev.map((r, i) => {
          const el = rowRefs.current[i];
          if (el && !el.contains(target)) {
            return { ...r, open: false };
          }
          return r;
        })
      );
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadAccounts = async () => {
    const { data } = await supabase.from("accounts").select("*");
    setAccounts(data || []);
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  // ================= LOAD DATA =================
  const loadData = async () => {
    setLoading(true);

    try {
      const startDate = range[0].startDate;
      const endDate = range[0].endDate;

      let query = supabase
        .from("journals")
        .select(
          `
            id,
            tanggal,
            waktu,
            reference,
            description,
            created_at,
            updated_at,
            user_id,
            entity_id,
            source_table,
            source_id
          `,
          {
            count: "exact",
          }
        )
        .order("created_at", {
          ascending: false,
        });

      // ================= ENTITY =================
      if (selectedEntity) {
        query = query.eq(
          "entity_id",
          selectedEntity
        );
      }

      // ================= DATE FROM =================
      if (startDate) {
        query = query.gte(
          "tanggal",
          format(startDate, "yyyy-MM-dd")
        );
      }

      // ================= DATE TO =================
      if (endDate) {
        query = query.lte(
          "tanggal",
          format(endDate, "yyyy-MM-dd")
        );
      }

      // ================= SEARCH =================
      const keyword = searchKeyword.trim();

      if (keyword) {
        if (filterBy === "reference") {
          query = query.ilike(
            "reference",
            `%${keyword}%`
          );
        }

        if (filterBy === "description") {
          query = query.ilike(
            "description",
            `%${keyword}%`
          );
        }

        if (filterBy === "user_id") {
          query = query.ilike(
            "user_id",
            `%${keyword}%`
          );
        }
      }

      // ================= PAGINATION =================
      query = query.range(from, to);

      const {
        data: journals,
        count,
        error,
      } = await query;

      if (error) {
        console.error(
          "ERROR LOAD JURNAL:",
          error.message
        );

        setData([]);
        setTotal(0);

        return;
      }

      const journalRows =
        journals ?? [];

      setTotal(count ?? 0);

      // ================= JOURNAL DETAIL =================
      const journalIds =
        journalRows.map(
          (journal) => journal.id
        );

      if (journalIds.length === 0) {
        setData([]);
        return;
      }

      const {
        data: details,
        error: detailError,
      } = await supabase
        .from("journal_details")
        .select(`
          id,
          journal_id,
          debit,
          credit,
          description,
          account:accounts (
            id,
            code,
            name
          )
        `)
        .in(
          "journal_id",
          journalIds
        );

      if (detailError) {
        console.error(
          "ERROR LOAD DETAIL JURNAL:",
          detailError.message
        );

        setData(
          journalRows.map(
            (journal) => ({
              ...journal,
              journal_details: [],
            })
          )
        );

        return;
      }

      // ================= GABUNG JOURNAL + DETAIL =================
      const journalsWithDetails =
        journalRows.map(
          (journal) => ({
            ...journal,

            journal_details:
              (details ?? [])
                .filter(
                  (detail) =>
                    detail.journal_id ===
                    journal.id
                )
                .map((detail) => ({
                  id: detail.id,
                  debit: Number(
                    detail.debit ?? 0
                  ),
                  credit: Number(
                    detail.credit ?? 0
                  ),
                  description:
                    detail.description ?? "",
                  account:
                    Array.isArray(
                      detail.account
                    )
                      ? detail.account[0] ??
                        undefined
                      : detail.account,
                })),
          })
        );

      setData(
        journalsWithDetails as Journal[]
      );
    } catch (error) {
      console.error(
        "ERROR LOAD JURNAL:",
        error
      );

      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // ================= FETCH SEMUA DATA UNTUK EXPORT / PRINT =================
  const fetchAllFilteredJournals = async (): Promise<
    Array<Record<string, unknown>>
  > => {
    const startDate = range[0].startDate;
    const endDate = range[0].endDate;
    const keyword = searchKeyword.trim();

    const PAGE_SIZE = 1000;
    let offset = 0;

    type JournalExportRow = {
      tanggal: string;
      waktu: string;
      reference: string;
      description: string;
      debit: number | string;
      credit: number | string;
      user_id: string;
      updated_at: string;
    };

    const result: JournalExportRow[] = [];

    while (true) {
      let query = supabase
        .from("journals")
        .select(
          `
            id,
            tanggal,
            waktu,
            reference,
            description,
            updated_at,
            user_id,
            entity_id
          `
        )
        .order("created_at", {
          ascending: false,
        })
        .range(offset, offset + PAGE_SIZE - 1);

      // ================= ENTITY =================
      if (selectedEntity) {
        query = query.eq(
          "entity_id",
          selectedEntity
        );
      }

      // ================= DATE FROM =================
      if (startDate) {
        query = query.gte(
          "tanggal",
          format(startDate, "yyyy-MM-dd")
        );
      }

      // ================= DATE TO =================
      if (endDate) {
        query = query.lte(
          "tanggal",
          format(endDate, "yyyy-MM-dd")
        );
      }

      // ================= SEARCH =================
      if (keyword) {
        if (filterBy === "reference") {
          query = query.ilike(
            "reference",
            `%${keyword}%`
          );
        }

        if (filterBy === "description") {
          query = query.ilike(
            "description",
            `%${keyword}%`
          );
        }

        if (filterBy === "user_id") {
          query = query.ilike(
            "user_id",
            `%${keyword}%`
          );
        }
      }

      const {
        data: journals,
        error,
      } = await query;

      if (error) {
        throw error;
      }

      const journalRows = journals ?? [];

      if (journalRows.length === 0) {
        break;
      }

      // ================= AMBIL DETAIL =================
      const journalIds = journalRows.map(
        (journal) => journal.id
      );

      const {
        data: details,
        error: detailError,
      } = await supabase
        .from("journal_details")
        .select(`
          id,
          journal_id,
          debit,
          credit,
          description,
          account:accounts (
            id,
            code,
            name
          )
        `)
        .in("journal_id", journalIds);

      if (detailError) {
        throw detailError;
      }

      // ================= FLATTEN DATA =================
      journalRows.forEach((journal) => {
        const journalDetails =
          (details ?? []).filter(
            (detail) =>
              detail.journal_id === journal.id
          );

        // Header jurnal
        result.push({
          tanggal: journal.tanggal
            ? toWIBDateString(
                new Date(journal.tanggal),
                "display"
              )
            : "",

          waktu: journal.waktu
            ? toWIBTimeString(journal.waktu)
            : "",

          reference:
            journal.reference ?? "",

          description:
            journal.description ?? "",

          debit: "",
          credit: "",

          user_id:
            journal.user_id ?? "",

          updated_at:
            journal.updated_at
              ? getWIBTimestampFromUTC(
                  journal.updated_at
                )
              : "",
        });

        // Detail akun
        journalDetails.forEach((detail) => {
          const account = Array.isArray(
            detail.account
          )
            ? detail.account[0]
            : detail.account;

          result.push({
            tanggal: "",
            waktu: "",

            reference: account
              ? `${account.code ?? ""} ${account.name ?? ""}`.trim()
              : "",

            description:
              detail.description ?? "",

            debit: Number(
              detail.debit ?? 0
            ),

            credit: Number(
              detail.credit ?? 0
            ),

            user_id: "",
            updated_at: "",
          });
        });
      });

      // Kalau kurang dari 1000 berarti batch terakhir.
      if (journalRows.length < PAGE_SIZE) {
        break;
      }

      offset += PAGE_SIZE;
    }

    return result;
  };

  // ================= FETCH ENTITY =================
  const fetchEntities = async () => {
    const { data, error } = await supabase
      .from("entities")
      .select("id, kode, nama")
      .order("nama");

    if (error) {
      console.error("Gagal memuat cabang:", error.message);
      return;
    }

    setEntities(data || []);

    // selectedEntity dibiarkan kosong agar default = Semua Cabang.
  };

  useEffect(() => {
    fetchEntities();
  }, []);

  useEffect(() => {
    loadData();
  }, [
      selectedEntity,
      searchKeyword,
      filterBy,
      range,
      page,
      pageSize,
    ]);

  // ================= DATE PICKER =================
  useEffect(() => {
    if (showPicker && pickerRef.current && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();

      setPickerStyle({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });

      function handleClickOutside(e: MouseEvent) {
        if (
          pickerRef.current &&
          !pickerRef.current.contains(e.target as Node) &&
          !triggerRef.current?.contains(e.target as Node)
        ) {
          setShowPicker(false);
        }
      }

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showPicker]);

  // ================= EDIT =================
  const handleEdit = (row: Journal) => {
    if (row.source_table) {
      alert("Jurnal otomatis harus diedit dari transaksi sumbernya.");
      return;
    }
    setEditId(row.id); // 🔥 penting

    setTanggal(row.tanggal);
    setReference(row.reference);

    const newRows =
      row.journal_details?.map((d) => ({
        account_id: d.account?.id || "", // 🔥 FIX
        search: "",
        selectedLabel: `${d.account?.code} - ${d.account?.name}`,
        desc: d.description,
        debit: d.debit,
        credit: d.credit,
        open: false,
        highlightIndex: 0,
      })) || [];

    setRows(newRows);
    setShowForm(true);
  };

  // ================= DELETE =================
  const handleDelete = async (row: Journal) => {
    if (row.source_table) {
      alert("Jurnal otomatis tidak dapat dihapus dari sini. Hapus transaksi sumbernya.");
      return;
    }

    if (!confirm("Hapus data?")) return;

    await supabase.from("journal_details").delete().eq("journal_id", row.id);
    await supabase.from("journals").delete().eq("id", row.id);

    loadData();
  };

  // ================== INPUT JURNAL =============
  function updateRow(
    i: number,
    field: keyof RowType,
    val: string | number | boolean
  ) {
    const newRows = [...rows];

    if (field === "debit") {
      newRows[i].debit = Number(val);
      newRows[i].credit = 0;
    } else if (field === "credit") {
      newRows[i].credit = Number(val);
      newRows[i].debit = 0;
    } else {
      (newRows[i][field] as RowType[keyof RowType]) = val;
    }

    setRows(newRows);
  }

  function selectAccount(i: number, acc: Account) {
    const newRows = [...rows];
    newRows[i].account_id = acc.id;
    newRows[i].selectedLabel = `${acc.code} - ${acc.name}`; // 🔥 simpan label
    newRows[i].search = ""; // 🔥 kosongkan search biar dropdown bebas lagi
    newRows[i].open = false;
    setRows(newRows);
  }

  function totalDebit() {
    return rows.reduce((s, r) => s + r.debit, 0);
  }

  function totalCredit() {
    return rows.reduce((s, r) => s + r.credit, 0);
  }

  // ================== SAVE JURNAL =================
  const saveJurnal = async () => {
    if (!tanggal) {
      alert("❌ Tanggal wajib diisi");
      return;
    }

    if (!reference || reference.trim() === "") {
      alert("❌ No Referensi wajib diisi");
      return;
    }

    // Jurnal baru harus dicatat ke satu cabang,
    // walaupun halaman awalnya menampilkan Semua Cabang.
    if (!editId && !selectedEntity) {
      alert("❌ Pilih cabang terlebih dahulu sebelum menambah jurnal.");
      return;
    }

    if (rows.length < 2) {
      alert("❌ Minimal harus ada 2 baris jurnal.");
      return;
    }

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];

      if (!row.account_id) {
        alert(`❌ Baris ke-${index + 1}: Akun belum dipilih.`);
        return;
      }

      if (!row.desc || row.desc.trim() === "") {
        alert(`❌ Baris ke-${index + 1}: Keterangan wajib diisi.`);
        return;
      }

      if ((!row.debit && !row.credit) || (row.debit > 0 && row.credit > 0)) {
        alert(
          `❌ Baris ke-${index + 1}: Isi debit atau kredit saja.`
        );
        return;
      }
    }

    if (totalDebit() !== totalCredit()) {
      alert("❌ Debit dan Kredit harus sama (balance).");
      return;
    }

    const userId = getCustomUserId();

    if (!userId) {
      alert("❌ User login tidak ditemukan. Silakan logout lalu login kembali.");
      return;
    }

    try {
      let journalId = editId;

      if (!editId) {
        const { data: journal, error: insertError } = await supabase
          .from("journals")
          .insert({
            tanggal,
            waktu: new Date().toISOString(),
            reference: reference.trim(),
            entity_id: selectedEntity,
            user_id: userId,
            updated_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (insertError) {
          throw insertError;
        }

        journalId = journal.id;
      } else {
        const { error: updateError } = await supabase
          .from("journals")
          .update({
            tanggal,
            waktu: new Date().toISOString(),
            reference: reference.trim(),

            // User terakhir yang melakukan perubahan.
            user_id: userId,

            updated_at: new Date().toISOString(),
          })
          .eq("id", editId);

        if (updateError) {
          throw updateError;
        }

        const { error: deleteDetailError } = await supabase
          .from("journal_details")
          .delete()
          .eq("journal_id", editId);

        if (deleteDetailError) {
          throw deleteDetailError;
        }
      }

      if (!journalId) {
        throw new Error("ID jurnal tidak ditemukan.");
      }

      const details = rows.map((row) => ({
        journal_id: journalId,
        account_id: row.account_id,
        debit: Number(row.debit || 0),
        credit: Number(row.credit || 0),
        description: row.desc.trim(),
      }));

      const { error: detailError } = await supabase
        .from("journal_details")
        .insert(details);

      if (detailError) {
        throw detailError;
      }

      alert("✅ Jurnal berhasil disimpan.");

      setEditId(null);
      setShowForm(false);
      resetForm();
      loadData();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown error";

      alert("❌ Gagal simpan: " + message);
    }
  };

  // ========== RESETFORM ======
  function resetForm() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    const today = local.toISOString().split("T")[0];

    setTanggal(today);
    setReference("");
    setRows(defaultRows);
  }

  // ========== EXPORT EXCEL ======
  const handleExportExcel = async () => {
    try {
      const rows = await fetchAllFilteredJournals();

      const filename = `Jurnal_Umum${formatReportDateRange(
        range[0].startDate,
        range[0].endDate
      )}.xlsx`;

      exportReport({
        filename,
        sheetName: "Jurnal_Umum",
        columns: [
          {
            label: "Tanggal",
            key: "tanggal",
          },
          {
            label: "Waktu",
            key: "waktu",
          },
          {
            label: "Referensi",
            key: "reference",
          },
          {
            label: "Keterangan",
            key: "description",
          },
          {
            label: "Debit",
            key: "debit",
            format: (value) =>
              formatNumber(Number(value ?? 0)),
          },
          {
            label: "Kredit",
            key: "credit",
            format: (value) =>
              formatNumber(Number(value ?? 0)),
          },
          {
            label: "User ID",
            key: "user_id",
          },
          {
            label: "Updated At",
            key: "updated_at",
          },
        ],
        rows,
      });
    } catch (error) {
      console.error("Export jurnal gagal:", error);
      alert("Gagal melakukan export jurnal.");
    }
  };

  // ========== CETAK HALAMAN ======
  const handlePrint = async () => {
    try {
      const rows = await fetchAllFilteredJournals();

      const currentUser = getCustomUser();

      const printedBy =
        currentUser?.name ??
        getCustomUserId() ??
        "-";

      printReport({
        title: "JURNAL UMUM",

        period: `${range[0].startDate
          ? format(range[0].startDate, "dd-MM-yyyy")
          : "-"
        } s/d ${
          range[0].endDate
            ? format(range[0].endDate, "dd-MM-yyyy")
            : "-"
        }`,

        orientation: "landscape",

        printedBy,

        columns: [
          {
            label: "Tanggal",
            key: "tanggal",
          },
          {
            label: "Waktu",
            key: "waktu",
          },
          {
            label: "Referensi",
            key: "reference",
          },
          {
            label: "Keterangan",
            key: "description",
          },
          {
            label: "Debit",
            key: "debit",
            align: "right",
            format: (value) =>
              formatNumber(Number(value ?? 0)),
          },
          {
            label: "Kredit",
            key: "credit",
            align: "right",
            format: (value) =>
              formatNumber(Number(value ?? 0)),
          },
          {
            label: "User ID",
            key: "user_id",
          },
          {
            label: "Updated At",
            key: "updated_at",
          },
        ],

        rows,
      });
    } catch (error) {
      console.error("Print jurnal gagal:", error);
      alert("Gagal mencetak jurnal.");
    }
  };

  // ================= UI =================
  return (
    <div className="p-4 bg-white rounded shadow max-w-[1600px] mx-auto">

      {/* ================= HEADER ================= */}
      <div className="mb-4 flex flex-col gap-3">

        {/* BARIS 1 */}
        <div className="flex flex-wrap items-center gap-3">

          {/* KIRI : DATE + SEARCH */}
          <div className="flex flex-wrap items-center gap-3">

            {/* DATE RANGE */}
            <div ref={triggerRef} className="flex items-center gap-2">
              <label className="font-semibold">Date range:</label>

              <input
                readOnly
                value={`${format(range[0].startDate!, "dd-MM-yyyy", { locale: id })} - ${format(range[0].endDate!, "dd-MM-yyyy", { locale: id })}`}
                onClick={() => setShowPicker(true)}
                className="border px-2 py-1 rounded cursor-pointer w-[210px]"
              />

              {showPicker &&
                createPortal(
                  <div
                    ref={pickerRef}
                    className="z-50 shadow border bg-white"
                    style={{
                      position: "fixed",
                      top: pickerStyle.top,
                      left: pickerStyle.left,
                    }}
                  >
                    <DateRangePicker
                      className="custom-datepicker"
                      onChange={(ranges) => {
                        const selection =
                          ranges.selection;

                        if (
                          selection.startDate &&
                          selection.endDate
                        ) {
                          setRange([selection]);
                          resetPage();
                        }
                      }}
                      moveRangeOnFirstSelection={false}
                      showMonthAndYearPickers={true}
                      staticRanges={[]}
                      inputRanges={[]}
                      months={1}
                      ranges={range}
                      direction="horizontal"
                      locale={id}
                      preventSnapRefocus={true}
                      calendarFocus="forwards"
                    />
                  </div>,
                  document.body
                )}
            </div>

            {/* OUTLET */}
            <div className="flex flex-wrap items-center gap-2 border p-2 rounded bg-gray-100 w-fit">
              <label>Outlet:</label>
              <select
                value={selectedEntity}
                onChange={(e) => {
                  setSelectedEntity(e.target.value);
                  resetPage();
                }}
                className="border px-2 py-1"
              >
                <option value="">Semua Cabang</option>

                {entities.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.kode} - {e.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* FILTER */}
            <select
              value={filterBy}
              onChange={(e) =>
                setFilterBy(e.target.value)}
              className="border px-2 py-1"
            >
              <option value="reference">No Referensi</option>
              <option value="description">Keterangan</option>
              <option value="user_id">User</option>
            </select>

            {/* SEARCH */}
            <input
              placeholder="Kata kunci..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="border px-2 py-1"
            />

            <button
              onClick={() => {
                setSearchKeyword(q.trim());
                resetPage();
              }}
              className="bg-blue-600 text-white px-3 py-1 rounded"
            >
              Cari
            </button>

            <div className="flex items-center gap-3 ml-6">

              <button
                onClick={() => {
                  const now = new Date();
                  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
                  const today = local.toISOString().split("T")[0];
                  setTanggal(today);
                  resetForm();
                  setShowForm(true);
                }}
                className="bg-green-600 text-white px-3 py-1 rounded flex items-center gap-2"
              >
                <FiPlus /> Tambah Jurnal
              </button>

              <button
                onClick={handleExportExcel}
                className="bg-blue-600 text-white px-3 py-1 rounded flex items-center gap-2"
              >
                <FiDownload /> Export
              </button>

              <button
                onClick={handlePrint}
                className="bg-orange-500 text-white px-3 py-1 rounded flex items-center gap-2"
              >
                <FiPrinter /> Cetak
              </button>

            </div>
          </div>
        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div className="w-full pr-8">
        <table className="w-full table-auto border border-gray-300 text-sm">
          <thead className="bg-gray-500 text-white">
            <tr>
              <th className="border p-2 w-[80px]">Aksi</th>
              <th className="border p-2">Tanggal</th>
              <th className="border p-2">Waktu</th>
              <th className="border p-2">No Referensi</th>
              <th className="border p-2">Keterangan</th>
              <th className="border p-2">Debit</th>
              <th className="border p-2">Kredit</th>
              <th className="border p-2">User</th>
              <th className="border p-2">Updated</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center py-3">
                  Memuat...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-3">
                  Tidak ada data
                </td>
              </tr>
            ) : (
              data.map((row) => {
                const detailRows =
                  row.journal_details?.map((d) => (
                    <tr
                      key={d.id}
                      className="hover:bg-yellow-100 transition text-sm"
                    >
                      <td className="border p-2"></td>
                      <td className="border p-2"></td>
                      <td className="border p-2"></td>

                      <td className="border p-2">
                        {d.account?.code} {d.account?.name}
                      </td>

                      <td className="border p-2 text-left">
                        {d.description}
                      </td>

                      <td className="border p-2 text-right">
                        {d.debit
                          ? Number(d.debit).toLocaleString("id-ID")
                          : ""}
                      </td>

                      <td className="border p-2 text-right">
                        {d.credit
                          ? Number(d.credit).toLocaleString("id-ID")
                          : ""}
                      </td>

                      <td className="border p-2"></td>
                      <td className="border p-2"></td>
                    </tr>
                  )) || [];

                return [
                  <tr
                    key={`header-${row.id}`}
                    className="bg-gray-300 font-semibold text-center"
                  >
                    <td className="border p-2 align-top">
                      <div className="flex justify-center gap-1">
                        <FiEdit
                          className="cursor-pointer text-blue-600"
                          onClick={() => handleEdit(row)}
                        />
                        <FiTrash2
                          className="cursor-pointer text-red-500"
                          onClick={() => handleDelete(row)}
                        />
                      </div>
                    </td>

                    <td className="tengah p-2 border">
                      {row.tanggal
                        ? toWIBDateString(new Date(row.tanggal), "display")
                        : ""}
                    </td>

                    <td className="tengah p-2 border">
                      {row.waktu ? toWIBTimeString(row.waktu) : ""}
                    </td>

                    <td className="border p-2 align-top font-semibold">
                      {row.reference}
                    </td>

                    <td className="border p-2"></td>
                    <td className="border p-2"></td>
                    <td className="border p-2"></td>

                    <td className="border p-2 align-top">
                      {row.user_id}
                    </td>

                    <td className="tengah p-2 border">
                      {row.updated_at
                        ? getWIBTimestampFromUTC(row.updated_at)
                        : ""}
                    </td>
                  </tr>,

                  ...detailRows,
                ];
              })
            )}
          </tbody>
        </table>

        <Pagination
          meta={createPaginationMeta(
            page,
            pageSize,
            total
          )}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {showForm && (
      <div className="fixed inset-0 bg-black/40 flex justify-center items-start pt-20 z-50">
        <div className="bg-white w-[800px] rounded-lg shadow-lg p-6">

          <h2 className="text-lg font-semibold mb-4 text-center">
            Input Jurnal
          </h2>

          {/* HEADER */}
          <div className="flex gap-3 mb-4">
            <input
              type="date"
              className="border px-3 py-2 rounded w-[180px]"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
            <input
              placeholder="No Referensi"
              className="border px-3 py-2 rounded w-[220px]"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          {/* ROWS */}
          <div className="space-y-2">
            {rows.map((row, i) => {
              const keyword = (row.search || "").toLowerCase();
              const filtered =
                keyword === ""
                  ? accounts // 🔥 kalau kosong tampilkan semua
                  : accounts.filter((a: Account) =>
                      `${a.code} ${a.name}`.toLowerCase().includes(keyword)
                    );

              const highlightIndex = row.highlightIndex ?? 0;

              return (
                <div
                  key={i}
                  ref={(el) => (rowRefs.current[i] = el)}
                  className="flex items-center gap-2 border rounded px-2 py-2"
                >
                  {/* DELETE */}
                  <button
                    onClick={() => {
                      if (rows.length <= 2) return;
                      setRows(rows.filter((_, idx) => idx !== i));
                    }}
                    className="text-red-500 text-lg px-2"
                  >
                    ×
                  </button>

                  {/* DESKRIPSI */}
                  <input
                    className="border px-2 py-1 rounded w-[160px]"
                    placeholder="Keterangan"
                    value={row.desc}
                    onChange={(e) =>
                      updateRow(i, "desc", e.target.value)
                    }
                  />

                  {/* AKUN */}
                  <div className="relative w-full">
                    <input
                      className="border px-2 py-1 rounded w-full"
                      placeholder="-- PILIH AKUN --"
                      value={row.open ? row.search : row.selectedLabel}
                      onFocus={() => {
                        updateRow(i, "open", true);
                        updateRow(i, "search", ""); // 🔥 reset biar list muncul semua
                      }}
                      onClick={() => {
                        updateRow(i, "open", true);
                        updateRow(i, "search", ""); // 🔥
                      }}
                      onChange={(e) => {
                        updateRow(i, "search", e.target.value);
                        updateRow(i, "open", true);
                        updateRow(i, "highlightIndex", 0);
                      }}
                      onKeyDown={(e) => {
                        let idx = highlightIndex;

                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          idx = (idx + 1) % filtered.length;
                          updateRow(i, "highlightIndex", idx);
                        }

                        if (e.key === "ArrowUp") {
                          e.preventDefault();
                          idx = (idx - 1 + filtered.length) % filtered.length;
                          updateRow(i, "highlightIndex", idx);
                        }

                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (filtered[idx]) {
                            selectAccount(i, filtered[idx]);
                          }
                        }

                        if (e.key === "Escape") {
                          updateRow(i, "open", false);
                        }
                      }}
                    />

                    {/* DROPDOWN */}
                    {row.open && (
                      <div
                        ref={(el) => {
                          if (el && row.open) {
                            const item = el.querySelector(
                              `[data-idx="${highlightIndex}"]`
                            ) as HTMLElement;

                            if (item) {
                              item.scrollIntoView({
                                block: "nearest",
                              });
                            }
                          }
                        }}
                        className="absolute z-20 bg-white border w-full max-h-48 overflow-auto shadow rounded"
                      >

                        <div className="px-2 py-1 bg-gray-100 text-xs text-gray-500">
                          -- PILIH AKUN --
                        </div>

                        {filtered.map((a, idx) => (
                          <div
                            key={a.id}
                            data-idx={idx}
                            className={`px-2 py-1 cursor-pointer text-sm ${
                              idx === highlightIndex
                                ? "bg-blue-200"
                                : "hover:bg-blue-100"
                            }`}
                            onMouseEnter={() =>
                              updateRow(i, "highlightIndex", idx)
                            }
                            onClick={() => selectAccount(i, a)}
                          >
                            {a.code} {a.name}
                          </div>
                        ))}

                        {filtered.length === 0 && (
                          <div className="px-2 py-1 text-gray-400 text-sm">
                            Tidak ditemukan
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* DEBIT */}
                  <input
                    className="border px-2 py-1 rounded w-[120px] text-right"
                    placeholder="Debit"
                    value={row.debit ? formatNumber(row.debit) : ""}
                    onChange={(e) =>
                      updateRow(
                        i,
                        "debit",
                        e.target.value.replace(/\./g, "")
                      )
                    }
                  />

                  {/* CREDIT */}
                  <input
                    className="border px-2 py-1 rounded w-[120px] text-right"
                    placeholder="Kredit"
                    value={row.credit ? formatNumber(row.credit) : ""}
                    onChange={(e) =>
                      updateRow(
                        i,
                        "credit",
                        e.target.value.replace(/\./g, "")
                      )
                    }
                  />
                </div>
              );
            })}
          </div>

          {/* TAMBAH BARIS */}
          <button
            onClick={() =>
              setRows([
                ...rows,
                {
                  account_id: "",
                  search: "",
                  selectedLabel: "", // 🔥 WAJIB DITAMBAHKAN
                  desc: "",
                  debit: 0,
                  credit: 0,
                  open: false,
                  highlightIndex: 0,
                },
              ])
            }
            className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
          >
            + Tambah Baris
          </button>

          {/* TOTAL */}
          <div className="mt-3 font-semibold text-sm">
            Total Debit: {formatNumber(totalDebit())} | Total Kredit:{" "}
            {formatNumber(totalCredit())}
          </div>

          {/* ACTION */}
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => {
              setShowForm(false);
              resetForm();
              }}
              className="bg-gray-400 px-3 py-1 text-white rounded"
            >
              Batal
            </button>

            <button
              onClick={saveJurnal}
              className="bg-green-600 hover:bg-green-700 px-3 py-1 text-white rounded"
            >
              Simpan
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}