"use client";

import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings2,
  WalletCards,
  X,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { hasSupabaseConfig, supabase, type TransactionKind, type TransactionRecord } from "@/lib/supabase";

type AuthMode = "login" | "signup";
type View = "overview" | "transactions";
type TransactionFilter = "all" | TransactionKind;

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const shortDate = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });
const fullDate = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" });

function dateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function makeDemoTransactions(): TransactionRecord[] {
  const samples = [
    ["Gaji bulanan", "Pekerjaan", "income", 12500000, -1],
    ["Belanja mingguan", "Belanja", "expense", 685000, -1],
    ["Proyek identitas visual", "Freelance", "income", 3200000, -3],
    ["Kopi dan makan siang", "Makanan", "expense", 148000, -3],
    ["Tagihan listrik", "Tagihan", "expense", 425000, -5],
    ["Langganan streaming", "Hiburan", "expense", 79000, -7],
    ["Dana darurat", "Tabungan", "income", 1000000, -9],
  ] as const;

  return samples.map(([title, category, type, amount, days], index) => ({
    id: `demo-${index}`,
    user_id: "demo",
    title,
    category,
    type,
    amount,
    occurred_on: dateOffset(days),
    note: null,
    created_at: new Date().toISOString(),
  }));
}

function formatDate(value: string, full = false) {
  const date = new Date(`${value}T00:00:00`);
  return (full ? fullDate : shortDate).format(date);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function initials(email?: string) {
  return email?.split("@")[0]?.slice(0, 2).toUpperCase() || "NA";
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [view, setView] = useState<View>("overview");
  const [filter, setFilter] = useState<TransactionFilter>("all");
  const [filterQuery, setFilterQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [transactionForm, setTransactionForm] = useState({
    title: "",
    category: "Makanan",
    type: "expense" as TransactionKind,
    amount: "",
    occurred_on: dateOffset(0),
    note: "",
  });

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setAuthLoading(false);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (demoMode) {
      setTransactions(makeDemoTransactions());
      setDataLoading(false);
      return;
    }
    if (!session || !supabase) {
      setTransactions([]);
      setDataLoading(false);
      return;
    }

    let mounted = true;
    setDataLoading(true);
    void supabase
      .from("transactions")
      .select("*")
      .order("occurred_on", { ascending: false })
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) setActionError(error.message);
        else setTransactions(data ?? []);
        setDataLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [demoMode, session]);

  const userEmail = session?.user.email ?? (demoMode ? "nara@ruangarus.id" : "");
  const activeUser = Boolean(session || demoMode);
  const thisMonth = monthKey(new Date());
  const monthTransactions = transactions.filter((item) => item.occurred_on.startsWith(thisMonth));
  const incomeThisMonth = monthTransactions
    .filter((item) => item.type === "income")
    .reduce((total, item) => total + Number(item.amount), 0);
  const expensesThisMonth = monthTransactions
    .filter((item) => item.type === "expense")
    .reduce((total, item) => total + Number(item.amount), 0);
  const balance = transactions.reduce(
    (total, item) => total + (item.type === "income" ? Number(item.amount) : -Number(item.amount)),
    0,
  );
  const savingsRate = incomeThisMonth ? Math.round(((incomeThisMonth - expensesThisMonth) / incomeThisMonth) * 100) : 0;

  const chartMonths = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(today.getFullYear(), today.getMonth() - offset, 1);
      const key = monthKey(date);
      const monthItems = transactions.filter((item) => item.occurred_on.startsWith(key));
      result.push({
        label: new Intl.DateTimeFormat("id-ID", { month: "short" }).format(date),
        income: monthItems.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0),
        expenses: monthItems.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount), 0),
      });
    }
    return result;
  }, [transactions]);

  const chartMax = Math.max(...chartMonths.flatMap((month) => [month.income, month.expenses]), 1);
  const sortedTransactions = [...transactions].sort((first, second) => second.occurred_on.localeCompare(first.occurred_on));
  const filteredTransactions = sortedTransactions.filter((item) => filter === "all" || item.type === filter);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    setAuthMessage("");
    if (!supabase) {
      setAuthError("Hubungkan Supabase terlebih dahulu untuk menggunakan akun.");
      return;
    }

    setSaving(true);
    const result = authMode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setSaving(false);

    if (result.error) {
      setAuthError(result.error.message);
      return;
    }
    if (authMode === "signup" && !result.data.session) {
      setAuthMessage("Akun berhasil dibuat. Periksa email Anda untuk konfirmasi sebelum masuk.");
      return;
    }
    setAuthMessage("");
  }

  async function handleSignOut() {
    setDemoMode(false);
    setView("overview");
    if (supabase && session) await supabase.auth.signOut();
    setSession(null);
  }

  async function handleCreateTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError("");
    const amount = Number(transactionForm.amount);
    if (!transactionForm.title.trim() || !Number.isFinite(amount) || amount <= 0) {
      setActionError("Isi nama transaksi dan nominal yang valid.");
      return;
    }

    setSaving(true);
    const record = {
      user_id: session?.user.id ?? "demo",
      title: transactionForm.title.trim(),
      category: transactionForm.category,
      type: transactionForm.type,
      amount,
      occurred_on: transactionForm.occurred_on,
      note: transactionForm.note.trim() || null,
    };

    if (demoMode) {
      setTransactions((current) => [{ ...record, id: crypto.randomUUID(), created_at: new Date().toISOString() }, ...current]);
    } else if (supabase) {
      const { data, error } = await supabase.from("transactions").insert(record).select().single();
      if (error) {
        setActionError(error.message);
        setSaving(false);
        return;
      }
      setTransactions((current) => [data, ...current]);
    }

    setSaving(false);
    setShowModal(false);
    setTransactionForm({ title: "", category: "Makanan", type: "expense", amount: "", occurred_on: dateOffset(0), note: "" });
  }

  async function handleDeleteTransaction(transaction: TransactionRecord) {
    setActionError("");
    if (demoMode) {
      setTransactions((current) => current.filter((item) => item.id !== transaction.id));
      return;
    }
    if (!supabase) return;
    const { error } = await supabase.from("transactions").delete().eq("id", transaction.id);
    if (error) setActionError(error.message);
    else setTransactions((current) => current.filter((item) => item.id !== transaction.id));
  }

  if (authLoading) {
    return <main className="boot-screen"><span className="brand-mark"><WalletCards size={20} /></span><span>Menyiapkan ruang Anda...</span></main>;
  }

  if (!activeUser) {
    return (
      <main className="auth-screen">
        <section className="auth-story">
          <div className="auth-story-top">
            <Brand />
            <span className="story-index">KEUANGAN, LEBIH TERARAH</span>
          </div>
          <div className="story-copy">
            <p className="eyebrow"><span /> RUANG UNTUK BERTUMBUH</p>
            <h1>Uangmu punya<br />arah. <em>Kamu</em> punya<br />kendali.</h1>
            <p className="story-description">Catat yang masuk, pahami yang keluar, dan buat keputusan finansial dengan lebih tenang.</p>
            <div className="story-note">
              <div className="note-icon"><ArrowUpRight size={20} /></div>
              <div><strong>Setiap langkah kecil berarti.</strong><span>Mulai dari memahami arusmu hari ini.</span></div>
            </div>
          </div>
          <div className="story-footer"><span>RUANG ARUS © 2026</span><span>FINANSIAL PRIBADI, DENGAN INTENSI</span></div>
          <div className="story-sun" aria-hidden="true" />
        </section>

        <section className="auth-panel">
          <div className="auth-panel-top"><span>SUATU HARI YANG LEBIH TERATUR</span><span className="secure-label"><span /> AMAN &amp; PRIBADI</span></div>
          <div className="auth-box">
            <div className="auth-welcome">
              <span className="auth-symbol"><WalletCards size={22} /></span>
              <p className="eyebrow">SELAMAT DATANG {authMode === "signup" ? "DI RUANG ARUS" : "KEMBALI"}</p>
              <h2>{authMode === "login" ? "Senang melihatmu." : "Mulai dari sini."}</h2>
              <p>{authMode === "login" ? "Masuk untuk melanjutkan perjalanan finansialmu." : "Buat akun dan bangun kebiasaan finansial yang lebih baik."}</p>
            </div>
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              <label htmlFor="email">Alamat email</label>
              <input id="email" type="email" autoComplete="email" placeholder="nama@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
              <div className="password-label"><label htmlFor="password">Kata sandi</label>{authMode === "login" && <span>Minimal 6 karakter</span>}</div>
              <input id="password" type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} placeholder="••••••••" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required />
              {authError && <p className="form-message error-message" role="alert">{authError}</p>}
              {authMessage && <p className="form-message success-message" role="status">{authMessage}</p>}
              <button className="button button-primary auth-submit" type="submit" disabled={saving}>
                {saving ? "Mohon tunggu..." : authMode === "login" ? "Masuk ke akun" : "Buat akun"}<ArrowRight size={17} />
              </button>
            </form>
            <p className="auth-switch">{authMode === "login" ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
              <button type="button" onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setAuthError(""); setAuthMessage(""); }}>
                {authMode === "login" ? "Daftar sekarang" : "Masuk"}
              </button>
            </p>
            {!hasSupabaseConfig && <p className="config-note">Login aktif setelah Supabase dikonfigurasi. Sementara itu, kamu bisa mencoba dashboard demo.</p>}
            <button type="button" className="demo-link" onClick={() => { setDemoMode(true); setAuthError(""); }}>
              Coba dashboard demo <ArrowRight size={14} />
            </button>
          </div>
          <div className="auth-panel-footer"><span>PRIVASI ADALAH PRIORITAS</span><a href="mailto:bantuan@ruangarus.id">Butuh bantuan? <CircleHelp size={13} /></a></div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      {mobileMenuOpen && <button className="sidebar-scrim" aria-label="Tutup menu" onClick={() => setMobileMenuOpen(false)} />}
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand"><Brand /><button className="icon-button close-sidebar" aria-label="Tutup menu" onClick={() => setMobileMenuOpen(false)}><X size={19} /></button></div>
        <div className="workspace-switch"><span className="workspace-avatar">R</span><span><strong>Ruang personal</strong><small>Ruang pribadimu</small></span><ChevronDown size={15} /></div>
        <p className="nav-label">MENU UTAMA</p>
        <nav className="main-nav" aria-label="Navigasi utama">
          <button className={view === "overview" ? "nav-item active" : "nav-item"} onClick={() => { setView("overview"); setMobileMenuOpen(false); }}><LayoutDashboard size={18} /> Ringkasan</button>
          <button className={view === "transactions" ? "nav-item active" : "nav-item"} onClick={() => { setView("transactions"); setMobileMenuOpen(false); }}><CreditCard size={18} /> Transaksi</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip"><span className="tip-spark">✳</span><strong>Pelan-pelan saja.</strong><p>Konsistensi kecil hari ini membentuk masa depanmu.</p></div>
          <button className="nav-item secondary-nav" onClick={() => setActionError("Pengaturan akun segera hadir.")}><Settings2 size={17} /> Pengaturan</button>
          <button className="nav-item secondary-nav" onClick={() => setActionError("Pusat bantuan segera hadir.")}><CircleHelp size={17} /> Pusat bantuan</button>
          <button className="profile-row" onClick={handleSignOut}>
            <span className="profile-avatar">{initials(userEmail)}</span><span className="profile-copy"><strong>{userEmail.split("@")[0]}</strong><small>{demoMode ? "Akun demo" : userEmail}</small></span><LogOut size={16} />
          </button>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Buka menu" onClick={() => setMobileMenuOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>Ruang personal</span><span>/</span><strong>{view === "overview" ? "Ringkasan" : "Transaksi"}</strong></div>
          <div className="topbar-actions"><span className="today-label">{new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</span><button className="icon-button notification-button" aria-label="Notifikasi" onClick={() => setActionError("Belum ada notifikasi baru.")}><Bell size={18} /><i /></button><span className="topbar-avatar">{initials(userEmail)}</span></div>
        </header>

        <div className="page-content">
          {actionError && <div className="inline-alert" role="status"><span>{actionError}</span><button aria-label="Tutup pesan" onClick={() => setActionError("")}><X size={15} /></button></div>}
          {view === "overview" ? (
            <>
              <div className="page-heading">
                <div><p className="eyebrow">{demoMode ? "MODE DEMO" : "GAMBARAN BESAR"}</p><h1>Ruangmu, <em>{userEmail.split("@")[0]}</em>.</h1><p className="heading-subtitle">Ini ringkasan arus keuanganmu bulan ini.</p></div>
                <button className="button button-primary add-button" onClick={() => setShowModal(true)}><Plus size={18} /> Catat transaksi</button>
              </div>

              <section className="stats-grid" aria-label="Ringkasan keuangan">
                <article className="stat-card balance-card"><div className="stat-topline"><span>Total saldo</span><span className="stat-icon balance-icon"><WalletCards size={17} /></span></div><strong className="stat-value">{currency.format(balance)}</strong><div className="stat-foot"><span className="balance-dot" /> Akumulasi seluruh transaksi</div><span className="card-corner" aria-hidden="true" /></article>
                <article className="stat-card"><div className="stat-topline"><span>Pemasukan bulan ini</span><span className="stat-icon income-icon"><ArrowDownLeft size={17} /></span></div><strong className="stat-value">{currency.format(incomeThisMonth)}</strong><div className="stat-foot"><span className="positive-change"><ArrowDownRight size={13} /> Masuk</span><span>bulan ini</span></div></article>
                <article className="stat-card"><div className="stat-topline"><span>Pengeluaran bulan ini</span><span className="stat-icon expense-icon"><ArrowUpRight size={17} /></span></div><strong className="stat-value">{currency.format(expensesThisMonth)}</strong><div className="stat-foot"><span className="expense-change"><ArrowUpRight size={13} /> Keluar</span><span>bulan ini</span></div></article>
                <article className="stat-card"><div className="stat-topline"><span>Tingkat tabungan</span><span className="stat-icon savings-icon"><Check size={17} /></span></div><strong className="stat-value">{savingsRate}%</strong><div className="savings-track"><span style={{ width: `${Math.max(0, Math.min(savingsRate, 100))}%` }} /></div><div className="stat-foot"><span>Dari pemasukan bulan ini</span></div></article>
              </section>

              <section className="dashboard-grid">
                <article className="panel chart-panel">
                  <div className="panel-heading"><div><p className="eyebrow">POLA BULANAN</p><h2>Arus kas</h2></div><button className="period-select" aria-label="Periode enam bulan terakhir">6 bulan <ChevronDown size={14} /></button></div>
                  <div className="chart-legend"><span><i className="legend-income" /> Pemasukan</span><span><i className="legend-expense" /> Pengeluaran</span></div>
                  <div className="chart-area">
                    <div className="chart-y-labels"><span>{compactCurrency(chartMax)}</span><span>{compactCurrency(chartMax * 0.66)}</span><span>{compactCurrency(chartMax * 0.33)}</span><span>Rp0</span></div>
                    <div className="chart-columns">
                      {chartMonths.map((month) => <div className="chart-month" key={month.label}>
                        <div className="bar-pair"><span className="chart-bar bar-income" title={`Pemasukan ${currency.format(month.income)}`} style={{ height: `${Math.max(month.income ? 4 : 0, (month.income / chartMax) * 100)}%` }} /><span className="chart-bar bar-expense" title={`Pengeluaran ${currency.format(month.expenses)}`} style={{ height: `${Math.max(month.expenses ? 4 : 0, (month.expenses / chartMax) * 100)}%` }} /></div>
                        <span className="month-label">{month.label}</span>
                      </div>)}
                    </div>
                  </div>
                  <div className="chart-summary"><span>Selisih bulan ini</span><strong className={incomeThisMonth >= expensesThisMonth ? "positive-text" : "negative-text"}>{currency.format(incomeThisMonth - expensesThisMonth)}</strong></div>
                </article>

                <article className="panel insight-panel">
                  <div className="panel-heading"><div><p className="eyebrow">KABAR BAIK</p><h2>Satu langkah maju</h2></div><span className="insight-spark">✳</span></div>
                  <div className="insight-body"><span className="insight-illustration"><ArrowUpRight size={27} /></span><p>{savingsRate > 0 ? `Kamu menyimpan ${savingsRate}% dari pemasukan bulan ini.` : "Setiap rupiah yang kamu catat membawamu lebih dekat ke tujuan."}</p><span className="insight-caption">KEBIASAAN BAIK TUMBUH DARI KESEDARAN</span></div>
                  <button className="text-action" onClick={() => setView("transactions")}>Lihat semua transaksi <ArrowRight size={15} /></button>
                </article>
              </section>

              <TransactionSection transactions={sortedTransactions.slice(0, 5)} loading={dataLoading} onViewAll={() => setView("transactions")} onDelete={handleDeleteTransaction} />
            </>
          ) : (
            <>
              <div className="page-heading transactions-heading"><div><p className="eyebrow">CATATAN KEUANGAN</p><h1>Semua <em>transaksi.</em></h1><p className="heading-subtitle">Satu tempat untuk memahami ke mana uangmu bergerak.</p></div><button className="button button-primary add-button" onClick={() => setShowModal(true)}><Plus size={18} /> Catat transaksi</button></div>
              <div className="all-transactions-panel">
                <div className="table-toolbar"><div className="filter-tabs" role="group" aria-label="Filter transaksi">
                  {(["all", "income", "expense"] as const).map((value) => <button key={value} className={filter === value ? "filter-tab selected" : "filter-tab"} onClick={() => setFilter(value)}>{value === "all" ? "Semua" : value === "income" ? "Pemasukan" : "Pengeluaran"}</button>)}
                </div><div className="search-box"><Search size={16} /><input aria-label="Cari transaksi" placeholder="Cari transaksi" onChange={(event) => setFilterQuery(event.target.value)} /></div></div>
                <TransactionSection transactions={filteredTransactions.filter((item) => `${item.title} ${item.category}`.toLowerCase().includes(filterQuery.toLowerCase()))} loading={dataLoading} onViewAll={() => setView("overview")} onDelete={handleDeleteTransaction} full />
              </div>
            </>
          )}
          <footer className="page-footer"><span>Uangmu, ceritamu. Rawat dengan penuh kesadaran.</span><span>RUANG ARUS <span className="footer-dot">·</span> 2026</span></footer>
        </div>
      </section>

      {showModal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowModal(false); }}>
        <section className="transaction-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="modal-heading"><div><p className="eyebrow">CATAT DENGAN SADAR</p><h2 id="modal-title">Transaksi baru</h2></div><button className="icon-button" aria-label="Tutup" onClick={() => setShowModal(false)}><X size={19} /></button></div>
          <form className="transaction-form" onSubmit={handleCreateTransaction}>
            <div className="type-segment" role="group" aria-label="Jenis transaksi"><button type="button" className={transactionForm.type === "expense" ? "type-option selected expense-selected" : "type-option"} onClick={() => setTransactionForm({ ...transactionForm, type: "expense" })}><ArrowUpRight size={16} /> Pengeluaran</button><button type="button" className={transactionForm.type === "income" ? "type-option selected income-selected" : "type-option"} onClick={() => setTransactionForm({ ...transactionForm, type: "income" })}><ArrowDownLeft size={16} /> Pemasukan</button></div>
            <label htmlFor="transaction-title">Nama transaksi</label><input id="transaction-title" autoFocus placeholder="Contoh: Makan siang" value={transactionForm.title} onChange={(event) => setTransactionForm({ ...transactionForm, title: event.target.value })} required />
            <div className="form-two-columns"><div><label htmlFor="transaction-amount">Nominal (Rp)</label><input id="transaction-amount" type="number" min="1" step="1" inputMode="numeric" placeholder="0" value={transactionForm.amount} onChange={(event) => setTransactionForm({ ...transactionForm, amount: event.target.value })} required /></div><div><label htmlFor="transaction-category">Kategori</label><select id="transaction-category" value={transactionForm.category} onChange={(event) => setTransactionForm({ ...transactionForm, category: event.target.value })}>{["Makanan", "Belanja", "Pekerjaan", "Freelance", "Transportasi", "Tagihan", "Hiburan", "Tabungan", "Kesehatan", "Lainnya"].map((category) => <option key={category}>{category}</option>)}</select></div></div>
            <label htmlFor="transaction-date">Tanggal</label><input id="transaction-date" type="date" value={transactionForm.occurred_on} onChange={(event) => setTransactionForm({ ...transactionForm, occurred_on: event.target.value })} required />
            <label htmlFor="transaction-note">Catatan <span className="optional-label">OPSIONAL</span></label><textarea id="transaction-note" rows={2} placeholder="Tambahkan sedikit konteks" value={transactionForm.note} onChange={(event) => setTransactionForm({ ...transactionForm, note: event.target.value })} />
            {actionError && <p className="form-message error-message" role="alert">{actionError}</p>}
            <div className="modal-actions"><button className="button button-quiet" type="button" onClick={() => setShowModal(false)}>Batal</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan transaksi"}<Check size={16} /></button></div>
          </form>
        </section>
      </div>}
    </main>
  );
}

