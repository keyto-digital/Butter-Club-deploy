import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { PaginationMeta } from "@/lib/pagination/types";

import type {
  OpnameDocument,
  OpnameFilter,
} from "../types";

import type {
  StoreOption,
} from "../../types";

type OpnameMovementRow = {
  reference: string;
  movement_date: string;
  created_at: string;
  created_by: string | null;
  description: string | null;

  quantity_before: number | string | null;
  quantity_after: number | string | null;
  average_cost_after: number | string | null;
  movement_value: number | string | null;

  item:
    | {
        code: string | null;
        name: string | null;
        unit:
          | {
              code: string | null;
            }
          | {
              code: string | null;
            }[]
          | null;
      }
    | {
        code: string | null;
        name: string | null;
        unit:
          | {
              code: string | null;
            }
          | {
              code: string | null;
            }[]
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

export function useOpnameList() {
  const [loading, setLoading] =
    useState(false);

  const [documents, setDocuments] =
    useState<OpnameDocument[]>([]);

  const [stores, setStores] =
    useState<StoreOption[]>([]);

  const [filter, setFilter] =
    useState<OpnameFilter>({
      dateFrom: "",
      dateTo: "",
      storeId: "",
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
  // LOAD STORES
  // =========================================================

  const loadStores = async () => {
    const {
      data,
      error,
    } = await supabase
      .from("stores")
      .select("id,code,name")
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

  // =========================================================
  // FETCH MOVEMENTS
  // =========================================================

  const fetchMovements = async (
    currentFilter: OpnameFilter
  ): Promise<OpnameMovementRow[]> => {
    let query = supabase
      .from("inventory_movements")
      .select(`
        reference,
        movement_date,
        created_at,
        created_by,
        description,
        quantity_before,
        quantity_after,
        average_cost_after,
        movement_value,

        item:items(
          code,
          name,
          unit:units(code)
        ),

        store:stores(
          id,
          code,
          name
        )
      `)
      .eq(
        "movement_type",
        "STOCK_OPNAME"
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
    ) as unknown as OpnameMovementRow[];
  };

  // =========================================================
  // BUILD DOCUMENTS
  // =========================================================

  const buildDocuments = (
    data: OpnameMovementRow[],
    currentFilter: OpnameFilter
  ): OpnameDocument[] => {
    const map =
      new Map<
        string,
        OpnameDocument
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

          store: null,

          items: [],

          totalDifference: 0,

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

      const unit =
        Array.isArray(
          item?.unit
        )
          ? item.unit[0]
          : item?.unit;

      doc.store =
        store
          ? {
              id: store.id,
              code: store.code,
              name: store.name,
            }
          : null;

      const qtySystem =
        Number(
          row.quantity_before ??
            0
        );

      const qtyOpname =
        Number(
          row.quantity_after ??
            0
        );

      const difference =
        qtyOpname -
        qtySystem;

      const value =
        Number(
          row.movement_value ??
            0
        );

      doc.totalDifference +=
        difference;

      doc.totalValue +=
        value;

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

        qtySystem,

        qtyOpname,

        difference,

        averageCost:
          Number(
            row.average_cost_after ??
              0
          ),

        value,
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
        currentFilter.storeId &&
        doc.store?.id !==
          currentFilter.storeId
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
    currentFilter: OpnameFilter,
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
        "Load stock opname gagal:",
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
  // INITIAL LOAD STORE
  // =========================================================

  useEffect(() => {
    void loadStores();
  }, []);

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
  // FETCH SEMUA DATA SESUAI FILTER
  // EXPORT + PRINT
  // =========================================================

  const fetchAllFilteredDocuments =
    async (): Promise<
      OpnameDocument[]
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