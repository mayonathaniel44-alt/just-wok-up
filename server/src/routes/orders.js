require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");

const router = express.Router();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const allowedStatuses = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "served",
  "cancelled",
];


// Create an order from the customer cart.
// Prices are read from PostgreSQL, never trusted from the browser.
router.post("/", async (req, res) => {
  const { items, orderType = "takeout", tableToken = null, notes = "" } =
    req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Your cart is empty.",
    });
  }

  if (items.length > 50) {
    return res.status(400).json({
      success: false,
      message: "Too many different items in one order.",
    });
  }

  if (!["dine_in", "takeout"].includes(orderType)) {
    return res.status(400).json({
      success: false,
      message: "Order type must be dine_in or takeout.",
    });
  }

  if (orderType === "dine_in" && !tableToken) {
    return res.status(400).json({
      success: false,
      message: "A valid table QR token is required for dine-in orders.",
    });
  }

  if (tableToken !== null && typeof tableToken !== "string") {
    return res.status(400).json({
      success: false,
      message: "Invalid table QR token.",
    });
  }

  if (typeof notes !== "string" || notes.length > 1000) {
    return res.status(400).json({
      success: false,
      message: "Order notes must be 1000 characters or fewer.",
    });
  }

  const normalizedItems = [];
  const seenIds = new Set();

  for (const item of items) {
    const id = Number(item?.menuItemId ?? item?.id);
    const quantity = Number(item?.quantity);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "Each cart item must have a valid menu item ID.",
      });
    }

    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
      return res.status(400).json({
        success: false,
        message: "Each item quantity must be between 1 and 99.",
      });
    }

    if (seenIds.has(id)) {
      return res.status(400).json({
        success: false,
        message: "Remove duplicate menu items from the cart and try again.",
      });
    }

    seenIds.add(id);
    normalizedItems.push({ id, quantity });
  }

  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    let tableId = null;

    if (orderType === "dine_in" || tableToken) {
      const tableResult = await client.query(
        `SELECT id
         FROM restaurant_tables
         WHERE qr_token = $1::uuid AND is_active = TRUE
         FOR SHARE`,
        [tableToken]
      );

      if (tableResult.rowCount === 0) {
        await client.query("ROLLBACK");
        transactionStarted = false;
        return res.status(400).json({
          success: false,
          message: "That table QR code is invalid or inactive.",
        });
      }

      tableId = tableResult.rows[0].id;
    }

    const ids = normalizedItems.map((item) => item.id);
    const menuResult = await client.query(
      `SELECT id, name, price
       FROM menu_items
       WHERE id = ANY($1::bigint[]) AND is_available = TRUE
       FOR SHARE`,
      [ids]
    );

    const menuById = new Map(
      menuResult.rows.map((item) => [String(item.id), item])
    );

    if (menuById.size !== normalizedItems.length) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(400).json({
        success: false,
        message: "One or more menu items are unavailable or no longer exist. Refresh the menu and try again.",
      });
    }

    const orderItems = normalizedItems.map((requested) => {
      const menuItem = menuById.get(String(requested.id));
      return {
        menuItemId: menuItem.id,
        name: menuItem.name,
        unitPrice: Number(menuItem.price),
        quantity: requested.quantity,
      };
    });

    const subtotal = orderItems.reduce(
      (sum, item) => sum + Math.round(item.unitPrice * 100) * item.quantity,
      0
    ) / 100;

    // Use a database-generated ID to produce a unique order number.
    const created = await client.query(
      `INSERT INTO orders
         (order_number, table_id, order_type, order_status,
          payment_status, subtotal, notes)
       VALUES ('TEMP', $1, $2, 'pending', 'unpaid', $3, $4)
       RETURNING id`,
      [tableId, orderType, subtotal, notes.trim() || null]
    );

    const orderId = created.rows[0].id;
    const orderNumber = `JW-${String(orderId).padStart(6, "0")}`;

    await client.query(
      `UPDATE orders SET order_number = $1 WHERE id = $2`,
      [orderNumber, orderId]
    );

    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_items
           (order_id, menu_item_id, item_name, unit_price, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          orderId,
          item.menuItemId,
          item.name,
          item.unitPrice,
          item.quantity,
        ]
      );
    }

    const saved = await client.query(
      `SELECT
         o.id,
         o.order_number AS "orderNumber",
         o.order_type AS "orderType",
         o.order_status AS "orderStatus",
         o.payment_status AS "paymentStatus",
         o.subtotal,
         o.notes,
         o.created_at AS "createdAt",
         rt.table_number AS "tableNumber",
         COALESCE(
           json_agg(
             json_build_object(
               'menuItemId', oi.menu_item_id,
               'name', oi.item_name,
               'unitPrice', oi.unit_price,
               'quantity', oi.quantity,
               'lineTotal', oi.line_total,
               'notes', oi.item_notes
             ) ORDER BY oi.id
           ) FILTER (WHERE oi.id IS NOT NULL),
           '[]'::json
         ) AS items
       FROM orders o
       LEFT JOIN restaurant_tables rt ON rt.id = o.table_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = $1
       GROUP BY o.id, rt.table_number`,
      [orderId]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: "Order created successfully.",
      data: saved.rows[0],
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK").catch(() => {});
    }

    console.error("Create order error:", error.message);

    if (error.code === "22P02") {
      return res.status(400).json({
        success: false,
        message: "Invalid table QR token.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create the order.",
    });
  } finally {
    client.release();
  }
});

