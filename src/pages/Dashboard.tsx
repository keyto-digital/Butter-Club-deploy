import { useEffect, useState } from "react";
import {
  ShoppingCart,
  Package,
  FileText,
  Folder,
  Wheat,
} from "lucide-react";

interface CustomUser {
  id?: string;
  username?: string;
  name?: string;
  full_name?: string;
  email?: string;
}

interface DashboardModule {
  title: string;
  description: string;
  icon: React.ElementType;
}

const modules: DashboardModule[] = [
  {
    title: "Procurement",
    description: "Kelola pembelian & supplier",
    icon: ShoppingCart,
  },
  {
    title: "Inventory",
    description: "Kelola stok & barang",
    icon: Package,
  },
  {
    title: "Accounting",
    description: "Pembukuan & laporan",
    icon: FileText,
  },
  {
    title: "Master Data",
    description: "Kelola data utama sistem",
    icon: Folder,
  },
];

function getUserName(): string {
  try {
    const storedUser = localStorage.getItem("custom_user");

    if (!storedUser) {
      return "User";
    }

    const user = JSON.parse(storedUser) as CustomUser;

    return (
      user.name?.trim() ||
      user.full_name?.trim() ||
      user.username?.trim() ||
      user.email?.split("@")[0] ||
      "User"
    );
  } catch {
    return "User";
  }
}

export default function Dashboard() {
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    setUserName(getUserName());
  }, []);

  return (
    <div className="relative min-h-[calc(100vh-0px)] overflow-hidden bg-[#f5f9fc]">

      {/* BACKGROUND FOTO BAKERY */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/bcbground.jpg')",
        }}
      />

      {/* FOTO TETAP TERLIHAT JELAS */}
      <div className="absolute inset-0 bg-white/70" />

      {/* BLUE TINT TIPIS */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-white/20" />

      {/* CONTENT */}
      <div className="relative z-10 flex min-h-[calc(100vh-0px)] flex-col">
        <main className="flex flex-1 items-center justify-center px-6 py-10 md:px-10 lg:px-16">
          <div className="w-full max-w-6xl">

            {/* =====================================================
                MAIN WELCOME AREA
            ===================================================== */}
            <section className="flex flex-col items-center text-center">

              {/* Logo */}
              <div className="mb-5">
                <img
                  src="/logo.png"
                  alt="Butter Club Bakery"
                  className="h-auto w-[260px] object-contain drop-shadow-sm md:w-[390px] lg:w-[500px]"
                />
              </div>

              {/* Small divider */}
              <div className="mb-6 flex items-center justify-center gap-4">
                <span className="h-px w-24 bg-blue-300 md:w-36" />

                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-white/80">
                  <Wheat
                    size={18}
                    strokeWidth={1.7}
                    className="text-red-500"
                  />
                </div>

                <span className="h-px w-24 bg-blue-300 md:w-36" />
              </div>

              {/* Welcome */}
              <h1 className="text-2xl font-semibold tracking-tight text-[#23415f] md:text-4xl">
                Selamat datang, {userName}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
                Kelola bisnis bakery Anda dengan mudah, terstruktur,
                <br className="hidden md:block" />
                dan terintegrasi dalam satu sistem.
              </p>

              {/* Small red accent */}
              <div className="mt-6 flex items-center gap-2">
                <span className="h-px w-8 bg-red-400" />
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                <span className="h-px w-8 bg-red-400" />
              </div>
            </section>

            {/* =====================================================
                MODULE PREVIEW
                CARD SENGAJA BELUM CLICKABLE
            ===================================================== */}
            <section className="mx-auto mt-12 max-w-5xl">
              <div className="grid grid-cols-2 md:grid-cols-4">

                {modules.map((module, index) => {
                  const Icon = module.icon;

                  return (
                    <div
                      key={module.title}
                      className={`
                        group flex flex-col items-center px-5 py-4 text-center
                        ${index !== modules.length - 1
                          ? "border-r border-slate-300/70"
                          : ""}
                      `}
                    >
                      {/* Icon circle */}
                      <div
                        className="
                          flex h-20 w-20 items-center justify-center
                          rounded-full
                          border border-blue-200
                          bg-white/75
                          shadow-sm
                          transition-all
                          duration-300
                          group-hover:border-blue-300
                          group-hover:bg-white
                          group-hover:shadow-md
                        "
                      >
                        <Icon
                          size={31}
                          strokeWidth={1.6}
                          className="text-[#2877bd]"
                        />
                      </div>

                      {/* Title */}
                      <h3 className="mt-4 text-base font-semibold text-[#23415f]">
                        {module.title}
                      </h3>

                      {/* Description */}
                      <p className="mt-1 max-w-[150px] text-xs leading-5 text-slate-500">
                        {module.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* =====================================================
                QUOTE
            ===================================================== */}
            <section className="mt-12 flex justify-center">
              <div className="flex items-center gap-3 text-center">
                <span className="text-3xl leading-none text-red-500">
                  “
                </span>

                <p className="text-sm italic text-[#23415f] md:text-base">
                  Kualitas adalah resep utama setiap produk kami.
                </p>

                <span className="mt-3 text-3xl leading-none text-red-500">
                  ”
                </span>
              </div>
            </section>

          </div>
        </main>

        {/* =========================================================
            FOOTER
        ========================================================= */}
        <footer className="relative z-10 px-6 pb-6 pt-2 text-center">
          <p className="text-xs text-slate-500">
            Butter Club Bakery Management System
          </p>

          <p className="mt-1 text-[11px] text-slate-400">
            © 2026
          </p>
        </footer>
      </div>
    </div>
  );
}