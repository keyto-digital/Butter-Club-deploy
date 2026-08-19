import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type {
  AccountOption,
  Item,
  ItemCategoryOption,
  ItemFormData,
  ItemSubcategoryOption,
  UnitOption,
} from "../types";
import { getCustomUser } from "@/lib/authUser";

const TABLE_NAME = "items";

export function useItems(entityId?: string | null) {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<ItemCategoryOption[]>([]);
  const [subcategories, setSubcategories] = useState<
    ItemSubcategoryOption[]
  >([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingMasters, setLoadingMasters] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMasters = useCallback(async () => {
    setLoadingMasters(true);
    setError(null);

    let categoryQuery = supabase
      .from("item_categories")
      .select("id, code, name, is_active")
      .eq("is_active", true)
      .order("code", { ascending: true });

    let subcategoryQuery = supabase
      .from("item_subcategories")
      .select("id, category_id, code, name, is_active")
      .eq("is_active", true)
      .order("code", { ascending: true });

    let accountQuery = supabase
      .from("accounts")
      .select(`
        id,
        code,
        name,
        category_code,
        account_type,
        is_active,
        is_posting
      `)
      .eq("is_active", true)
      .eq("is_posting", true)
      .order("code", { ascending: true });

    const unitQuery = supabase
      .from("units")
      .select("id, code, name, is_active")
      .eq("is_active", true)
      .order("code", { ascending: true });

    if (entityId) {
      categoryQuery = categoryQuery.eq("entity_id", entityId);
      subcategoryQuery = subcategoryQuery.eq("entity_id", entityId);
      accountQuery = accountQuery.eq("entity_id", entityId);
    }

    const [
      categoryResult,
      subcategoryResult,
      unitResult,
      accountResult,
    ] = await Promise.all([
      categoryQuery,
      subcategoryQuery,
      unitQuery,
      accountQuery,
    ]);

    if (categoryResult.error) {
      setError(categoryResult.error.message);
      setCategories([]);
    } else {
      setCategories(
        (categoryResult.data ?? []) as ItemCategoryOption[]
      );
    }

    if (subcategoryResult.error) {
      setError(subcategoryResult.error.message);
      setSubcategories([]);
    } else {
      setSubcategories(
        (subcategoryResult.data ?? []) as ItemSubcategoryOption[]
      );
    }

    if (unitResult.error) {
      setError(unitResult.error.message);
      setUnits([]);
    } else {
      setUnits((unitResult.data ?? []) as UnitOption[]);
    }

    if (accountResult.error) {
      setError(accountResult.error.message);
      setAccounts([]);
    } else {
      setAccounts((accountResult.data ?? []) as AccountOption[]);
    }

    setLoadingMasters(false);
  }, [entityId]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from(TABLE_NAME)
      .select(`
        *,
        category:item_categories!items_category_id_fkey (
          id, code, name, is_active
        ),
        subcategory:item_subcategories!items_subcategory_id_fkey (
          id, category_id, code, name, is_active
        ),
        unit:units!items_unit_id_fkey (
          id, code, name, is_active
        )
      `)
      .order("code", { ascending: true });

    if (entityId) {
      query = query.eq("entity_id", entityId);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
      setItems([]);
    } else {
      setItems((data ?? []) as Item[]);
    }

    setLoading(false);
  }, [entityId]);

  useEffect(() => {
    fetchMasters();
    fetchItems();
  }, [fetchMasters, fetchItems]);

  const createItem = async (payload: ItemFormData) => {
    const currentUser = getCustomUser();

    if (!currentUser?.entity_id) {
      throw new Error("Entity user tidak ditemukan.");
    }

    setSaving(true);
    setError(null);

    const { error: createError } = await supabase
      .from(TABLE_NAME)
      .insert({
        entity_id: currentUser.entity_id,

        code: payload.code.trim().toUpperCase(),
        name: payload.name.trim(),
        description: payload.description.trim() || null,
        item_type: payload.item_type,

        category_id: payload.category_id,
        subcategory_id: payload.subcategory_id || null,
        unit_id: payload.unit_id,

        inventory_account_id: payload.inventory_account_id || null,
        expense_account_id: payload.expense_account_id || null,
        cogs_account_id: payload.cogs_account_id || null,
        stock_adjustment_account_id:
          payload.stock_adjustment_account_id || null,

        valuation_method: "MOVING_AVERAGE",
        minimum_stock: Number(payload.minimum_stock || 0),
        standard_cost: Number(payload.standard_cost || 0),
        is_active: payload.is_active,
      });

    if (createError) {
      setError(createError.message);
      setSaving(false);
      return false;
    }

    await fetchItems();
    setSaving(false);
    return true;
  };

  const updateItem = async (id: string, payload: ItemFormData) => {
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from(TABLE_NAME)
      .update({
        entity_id: payload.entity_id || null,

        code: payload.code.trim().toUpperCase(),
        name: payload.name.trim(),
        description: payload.description.trim() || null,
        item_type: payload.item_type,

        category_id: payload.category_id,
        subcategory_id: payload.subcategory_id || null,
        unit_id: payload.unit_id,

        inventory_account_id: payload.inventory_account_id || null,
        expense_account_id: payload.expense_account_id || null,
        cogs_account_id: payload.cogs_account_id || null,
        stock_adjustment_account_id:
          payload.stock_adjustment_account_id || null,

        minimum_stock: Number(payload.minimum_stock || 0),
        standard_cost: Number(payload.standard_cost || 0),
        is_active: payload.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return false;
    }

    await fetchItems();
    setSaving(false);
    return true;
  };

  const deleteItem = async (id: string) => {
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

    await fetchItems();
    setSaving(false);
    return true;
  };

  return {
    items,
    categories,
    subcategories,
    units,
    accounts,

    loading,
    loadingMasters,
    saving,
    error,

    fetchItems,
    createItem,
    updateItem,
    deleteItem,
  };
}