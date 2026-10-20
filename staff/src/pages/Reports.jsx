
import { useMemo, useState } from "react";
import {
  Download,
  TrendingUp,
  ShoppingBag,
  Receipt,
  Coffee,
  CalendarDays,
  ChartColumn,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import "./Reports.css";

const makeDate = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
};

// Sample café orders. Replace with database records when connected.
const sampleOrders = [
  { id: "ORD-1001", date: makeDate(0), item: "Iced Spanish Latte", category: "Coffee", qty: 3, total: 390, status: "Completed" },
  { id: "ORD-1002", date: makeDate(0), item: "Caramel Macchiato", category: "Coffee", qty: 2, total: 300, status: "Completed" },
  { id: "ORD-1003", date: makeDate(0), item: "Chocolate Cake", category: "Pastries", qty: 2, total: 240, status: "Completed" },
  { id: "ORD-1004", date: makeDate(0), item: "Americano", category: "Coffee", qty: 2, total: 180, status: "Pending" },
  { id: "ORD-1005", date: makeDate(1), item: "Iced Spanish Latte", category: "Coffee", qty: 4, total: 520, status: "Completed" },
  { id: "ORD-1006", date: makeDate(1), item: "Matcha Latte", category: "Non-Coffee", qty: 3, total: 405, status: "Completed" },
  { id: "ORD-1007", date: makeDate(1), item: "Croissant", category: "Pastries", qty: 3, total: 210, status: "Completed" },
  { id: "ORD-1008", date: makeDate(2), item: "Caramel Macchiato", category: "Coffee", qty: 4, total: 600, status: "Completed" },
  { id: "ORD-1009", date: makeDate(2), item: "Iced Spanish Latte", category: "Coffee", qty: 2, total: 260, status: "Cancelled" },
  { id: "ORD-1010", date: makeDate(3), item: "Matcha Latte", category: "Non-Coffee", qty: 3, total: 405, status: "Completed" },
  { id: "ORD-1011", date: makeDate(4), item: "Americano", category: "Coffee", qty: 5, total: 450, status: "Completed" },
  { id: "ORD-1012", date: makeDate(5), item: "Chocolate Cake", category: "Pastries", qty: 4, total: 480, status: "Completed" },
  { id: "ORD-1013", date: makeDate(6), item: "Iced Spanish Latte", category: "Coffee", qty: 3, total: 390, status: "Completed" },
  { id: "ORD-1014", date: makeDate(8), item: "Caramel Macchiato", category: "Coffee", qty: 2, total: 300, status: "Completed" },
  { id: "ORD-1015", date: makeDate(10), item: "Croissant", category: "Pastries", qty: 5, total: 350, status: "Completed" },
  { id: "ORD-1016", date: makeDate(15), item: "Matcha Latte", category: "Non-Coffee", qty: 2, total: 270, status: "Completed" },
  { id: "ORD-1017", date: makeDate(20), item: "Americano", category: "Coffee", qty: 4, total: 360, status: "Completed" },
  { id: "ORD-1018", date: makeDate(35), item: "Iced Spanish Latte", category: "Coffee", qty: 3, total: 390, status: "Completed" },
];

const peso = (amount) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(amount);

