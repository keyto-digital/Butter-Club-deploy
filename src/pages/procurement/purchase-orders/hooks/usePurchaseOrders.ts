import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getCustomUser } from "@/lib/authUser";
import type {
  ItemOption,
  PurchaseOrder,
  PurchaseOrderFormData,
  PurchaseOrderLineForm,
  SupplierOption,
} from "../types";

type PurchaseOrderDetailRow = {
  item_id: string;

  item_code_snapshot: string;
  item_name_snapshot: string;
  unit_code_snapshot: string;

  quantity_ordered: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  notes: string | null;
};

type PurchaseOrderResult = {
  success: boolean;
  purchase_order_id?: string;
  po_number: string;
  status: string;
  grand_total?: number;
};

export function usePurchaseOrders() {
  
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingMasters, setLoadingMasters] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = getCustomUser();
    const entityId = user?.entity_id ?? null;

  const fetchPurchaseOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from("purchase_orders")
      .select(`
        *,
        store:stores (
          id,
          code,
          name
        )
      `)
      .order("order_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (entityId) {
      query = query.eq("entity_id", entityId);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
      setPurchaseOrders([]);
    } else {
      const normalizedPurchaseOrders = (data ?? []).map((row) => ({
        ...row,
        store_name: Array.isArray(row.store)
          ? row.store[0]?.name ?? null
          : row.store?.name ?? null,
      }));

      setPurchaseOrders(
        normalizedPurchaseOrders as PurchaseOrder[]
      );
    }

    setLoading(false);
  }, [entityId]);

  const fetchMasters = useCallback(async () => {
    setLoadingMasters(true);
    setError(null);

    let supplierQuery = supabase
      .from("suppliers")
      .select(`
        id,
        code,
        name,
        default_payment_term_days,
        is_active
      `)
      .eq("is_active", true)
      .order("code", { ascending: true });

    let itemQuery = supabase
      .from("items")
      .select(`
        id,
        code,
        name,
        item_type,
        standard_cost,
        is_active,
        category:item_categories (code, name),
        subcategory:item_subcategories (code, name),
        unit:units (code, name)
      `)
      .eq("is_active", true)
      .order("code", { ascending: true });

    if (entityId) {
      supplierQuery = supplierQuery.eq("entity_id", entityId);
      itemQuery = itemQuery.eq("entity_id", entityId);
    }

    const [supplierResult, itemResult] = await Promise.all([
      supplierQuery,
      itemQuery,
    ]);

    if (supplierResult.error) {
      setError(supplierResult.error.message);
      setSuppliers([]);
    } else {
      setSuppliers((supplierResult.data ?? []) as SupplierOption[]);
    }

    if (itemResult.error) {
      setError(itemResult.error.message);
      setItems([]);
    } else {
      const normalizedItems = (itemResult.data ?? []).map((item) => ({
        ...item,
        category: Array.isArray(item.category)
          ? item.category[0] ?? null
          : item.category ?? null,
        subcategory: Array.isArray(item.subcategory)
          ? item.subcategory[0] ?? null
          : item.subcategory ?? null,
        unit: Array.isArray(item.unit)
          ? item.unit[0] ?? null
          : item.unit ?? null,
      }));

      setItems(normalizedItems as ItemOption[]);
    }

    setLoadingMasters(false);
  }, [entityId]);

  useEffect(() => {
    fetchPurchaseOrders();
    fetchMasters();
  }, [fetchPurchaseOrders, fetchMasters]);

  const fetchPurchaseOrderDetails = async (
    purchaseOrderId: string
  ): Promise<PurchaseOrderLineForm[] | null> => {
    setError(null);

    const { data, error: detailError } = await supabase
      .from("purchase_order_details")
      .select(`
          item_id,
          item_code_snapshot,
          item_name_snapshot,
          unit_code_snapshot,
          quantity_ordered,
          unit_price,
          discount_amount,
          tax_amount,
          notes
      `)
      .eq("purchase_order_id", purchaseOrderId)
      .order("line_number", { ascending: true });

    if (detailError) {
      setError(detailError.message);
      return null;
    }

    return ((data ?? []) as PurchaseOrderDetailRow[]).map((detail) => ({
      item_id: detail.item_id,

      item_code_snapshot: detail.item_code_snapshot,
      item_name_snapshot: detail.item_name_snapshot,
      unit_code_snapshot: detail.unit_code_snapshot,

      quantity_ordered: Number(detail.quantity_ordered || 0),
      unit_price: Number(detail.unit_price || 0),
      discount_amount: Number(detail.discount_amount || 0),
      tax_amount: Number(detail.tax_amount || 0),
      notes: detail.notes ?? "",
    }));
  };

  const createPurchaseOrder = async (payload: PurchaseOrderFormData) => {
    
    setSaving(true);
    setError(null);

    
    const { data, error: createError } = await supabase.rpc(
      "create_purchase_order",
      {
        p_entity_id: entityId,
        p_order_date: payload.order_date,
        p_expected_delivery_date:
          payload.expected_delivery_date || null,
        p_supplier_id: payload.supplier_id,
        p_store_id: payload.store_id,
        p_payment_term_days: Number(payload.payment_term_days || 0),
        p_notes: payload.notes || null,
        p_details: payload.details,
      }
    );

    if (createError) {
      setError(createError.message);
      setSaving(false);
      return null;
    }

    await fetchPurchaseOrders();
    setSaving(false);
    return data as PurchaseOrderResult;
  };

  const updatePurchaseOrderDraft = async (
    purchaseOrderId: string,
    payload: PurchaseOrderFormData
  ) => {
    setSaving(true);
    setError(null);

    const { data, error: updateError } = await supabase.rpc(
      "update_purchase_order_draft",
      {
        p_purchase_order_id: purchaseOrderId,
        p_order_date: payload.order_date,
        p_expected_delivery_date:
          payload.expected_delivery_date || null,
        p_supplier_id: payload.supplier_id,
        p_store_id: payload.store_id,
        p_payment_term_days:
          Number(payload.payment_term_days || 0),
        p_notes: payload.notes || null,
        p_details: payload.details,
      }
    );

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return null;
    }

    await fetchPurchaseOrders();
    setSaving(false);
    return data as PurchaseOrderResult;
  };

  const deletePurchaseOrderDraft = async (purchaseOrderId: string) => {
    setSaving(true);
    setError(null);

    const { data, error: deleteError } = await supabase.rpc(
      "delete_purchase_order_draft",
      { p_purchase_order_id: purchaseOrderId }
    );

    if (deleteError) {
      setError(deleteError.message);
      setSaving(false);
      return null;
    }

    await fetchPurchaseOrders();
    setSaving(false);
    return data as PurchaseOrderResult;
  };

  const openPurchaseOrder = async (purchaseOrderId: string) => {
    setSaving(true);
    setError(null);

    const { data, error: openError } = await supabase.rpc(
      "open_purchase_order",
      { p_purchase_order_id: purchaseOrderId }
    );

    if (openError) {
      setError(openError.message);
      setSaving(false);
      return null;
    }

    await fetchPurchaseOrders();
    setSaving(false);
    return data as PurchaseOrderResult;
  };

  const cancelPurchaseOrder = async (
    purchaseOrderId: string,
    cancelReason: string
  ) => {
    setSaving(true);
    setError(null);

    const { data, error: cancelError } = await supabase.rpc(
      "cancel_purchase_order",
      {
        p_purchase_order_id: purchaseOrderId,
        p_cancel_reason: cancelReason,
      }
    );

    if (cancelError) {
      setError(cancelError.message);
      setSaving(false);
      return null;
    }

    await fetchPurchaseOrders();
    setSaving(false);
    return data as PurchaseOrderResult;
  };

  const closePurchaseOrderOutstanding = async (
    purchaseOrderId: string,
    closeReason: string
  ) => {
    setSaving(true);
    setError(null);

    const { data, error: closeError } = await supabase.rpc(
      "close_purchase_order_outstanding",
      {
        p_purchase_order_id: purchaseOrderId,
        p_close_reason: closeReason,
      }
    );

    if (closeError) {
      setError(closeError.message);
      setSaving(false);
      return null;
    }

    await fetchPurchaseOrders();
    setSaving(false);
    return data as PurchaseOrderResult;
  };

  return {
    purchaseOrders,
    suppliers,
    items,
    loading,
    loadingMasters,
    saving,
    error,

    fetchPurchaseOrders,
    fetchPurchaseOrderDetails,

    createPurchaseOrder,
    updatePurchaseOrderDraft,
    deletePurchaseOrderDraft,

    openPurchaseOrder,
    cancelPurchaseOrder,
    closePurchaseOrderOutstanding,
  };
}