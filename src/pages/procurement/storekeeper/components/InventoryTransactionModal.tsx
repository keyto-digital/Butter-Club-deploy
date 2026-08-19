import { useState } from "react";
import type {
  AccountOption,
  StockOpnameLine,
  StockRow,
  StoreOption,
  TransactionKind,
} from "../types";

interface InventoryTransactionModalProps {
  open: boolean;

  stores: StoreOption[];
  accounts: AccountOption[];
  stocks: StockRow[];

  transaction: {
    transactionKind: TransactionKind | null;

    transactionStockId: string;
    fromStoreId: string;
    toStoreId: string;
    targetStoreId: string;
    transactionDate: string;
    transactionQty: string;
    offsetAccountId: string;
    reference: string;
    transactionNotes: string;

    setTransactionKind(value: TransactionKind | null): void;
    setTransactionStockId(value: string): void;

    setFromStoreId(value: string): void;
    handleFromStoreChange(value: string): void;

    setToStoreId(value: string): void;

    setTargetStoreId(value: string): void;
    handleTargetStoreChange(value: string): void;
    setTransactionDate(value: string): void;
    setTransactionQty(value: string): void;
    lines: StockOpnameLine[];
    setLines(value: StockOpnameLine[]): void;

    addLine(): void;
    removeLine(id: string): void;

    updateLine(
      id: string,
      field: keyof StockOpnameLine,
      value: string
    ): void;
    setOffsetAccountId(value: string): void;
    setReference(value: string): void;
    setTransactionNotes(value: string): void;

    postingTransaction: boolean;

    postTransaction(): Promise<void>;
    resetForm(): void;
  };

  onClose(): void;
}

