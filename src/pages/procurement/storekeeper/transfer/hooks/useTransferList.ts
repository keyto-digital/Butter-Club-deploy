import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { PaginationMeta } from "@/lib/pagination/types";

import type {
  TransferDocument,
  TransferFilter,
} from "../types";

import type {
  StoreOption,
} from "../../types";

type TransferMovementRow = {
  reference: string;
  movement_date: string;
  created_at: string;
  created_by: string | null;
  movement_type: string;

  quantity_in: number | string | null;
  quantity_out: number | string | null;
  movement_value: number | string | null;

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
        id: string;
        code: string;
        name: string;
      }
    | {
        id: string;
        code: string;
        name: string;
      }[]
    | null;
};

const DEFAULT_PAGE_SIZE = 25;

export function useTransferList() {
  const [loading, setLoading] =
    useState(false);

  const [documents, setDocuments] =
    useState<TransferDocument[]>([]);

  const [stores, setStores] =
    useState<StoreOption[]>([]);

  const [filter, setFilter] =
    useState<TransferFilter>({
      dateFrom: "",
      dateTo: "",
      fromStoreId: "",
      toStoreId: "",
      keyword: "",
    });

  const [paginationMeta, setPaginationMeta] =
    useState<PaginationMeta>({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      total: 0,
      from: 0,
      to: 0,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    });

  // =========================================================
  // LOAD STORE
  // =========================================================

  useEffect(() => {
    const loadStores = async () => {
      const {
        data,
        error,
      } = await supabase
        .from("stores")
        .select(
          "id,code,name"
        )
        .order("code");

      if (error) {
        console.error(
          "Load stores gagal:",
          error
        );
        return;
      }

      setStores(
        (data ?? []) as StoreOption[]
      );
    };

    void loadStores();
  }, []);

  // =========================================================
  // FETCH MOVEMENTS
  // =========================================================

  const fetchMovements = async (
    currentFilter: TransferFilter
  ): Promise<
    TransferMovementRow[]
  > => {
    let query = supabase
      .from("inventory_movements")
      .select(`
        reference,
        movement_date,
        created_at,
        created_by,
        movement_type,
        quantity_in,
        quantity_out,
        movement_value,

        item:items(
          code,
          name,
          unit:units(
            code
          )
        ),

        store:stores(
          id,
          code,
          name
        )
      `)
      .eq(
        "source_table",
        "inventory_transfers"
      );

    if (
      currentFilter.dateFrom
    ) {
      query = query.gte(
        "movement_date",
        currentFilter.dateFrom
      );
    }

    if (
      currentFilter.dateTo
    ) {
      query = query.lte(
        "movement_date",
        currentFilter.dateTo
      );
    }

    const {
      data,
      error,
    } = await query.order(
      "created_at",
      {
        ascending: false,
      }
    );

    if (error) {
      throw error;
    }

    return (
      data ?? []
    ) as unknown as TransferMovementRow[];
  };

  // =========================================================
  // BUILD DOCUMENTS
  // =========================================================

  const buildDocuments = (
    data: TransferMovementRow[],
    currentFilter: TransferFilter
  ): TransferDocument[] => {
    const map =
      new Map<
        string,
        TransferDocument
      >();

    data.forEach((row) => {
      let doc =
        map.get(
          row.reference
        );

      if (!doc) {
        doc = {
          reference:
            row.reference,

          movement_date:
            row.movement_date,

          created_at:
            row.created_at,

          created_by:
            row.created_by,

          fromStore:
            null,

          toStore:
            null,

          items: [],

          totalQty: 0,

          totalValue: 0,
        };

        map.set(
          row.reference,
          doc
        );
      }

      const store =
        Array.isArray(
          row.store
        )
          ? row.store[0]
          : row.store;

      const item =
        Array.isArray(
          row.item
        )
          ? row.item[0]
          : row.item;

      // =====================================================
      // TRANSFER OUT
      // =====================================================

      if (
        row.movement_type ===
        "TRANSFER_OUT"
      ) {
        doc.fromStore =
          store
            ? {
                id: store.id,
                code:
                  store.code,
                name:
                  store.name,
              }
            : null;

        doc.totalQty +=
          Number(
            row.quantity_out ??
              0
          );

        doc.totalValue +=
          Number(
            row.movement_value ??
              0
          );
      }

      // =====================================================
      // TRANSFER IN
      // =====================================================

      if (
        row.movement_type ===
        "TRANSFER_IN"
      ) {
        doc.toStore =
          store
            ? {
                id: store.id,
                code:
                  store.code,
                name:
                  store.name,
              }
            : null;
      }

      // =====================================================
      // ITEM
      // =====================================================

      const unit =
        Array.isArray(
          item?.unit
        )
          ? item.unit[0]
          : item?.unit;

      doc.items.push({
        code:
          item?.code ??
          "",

        name:
          item?.name ??
          "",

        unit_code:
          unit?.code ??
          null,

        qty:
          Number(
            row.quantity_in ??
              0
          ) ||
          Number(
            row.quantity_out ??
              0
          ),

        value:
          Number(
            row.movement_value ??
              0
          ),
      });
    });

    // =======================================================
    // FILTER STORE + KEYWORD
    // =======================================================

    const keyword =
      currentFilter.keyword
        .trim()
        .toLowerCase();

    return Array.from(
      map.values()
    ).filter((doc) => {
      if (
        currentFilter.fromStoreId &&
        doc.fromStore?.id !==
          currentFilter.fromStoreId
      ) {
        return false;
      }

      if (
        currentFilter.toStoreId &&
        doc.toStore?.id !==
          currentFilter.toStoreId
      ) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      if (
        doc.reference
          .toLowerCase()
          .includes(keyword)
      ) {
        return true;
      }

      return doc.items.some(
        (item) =>
          `${item.code} ${item.name}`
            .toLowerCase()
            .includes(keyword)
      );
    });
  };

  // =========================================================
  // LOAD TABLE
  // =========================================================

  const load = async (
    currentFilter: TransferFilter,
    requestedPage: number,
    requestedPageSize: number
  ) => {
    setLoading(true);

    try {
      const movements =
        await fetchMovements(
          currentFilter
        );

      const allDocuments =
        buildDocuments(
          movements,
          currentFilter
        );

      const total =
        allDocuments.length;

      const totalPages =
        total === 0
          ? 0
          : Math.ceil(
              total /
                requestedPageSize
            );

      const safePage =
        totalPages === 0
          ? 1
          : Math.min(
              Math.max(
                requestedPage,
                1
              ),
              totalPages
            );

      const from =
        total === 0
          ? 0
          : (safePage - 1) *
            requestedPageSize;

      const to =
        total === 0
          ? 0
          : Math.min(
              from +
                requestedPageSize -
                1,
              total - 1
            );

      const pageDocuments =
        total === 0
          ? []
          : allDocuments.slice(
              from,
              to + 1
            );

      setDocuments(
        pageDocuments
      );

      setPaginationMeta({
        page: safePage,
        pageSize:
          requestedPageSize,
        total,
        from,
        to,
        totalPages,
        hasPreviousPage:
          safePage > 1,
        hasNextPage:
          safePage <
          totalPages,
      });
    } catch (error) {
      console.error(
        "Load transfer gagal:",
        error
      );

      setDocuments([]);

      setPaginationMeta({
        page: 1,
        pageSize:
          requestedPageSize,
        total: 0,
        from: 0,
        to: 0,
        totalPages: 0,
        hasPreviousPage:
          false,
        hasNextPage:
          false,
      });
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // FILTER BERUBAH
  // =========================================================

  useEffect(() => {
    void load(
      filter,
      1,
      paginationMeta.pageSize
    );
  }, [filter]);

  // =========================================================
  // PAGE CHANGE
  // =========================================================

  const goToPage = (
    nextPage: number
  ) => {
    void load(
      filter,
      nextPage,
      paginationMeta.pageSize
    );
  };

  // =========================================================
  // PAGE SIZE CHANGE
  // =========================================================

  const changePageSize = (
    nextPageSize: number
  ) => {
    void load(
      filter,
      1,
      nextPageSize
    );
  };

  // =========================================================
  // FETCH SEMUA DATA
  // KHUSUS EXPORT + PRINT
  // =========================================================

  const fetchAllFilteredDocuments =
    async (): Promise<
      TransferDocument[]
    > => {
      const movements =
        await fetchMovements(
          filter
        );

      return buildDocuments(
        movements,
        filter
      );
    };

  // =========================================================
  // RELOAD
  // =========================================================

  const reload = () => {
    void load(
      filter,
      paginationMeta.page,
      paginationMeta.pageSize
    );
  };

  // =========================================================
  // RETURN
  // =========================================================

  return {
    loading,
    documents,
    stores,
    filter,

    setFilter,
    paginationMeta,
    goToPage,
    changePageSize,
    fetchAllFilteredDocuments,
    reload,
  };
}