export default function Reports() {
  const [period, setPeriod] = useState("7");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filteredOrders = useMemo(() => {
    const days = Number(period);
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - days + 1);

    return sampleOrders.filter((order) => {
      const orderDate = new Date(`${order.date}T00:00:00`);
      const matchesDate = orderDate >= cutoff;
      const matchesStatus =
        statusFilter === "All" || order.status === statusFilter;
      const matchesSearch =
        order.id.toLowerCase().includes(search.toLowerCase()) ||
        order.item.toLowerCase().includes(search.toLowerCase());

      return matchesDate && matchesStatus && matchesSearch;
    });
  }, [period, statusFilter, search]);

  const completedOrders = filteredOrders.filter(
    (order) => order.status === "Completed"
  );

  const totalSales = completedOrders.reduce(
    (sum, order) => sum + order.total,
    0
  );

  const itemsSold = completedOrders.reduce(
    (sum, order) => sum + order.qty,
    0
  );

  const averageOrder = completedOrders.length
    ? totalSales / completedOrders.length
    : 0;

  const salesByDate = useMemo(() => {
    const days = Number(period);
    const result = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = makeDate(i);
      const sales = completedOrders
        .filter((order) => order.date === date)
        .reduce((sum, order) => sum + order.total, 0);

      result.push({ date, sales });
    }

    return result;
  }, [period, completedOrders]);

  const maxSales = Math.max(...salesByDate.map((day) => day.sales), 1);

  const bestSellers = useMemo(() => {
    const totals = {};

    completedOrders.forEach((order) => {
      if (!totals[order.item]) {
        totals[order.item] = { name: order.item, qty: 0, sales: 0 };
      }

      totals[order.item].qty += order.qty;
      totals[order.item].sales += order.total;
    });

    return Object.values(totals)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [completedOrders]);

  const completedCount = filteredOrders.filter(
    (order) => order.status === "Completed"
  ).length;
  const pendingCount = filteredOrders.filter(
    (order) => order.status === "Pending"
  ).length;
  const cancelledCount = filteredOrders.filter(
    (order) => order.status === "Cancelled"
  ).length;

  const exportCSV = () => {
    const headers = [
      "Order ID",
      "Date",
      "Item",
      "Category",
      "Quantity",
      "Total (PHP)",
      "Status",
    ];

    const rows = filteredOrders.map((order) => [
      order.id,
      order.date,
      order.item,
      order.category,
      order.qty,
      order.total,
      order.status,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `cafe-report-${makeDate(0)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="cafe-reports">
      <div className="report-heading">
        <div>
          <span className="report-eyebrow">
            <ChartColumn size={15} /> BUSINESS INSIGHTS
          </span>
          <h1>Café Reports</h1>
          <p>Track sales, orders, and your café's best-selling products.</p>
        </div>

        <button className="report-export" onClick={exportCSV}>
          <Download size={17} />
          Export CSV
        </button>
      </div>

      <div className="report-notice">
        <span className="notice-dot" />
        Sample data preview — connect your database to display actual sales.
      </div>

      <div className="report-toolbar">
        <label className="report-filter">
          <CalendarDays size={17} />
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="1">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </label>

        <label className="report-search">
          <input
            type="search"
            placeholder="Search order or menu item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <label className="report-filter">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All statuses</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </label>
      </div>

      <div className="report-stats">
        <div className="report-stat">
          <div className="stat-icon sales-icon"><TrendingUp size={20} /></div>
          <span>Total sales</span>
          <strong>{peso(totalSales)}</strong>
          <small>Completed orders only</small>
        </div>

        <div className="report-stat">
          <div className="stat-icon orders-icon"><ShoppingBag size={20} /></div>
          <span>Completed orders</span>
          <strong>{completedCount}</strong>
          <small>Successfully completed</small>
        </div>

        <div className="report-stat">
          <div className="stat-icon average-icon"><Receipt size={20} /></div>
          <span>Average order value</span>
          <strong>{peso(averageOrder)}</strong>
          <small>Sales per completed order</small>
        </div>

        <div className="report-stat">
          <div className="stat-icon items-icon"><Coffee size={20} /></div>
          <span>Items sold</span>
          <strong>{itemsSold}</strong>
          <small>From completed orders</small>
        </div>
      </div>

      <div className="report-main-grid">
        <section className="report-panel sales-panel">
          <div className="panel-heading">
            <div>
              <h2>Sales overview</h2>
              <p>Daily sales from completed orders</p>
            </div>
            <TrendingUp size={20} />
          </div>

          <div className="sales-chart">
            {salesByDate.map((day) => (
              <div className="chart-column" key={day.date}>
                <span className="chart-value">
                  {day.sales > 0 ? `₱${day.sales}` : ""}
                </span>
                <div className="chart-bar-area">
                  <div
                    className={`chart-bar ${day.sales ? "" : "empty-bar"}`}
                    style={{
                      height: `${Math.max((day.sales / maxSales) * 100, 3)}%`,
                    }}
                    title={`${day.date}: ${peso(day.sales)}`}
                  />
                </div>
                <span className="chart-label">
                  {new Date(`${day.date}T00:00:00`).toLocaleDateString(
                    "en-PH",
                    { month: "short", day: "numeric" }
                  )}
                </span>
              </div>
            ))}
          </div>

          <div className="chart-footer">
            <span>Total for selected period</span>
            <strong>{peso(totalSales)}</strong>
          </div>
        </section>

        <section className="report-panel bestseller-panel">
          <div className="panel-heading">
            <div>
              <h2>Best-selling items</h2>
              <p>Ranked by quantity sold</p>
            </div>
            <Award size={20} />
          </div>

          {bestSellers.length ? (
            <div className="best-list">
              {bestSellers.map((item, index) => (
                <div className="best-item" key={item.name}>
                  <div className={`best-rank rank-${index + 1}`}>
                    {index + 1}
                  </div>
                  <div className="best-details">
                    <strong>{item.name}</strong>
                    <span>{item.qty} items sold</span>
                  </div>
                  <strong className="best-sales">{peso(item.sales)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="report-empty">No completed sales for this period.</p>
          )}
        </section>
      </div>

      <section className="report-panel order-status-panel">
        <div className="panel-heading">
          <div>
            <h2>Order status</h2>
            <p>Order breakdown for the selected period</p>
          </div>
          <Clock size={20} />
        </div>

        <div className="status-grid">
          <div className="status-card">
            <CheckCircle2 size={21} />
            <span>Completed</span>
            <strong>{completedCount}</strong>
          </div>
          <div className="status-card pending-status">
            <Clock size={21} />
            <span>Pending</span>
            <strong>{pendingCount}</strong>
          </div>
          <div className="status-card cancelled-status">
            <XCircle size={21} />
            <span>Cancelled</span>
            <strong>{cancelledCount}</strong>
          </div>
        </div>
      </section>

      <section className="report-panel transactions-panel">
        <div className="panel-heading">
          <div>
            <h2>Order transactions</h2>
            <p>{filteredOrders.length} orders match your filters</p>
          </div>
          <Receipt size={20} />
        </div>

        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Menu item</th>
                <th>Qty</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length ? (
                filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="order-id">{order.id}</td>
                    <td>{order.date}</td>
                    <td>{order.item}</td>
                    <td>{order.qty}</td>
                    <td className="order-total">{peso(order.total)}</td>
                    <td>
                      <span
                        className={`order-badge ${order.status.toLowerCase()}`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="report-empty">
                    No orders found. Try changing the date or search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="report-footnote">
        <Coffee size={14} /> Just Wok Up Café · Reports are based on completed
        sample orders until the database is connected.
      </p>
    </div>
  );
}
