
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  ChartNoAxesCombined,
  Settings,
  Search,
  Bell,
  Menu,
  Clock3,
  CheckCircle2,
  ChefHat,
  CircleDollarSign,
  ShoppingBag,
  ArrowUpRight,
  Plus,
  ChevronRight,
} from "lucide-react";
import MenuManagement from "./pages/MenuManagement";
import "./App.css";

const navigation = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Orders", icon: ClipboardList },
  { name: "Menu Management", icon: UtensilsCrossed },
  { name: "Reports", icon: ChartNoAxesCombined },
  { name: "Settings", icon: Settings },
];


const API_URL = "http://localhost:5000";

function displayStatus(status) {
  const value = String(status || "").toLowerCase();
  if (value === "pending" || value === "confirmed") return "New";
  if (value === "preparing") return "Preparing";
  if (value === "ready") return "Ready";
  if (value === "served") return "Completed";
  if (value === "cancelled") return "Cancelled";
  return "New";
}

function apiStatus(status) {
  const value = String(status || "").toLowerCase();
  if (value === "new") return "pending";
  if (value === "completed") return "served";
  return value;
}

function formatOrderTime(value) {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";

  const minutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60000)
  );

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;

  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
}

function mapApiOrder(order) {
  const items = Array.isArray(order.items) ? order.items : [];

  return {
    id: order.id,
    displayId: order.orderNumber || `JW-${order.id}`,
    table:
      order.tableNumber ||
      (order.orderType === "takeout" ? "Takeaway" : "Unassigned table"),
    time: formatOrderTime(order.createdAt),
    status: displayStatus(order.orderStatus),
    items: items.map((item) => `${item.quantity} × ${item.name}`),
    total: Number(order.subtotal || 0),
  };
}

