import type { ComponentType } from "react";

type PageModule = {
  default: ComponentType<Record<string, unknown>>;
};

export function resolvePageComponent(name: string): () => Promise<PageModule> {
  const modules = import.meta.glob("/src/pages/**/*.{tsx,jsx}");

  const normalized = name.trim().replace(/^\/+/, "");

  const pascal = normalized
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");

  const aliases: Record<string, string> = {
    CoaPage: "/src/pages/accounting/coa/CoaPage.tsx",
    AccountMappingPage:
      "/src/pages/accounting/account-mapping/AccountMappingPage.tsx",
    GeneralLedgerPage:
      "/src/pages/accounting/general-ledger/GeneralLedgerPage.tsx",
    TrialBalancePage:
      "/src/pages/accounting/trial-balance/TrialBalancePage.tsx",
    IncomeStatementPage:
      "/src/pages/accounting/income-statement/IncomeStatementPage.tsx",
    BalanceSheetPage:
      "/src/pages/accounting/balance-sheet/BalanceSheetPage.tsx",
    ItemCategoryPage:
      "/src/pages/procurement/item-categories/ItemCategoryPage.tsx",
    ItemSubcategoryPage:
      "/src/pages/procurement/item-subcategories/ItemSubcategoryPage.tsx",
    StorePage:
      "/src/pages/procurement/stores/StorePage.tsx",
    SupplierPage:
      "/src/pages/procurement/suppliers/SupplierPage.tsx",
    ItemPage:
      "/src/pages/procurement/items/ItemPage.tsx",
    UnitPage:
      "/src/pages/procurement/units/UnitPage.tsx",
    PurchaseSettlementMethodPage:
      "/src/pages/procurement/purchase-settlement-methods/PurchaseSettlementMethodPage.tsx",
    PurchaseOrderPage:
      "/src/pages/procurement/purchase-orders/PurchaseOrderPage.tsx",
    ReceivingPage:
      "/src/pages/procurement/receiving/ReceivingPage.tsx",
    InventoryRequestPage:
      "/src/pages/procurement/inventory/InventoryRequestPage.tsx",
    StorekeeperPage:
      "/src/pages/procurement/storekeeper/StorekeeperPage.tsx",
    TransferPage:
      "/src/pages/procurement/storekeeper/transfer/TransferPage.tsx",
    OpnameReportPage:
      "/src/pages/procurement/storekeeper/opname-report/OpnameReportPage.tsx",
    AdjustmentReportPage:
      "/src/pages/procurement/storekeeper/adjustment-report/AdjustmentReportPage.tsx",
    SupplierInvoicePage:
      "/src/pages/procurement/account-payable/SupplierInvoicePage.tsx",
    PaymentPage:
      "/src/pages/procurement/account-payable/PaymentPage.tsx",
  };

  const aliasPath = aliases[normalized];

  if (aliasPath && modules[aliasPath]) {
    return modules[aliasPath] as () => Promise<PageModule>;
  }

  const candidates = [
    `/src/pages/${normalized}.tsx`,
    `/src/pages/${pascal}.tsx`,
    `/src/pages/${normalized}/index.tsx`,
    `/src/pages/${pascal}/index.tsx`,
    `/src/pages/${normalized}/${pascal}.tsx`,
  ];

  for (const path of candidates) {
    const loader = modules[path];

    if (loader) {
      return loader as () => Promise<PageModule>;
    }
  }

  console.warn(`Component "${name}" not found in:`, candidates);

  return () => import("../pages/NotFoundFallback.tsx") as Promise<PageModule>;
}