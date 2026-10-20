import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000/api";

// A table QR URL can pass its UUID as ?table=TABLE_UUID.
const tableToken = new URLSearchParams(window.location.search).get("table");
const ORDER_STORAGE_KEY = tableToken
  ? `justWokUpOrders:${tableToken}`
  : "justWokUpOrders:takeout";

const peso = (amount) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(amount) || 0);

async function readResponse(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function App() {
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [confirmation, setConfirmation] = useState(null);

  // Submitted tickets are separate from the editable cart.
  const [submittedOrders, setSubmittedOrders] = useState(() => {
    try {
      const saved = localStorage.getItem(ORDER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadMenu() {
      try {
        const response = await fetch(`${API_URL}/menu`, {
          signal: controller.signal,
        });

        const result = await readResponse(response);

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Could not load menu.");
        }

        setCategories(result.data || []);
        setError("");
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(
            "Unable to load the menu. Check that the backend and database are running.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadMenu();

    return () => controller.abort();
  }, []);

  // Keep submitted tickets when the customer refreshes or closes the page.
  useEffect(() => {
    try {
      localStorage.setItem(
        ORDER_STORAGE_KEY,
        JSON.stringify(submittedOrders),
      );
    } catch (err) {
      console.error("Could not save order history:", err);
    }
  }, [submittedOrders]);

  // Refresh each saved ticket so staff status changes reach the customer.
  const trackedOrderIds = submittedOrders
    .map((order) => order.id)
    .filter((id) => id !== undefined && id !== null)
    .join(",");

  useEffect(() => {
    if (!trackedOrderIds) return;

    let active = true;
    const ids = trackedOrderIds.split(",");

    async function refreshOrderStatuses() {
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const response = await fetch(`${API_URL}/orders/${id}`);
            const result = await readResponse(response);

            if (!response.ok || !result.success || !result.data) {
              return null;
            }

            return result.data;
          } catch {
            return null;
          }
        }),
      );

      if (!active) return;

      const updates = new Map(
        results
          .filter(Boolean)
          .map((order) => [String(order.id), order]),
      );

      if (updates.size > 0) {
        setSubmittedOrders((current) =>
          current.map(
            (order) => updates.get(String(order.id)) || order,
          ),
        );
      }
    }

    refreshOrderStatuses();
    const intervalId = setInterval(refreshOrderStatuses, 5000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [trackedOrderIds]);

  const items = useMemo(
    () =>
      categories.flatMap((category) =>
        (category.items || []).map((item) => ({
          ...item,
          categoryName: category.name,
        })),
      ),
    [categories],
  );

  const filteredItems = items.filter((item) => {
    const matchesCategory =
      activeCategory === "All" ||
      item.categoryName === activeCategory;

    const matchesSearch = item.name
      .toLowerCase()
      .includes(search.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const addToCart = (item) => {
    setCheckoutError("");
    setConfirmation(null);

    setCart((current) => {
      const existing = current.find((entry) => entry.id === item.id);

      if (existing) {
        if (existing.quantity >= 99) return current;

        return current.map((entry) =>
          entry.id === item.id
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry,
        );
      }

      return [...current, { ...item, quantity: 1 }];
    });
  };

  const changeQuantity = (id, amount) => {
    setCheckoutError("");
    setConfirmation(null);

    setCart((current) =>
      current
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: Math.min(99, item.quantity + amount),
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const total = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0,
  );

  const itemCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  // Exclude cancelled orders and orders already paid or refunded.
  const runningTabTotal = submittedOrders.reduce((sum, order) => {
    const status = String(order.orderStatus || "").toLowerCase();
    const payment = String(order.paymentStatus || "").toLowerCase();

    if (
      status === "cancelled" ||
      payment === "paid" ||
      payment === "refunded"
    ) {
      return sum;
    }

    return sum + Number(order.subtotal || 0);
  }, 0);

  async function handleCheckout() {
    if (submitting || cart.length === 0) return;

    setSubmitting(true);
    setCheckoutError("");
    setConfirmation(null);

    try {
      const response = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cart.map((item) => ({
            menuItemId: item.id,
            quantity: item.quantity,
          })),
          orderType: tableToken ? "dine_in" : "takeout",
          tableToken: tableToken || null,
          notes: notes.trim(),
        }),
      });

      const result = await readResponse(response);

      if (!response.ok || !result.success || !result.data) {
        throw new Error(
          result.message || "Unable to submit your order. Please try again.",
        );
      }

      // Only clear the cart after the server confirms order creation.
      setConfirmation(result.data);

      setSubmittedOrders((current) => [
        result.data,
        ...current.filter(
          (order) => String(order.id) !== String(result.data.id),
        ),
      ]);

      setCart([]);
      setNotes("");
    } catch (err) {
      setCheckoutError(
        err.message ||
          "Unable to reach the server. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Just Wok Up home">
          <span className="brand-mark">JW</span>
          <span>
            <strong>JUST WOK UP</strong>
            <small>CAFÉ · ORDER ONLINE</small>
          </span>
        </a>

        <a className="cart-link" href="#your-order">
          Your order <span>{itemCount}</span>
        </a>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">FRESHLY MADE · MADE FOR YOU</p>
          <h1>
            Good food.
            <br />
            No waiting in line.
          </h1>
          <p className="hero-copy">
            Explore the menu, customize your order, and let us handle the rest.
          </p>
          <div className="hero-note">
            <span className="status-dot" />
            <span>Online ordering</span>
            <span className="preview-label">DEVELOPMENT</span>
          </div>
        </section>

        <section className="menu-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">WHAT ARE YOU CRAVING?</p>
              <h2>Explore the menu</h2>
            </div>
            <span className="item-count">{items.length} items</span>
          </div>

          <input
            className="search-input"
            type="search"
            placeholder="Search dishes..."
            aria-label="Search dishes"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="category-list">
            {["All", ...categories.map((category) => category.name)].map(
              (category) => (
                <button
                  key={category}
                  className={`category-button ${
                    activeCategory === category ? "active" : ""
                  }`}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ),
            )}
          </div>

          {loading && <p className="message">Loading menu...</p>}
          {error && <p className="error-message">{error}</p>}

          {!loading && !error && filteredItems.length === 0 && (
            <p className="message">
              No dishes found. Try another search.
            </p>
          )}

          <div className="menu-grid">
            {filteredItems.map((item) => (
              <article className="menu-card" key={item.id}>
                <div className="dish-placeholder">
                  <span>{item.categoryName}</span>
                  <span className="dish-initial">
                    {item.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="dish-info">
                  <p className="dish-category">{item.categoryName}</p>
                  <h3>{item.name}</h3>
                  <p className="dish-description">
                    {item.description ||
                      "Freshly prepared for your order."}
                  </p>

                  <div className="dish-footer">
                    <strong>{peso(item.price)}</strong>
                    <button
                      className="add-button"
                      onClick={() => addToCart(item)}
                      aria-label={`Add ${item.name} to order`}
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="order-section" id="order-history">
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR TICKETS</p>
              <h2>Order history</h2>
            </div>
            <span className="item-count">
              {submittedOrders.length} tickets
            </span>
          </div>

          <div className="running-tab">
            <div>
              <p className="eyebrow">RUNNING TAB</p>
              <h3>{peso(runningTabTotal)}</h3>
              <p>
                Unpaid orders, excluding cancelled orders.
              </p>
            </div>
            <span className="running-tab-icon">₱</span>
          </div>

          {submittedOrders.length === 0 ? (
            <div className="empty-cart">
              <strong>No submitted orders yet</strong>
              <p>Your tickets will appear here after you place an order.</p>
            </div>
          ) : (
            <div className="ticket-list">
              {submittedOrders.map((order) => {
                const status = String(
                  order.orderStatus || "pending",
                ).toLowerCase();

                return (
                  <article className="ticket-card" key={order.id}>
                    <div className="ticket-header">
                      <div>
                        <p className="eyebrow">ORDER TICKET</p>
                        <h3>{order.orderNumber}</h3>
                      </div>
                      <span
                        className={`ticket-status status-${status}`}
                        aria-label={`Order status: ${status}`}
                      >
                        {status.replaceAll("_", " ")}
                      </span>
                    </div>

                    <div className="ticket-items">
                      {(order.items || []).map((item, index) => (
                        <div
                          className="ticket-item"
                          key={`${order.id}-${item.menuItemId ?? item.id ?? index}-${index}`}
                        >
                          <span>
                            {item.quantity} × {item.name}
                          </span>
                          <strong>
                            {peso(
                              item.lineTotal ??
                              Number(item.unitPrice || 0) *
                                Number(item.quantity || 0),
                            )}
                          </strong>
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <p className="ticket-notes">
                        Notes: {order.notes}
                      </p>
                    )}

                    <div className="ticket-total">
                      <span>Ticket total</span>
                      <strong>{peso(order.subtotal)}</strong>
                    </div>

                    <p className="ticket-payment">
                      Payment: {String(
                        order.paymentStatus || "unpaid",
                      ).replaceAll("_", " ")}
                    </p>
                  </article>
                );
              })}
            </div>
          )}

          <p className="checkout-hint">
            Ticket statuses refresh automatically while this page is open.
            Keep this page open to follow your orders.
          </p>
        </section>

        <section className="order-section" id="your-order">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ALMOST THERE</p>
              <h2>Your order</h2>
            </div>
            <span className="item-count">{cart.length} dishes</span>
          </div>

          {confirmation && (
            <div className="checkout-success" role="status">
              <p className="eyebrow">ORDER SUBMITTED</p>
              <h3>Thank you for your order!</h3>
              <p>
                Your order number is{" "}
                <strong>{confirmation.orderNumber}</strong>.
              </p>
              <p>
                Status:{" "}
                <strong>{confirmation.orderStatus}</strong>
              </p>
              <p>
                Order total:{" "}
                <strong>{peso(confirmation.subtotal)}</strong>
              </p>
              <p>
                Payment status:{" "}
                <strong>{confirmation.paymentStatus}</strong>
              </p>
              <p className="checkout-hint">
                Your order has been recorded. Payment is not processed by this
                checkout.
              </p>
            </div>
          )}

          {cart.length === 0 ? (
            <div className="empty-cart">
              <span className="empty-cart-icon">＋</span>
              <strong>Your order is empty</strong>
              <p>Add a dish from the menu to get started.</p>
            </div>
          ) : (
            <>
              <div className="cart-items">
                {cart.map((item) => (
                  <div className="cart-item" key={item.id}>
                    <div className="cart-item-info">
                      <strong>{item.name}</strong>
                      <span>{peso(item.price)} each</span>
                    </div>

                    <div className="quantity-controls">
                      <button
                        onClick={() => changeQuantity(item.id, -1)}
                        aria-label={`Remove one ${item.name}`}
                        disabled={submitting}
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => changeQuantity(item.id, 1)}
                        aria-label={`Add one ${item.name}`}
                        disabled={submitting || item.quantity >= 99}
                      >
                        +
                      </button>
                    </div>

                    <strong className="line-total">
                      {peso(item.price * item.quantity)}
                    </strong>
                  </div>
                ))}
              </div>

              <label className="notes-label" htmlFor="order-notes">
                Order notes
              </label>
              <textarea
                id="order-notes"
                placeholder="Any special requests? (optional)"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                maxLength={1000}
                disabled={submitting}
              />

              <div className="total-row">
                <span>Subtotal</span>
                <strong>{peso(total)}</strong>
              </div>

              <p className="checkout-hint">
                {tableToken
                  ? "Dine-in order · Your order is associated with this table QR."
                  : "Takeout order · Pay at the café. Final prices are validated by the server."}
              </p>

              {checkoutError && (
                <p className="error-message" role="alert">
                  {checkoutError}
                </p>
              )}

              <button
                className="checkout-button"
                onClick={handleCheckout}
                disabled={submitting || loading || Boolean(error)}
              >
                {submitting
                  ? "Submitting your order..."
                  : `Place order · ${peso(total)}`}
              </button>
            </>
          )}
        </section>
      </main>

      <footer className="footer">
        <strong>JUST WOK UP CAFÉ</strong>
        <p>Life begins after coffee.</p>
        <small>Online ordering · Development version</small>
      </footer>
    </div>
  );
}

export default App;