function compactCurrency(value: number) {
  if (value >= 1000000) return `Rp${(value / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} jt`;
  if (value >= 1000) return `Rp${(value / 1000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} rb`;
  return `Rp${Math.round(value)}`;
}

function Brand() {
  return <div className="brand"><span className="brand-mark"><WalletCards size={19} strokeWidth={1.8} /></span><span>ruang<span>arus</span></span></div>;
}

function TransactionSection({
  transactions,
  loading,
  onViewAll,
  onDelete,
  full = false,
}: {
  transactions: TransactionRecord[];
  loading: boolean;
  onViewAll: () => void;
  onDelete: (transaction: TransactionRecord) => void;
  full?: boolean;
}) {
  return (
    <section className={`panel transaction-panel ${full ? "transaction-panel-full" : ""}`}>
      {!full && <div className="panel-heading transaction-panel-heading"><div><p className="eyebrow">CATATAN TERBARU</p><h2>Aktivitasmu</h2></div><button className="text-action" onClick={onViewAll}>Lihat semua <ArrowRight size={15} /></button></div>}
      {full && <div className="full-table-heading"><div><p className="eyebrow">RIWAYAT TRANSAKSI</p><h2>{transactions.length} catatan</h2></div></div>}
      <div className="transaction-list">
        <div className="transaction-table-head"><span>DESKRIPSI</span><span>KATEGORI</span><span>TANGGAL</span><span>NOMINAL</span><span /></div>
        {loading ? <p className="empty-state">Memuat transaksi...</p> : transactions.length === 0 ? <p className="empty-state">Belum ada transaksi untuk ditampilkan.</p> : transactions.map((transaction) => <div className="transaction-row" key={transaction.id}>
          <span className="transaction-title"><span className={transaction.type === "income" ? "transaction-icon income-row" : "transaction-icon expense-row"}>{transaction.type === "income" ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span><span><strong>{transaction.title}</strong><small>{transaction.note || (transaction.type === "income" ? "Uang masuk" : "Uang keluar")}</small></span></span>
          <span><span className="category-tag">{transaction.category}</span></span>
          <span className="date-cell">{formatDate(transaction.occurred_on, full)}</span>
          <strong className={transaction.type === "income" ? "amount-cell income-amount" : "amount-cell expense-amount"}>{transaction.type === "income" ? "+" : "−"}{currency.format(Number(transaction.amount))}</strong>
          <button className="row-delete" aria-label={`Hapus ${transaction.title}`} title="Hapus transaksi" onClick={() => onDelete(transaction)}><X size={15} /></button>
        </div>)}
      </div>
    </section>
  );
}
