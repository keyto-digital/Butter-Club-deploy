import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type {
  AccountMappingFormData,
  AccountMappingWithAccount,
} from "../types";

const TABLE_NAME = "account_mappings";

export interface AccountMappingPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function useAccountMapping(entityId?: string | null) {
  const [mappings, setMappings] = useState<AccountMappingWithAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");

  const totalPages = Math.max(
    1,
    Math.ceil(total / pageSize)
  );

  const fetchMappings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const keyword = search.trim();

      /*
       * Jika search digunakan pada account code/name,
       * cari account_id terlebih dahulu.
       */
      let matchingAccountIds: string[] = [];

      if (keyword) {
        const escapedKeyword = keyword.replace(
          /[%_]/g,
          "\\$&"
        );

        const {
          data: matchingAccounts,
          error: accountSearchError,
        } = await supabase
          .from("accounts")
          .select("id")
          .or(
            `code.ilike.%${escapedKeyword}%,name.ilike.%${escapedKeyword}%`
          );

        if (accountSearchError) {
          throw accountSearchError;
        }

        matchingAccountIds = (matchingAccounts ?? []).map(
          (account) => account.id
        );
      }

      let query = supabase
        .from(TABLE_NAME)
        .select(
          `
            *,
            account:accounts (
              id,
              code,
              name,
              category_code,
              account_type
            )
          `,
          { count: "exact" }
        )
        .order("module_code", { ascending: true })
        .order("transaction_code", { ascending: true })
        .order("mapping_key", { ascending: true });

      /*
       * Global / entity.
       */
      if (entityId) {
        query = query.eq("entity_id", entityId);
      } else {
        query = query.is("entity_id", null);
      }

      /*
       * Search dilakukan di database,
       * bukan lagi mappings.filter() di frontend.
       */
      if (keyword) {
        const escapedKeyword = keyword.replace(
          /[%_]/g,
          "\\$&"
        );

        const directSearch = [
          `module_code.ilike.%${escapedKeyword}%`,
          `transaction_code.ilike.%${escapedKeyword}%`,
          `mapping_key.ilike.%${escapedKeyword}%`,
          `name.ilike.%${escapedKeyword}%`,
          `description.ilike.%${escapedKeyword}%`,
        ];

        if (matchingAccountIds.length > 0) {
          directSearch.push(
            `account_id.in.(${matchingAccountIds.join(",")})`
          );
        }

        query = query.or(directSearch.join(","));
      }

      /*
       * Server-side pagination.
       */
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      query = query.range(from, to);

      const {
        data,
        error: fetchError,
        count,
      } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setMappings(
        (data ?? []) as AccountMappingWithAccount[]
      );

      setTotal(count ?? 0);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Gagal mengambil data account mapping.";

      setError(message);
      setMappings([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [entityId, page, pageSize, search]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  /*
   * Jika entity berubah atau search berubah,
   * kembali ke halaman pertama.
   */
  useEffect(() => {
    setPage(1);
  }, [entityId, search]);

  const createMapping = async (
    payload: AccountMappingFormData
  ) => {
    setSaving(true);
    setError(null);

    const { error: createError } = await supabase
      .from(TABLE_NAME)
      .insert({
        module_code: payload.module_code,
        transaction_code: payload.transaction_code,
        mapping_key: payload.mapping_key,
        account_id: payload.account_id,
        entity_id: payload.entity_id,
        name: payload.name,
        description: payload.description,
        is_active: payload.is_active,
      });

    if (createError) {
      setError(createError.message);
      setSaving(false);
      return false;
    }

    await fetchMappings();

    setSaving(false);
    return true;
  };

  const updateMapping = async (
    id: string,
    payload: AccountMappingFormData
  ) => {
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from(TABLE_NAME)
      .update({
        module_code: payload.module_code,
        transaction_code: payload.transaction_code,
        mapping_key: payload.mapping_key,
        account_id: payload.account_id,
        entity_id: payload.entity_id,
        name: payload.name,
        description: payload.description,
        is_active: payload.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return false;
    }

    await fetchMappings();

    setSaving(false);
    return true;
  };

  const deleteMapping = async (id: string) => {
    setSaving(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      setSaving(false);
      return false;
    }

    await fetchMappings();

    setSaving(false);
    return true;
  };

    return {
      mappings,
      loading,
      saving,
      error,

      fetchMappings,

      createMapping,
      updateMapping,
      deleteMapping,

      page,
      pageSize,
      total,
      totalPages,
      setPage,
      setPageSize,

      search,
      setSearch,
    };
  }