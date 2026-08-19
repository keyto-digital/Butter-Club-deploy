import { useEffect } from "react";
import { getWIBTimestampFromUTC } from "@/utils/time";
import { money, quantity } from "../../../utils/format";
import { useMovementDetail } from "../../hooks/useMovementDetail";
import type { AdjustmentDocument } from "../types";

interface Props {
  open: boolean;
  row: AdjustmentDocument | null;
  onClose: () => void;
}

export default function AdjustmentDetailModal({
  open,
  row,
  onClose,
}: Props) {
  const {
    rows,
    loadDetail,
  } = useMovementDetail();

  useEffect(() => {
    if (!open || !row?.reference) {
      return;
    }

    void loadDetail(row.reference);
  }, [
    open,
    row?.reference,
    loadDetail,
  ]);

  if (!open || !row) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">

      <div className="w-[1100px] max-h-[90vh] overflow-auto rounded-lg bg-white shadow-xl">

        <div className="flex items-center justify-between border-b p-4">

          <h2 className="text-lg font-semibold">
            Detail Adjustment
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded border px-3 py-1"
          >
            ✕
          </button>

        </div>

        <div className="space-y-6 p-5">

          <div className="grid grid-cols-3 gap-4">

            <Info
              label="No Adjustment"
              value={row.reference}
            />

            <Info
              label="Tanggal"
              value={row.movement_date}
            />

            <Info
              label="Posting"
              value={getWIBTimestampFromUTC(row.created_at)}
            />

            <Info
              label="User"
              value={row.created_by ?? "-"}
            />

            <Info
              label="Gudang"
              value={
                row.store
                  ? `${row.store.code} - ${row.store.name}`
                  : "-"
              }
            />

            <Info
              label="Jumlah Item"
              value={String(row.items.length)}
            />

          </div>

          <div>

            <div className="mb-2 font-semibold">
              Detail Item
            </div>

            <div className="overflow-x-auto rounded border">

              <div className="grid min-w-[1250px] grid-cols-[60px_120px_280px_90px_120px_120px_120px_150px_150px] bg-slate-100 text-sm font-semibold">

                <div className="border-r border-b p-2 text-center">
                  No
                </div>

                <div className="border-r border-b p-2">
                  Kode
                </div>

                <div className="border-r border-b p-2">
                  Artikel
                </div>

                <div className="border-r border-b p-2">
                  Satuan
                </div>

                <div className="border-r border-b p-2 text-right">
                  Qty Sebelum
                </div>

                <div className="border-r border-b p-2 text-right">
                  Qty Adj
                </div>

                <div className="border-r border-b p-2 text-right">
                  Qty Sesudah
                </div>

                <div className="border-r border-b p-2 text-right">
                  Avg Cost
                </div>

                <div className="border-b p-2 text-right">
                  Nilai
                </div>

              </div>

              {row.items.map((item, index) => (

                <div
                  key={index}
                  className="grid min-w-[1250px] grid-cols-[60px_120px_280px_90px_120px_120px_120px_150px_150px]"
                >

                  <div className="border-r border-b p-2 text-center">
                    {index + 1}
                  </div>

                  <div className="border-r border-b p-2">
                    {item.code}
                  </div>

                  <div className="border-r border-b p-2">
                    {item.name}
                  </div>

                  <div className="border-r border-b p-2">
                    {item.unit_code ?? "-"}
                  </div>

                  <div className="border-r border-b p-2 text-right">
                    {quantity(item.qtyBefore)}
                  </div>

                  <div className="border-r border-b p-2 text-right text-red-600 font-semibold">
                    {quantity(item.qtyAdjustment)}
                  </div>

                  <div className="border-r border-b p-2 text-right">
                    {quantity(item.qtyAfter)}
                  </div>

                  <div className="border-r border-b p-2 text-right">
                    {money(item.averageCost)}
                  </div>

                  <div className="border-b p-2 text-right">
                    {money(item.value)}
                  </div>

                </div>

              ))}

            </div>

          </div>

          <div>

            <div className="mb-2 font-semibold">
              Riwayat Movement
            </div>

            <div className="overflow-x-auto rounded border">

              <div className="grid min-w-[750px] grid-cols-[180px_220px_100px_100px_120px] bg-slate-100 font-semibold">

                <div className="border-r border-b p-2">
                  Movement
                </div>

                <div className="border-r border-b p-2">
                  Gudang
                </div>

                <div className="border-r border-b p-2 text-right">
                  Qty
                </div>

                <div className="border-r border-b p-2 text-right">
                  Saldo
                </div>

                <div className="border-b p-2 text-right">
                  Avg Cost
                </div>

              </div>

              {rows.map((line, index) => (

                <div
                  key={line.id ?? index}
                  className="grid min-w-[750px] grid-cols-[180px_220px_100px_100px_120px]"
                >

                  <div className="border-r border-b p-2">
                    {line.movement_type}
                  </div>

                  <div className="border-r border-b p-2">
                    {line.store
                      ? `${line.store.code} - ${line.store.name}`
                      : "-"}
                  </div>

                  <div className="border-r border-b p-2 text-right">
                    {quantity(line.quantity_out)}
                  </div>

                  <div className="border-r border-b p-2 text-right">
                    {quantity(line.quantity_after)}
                  </div>

                  <div className="border-b p-2 text-right">
                    {money(line.average_cost_after)}
                  </div>

                </div>

              ))}

            </div>

          </div>

          <div className="flex justify-end">

            <table>

              <tbody>

                <tr>

                  <td className="pr-8 font-medium">
                    Total Qty Adjustment
                  </td>

                  <td className="text-right font-semibold">
                    {quantity(row.totalQty)}
                  </td>

                </tr>

                <tr>

                  <td className="pr-8 font-medium">
                    Total Nilai
                  </td>

                  <td className="text-right font-semibold">
                    {money(row.totalValue)}
                  </td>

                </tr>

              </tbody>

            </table>

          </div>

          <div className="flex justify-end gap-2 border-t pt-4">

            <button
              type="button"
              onClick={() =>
                navigator.clipboard.writeText(row.reference)
              }
              className="rounded border px-4 py-2"
            >
              Copy Reference
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded bg-blue-600 px-4 py-2 text-white"
            >
              Tutup
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs text-gray-500">
        {label}
      </div>

      <div className="font-medium">
        {value}
      </div>
    </div>
  );
}