import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getCustomUser } from "@/lib/authUser";

import type {
  ApInvoice,
  ApPaymentRequestFormData,
} from "../types";


type PaymentRequestItemRow = {
  id: string;
  payment_request_id: string;
  ap_invoice_id: string | null;
  receiving_record_id: string | null;
  requested_amount: number;
  notes: string | null;
};

export type PaymentRequestDetailItem = {
  id: string;
  payment_request_id: string;
  ap_invoice_id: string | null;
  receiving_record_id: string | null;
  requested_amount: number;
  notes: string | null;

  supplier_name: string | null;
  supplier_code: string | null;

  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;

  receiving_number: string | null;
  receiving_date: string | null;

  grand_total: number;
  paid_amount: number;
  remaining_amount: number;
};



export function useApInvoices() {
  const [invoices, setInvoices] = useState<ApInvoice[]>([]);

  type PaymentRequestRow = {
    id: string;
    entity_id: string;
    payment_request_number: string;
    request_date: string;
    supplier_id: string;
    supplier_name?: string | null;
    supplier_code?: string | null;

    total_amount: number;
    status: "DRAFT" | "APPROVED" | "CANCELLED" | "PAID";
    payment_id?: string | null;
    payment_number?: string | null;
    payment_date?: string | null;
    payment_method_id?: string | null;
    payment_method_name?: string | null;
    payment_method_code?: string | null;
    notes: string | null;
    created_by: string | null;
    updated_by: string | null;
    approved_by: string | null;
    approved_at: string | null;
    cancelled_by: string | null;
    cancelled_at: string | null;
    cancel_reason: string | null;
    created_at: string;
    updated_at: string;
  };

  const [
    paymentRequests,
    setPaymentRequests,
  ] = useState<PaymentRequestRow[]>([]);


  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const user = getCustomUser();

  const entityId = user?.entity_id ?? null;
  const createdBy = user?.id ?? null;

  /**
   * ============================================================
   * FETCH AP INVOICES
   *
   * AP Invoice sekarang otomatis dibuat dari Receiving
   * ketika Receiving berstatus POSTED.
   *
   * Jadi halaman AP Invoice TIDAK lagi mencari Receiving
   * untuk membuat invoice manual.
   * ============================================================
   */
  const fetchInvoices = useCallback(async () => {
    if (!entityId) {
      console.error(
        "AP INVOICE: entityId kosong"
      );

      setInvoices([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      /**
       * =====================================================
       * 1. AMBIL AP INVOICE LANGSUNG
       * =====================================================
       */

      const {
        data: invoiceData,
        error: invoiceError,
      } = await supabase.rpc(
        "get_available_ap_invoices",
        {
          p_entity_id: entityId,
        }
      );

      if (invoiceError) {
        throw invoiceError;
      }

      type InvoiceRow = ApInvoice;

      const rows =
        (invoiceData ?? []) as InvoiceRow[];

      console.log(
        "AP invoice count:",
        rows.length
      );

      /**
       * =====================================================
       * 2. TIDAK ADA DATA
       * =====================================================
       */

      if (rows.length === 0) {
        setInvoices([]);
        return;
      }

      /**
       * =====================================================
       * 3. AMBIL SUPPLIER
       * =====================================================
       */

      type SupplierRow = {
        id: string;
        code: string;
        name: string;
      };

      const supplierIds =
        Array.from(
          new Set(
            rows
              .map(
                (row) =>
                  row.supplier_id
              )
              .filter(
                (
                  id
                ): id is string =>
                  Boolean(id)
              )
          )
        );

      const supplierMap =
        new Map<
          string,
          SupplierRow
        >();

      if (
        supplierIds.length > 0
      ) {
        const {
          data: supplierData,
          error: supplierError,
        } = await supabase
          .from("suppliers")
          .select(
            "id, code, name"
          )
          .in(
            "id",
            supplierIds
          );

        if (supplierError) {
          throw supplierError;
        }

        for (
          const supplier
          of (supplierData ??
            []) as SupplierRow[]
        ) {
          supplierMap.set(
            supplier.id,
            supplier
          );
        }
      }

      /**
       * =====================================================
       * 4. AMBIL RECEIVING
       * =====================================================
       */

      type ReceivingRow = {
        id: string;
        receiving_number: string;
        receiving_date: string;
        purchase_order_number_snapshot:
          string | null;
        supplier_invoice_number:
          string | null;
        supplier_invoice_date:
          string | null;
        supplier_due_date:
          string | null;
        grand_total: number;
      };

      const receivingIds =
        Array.from(
          new Set(
            rows
              .map(
                (row) =>
                  row.receiving_record_id
              )
              .filter(
                (
                  id
                ): id is string =>
                  Boolean(id)
              )
          )
        );

      const receivingMap =
        new Map<
          string,
          ReceivingRow
        >();

      if (
        receivingIds.length > 0
      ) {
        const {
          data: receivingData,
          error: receivingError,
        } = await supabase
          .from("receiving_records")
          .select(`
            id,
            receiving_number,
            receiving_date,
            purchase_order_number_snapshot,
            supplier_invoice_number,
            supplier_invoice_date,
            supplier_due_date,
            grand_total
          `)
          .in(
            "id",
            receivingIds
          );

        if (receivingError) {
          throw receivingError;
        }

        for (
          const receiving
          of (receivingData ??
            []) as ReceivingRow[]
        ) {
          receivingMap.set(
            receiving.id,
            receiving
          );
        }
      }

      /**
       * =====================================================
       * 5. GABUNGKAN
       * =====================================================
       */

      const mappedInvoices =
        rows.map(
          (
            row
          ): ApInvoice => {
            const supplier =
              supplierMap.get(
                row.supplier_id
              );

            const receiving =
              row.receiving_record_id
                ? receivingMap.get(
                    row.receiving_record_id
                  )
                : undefined;

            return {
              ...row,

              supplier_code:
                supplier?.code ??
                null,

              supplier_name:
                supplier?.name ??
                null,

              receiving_number:
                receiving?.receiving_number ??
                null,

              receiving_date:
                receiving?.receiving_date ??
                null,

              purchase_order_number:
                receiving
                  ?.purchase_order_number_snapshot ??
                null,

              supplier_invoice_number:
                receiving
                  ?.supplier_invoice_number ??
                null,

              supplier_invoice_date:
                receiving
                  ?.supplier_invoice_date ??
                null,

              supplier_due_date:
                receiving
                  ?.supplier_due_date ??
                null,
            };
          }
        );

      setInvoices(
        mappedInvoices
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Gagal mengambil data Supplier Invoice.";

      console.error(
        "=== AP INVOICE FETCH ERROR ===",
        err
      );

      setError(message);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [entityId]);

  /**
   * ============================================================
   * PAYMENT REQUEST
   * ============================================================
   */

  const fetchPaymentRequests =
    useCallback(async () => {
      if (!entityId) {
        setPaymentRequests([]);
        return;
      }

      try {
        /**
         * =====================================================
         * 1. AMBIL SEMUA PAYMENT REQUEST AKTIF
         *
         * DRAFT + APPROVED tetap ditampilkan.
         * CANCELLED tidak ditampilkan.
         *
         * PAID tidak berasal dari status payment_request,
         * tetapi ditentukan dari adanya ap_payment.
         * =====================================================
         */

        const {
          data: requestData,
          error: requestError,
        } = await supabase
          .from("ap_payment_requests")
          .select(`
            id,
            entity_id,
            payment_request_number,
            request_date,
            supplier_id,
            total_amount,
            status,
            notes,
            created_by,
            updated_by,
            approved_by,
            approved_at,
            cancelled_by,
            cancelled_at,
            cancel_reason,
            created_at,
            updated_at
          `)
          .eq("entity_id", entityId)
          .in("status", [
            "DRAFT",
            "APPROVED",
            "PAID",
          ])
          .order("request_date", {
            ascending: false,
          })
          .order("created_at", {
            ascending: false,
          });

        if (requestError) {
          throw requestError;
        }

        const requests =
          (requestData ?? []) as PaymentRequestRow[];

        /**
         * =====================================================
         * 2. JIKA TIDAK ADA PAYMENT REQUEST
         * =====================================================
         */

        if (requests.length === 0) {
          setPaymentRequests([]);
          return;
        }

        /**
         * =====================================================
         * 3. AMBIL AP PAYMENT BERDASARKAN PAYMENT_REQUEST_ID
         *
         * Satu PV seharusnya memiliki maksimal satu payment.
         * =====================================================
         */

        const paymentRequestIds =
          requests.map(
            (request) => request.id
          );

        const {
          data: paymentData,
          error: paymentError,
        } = await supabase
          .from("ap_payments")
          .select(`
            id,
            payment_request_id,
            payment_number,
            payment_date,
            payment_method_id,
            amount,
            journal_id
          `)
          .eq("entity_id", entityId)
          .in(
            "payment_request_id",
            paymentRequestIds
          );

        if (paymentError) {
          throw paymentError;
        }

        /**
         * =====================================================
         * 4. MAP PAYMENT
         * =====================================================
         */

        type PaymentRow = {
          id: string;
          payment_request_id: string | null;
          payment_number: string;
          payment_date: string;
          payment_method_id: string;
          amount: number;
          journal_id: string | null;
        };

        const paymentMap =
          new Map<
            string,
            PaymentRow
          >();

        for (
          const payment
          of (paymentData ??
            []) as PaymentRow[]
        ) {
          if (
            !payment.payment_request_id
          ) {
            continue;
          }

          paymentMap.set(
            payment.payment_request_id,
            payment
          );
        }


        type PaymentMethodRow = {
          id: string;
          code: string;
          name: string;
        };

        const paymentMethodIds =
          Array.from(
            new Set(
              (paymentData ?? [])
                .map(
                  (payment) =>
                    (payment as PaymentRow).payment_method_id
                )
                .filter(
                  (
                    id
                  ): id is string =>
                    Boolean(id)
                )
            )
          );

        const paymentMethodMap =
          new Map<string, PaymentMethodRow>();

        if (paymentMethodIds.length > 0) {
          const {
            data: paymentMethodData,
            error: paymentMethodError,
          } = await supabase
            .from("purchase_settlement_methods")
            .select(`
              id,
              code,
              name
            `)
            .in(
              "id",
              paymentMethodIds
            );

          if (paymentMethodError) {
            throw paymentMethodError;
          }

          for (
            const method of
              (paymentMethodData ??
                []) as PaymentMethodRow[]
          ) {
            paymentMethodMap.set(
              method.id,
              method
            );
          }
        }

        /**
         * =====================================================
         * 5. GABUNGKAN PAYMENT REQUEST + AP PAYMENT
         *
         * Jika sudah ada AP Payment:
         *     status frontend = PAID
         *
         * Jika belum:
         *     gunakan status asli
         * =====================================================
         */

        const mappedRequests =
          requests.map(
            (request): PaymentRequestRow => {
              const payment =
                paymentMap.get(request.id);

              if (!payment) {
                return request;
              }

              return {
                ...request,

                status: "PAID" as const,

                payment_id:
                  payment.id,

                payment_number:
                  payment.payment_number,

                payment_date:
                  payment.payment_date,

                payment_method_id:
                  payment.payment_method_id,

                payment_method_name:
                  paymentMethodMap.get(
                    payment.payment_method_id
                  )?.name ?? null,

                payment_method_code:
                  paymentMethodMap.get(
                    payment.payment_method_id
                  )?.code ?? null,
              };
            }
          );

        setPaymentRequests(
          mappedRequests
        );

      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Gagal mengambil Payment Request.";

        console.error(
          "=== PAYMENT REQUEST FETCH ERROR ===",
          err
        );

        setError(message);
        setPaymentRequests([]);
      }
    }, [entityId]);

  const fetchPaymentRequestItems = useCallback(
    async (
      paymentRequestId: string
    ): Promise<PaymentRequestDetailItem[]> => {
      const {
        data: itemData,
        error: itemError,
      } = await supabase
        .from("ap_payment_request_items")
        .select(`
          id,
          payment_request_id,
          ap_invoice_id,
          receiving_record_id,
          requested_amount,
          notes
        `)
        .eq(
          "payment_request_id",
          paymentRequestId
        )
        .order("id", {
          ascending: true,
        });

      if (itemError) {
        throw itemError;
      }

      const items =
        (itemData ?? []) as PaymentRequestItemRow[];

      if (items.length === 0) {
        return [];
      }

      /**
       * =====================================================
       * AMBIL AP INVOICE
       * =====================================================
       */

      const invoiceIds =
        Array.from(
          new Set(
            items
              .map(
                (item) =>
                  item.ap_invoice_id
              )
              .filter(
                (
                  id
                ): id is string =>
                  Boolean(id)
              )
          )
        );

      type PaymentInvoiceRow = {
        id: string;
        supplier_id: string;
        receiving_record_id: string | null;
        invoice_number: string;
        invoice_date: string;
        due_date: string | null;
        grand_total: number;
        paid_amount: number;
        remaining_amount: number;
      };

      const invoiceMap =
        new Map<
          string,
          PaymentInvoiceRow
        >();

      if (invoiceIds.length > 0) {
        const {
          data: invoiceData,
          error: invoiceError,
        } = await supabase
          .from("ap_invoices")
          .select(`
            id,
            supplier_id,
            receiving_record_id,
            invoice_number,
            invoice_date,
            due_date,
            grand_total,
            paid_amount,
            remaining_amount
          `)
          .in(
            "id",
            invoiceIds
          );

        if (invoiceError) {
          throw invoiceError;
        }

        for (
          const invoice
          of (invoiceData ??
            []) as PaymentInvoiceRow[]
        ) {
          invoiceMap.set(
            invoice.id,
            invoice
          );
        }
      }

      /**
       * =====================================================
       * AMBIL RECEIVING
       * =====================================================
       */

      const receivingIds =
        Array.from(
          new Set(
            [
              ...items
                .map(
                  (item) =>
                    item.receiving_record_id
                ),
              ...Array.from(
                invoiceMap.values()
              ).map(
                (invoice) =>
                  invoice.receiving_record_id
              ),
            ]
              .filter(
                (
                  id
                ): id is string =>
                  Boolean(id)
              )
          )
        );

      type PaymentReceivingRow = {
        id: string;
        receiving_number: string;
        receiving_date: string;
      };

      const receivingMap =
        new Map<
          string,
          PaymentReceivingRow
        >();

      if (
        receivingIds.length > 0
      ) {
        const {
          data: receivingData,
          error: receivingError,
        } = await supabase
          .from("receiving_records")
          .select(`
            id,
            receiving_number,
            receiving_date
          `)
          .in(
            "id",
            receivingIds
          );

        if (receivingError) {
          throw receivingError;
        }

        for (
          const receiving
          of (receivingData ??
            []) as PaymentReceivingRow[]
        ) {
          receivingMap.set(
            receiving.id,
            receiving
          );
        }
      }

      /**
       * =====================================================
       * AMBIL SUPPLIER
       * =====================================================
       */

      const supplierIds =
        Array.from(
          new Set(
            Array.from(
              invoiceMap.values()
            ).map(
              (invoice) =>
                invoice.supplier_id
            )
          )
        );

      type PaymentSupplierRow = {
        id: string;
        code: string;
        name: string;
      };

      const supplierMap =
        new Map<
          string,
          PaymentSupplierRow
        >();

      if (
        supplierIds.length > 0
      ) {
        const {
          data: supplierData,
          error: supplierError,
        } = await supabase
          .from("suppliers")
          .select(`
            id,
            code,
            name
          `)
          .in(
            "id",
            supplierIds
          );

        if (supplierError) {
          throw supplierError;
        }

        for (
          const supplier
          of (supplierData ??
            []) as PaymentSupplierRow[]
        ) {
          supplierMap.set(
            supplier.id,
            supplier
          );
        }
      }

      /**
       * =====================================================
       * GABUNGKAN ITEM
       * =====================================================
       */

      return items.map(
        (
          item
        ): PaymentRequestDetailItem => {
          const invoice =
            item.ap_invoice_id
              ? invoiceMap.get(
                  item.ap_invoice_id
                )
              : undefined;

          const receivingId =
            item.receiving_record_id ??
            invoice?.receiving_record_id ??
            null;

          const receiving =
            receivingId
              ? receivingMap.get(
                  receivingId
                )
              : undefined;

          const supplier =
            invoice
              ? supplierMap.get(
                  invoice.supplier_id
                )
              : undefined;

          return {
            id: item.id,
            payment_request_id:
              item.payment_request_id,
            ap_invoice_id:
              item.ap_invoice_id,
            receiving_record_id:
              item.receiving_record_id,
            requested_amount:
              Number(
                item.requested_amount
              ),
            notes: item.notes,

            supplier_name:
              supplier?.name ?? null,

            supplier_code:
              supplier?.code ?? null,

            invoice_number:
              invoice?.invoice_number ??
              null,

            invoice_date:
              invoice?.invoice_date ??
              null,

            due_date:
              invoice?.due_date ??
              null,

            receiving_number:
              receiving?.receiving_number ??
              null,

            receiving_date:
              receiving?.receiving_date ??
              null,

            grand_total:
              Number(
                invoice?.grand_total ?? 0
              ),

            paid_amount:
              Number(
                invoice?.paid_amount ?? 0
              ),

            remaining_amount:
              Number(
                invoice?.remaining_amount ?? 0
              ),
          };
        }
      );
    },
    []
  );

  const createPaymentRequest = useCallback(
    async (
      payload: ApPaymentRequestFormData
    ) => {
      if (!entityId) {
        setError(
          "Entity user tidak ditemukan."
        );
        return null;
      }

      if (!createdBy) {
        setError(
          "User pembuat tidak ditemukan."
        );
        return null;
      }

      if (payload.items.length === 0) {
        setError(
          "Minimal satu invoice harus dipilih."
        );
        return null;
      }

      setSaving(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc(
          "create_ap_payment_request",
          {
            p_entity_id: entityId,
            p_request_date: payload.request_date,
            p_supplier_id: payload.supplier_id,
            p_items: payload.items,
            p_notes: payload.notes ?? null,
            p_created_by: null,
          }
        );

        if (rpcError) {
          console.error(
            "=== CREATE PAYMENT REQUEST RPC ERROR ===",
            {
              code: rpcError.code,
              message: rpcError.message,
              details: rpcError.details,
              hint: rpcError.hint,
            }
          );

          setError(
            [
              `Code: ${rpcError.code ?? "-"}`,
              `Message: ${rpcError.message ?? "-"}`,
              `Details: ${rpcError.details ?? "-"}`,
              `Hint: ${rpcError.hint ?? "-"}`,
            ].join(" | ")
          );

          return null;
        }

        await Promise.all([
          fetchInvoices(),
          fetchPaymentRequests(),
        ]);

        return data as {
          success: boolean;
          payment_request_id: string;
          payment_request_number: string;
          supplier_id: string;
          request_date: string;
          total_amount: number;
          status: "DRAFT";
        };
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Gagal membuat Payment Request.";

        setError(message);

        return null;
      } finally {
        setSaving(false);
      }
    },
    [
      entityId,
      createdBy,
      fetchInvoices,
      fetchPaymentRequests,
    ]
  );

  /**
   * ============================================================
   * APPROVED REQUEST
   * ============================================================
   */

  const approvePaymentRequest =
    useCallback(
      async (
        paymentRequestId: string
      ) => {
        if (!createdBy) {
          setError(
            "User pengguna tidak ditemukan."
          );
          return null;
        }

        setSaving(true);
        setError(null);

        try {
          console.log(
            "=== APPROVE PAYMENT REQUEST ==="
          );

          console.log(
            "paymentRequestId:",
            paymentRequestId
          );

          console.log(
            "createdBy:",
            createdBy
          );

          const {
            data,
            error: rpcError,
          } = await supabase.rpc(
            "approve_ap_payment_request",
            {
              p_payment_request_id:
                paymentRequestId,

              /*
              * createdBy = custom_users.id
              * bertipe text ("01"), sedangkan
              * p_approved_by = uuid.
              *
              * Untuk sementara jangan kirim
              * custom user id ke parameter uuid.
              */
              p_approved_by: null,
            }
          );

          console.log(
            "=== APPROVE RPC RESULT ==="
          );

          console.log(
            "data:",
            data
          );

          console.log(
            "rpcError:",
            rpcError
          );

          if (rpcError) {
            console.error(
              "=== APPROVE PAYMENT REQUEST RPC ERROR ===",
              {
                code:
                  rpcError.code,

                message:
                  rpcError.message,

                details:
                  rpcError.details,

                hint:
                  rpcError.hint,
              }
            );

            setError(
              [
                `Code: ${
                  rpcError.code ??
                  "-"
                }`,
                `Message: ${
                  rpcError.message ??
                  "-"
                }`,
                `Details: ${
                  rpcError.details ??
                  "-"
                }`,
                `Hint: ${
                  rpcError.hint ??
                  "-"
                }`,
              ].join(" | ")
            );

            return null;
          }

          await Promise.all([
            fetchPaymentRequests(),
            fetchInvoices(),
          ]);

          return data as {
            success: boolean;
            payment_request_id: string;
            payment_request_number: string;
            status: "APPROVED";
            total_amount: number;
            approved_at: string;
          };
        } catch (err) {
          console.error(
            "=== APPROVE PAYMENT REQUEST UNEXPECTED ERROR ===",
            err
          );

          const message =
            err instanceof Error
              ? err.message
              : "Gagal menyetujui Payment Request.";

          setError(message);

          return null;
        } finally {
          setSaving(false);
        }
      },
      [
        createdBy,
        fetchPaymentRequests,
        fetchInvoices,
      ]
    );

  /**
   * ============================================================
   * CANCEL PAYMENT
   * ============================================================
   */

  const cancelPaymentRequest =
    useCallback(
      async (
        paymentRequestId: string,
        reason: string
      ) => {
        if (!createdBy) {
          setError(
            "User pengguna tidak ditemukan."
          );
          return null;
        }

        setSaving(true);
        setError(null);

        try {
          const { data, error: rpcError } = await supabase.rpc(
            "cancel_ap_payment_request",
            {
              p_payment_request_id: paymentRequestId,
              p_cancelled_by: null,
              p_cancel_reason: reason,
            }
          );

          if (rpcError) {
            throw rpcError;
          }

          await Promise.all([
            fetchPaymentRequests(),
            fetchInvoices(),
          ]);

          return data;
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "Gagal membatalkan Payment Request.";

          setError(message);
          return null;
        } finally {
          setSaving(false);
        }
      },
      [
        createdBy,
        fetchPaymentRequests,
        fetchInvoices,
      ]
    );

  /**
   * ============================================================
   * INITIAL LOAD
   * ============================================================
   */
  useEffect(() => {
    void Promise.all([
      fetchInvoices(),
      fetchPaymentRequests(),
    ]);
  }, [
    fetchInvoices,
    fetchPaymentRequests,
  ]);

  /**
   * ============================================================
   * CREATE INVOICE
   *
   * DISABLED / TIDAK DIPAKAI DALAM WORKFLOW BARU.
   *
   * AP Invoice dibuat otomatis oleh database ketika
   * Receiving POSTED.
   *
   * Function ini sengaja tidak dipanggil dari SupplierInvoicePage.
   * ============================================================
   */

  /**
   * ============================================================
   * UPDATE INVOICE
   *
   * Untuk sementara tetap tersedia agar tidak langsung merusak
   * pemanggil lama.
   *
   * Namun SupplierInvoicePage baru nanti TIDAK menggunakan ini.
   * ============================================================
   */
  const updateInvoice = async (
    invoiceId: string,
    payload: {
      invoice_number: string;
      invoice_date: string;
      due_date: string | null;
      notes: string | null;
    }
  ) => {
    setSaving(true);
    setError(null);

    try {
      const { data, error: updateError } =
        await supabase.rpc(
          "update_ap_invoice",
          {
            p_invoice_id: invoiceId,
            p_invoice_number:
              payload.invoice_number,
            p_invoice_date:
              payload.invoice_date,
            p_due_date:
              payload.due_date || null,
            p_notes:
              payload.notes || null,
          }
        );

      if (updateError) {
        throw updateError;
      }

      await fetchInvoices();

      return data;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Gagal memperbarui Supplier Invoice.";

      setError(message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  /**
   * ============================================================
   * DELETE INVOICE
   *
   * Tetap tersedia untuk kompatibilitas sementara.
   * SupplierInvoicePage baru nanti tidak akan menggunakannya.
   * ============================================================
   */
  const deleteInvoice = async (
    invoiceId: string
  ) => {
    setSaving(true);
    setError(null);

    try {
      const { data, error: deleteError } =
        await supabase.rpc(
          "delete_ap_invoice",
          {
            p_invoice_id: invoiceId,
          }
        );

      if (deleteError) {
        throw deleteError;
      }

      await fetchInvoices();

      return data;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Gagal menghapus Supplier Invoice.";

      setError(message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  /**
   * ============================================================
   * OPEN INVOICE
   * ============================================================
   */
  const openInvoice = async (
    invoiceId: string
  ) => {
    setSaving(true);
    setError(null);

    try {
      const { data, error: openError } =
        await supabase.rpc(
          "open_ap_invoice",
          {
            p_invoice_id: invoiceId,
          }
        );

      if (openError) {
        throw openError;
      }

      await fetchInvoices();

      return data;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Gagal membuka Supplier Invoice.";

      setError(message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  /**
   * ============================================================
   * CANCEL INVOICE
   * ============================================================
   */
  const cancelInvoice = async (
    invoiceId: string,
    reason: string
  ) => {
    setSaving(true);
    setError(null);

    try {
      const { data, error: cancelError } =
        await supabase.rpc(
          "cancel_ap_invoice",
          {
            p_invoice_id: invoiceId,
            p_cancel_reason: reason,
          }
        );

      if (cancelError) {
        throw cancelError;
      }

      await fetchInvoices();

      return data;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Gagal membatalkan Supplier Invoice.";

      setError(message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  /**
   * ============================================================
   * RETURN
   * ============================================================
   */
  return {
    invoices,
    paymentRequests,

    loading,
    saving,
    error,

    entityId,
    createdBy,

    fetchInvoices,
    fetchPaymentRequests,
    fetchPaymentRequestItems,

    updateInvoice,
    deleteInvoice,
    openInvoice,
    cancelInvoice,

    createPaymentRequest,
    approvePaymentRequest,
    cancelPaymentRequest,
  };
}