export default function InventoryTransactionModal({
  open,
  stocks,
  stores,
  accounts,
  transaction,
  onClose,
}: InventoryTransactionModalProps) {

  if (!open) return null;

  const [transferItemSearch, setTransferItemSearch] = useState("");
  const [showTransferDropdown, setShowTransferDropdown] = useState(false);
  const [highlightedTransferIndex,setHighlightedTransferIndex,] = useState(-1);
  const [selectedTransferStock, setSelectedTransferStock] = useState<StockRow | null>(null);
  const [transferQty, setTransferQty] = useState("");

  const filteredTransferStocks = stocks.filter((stock) => {
    if (stock.store_id !== transaction.fromStoreId) {
      return false;
    }

    const keyword =
      transferItemSearch
        .trim()
        .toLowerCase();

    if (keyword === "") return true;

    return (
      stock.item_code
        .toLowerCase()
        .includes(keyword) ||
      stock.item_name
        .toLowerCase()
        .includes(keyword)
    );
  });

  const filteredOpnameStocks = stocks.filter((stock) => {
    if (stock.store_id !== transaction.targetStoreId) {
      return false;
    }

    const keyword = transferItemSearch
      .trim()
      .toLowerCase();

    if (keyword === "") return true;

    return (
      stock.item_code
        .toLowerCase()
        .includes(keyword) ||
      stock.item_name
        .toLowerCase()
        .includes(keyword)
    );
  });

  const filteredAdjustmentStocks = filteredOpnameStocks;

  const title =
    transaction.transactionKind === "TRANSFER"
      ? "Transfer Stok"
      : transaction.transactionKind === "OPNAME"
      ? "Stock Opname"
      : "Adjustment Persediaan";

  const handleSelectTransferItem = (
    stock: StockRow
  ) => {
    setSelectedTransferStock(stock);

    setTransferItemSearch(
      `${stock.item_code} - ${stock.item_name}`
    );

    setShowTransferDropdown(false);

    setHighlightedTransferIndex(-1);
  };

  const addTransferLine = () => {

  if (!selectedTransferStock) {
    window.alert("Pilih artikel.");
    return;
  }

  if (
    !transferQty ||
    Number(transferQty) <= 0
  ) {
    window.alert("Qty tidak valid.");
    return;
  }

  const newLine = {
      id: crypto.randomUUID(),
      stockId: selectedTransferStock.id,
      qty: transferQty,
      accountId: "",
  };

  transaction.setLines([
      ...transaction.lines.filter(
          x => x.stockId !== ""
      ),
      newLine
  ]);

  setTransferItemSearch("");
  setSelectedTransferStock(null);
  setTransferQty("");

};

const addAdjustmentLine = () => {
  if (!selectedTransferStock) {
    window.alert("Pilih artikel.");
    return;
  }

  if (!transferQty || Number(transferQty) <= 0) {
    window.alert("Qty tidak valid.");
    return;
  }

  if (!transaction.offsetAccountId) {
    window.alert("Pilih akun.");
    return;
  }

  const newLine = {
    id: crypto.randomUUID(),
    stockId: selectedTransferStock.id,
    qty: transferQty,
    accountId: transaction.offsetAccountId,
  };

  transaction.setLines([
    ...transaction.lines.filter(
      (x) => x.stockId !== ""
    ),
    newLine,
  ]);

  setTransferItemSearch("");
  setSelectedTransferStock(null);
  setTransferQty("");
};

const addOpnameLine = () => {
  if (!selectedTransferStock) {
    window.alert("Pilih artikel.");
    return;
  }

  if (!transferQty || Number(transferQty) <= 0) {
    window.alert("Qty tidak valid.");
    return;
  }

  if (!transaction.offsetAccountId) {
    window.alert("Pilih akun.");
    return;
  }

  const newLine = {
    id: crypto.randomUUID(),
    stockId: selectedTransferStock.id,
    qty: transferQty,
    accountId: transaction.offsetAccountId,
  };

  transaction.setLines([
    ...transaction.lines.filter(
      (x) => x.stockId !== ""
    ),
    newLine,
  ]);

  setTransferItemSearch("");
  setSelectedTransferStock(null);
  setTransferQty("");
};

  return (
   <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
    <div className="flex min-h-full items-center justify-center">
      <div className="flex w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl max-h-[90vh]">

        {/* ========================================= */}
        {/* HEADER */}
        {/* ========================================= */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">
              {title}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Posting transaksi persediaan.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-3 py-2 text-sm"
          >
            ✕
          </button>
        </div>
        {/* ========================================= */}
        {/* BODY */}
        {/* ========================================= */}
        <div className="flex-1 overflow-y-auto space-y-5 p-6">
          {/* Jenis */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Jenis Transaksi
            </label>
            <input
              value={title}
              readOnly
              className="w-full rounded-md border bg-gray-100 px-3 py-2"
            />
          </div>

          {/* Tanggal */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Tanggal
              </label>
              <input
                type="date"
                value={transaction.transactionDate}
                onChange={(e)=>
                  transaction.setTransactionDate(
                  e.target.value
                )
                }
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
            
            {/* ========================================= */}
            {/* REFERENCE */}
            {/* ========================================= */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Nomor Referensi
              </label>
              <input
                value={transaction.reference}
                onChange={(e)=>
                  transaction.setReference(
                    e.target.value
                  )
                }
                placeholder="Opsional"
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
          </div>

          {/* ========================================= */}
          {/* TRANSFER */}
          {/* ========================================= */}
          {transaction.transactionKind === "TRANSFER" && (
          
            <div className="space-y-4 rounded-lg border bg-slate-50 p-4">

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Gudang Asal
                </label>

                <select
                  value={transaction.fromStoreId}
                  onChange={(e) =>
                    transaction.handleFromStoreChange(
                      e.target.value
                    )
                  }
                  className="w-full rounded-md border px-3 py-2"
                >
                  <option value="">
                    -- Pilih Store --
                  </option>

                  {stores.map((store) => (
                    <option
                      key={store.id}
                      value={store.id}
                    >
                      {store.code} - {store.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Gudang Tujuan
                </label>

                <select
                  value={transaction.targetStoreId}
                  onChange={(e) =>
                    transaction.handleTargetStoreChange(
                      e.target.value
                    )
                  }
                  className="w-full rounded-md border px-3 py-2"
                >

                  <option value="">
                    -- Pilih Store --
                  </option>

                  {stores
                    .filter(
                      (store) =>
                        store.id !== transaction.fromStoreId
                    )
                    .map((store) => (
                      <option
                        key={store.id}
                        value={store.id}
                      >
                        {store.code} - {store.name}
                      </option>
                  ))}
                </select>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <h3 className="text-base font-semibold">
                      Input Artikel Transfer
                  </h3>

                  <div className="grid grid-cols-12 items-end gap-3">
                    <div className="col-span-6">
                      <label className="mb-1 block text-sm font-medium">
                        Artikel
                      </label>

                    <div className="relative">
                      <input
                        type="text"
                        value={transferItemSearch}
                        onChange={(e) => {
                          setTransferItemSearch(e.target.value);
                          setShowTransferDropdown(true);
                          setHighlightedTransferIndex(-1);
                        }}
                        onFocus={() => setShowTransferDropdown(true)}
                        onBlur={() => {
                          setTimeout(() => {
                            setShowTransferDropdown(false);
                          }, 150);
                        }}
                        onKeyDown={(e) => {

                          if (e.key === "ArrowDown") {
                            e.preventDefault();

                            setHighlightedTransferIndex((prev) =>
                              prev < filteredTransferStocks.length - 1
                                ? prev + 1
                                : 0
                            );
                            return;
                          }

                          if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setHighlightedTransferIndex((prev) =>
                              prev > 0
                                ? prev - 1
                                : filteredTransferStocks.length - 1
                            );
                            return;
                          }

                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (
                              highlightedTransferIndex >= 0 &&
                              highlightedTransferIndex <
                                filteredTransferStocks.length
                            ) {
                              handleSelectTransferItem(
                                filteredTransferStocks[
                                  highlightedTransferIndex
                                ]
                              );
                            }
                            return;
                          }

                          if (e.key === "Escape") {
                            setShowTransferDropdown(false);
                          }
                        }}
                        placeholder="Cari kode atau nama artikel..."
                        className="w-full rounded border px-3 py-2"
                        autoComplete="off"
                      />

                      {showTransferDropdown &&
                        filteredTransferStocks.length > 0 && (
                        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded border bg-white shadow">
                          {filteredTransferStocks.map(
                            (stock, index) => (
                              <div
                                key={stock.id}
                                onMouseDown={() =>
                                  handleSelectTransferItem(stock)
                                }
                                className={`cursor-pointer px-3 py-2 ${
                                  highlightedTransferIndex === index
                                    ? "bg-blue-100"
                                    : "hover:bg-gray-100"
                                }`}
                              >
                                <div className="font-medium">
                                  {stock.item_code}
                                </div>

                                <div className="text-xs text-gray-500">
                                  {stock.item_name}
                                </div>

                                <div className="text-xs text-blue-600">
                                  Stok :
                                  {" "}
                                  {stock.quantity_on_hand}
                                </div>
                              </div>
                          ))}
                        </div>
                      )}
                    </div>

                    </div>
                    <div className="col-span-2">
                      <label className="mb-1 block text-sm font-medium">
                        Stok
                      </label>

                      <input
                        readOnly
                        value={
                          selectedTransferStock?.quantity_on_hand ?? ""
                        }
                        className="w-full rounded border bg-gray-100 px-3 py-2 text-right"
                      />

                    </div>
                    <div className="col-span-2">
                      <label className="mb-1 block text-sm font-medium">
                        Qty
                      </label>

                      <input
                        value={transferQty}
                        onChange={(e)=>
                          setTransferQty(e.target.value)
                        }
                        className="w-full rounded border px-3 py-2 text-right"
                      />

                    </div>
                    <div className="col-span-2 flex items-end">

                      <button
                        type="button"
                        onClick={addTransferLine}
                        className="w-full rounded bg-blue-600 py-2 text-white"
                      >
                        Tambah
                      </button>
                    </div>
                  </div>
                </div>

            
                <table className="w-full border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="w-12 border p-2">
                      No
                      </th>

                      <th className="border p-2">
                      Artikel
                      </th>

                      <th className="w-24 border p-2 text-right">
                      Stok
                      </th>

                      <th className="w-24 border p-2 text-right">
                      Qty
                      </th>

                      <th className="w-24 border p-2">
                      Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {transaction.lines.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="border p-8 text-center text-gray-500"
                        >
                          <div className="font-medium">
                            Belum ada artikel.
                          </div>

                          <div className="mt-1 text-xs text-gray-400">
                            Pilih artikel di atas lalu klik
                            <b> Tambah</b>.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      transaction.lines.map((line, index) => {
                        const stockInfo = stocks.find(
                          (s) => s.id === line.stockId
                        );
                        return (
                          <tr key={line.id}>
                            <td className="border p-2 text-center">
                              {index + 1}
                            </td>

                            <td className="border p-2">
                              {stockInfo?.item_code}
                              {" - "}
                              {stockInfo?.item_name}
                            </td>

                            <td className="border p-2 text-right">
                              {stockInfo?.quantity_on_hand}
                            </td>

                            <td className="border p-2 text-right">
                              {line.qty}
                            </td>

                            <td className="border p-2 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  transaction.removeLine(line.id)
                                }
                                className="rounded bg-red-500 px-2 py-1 text-white hover:bg-red-600"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                </tbody>
                </table>
                <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                  Qty adalah jumlah fisik yang di transfer
                </div>
              </div>             
            </div>
          )}   
          
          {/* ========================================= */}
          {/* OPNAME */}
          {/* ========================================= */}

          {transaction.transactionKind === "OPNAME" && (
            <div className="space-y-4 rounded-lg border bg-slate-50 p-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Store / Gudang
                </label>

                <select
                  value={transaction.targetStoreId}
                  onChange={(e) =>
                    transaction.handleTargetStoreChange(
                      e.target.value
                    )
                  }
                  className="w-full rounded-md border px-3 py-2"
                >
                  <option value="">
                    -- Pilih Store --
                  </option>

                  {stores.map((store) => (
                    <option
                      key={store.id}
                      value={store.id}
                    >
                      {store.code} - {store.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold">
                  Input Artikel Stock Opname
                </h3>

                <div className="grid grid-cols-12 items-end gap-3">
                  <div className="col-span-4">
                    <label className="mb-1 block text-sm font-medium">
                      Artikel
                    </label>

                    <div className="relative">
                      <input
                        type="text"
                        value={transferItemSearch}
                        onChange={(e) => {
                          setTransferItemSearch(e.target.value);
                          setShowTransferDropdown(true);
                          setHighlightedTransferIndex(-1);
                        }}
                        onFocus={() => setShowTransferDropdown(true)}
                        onBlur={() => {
                          setTimeout(() => {
                            setShowTransferDropdown(false);
                          }, 150);
                        }}
                        onKeyDown={(e) => {

                          if (e.key === "ArrowDown") {
                            e.preventDefault();

                            setHighlightedTransferIndex((prev) =>
                              prev < filteredOpnameStocks.length - 1
                                ? prev + 1
                                : 0
                            );
                            return;
                          }

                          if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setHighlightedTransferIndex((prev) =>
                              prev > 0
                                ? prev - 1
                                : filteredOpnameStocks.length - 1
                            );
                            return;
                          }

                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (
                              highlightedTransferIndex >= 0 &&
                              highlightedTransferIndex <
                                filteredOpnameStocks.length
                            ) {
                              handleSelectTransferItem(
                                filteredOpnameStocks[
                                  highlightedTransferIndex
                                ]
                              );
                            }
                            return;
                          }

                          if (e.key === "Escape") {
                            setShowTransferDropdown(false);
                          }
                        }}
                        placeholder="Cari kode atau nama artikel..."
                        className="w-full rounded border px-3 py-2"
                        autoComplete="off"
                      />

                      {showTransferDropdown &&
                        filteredOpnameStocks.length > 0 && (
                          <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded border bg-white shadow">
                            {filteredOpnameStocks.map(
                              (stock, index) => (
                                <div
                                  key={stock.id}
                                  onMouseDown={() =>
                                    handleSelectTransferItem(stock)
                                  }
                                  className={`cursor-pointer px-3 py-2 ${
                                    highlightedTransferIndex === index
                                      ? "bg-blue-100"
                                      : "hover:bg-gray-100"
                                  }`}
                                >
                                  <div className="font-medium">
                                    {stock.item_code}
                                  </div>

                                  <div className="text-xs text-gray-500">
                                    {stock.item_name}
                                  </div>

                                  <div className="text-xs text-blue-600">
                                    Stok :
                                    {" "}
                                    {stock.quantity_on_hand}
                                  </div>
                                </div>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="col-span-1 text-center">
                    <label className="mb-1 block text-sm font-medium">
                      Stok
                    </label>
                    <input
                      readOnly
                      value={
                        selectedTransferStock?.quantity_on_hand ?? ""
                      }
                      className="w-full rounded border bg-gray-100 px-3 py-2 text-right"
                    />
                  </div>

                  <div className="col-span-1 text-right">
                    <label className="mb-1 block text-sm font-medium">
                      Qty Fisik
                    </label>
                    <input
                      value={transferQty}
                      onChange={(e)=>
                        setTransferQty(e.target.value)
                      }
                      className="w-full rounded border px-3 py-2 text-right"
                    />
                  </div>

                  <div className="col-span-5 text-center">
                    <label className="mb-1 block text-sm font-medium">
                      Akun
                    </label>

                    <select
                      value={transaction.offsetAccountId}
                      onChange={(e)=>
                        transaction.setOffsetAccountId(
                         e.target.value
                        )
                      }
                      className="w-full rounded border px-2 py-2"
                    >
                    <option value="">
                      Pilih Akun
                    </option>
                      {accounts.map(account=>(
                        <option
                          key={account.id}
                          value={account.id}
                        >
                          {account.code} - {account.name}
                        </option>
                      ))}
                    </select>
                  </div>
      
                  <div className="col-span-1 text-center">
                    <label className="mb-1 block text-sm font-medium">
                      Tambah
                    </label>
                    <button
                      type="button"
                      onClick={addOpnameLine}
                      className="w-full rounded bg-blue-600 py-2 text-white"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <table className="w-full border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="w-12 border p-2">
                      No
                    </th>
                    <th className="border p-2">
                       Artikel
                    </th>
                      <th className="border p-2 text-right">
                      Stok
                    </th>

                    <th className="border p-2 text-right">
                       Qty Fisik
                     </th>

                     <th className="border p-2">
                       Akun
                     </th>

                     <th className="border p-2 w-16">
                       Action
                     </th>
                  </tr>
                </thead>

                <tbody>
                   {transaction.lines.map((line, index) => {
                     const stockInfo = stocks.find(
                       (s) => s.id === line.stockId
                     );

                     return (
                       <tr key={line.id}>
                         <td className="border p-2 text-center">
                           {index+1}
                         </td>

                         <td className="border p-2">
                           {stockInfo?.item_code}
                           {" - "}
                           {stockInfo?.item_name}
                         </td>

                         <td className="border p-2 text-right">
                           {stockInfo?.quantity_on_hand ?? "-"}
                         </td>

                         <td className="border p-2 text-right">
                           {line.qty}
                         </td>

                         <td className="border p-2">
                           {
                             accounts.find(
                               a=>a.id===line.accountId
                             )?.code
                           }

                            {" - "}

                           {
                            accounts.find(
                               a=>a.id===line.accountId
                             )?.name
                           }
                         </td>

                         <td className="border p-2 text-center">
                           <button
                             type="button"
                             onClick={() =>
                               transaction.removeLine(line.id)
                             }
                             className="rounded bg-red-500 px-2 py-1 text-white"
                           >
                             Hapus
                           </button>
                         </td>
                       </tr>
                     );
                   })}
                </tbody>
              </table>
              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                Qty adalah jumlah fisik hasil stock opname.
              </div>
            </div>
          )}

          {/* ========================================= */}
          {/* ADJUSTMENT */}
          {/* ========================================= */}
          {transaction.transactionKind === "ADJUSTMENT" && (
            <div className="space-y-4 rounded-lg border bg-slate-50 p-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Store / Gudang
                </label>

                <select
                  value={transaction.targetStoreId}
                  onChange={(e) =>
                    transaction.handleTargetStoreChange(
                      e.target.value
                    )
                  }
                  className="w-full rounded-md border px-3 py-2"
                >
                  <option value="">
                    -- Pilih Store --
                  </option>

                  {stores.map((store) => (
                    <option
                      key={store.id}
                      value={store.id}
                    >
                      {store.code} - {store.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold">
                  Input Artikel Adjusment
                </h3>

                <div className="grid grid-cols-12 items-end gap-3">
                  <div className="col-span-4">
                    <label className="mb-1 block text-sm font-medium">
                      Artikel
                    </label>

                  <div className="relative">
                      <input
                        type="text"
                        value={transferItemSearch}
                        onChange={(e) => {
                          setTransferItemSearch(e.target.value);
                          setShowTransferDropdown(true);
                          setHighlightedTransferIndex(-1);
                        }}
                        onFocus={() => setShowTransferDropdown(true)}
                        onBlur={() => {
                          setTimeout(() => {
                            setShowTransferDropdown(false);
                          }, 150);
                        }}
                        onKeyDown={(e) => {

                          if (e.key === "ArrowDown") {
                            e.preventDefault();

                            setHighlightedTransferIndex((prev) =>
                              prev < filteredAdjustmentStocks.length - 1
                                ? prev + 1
                                : 0
                            );
                            return;
                          }

                          if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setHighlightedTransferIndex((prev) =>
                              prev > 0
                                ? prev - 1
                                : filteredAdjustmentStocks.length - 1
                            );
                            return;
                          }

                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (
                              highlightedTransferIndex >= 0 &&
                              highlightedTransferIndex <
                                filteredAdjustmentStocks.length
                            ) {
                              handleSelectTransferItem(
                                filteredAdjustmentStocks[
                                  highlightedTransferIndex
                                ]
                              );
                            }
                            return;
                          }

                          if (e.key === "Escape") {
                            setShowTransferDropdown(false);
                          }
                        }}
                        placeholder="Cari kode atau nama artikel..."
                        className="w-full rounded border px-3 py-2"
                        autoComplete="off"
                      />

                      {showTransferDropdown &&
                        filteredAdjustmentStocks.length > 0 && (
                        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded border bg-white shadow">
                          {filteredAdjustmentStocks.map(
                            (stock, index) => (
                              <div
                                key={stock.id}
                                onMouseDown={() =>
                                  handleSelectTransferItem(stock)
                                }
                                className={`cursor-pointer px-3 py-2 ${
                                  highlightedTransferIndex === index
                                    ? "bg-blue-100"
                                    : "hover:bg-gray-100"
                                }`}
                              >
                                <div className="font-medium">
                                  {stock.item_code}
                                </div>

                                <div className="text-xs text-gray-500">
                                  {stock.item_name}
                                </div>

                                <div className="text-xs text-blue-600">
                                  Stok :
                                  {" "}
                                  {stock.quantity_on_hand}
                                </div>
                              </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                  </div>
                    <div className="col-span-1 text-center">
                      <label className="mb-1 block text-sm font-medium">
                        Stok
                      </label>
                      <input
                        readOnly
                        value={
                          selectedTransferStock?.quantity_on_hand ?? ""
                        }
                        className="w-full rounded border bg-gray-100 px-3 py-2 text-right"
                      />

                    </div>
                    <div className="col-span-1">
                      <label className="mb-1 block text-sm font-medium">
                        Qty Fisik
                      </label>

                      <input
                        value={transferQty}
                        onChange={(e)=>
                          setTransferQty(e.target.value)
                        }
                        className="w-full rounded border px-3 py-2 text-right"
                      />
                    </div>

                    <div className="col-span-5 text-center">
                      <label className="mb-1 block text-sm font-medium">
                        Akun
                      </label>

                      <select
                        value={transaction.offsetAccountId}
                        onChange={(e)=>
                          transaction.setOffsetAccountId(
                            e.target.value
                          )
                        }
                        className="w-full rounded border px-2 py-2"
                      >
                        <option value="">
                          Pilih Akun
                        </option>

                        {accounts.map(account=>(
                          <option
                            key={account.id}
                            value={account.id}
                          >
                            {account.code} - {account.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-1 text-center">
                      <label className="mb-1 block text-sm font-medium">
                        Tambah
                      </label>

                      <button
                        type="button"
                        onClick={addAdjustmentLine}
                        className="w-full rounded bg-blue-600 py-2 text-white"
                      >
                        +
                      </button>
                    </div>
                  </div>          
              </div>

              <table className="w-full border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="w-12 border p-2">
                      No
                    </th>

                    <th className="border p-2">
                      Artikel
                    </th>

                    <th className="border p-2 text-right">
                      Stok
                    </th>

                    <th className="border p-2 text-right">
                      Qty Fisik
                    </th>

                    <th className="border p-2">
                      Akun
                    </th>

                    <th className="border p-2 w-16">
                      Action
                    </th>
                  </tr>
                </thead>

              <tbody>
                {transaction.lines.map((line,index) => {
                  const stockInfo = stocks.find(
                    (s) => s.id === line.stockId
                  );

                  return (
                    <tr key={line.id}>
                      <td className="border p-2 text-center">
                        {index+1}
                      </td>

                      <td className="border p-2">
                        {stockInfo?.item_code}
                        {" - "}
                        {stockInfo?.item_name}
                      </td>

                      <td className="border p-2 text-right">
                        {stockInfo?.quantity_on_hand ?? "-"}
                      </td>

                      <td className="border p-2 text-right">
                        {line.qty}
                      </td>

                      <td className="border p-2">
                        {
                          accounts.find(
                            a=>a.id===line.accountId
                          )?.code
                        }

                          {" - "}

                        {
                          accounts.find(
                            a=>a.id===line.accountId
                          )?.name
                        }
                      </td>

                      <td className="border p-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            transaction.removeLine(line.id)
                          }
                          className="rounded bg-red-500 px-2 py-1 text-white"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                Qty adalah jumlah fisik hasil stock opname.
              </div>
            </div>
          )}
          
          {/* ========================================= */}
          {/* KETERANGAN */}
          {/* ========================================= */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Keterangan
            </label>
            <textarea
              rows={4}
              value={transaction.transactionNotes}
              onChange={(e)=>
                transaction.setTransactionNotes(
                  e.target.value
                )
              }
              placeholder="Catatan transaksi..."
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          {/* ========================================= */}
          {/* FOOTER */}
          {/* ========================================= */}
          <div className="sticky z-20 flex justify-end gap-3 border-t bg-white px-6 py-4">
             
            <button
              type="button"
              onClick={()=>{
                transaction.resetForm();
                onClose();
              }}
              disabled={transaction.postingTransaction}
              className="rounded-md border border-gray-300 px-5 py-2 text-sm"
            >
              Batal
            </button>

            <button
              type="button"
              disabled={transaction.postingTransaction}
              onClick={()=>{
                void transaction.postTransaction();
              }}
              className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {transaction.postingTransaction
                ? "Menyimpan..."
                : "Posting Transaksi"}
            </button>
          </div>
        </div>
      </div>
    </div>
   </div>
  );
}