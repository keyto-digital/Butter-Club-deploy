import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type MovementDetailRawRow = {
  id: string;
  movement_date: string;
  movement_type: string;
  quantity_in: number | null;
  quantity_out: number | null;
  quantity_after: number | null;
  average_cost_after: number | null;
  reference: string;
  description: string | null;
  created_at: string;
  created_by: string | null;

  item:
    | {
        code: string | null;
        name: string | null;
        unit:
          | { code: string | null }
          | { code: string | null }[]
          | null;
      }
    | {
        code: string | null;
        name: string | null;
        unit:
          | { code: string | null }
          | { code: string | null }[]
          | null;
      }[]
    | null;

  store:
    | {
        code: string | null;
        name: string | null;
      }
    | {
        code: string | null;
        name: string | null;
      }[]
    | null;
};

type MovementDetailRow = Omit<
  MovementDetailRawRow,
  "item" | "store"
> & {
  item: {
    code: string | null;
    name: string | null;
    unit: {
      code: string | null;
    } | null;
  } | null;

  store: {
    code: string | null;
    name: string | null;
  } | null;
};

export function useMovementDetail() {

  const [loading,setLoading] = useState(false);

  const [rows, setRows] = useState<MovementDetailRow[]>([]);

  const loadDetail=
    useCallback(

    async(reference:string)=>{
      if(!reference){
        setRows([]);
        return;
      }

      setLoading(true);
      const {data,error}=
      await supabase
      .from("inventory_movements")
      .select(`
        id,
        movement_date,
        movement_type,
        quantity_in,
        quantity_out,
        quantity_after,
        average_cost_after,
        reference,
        description,
        created_at,
        created_by,

        item:items(
          code,
          name,
          unit:units(
            code
          )
        ),

        store:stores(
          code,
          name
        )
      `)

      .eq(
        "reference",
        reference
      )

      .order(
        "movement_type"
      );

      if(error){
        console.error(error);
        setRows([]);

      }else{
        const movementRows = (data ?? []).map(
          (row: MovementDetailRawRow): MovementDetailRow => ({
            ...row,

            item: Array.isArray(row.item)
              ? row.item[0]
                ? {
                    code: row.item[0].code,
                    name: row.item[0].name,
                    unit: Array.isArray(row.item[0].unit)
                      ? row.item[0].unit[0] ?? null
                      : row.item[0].unit,
                  }
                : null
              : row.item
                ? {
                    code: row.item.code,
                    name: row.item.name,
                    unit: Array.isArray(row.item.unit)
                      ? row.item.unit[0] ?? null
                      : row.item.unit,
                  }
                : null,

            store: Array.isArray(row.store)
              ? row.store[0] ?? null
              : row.store,
          })
        );

        setRows(movementRows);
      }
      setLoading(false);
    },
    []
  );

  return{
    loading,
    rows,
    loadDetail,
  };
}