const peso = (amount) =>
  `₱${Number(amount).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function App() {
  const [activePage, setActivePage] = useState("Overview");
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      try {
        const response = await fetch(`${API_URL}/api/orders`);
        const result = await response.json();

        if (!response.ok || result.success === false) {
          throw new Error(result.message || "Unable to load orders.");
        }

        if (isMounted) {
          setOrders(
            Array.isArray(result.data) ? result.data.map(mapApiOrder) : []
          );
          setOrdersError("");
        }
      } catch (error) {
        if (isMounted) {
          setOrdersError(
            error.message || "Could not connect to the orders API."
          );
        }
      } finally {
        if (isMounted) setOrdersLoading(false);
      }
    }

    loadOrders();
    const intervalId = setInterval(loadOrders, 10000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  async function updateStatus(orderId, status) {
    try {
      const response = await fetch(
        `${API_URL}/api/orders/${orderId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderStatus: apiStatus(status) }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Unable to update order status.");
      }

      setOrders((current) =>
        current.map((order) =>
          order.id === orderId ? { ...order, status } : order
        )
      );
      setNotice(`Order status updated to ${status}.`);
      setOrdersError("");
    } catch (error) {
      setNotice(`Could not update order: ${error.message}`);
    }
  }

  const filteredOrders = orders.filter((order) =>
    `${order.displayId} ${order.table} ${order.status}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const newOrders = orders.filter((order) => order.status === "New").length;
  const preparing = orders.filter(
    (order) => order.status === "Preparing"
  ).length;
  const completed = orders.filter(
    (order) => order.status === "Completed"
  ).length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">JW</div>
          <div>
            <strong>JUST WOK UP</strong>
            <span>STAFF PORTAL</span>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <nav className="navigation">
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${
                activePage === name ? "active" : ""
              }`}
              onClick={() => {
                setActivePage(name);
                setNotice("");
              }}
            >
              <Icon size={18} />
              <span>{name}</span>
              {name === "Orders" && newOrders > 0 && (
                <span className="nav-count">{newOrders}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="service-indicator">
            <span className="online-dot" />
            <div>
              <strong>Service status</strong>
              <span>Dashboard preview</span>
            </div>
          </div>
          <p>Just Wok Up Café</p>
          <small>Staff workspace · Prototype</small>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <Menu size={18} />
            <span>Workspace</span>
            <ChevronRight size={15} />
            <strong>{activePage}</strong>
          </div>

          <div className="topbar-actions">
            <span className="open-status">
              <span className="online-dot" />
              Preview mode
            </span>
            <button
              className="icon-button"
              aria-label="Notifications"
              onClick={() => setNotice("Notifications will be connected to live orders later.")}
            >
              <Bell size={18} />
            </button>
            <div className="avatar">JW</div>
          </div>
        </header>

        <div className="page-content">
          {notice && (
            <div className="notice">
              <CheckCircle2 size={17} />
              {notice}
              <button onClick={() => setNotice("")}>Dismiss</button>
            </div>
          )}

          {activePage === "Overview" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">YOUR CAFÉ AT A GLANCE</p>
                  <h1>Good day, team.</h1>
                  <p>Here's what's happening with your café today.</p>
                </div>
                <div className="date-chip">
                  <Clock3 size={16} />
                  Live workspace preview
                </div>
              </div>

              <section className="stats-grid">
                <StatCard
                  icon={ClipboardList}
                  label="New orders"
                  value={newOrders}
                  detail="Awaiting staff action"
                />
                <StatCard
                  icon={ChefHat}
                  label="Preparing"
                  value={preparing}
                  detail="Currently in progress"
                />
                <StatCard
                  icon={CheckCircle2}
                  label="Completed"
                  value={completed}
                  detail="Orders marked as served"
                />
                <StatCard
                  icon={CircleDollarSign}
                  label="Order value"
                  value={peso(orders.reduce((sum, order) => sum + order.total, 0))}
                  detail="Subtotal of loaded orders"
                />
              </section>

              <section className="content-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Recent orders</h2>
                    <p>Review orders and update their progress.</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setActivePage("Orders")}
                  >
                    View all orders <ArrowUpRight size={16} />
                  </button>
                </div>
                <OrderList
                  orders={orders.slice(0, 3)}
                  onUpdate={updateStatus}
                />
              </section>

              <div className="bottom-grid">
                <section className="content-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Quick actions</h2>
                      <p>Jump into common tasks.</p>
                    </div>
                  </div>
                  <div className="quick-actions">
                    <button onClick={() => setActivePage("Orders")}>
                      <ClipboardList size={19} />
                      <span>Manage orders</span>
                      <ChevronRight size={16} />
                    </button>
                    <button onClick={() => setActivePage("Menu Management")}>
                      <Plus size={19} />
                      <span>Manage menu</span>
                      <ChevronRight size={16} />
                    </button>
                    <button onClick={() => setActivePage("Reports")}>
                      <ChartNoAxesCombined size={19} />
                      <span>View reports</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </section>

                <section className="tip-panel">
                  <div className="tip-icon"><ShoppingBag size={21} /></div>
                  <p className="eyebrow">NEXT STEP</p>
                  <h2>Connect your operations.</h2>
                  <p>
                    This dashboard currently uses sample orders. The next
                    development step is connecting it to your Express API
                    and PostgreSQL database.
                  </p>
                </section>
              </div>
            </>
          )}

          {activePage === "Orders" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">ORDER WORKSPACE</p>
                  <h1>Orders</h1>
                  <p>Track orders and update their preparation status.</p>
                </div>
              </div>
              <section className="content-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Order queue</h2>
                    <p>{filteredOrders.length} orders loaded from the database</p>
                  </div>
                  <div className="search-box">
                    <Search size={17} />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search orders..."
                    />
                  </div>
                </div>
                {ordersError && <div className="empty-state">{ordersError}</div>}
                {ordersLoading ? (
                  <div className="empty-state">Loading orders...</div>
                ) : (
                  <OrderList orders={filteredOrders} onUpdate={updateStatus} />
                )}
              </section>
            </>
          )}

          {activePage === "Menu Management" && <MenuManagement />}

        {activePage === "Reports" && (
            <section className="content-panel placeholder-page">
              <div className="placeholder-icon"><ChartNoAxesCombined size={24} /></div>
              <p className="eyebrow">BUSINESS INSIGHTS</p>
              <h1>Reports</h1>
              <p>
                Sales totals, order volume, popular items, and date filters
                will be calculated from actual database records once connected.
              </p>
              <span className="preview-tag">Integration pending</span>
            </section>
          )}

          {activePage === "Settings" && (
            <section className="content-panel placeholder-page">
              <div className="placeholder-icon"><Settings size={24} /></div>
              <p className="eyebrow">WORKSPACE PREFERENCES</p>
              <h1>Settings</h1>
              <p>
                Staff accounts, access permissions, café details, and
                operational preferences will be configured here.
              </p>
              <span className="preview-tag">Integration pending</span>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, detail }) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <div className="stat-icon"><Icon size={19} /></div>
      </div>
      <strong className="stat-value">{value}</strong>
      <span className="stat-detail">{detail}</span>
    </article>
  );
}

function OrderList({ orders, onUpdate }) {
  if (orders.length === 0) {
    return <div className="empty-state">No matching orders found.</div>;
  }

  return (
    <div className="orders-list">
      {orders.map((order) => (
        <article className="order-row" key={order.id}>
          <div className="order-main">
            <div className="order-title">
              <strong>{order.displayId}</strong>
              <span className={`status status-${order.status.toLowerCase()}`}>
                {order.status}
              </span>
            </div>
            <span className="order-meta">
              {order.table} · {order.time}
            </span>
            <p className="order-items">{order.items.join(" · ")}</p>
          </div>
          <div className="order-side">
            <strong>{peso(order.total)}</strong>
            <select
              aria-label={`Update status for ${order.displayId}`}
              value={order.status}
              onChange={(event) => onUpdate(order.id, event.target.value)}
            >
              <option>New</option>
              <option>Preparing</option>
              <option>Ready</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
          </div>
        </article>
      ))}
    </div>
  );
}

export default App;