// List orders, including their items and table information.
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        o.id,
        o.order_number AS "orderNumber",
        o.order_type AS "orderType",
        o.order_status AS "orderStatus",
        o.payment_status AS "paymentStatus",
        o.subtotal,
        o.notes,
        o.created_at AS "createdAt",
        o.updated_at AS "updatedAt",
        rt.table_number AS "tableNumber",
        COALESCE(items.items, '[]'::json) AS items
      FROM orders o
      LEFT JOIN restaurant_tables rt ON rt.id = o.table_id
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'id', oi.id,
            'menuItemId', oi.menu_item_id,
            'name', oi.item_name,
            'unitPrice', oi.unit_price,
            'quantity', oi.quantity,
            'lineTotal', oi.line_total,
            'notes', oi.item_notes
          ) ORDER BY oi.id
        ) AS items
        FROM order_items oi
        WHERE oi.order_id = o.id
      ) items ON TRUE
      ORDER BY
        CASE WHEN o.order_status IN ('served', 'cancelled')
          THEN 1 ELSE 0 END,
        o.created_at DESC
      LIMIT 200
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("List orders error:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to load orders.",
    });
  }
});

// Get the details of one order.
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID.",
    });
  }

  try {
    const result = await pool.query(`
      SELECT
        o.id,
        o.order_number AS "orderNumber",
        o.order_type AS "orderType",
        o.order_status AS "orderStatus",
        o.payment_status AS "paymentStatus",
        o.subtotal,
        o.notes,
        o.created_at AS "createdAt",
        o.updated_at AS "updatedAt",
        rt.table_number AS "tableNumber",
        COALESCE(items.items, '[]'::json) AS items
      FROM orders o
      LEFT JOIN restaurant_tables rt ON rt.id = o.table_id
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'id', oi.id,
            'menuItemId', oi.menu_item_id,
            'name', oi.item_name,
            'unitPrice', oi.unit_price,
            'quantity', oi.quantity,
            'lineTotal', oi.line_total,
            'notes', oi.item_notes
          ) ORDER BY oi.id
        ) AS items
        FROM order_items oi
        WHERE oi.order_id = o.id
      ) items ON TRUE
      WHERE o.id = $1
    `, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get order error:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to load order details.",
    });
  }
});

// Update an order's status.
router.patch("/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const { orderStatus } = req.body || {};

  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID.",
    });
  }

  if (!allowedStatuses.includes(orderStatus)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order status.",
    });
  }

  try {
    const result = await pool.query(`
      UPDATE orders
      SET order_status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING
        id,
        order_number AS "orderNumber",
        order_status AS "orderStatus",
        updated_at AS "updatedAt"
    `, [orderStatus, id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    res.json({
      success: true,
      message: "Order status updated.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update order status error:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to update order status.",
    });
  }
});

module.exports = router;
