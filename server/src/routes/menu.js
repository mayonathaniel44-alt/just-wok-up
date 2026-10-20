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

function sendError(res, error, message) {
  console.error("Menu API error:", error.message);

  if (error.code === "23505") {
    return res.status(409).json({
      success: false,
      message: "That menu item or category already exists.",
    });
  }

  if (error.code === "23503") {
    return res.status(400).json({
      success: false,
      message: "The selected category does not exist.",
    });
  }

  return res.status(500).json({ success: false, message });
}

function validateItem(body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const price = Number(body.price);
  const categoryId = Number(body.categoryId);
  const imageUrl =
    typeof body.imageUrl === "string" ? body.imageUrl.trim() : null;

  if (!name || name.length > 150) {
    return { error: "Item name is required and must be 150 characters or fewer." };
  }

  if (
    body.price === "" ||
    body.price === null ||
    body.price === undefined ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    return { error: "Enter a valid price of zero or more." };
  }

  if (!Number.isSafeInteger(categoryId) || categoryId < 1) {
    return { error: "Select a valid menu category." };
  }

  if (description.length > 10000 || (imageUrl && imageUrl.length > 2000)) {
    return { error: "Description or image URL is too long." };
  }

  return { name, description, price, categoryId, imageUrl };
}

// Customer menu: active categories and available items only.
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id AS category_id,
        c.name AS category_name,
        c.description AS category_description,
        m.id AS item_id,
        m.name AS item_name,
        m.description AS item_description,
        m.price,
        m.image_url
      FROM menu_categories c
      LEFT JOIN menu_items m
        ON m.category_id = c.id
        AND m.is_available = TRUE
      WHERE c.is_active = TRUE
      ORDER BY c.name, m.name;
    `);

    const categories = new Map();

    for (const row of result.rows) {
      if (!categories.has(row.category_id)) {
        categories.set(row.category_id, {
          id: row.category_id,
          name: row.category_name,
          description: row.category_description,
          items: [],
        });
      }

      if (row.item_id !== null) {
        categories.get(row.category_id).items.push({
          id: row.item_id,
          name: row.item_name,
          description: row.item_description,
          price: Number(row.price),
          imageUrl: row.image_url,
        });
      }
    }

    res.json({ success: true, data: Array.from(categories.values()) });
  } catch (error) {
    sendError(res, error, "Unable to retrieve the customer menu.");
  }
});

// Staff menu: all items, including unavailable items.
router.get("/manage", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        m.id,
        m.name,
        m.description,
        m.price,
        m.image_url AS "imageUrl",
        m.is_available AS "isAvailable",
        m.category_id AS "categoryId",
        c.name AS "categoryName"
      FROM menu_items m
      LEFT JOIN menu_categories c ON c.id = m.category_id
      ORDER BY c.name, m.name;
    `);

    res.json({
      success: true,
      data: result.rows.map((item) => ({
        ...item,
        price: Number(item.price),
      })),
    });
  } catch (error) {
    sendError(res, error, "Unable to retrieve menu items for staff.");
  }
});

// Staff menu: list active categories for the item editor.
router.get("/categories", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name
      FROM menu_categories
      WHERE is_active = TRUE
      ORDER BY name;
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    sendError(res, error, "Unable to retrieve menu categories.");
  }
});

// Staff menu: create an item.
router.post("/items", async (req, res) => {
  const item = validateItem(req.body || {});

  if (item.error) {
    return res.status(400).json({ success: false, message: item.error });
  }

  try {
    const category = await pool.query(
      "SELECT id FROM menu_categories WHERE id = $1 AND is_active = TRUE",
      [item.categoryId]
    );

    if (category.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Select an active menu category.",
      });
    }

    const result = await pool.query(
      `INSERT INTO menu_items
        (category_id, name, description, price, image_url, is_available)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, category_id AS "categoryId", name, description,
                 price, image_url AS "imageUrl",
                 is_available AS "isAvailable"`,
      [
        item.categoryId,
        item.name,
        item.description,
        item.price,
        item.imageUrl || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Menu item created.",
      data: { ...result.rows[0], price: Number(result.rows[0].price) },
    });
  } catch (error) {
    sendError(res, error, "Unable to create menu item.");
  }
});

// Staff menu: edit an existing item.
router.put("/items/:id", async (req, res) => {
  const id = Number(req.params.id);
  const item = validateItem(req.body || {});

  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ success: false, message: "Invalid item ID." });
  }

  if (item.error) {
    return res.status(400).json({ success: false, message: item.error });
  }

  try {
    const category = await pool.query(
      "SELECT id FROM menu_categories WHERE id = $1 AND is_active = TRUE",
      [item.categoryId]
    );

    if (category.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Select an active menu category.",
      });
    }

    const result = await pool.query(
      `UPDATE menu_items
       SET category_id = $1, name = $2, description = $3,
           price = $4, image_url = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING id, category_id AS "categoryId", name, description,
                 price, image_url AS "imageUrl",
                 is_available AS "isAvailable"`,
      [
        item.categoryId,
        item.name,
        item.description,
        item.price,
        item.imageUrl || null,
        id,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found.",
      });
    }

    res.json({
      success: true,
      message: "Menu item updated.",
      data: { ...result.rows[0], price: Number(result.rows[0].price) },
    });
  } catch (error) {
    sendError(res, error, "Unable to update menu item.");
  }
});

// Staff menu: toggle item availability.
router.patch("/items/:id/availability", async (req, res) => {
  const id = Number(req.params.id);
  const { isAvailable } = req.body || {};

  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ success: false, message: "Invalid item ID." });
  }

  if (typeof isAvailable !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "isAvailable must be true or false.",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE menu_items
       SET is_available = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, is_available AS "isAvailable"`,
      [isAvailable, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found.",
      });
    }

    res.json({
      success: true,
      message: "Menu availability updated.",
      data: result.rows[0],
    });
  } catch (error) {
    sendError(res, error, "Unable to update menu availability.");
  }
});

module.exports = router;
