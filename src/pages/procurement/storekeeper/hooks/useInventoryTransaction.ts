import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type {StockRow, TransactionKind, StockOpnameLine, } from "../types";
import {inputDate, } from "../../utils/date";

interface UseInventoryTransactionProps {
  stocks: StockRow[];
  loadData: () => Promise<void>;
  setError: (message: string | null) => void;
}

export function useInventoryTransaction({
  stocks,
  loadData,
  setError,
}: UseInventoryTransactionProps) {

  // =====================================================
  // FORM STATE
  // =====================================================

  const [transactionKind, setTransactionKind] = useState<TransactionKind | null>(null);
  const [transactionStockId, setTransactionStockId] = useState("");
  const [targetStoreId, setTargetStoreId] = useState("");
  const [fromStoreId, setFromStoreId] = useState("");
  const [toStoreId, setToStoreId] = useState("");
  const [transactionDate, setTransactionDate] = useState(inputDate(new Date()));
  const [transactionQty, setTransactionQty] = useState("");

  const [lines, setLines] = useState<StockOpnameLine[]>([
    {
      id: crypto.randomUUID(),
      stockId: "",
      qty: "",
      accountId: "",
    },
  ]);

  const [offsetAccountId, setOffsetAccountId] = useState("");
  const [reference, setReference] = useState("");
  const [transactionNotes, setTransactionNotes] = useState("");
  const [postingTransaction, setPostingTransaction] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const currentUser = JSON.parse(
    localStorage.getItem("custom_user") || "{}"
  );

  const userId = currentUser.id ?? "";

  // =====================================================
  // OPEN TRANSACTION
  // =====================================================

  const resetForm = () => {
    setTransactionStockId(
      stocks.length
        ? stocks[0].id
        : ""
    );
    setTargetStoreId("");
    setTransactionDate(
      new Date()
        .toISOString()
        .slice(0,10)
    );
    setFromStoreId("");
    setToStoreId("");
    setTargetStoreId("");
    
    setTransactionQty("");
    setLines([]);
    setOffsetAccountId("");
    setReference("");
    setTransactionNotes("");
    setTransactionKind(null);
    setIsOpen(false);
  };

const changeStore = (id:string)=>{
  setTargetStoreId(id);
  setLines([]);
  }

const handleFromStoreChange = (value: string) => {
    setFromStoreId(value);

    setLines([]);
};

const handleTargetStoreChange = (value: string) => {
    setTargetStoreId(value);

    setLines([]);
};

  const openTransaction = (
    kind: TransactionKind
  ) => {
    setTransactionKind(kind);
    resetForm();
    setTransactionKind(kind);
    setIsOpen(true);
  };

  const addLine = () => {
    setLines([]);
  };

  const removeLine = (id: string) => {
    setLines((prev) =>
      prev.filter((x) => x.id !== id)
    );
  };

  const updateLine = (
    id: string,
    field: keyof StockOpnameLine,
    value: string
  ) => {
    setLines((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  };

  // =====================================================
  // POST TRANSACTION
  // =====================================================
  const postTransaction = async () => {

    if (!transactionKind) {
      return;
    }

    if (
      transactionKind === "TRANSFER" &&
      !targetStoreId
    ) {
      window.alert("Pilih store tujuan.");
      return;
    }

    if (
      transactionKind !== "TRANSFER" &&
      !offsetAccountId
    ) {
      window.alert("Pilih akun.");
      return;
    }

    if (lines.length === 0) {
      window.alert("Belum ada artikel.");
      return;
    }

    setPostingTransaction(true);
    setError(null);

    try {

      // ==========================================
      // TRANSFER
      // ==========================================

      if (transactionKind === "TRANSFER") {

        for (const line of lines) {

          const stockLine =
            stocks.find(
              x => x.id === line.stockId
            );

          if (!stockLine) {
            continue;
          }

          const qtyLine =
            Number(line.qty);

          if (
            !Number.isFinite(qtyLine) ||
            qtyLine <= 0
          ) {
            window.alert("Isi kuantitas dengan benar.");
            return;
          }

          const result =
            await supabase.rpc(
              "post_inventory_transfer",
              {
                p_entity_id:
                  stockLine.entity_id,
                p_transfer_date:
                  transactionDate,
                p_item_id:
                  stockLine.item_id,
                p_from_store_id:
                  stockLine.store_id,
                p_to_store_id:
                  targetStoreId,
                p_quantity:
                  qtyLine,
                p_reference:
                  reference || null,
                p_description:
                  transactionNotes || null,
                p_user_id:
                  userId,
              }
            );

          if (result.error) {
            setError(result.error.message);
            return;
          }
        }

      }

      // ==========================================
      // ADJUSTMENT
      // ==========================================

      else if (
        transactionKind === "ADJUSTMENT"
      ) {

        for (const line of lines) {

          const stockLine =
            stocks.find(
              x => x.id === line.stockId
            );

          if (!stockLine) {
            continue;
          }

          const qtyLine =
            Number(line.qty);

          if (
            !Number.isFinite(qtyLine)
          ) {
            continue;
          }

          const result =
            await supabase.rpc(
              "post_inventory_adjustment",
              {
                p_entity_id:
                  stockLine.entity_id,
                p_adjustment_date:
                  transactionDate,
                p_item_id:
                  stockLine.item_id,
                p_store_id:
                  stockLine.store_id,
                p_actual_quantity:
                  qtyLine,
                p_offset_account_id:
                  line.accountId,
                p_reference:
                  reference || null,
                p_description:
                  transactionNotes || null,
                p_is_opname:
                  false,
                p_user_id:
                  userId,
              }
            );

          if (result.error) {
            setError(result.error.message);
            return;
          }

        }

      }

      // ==========================================
      // STOCK OPNAME
      // ==========================================

      else {

        for (const line of lines) {

          const stockLine =
            stocks.find(
              x => x.id === line.stockId
            );

          if (!stockLine) {
            continue;
          }

          const qtyLine =
            Number(line.qty);

          if (
            !Number.isFinite(qtyLine)
          ) {
            continue;
          }

          if (!line.accountId) {
            continue;
          }

          const result =
            await supabase.rpc(
              "post_inventory_adjustment",
              {
                p_entity_id:
                  stockLine.entity_id,
                p_adjustment_date:
                  transactionDate,
                p_item_id:
                  stockLine.item_id,
                p_store_id:
                  stockLine.store_id,
                p_actual_quantity:
                  qtyLine,
                p_offset_account_id:
                  line.accountId,
                p_reference:
                  reference || null,
                p_description:
                  transactionNotes || null,
                p_is_opname:
                  true,
                p_user_id:
                  userId,
              }
            );

          if (result.error) {
            setError(result.error.message);
            return;
          }

        }

      }

      await loadData();

      resetForm();

      window.alert(
        "Transaksi berhasil diposting."
      );

    } finally {

      setPostingTransaction(false);

    }

  };

  // =====================================================
  // RETURN
  // =====================================================

  return {

    isOpen,

    transactionKind,
    transactionStockId,

    fromStoreId,
    toStoreId,
    targetStoreId,
    transactionDate,

    transactionQty,
    offsetAccountId,
    reference,
    transactionNotes,

    setTransactionKind,
    setTransactionStockId,
    setTargetStoreId,
    setTransactionDate,

    changeStore,
    setTransactionQty,
    setOffsetAccountId,
    setReference,
    setTransactionNotes,

    lines,
    setLines,
    addLine,
    removeLine,
    updateLine,

    setFromStoreId,
    handleFromStoreChange,

    setToStoreId,
    handleTargetStoreChange,

    postingTransaction,

    openTransaction,
    postTransaction,
    resetForm,
  };

}