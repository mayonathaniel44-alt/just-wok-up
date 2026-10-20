
INSERT INTO menu_categories (name, description)
VALUES
    ('Rice Meals', 'Sample rice meals for development testing'),
    ('Noodles', 'Sample noodle dishes for development testing'),
    ('Drinks', 'Sample beverages for development testing')
ON CONFLICT (name) DO NOTHING;

INSERT INTO menu_items (category_id, name, description, price)
SELECT c.id, v.name, v.description, v.price
FROM (
    VALUES
        ('Rice Meals', 'Sample Chicken Rice', 'Development test item', 129.00::NUMERIC),
        ('Rice Meals', 'Sample Beef Rice', 'Development test item', 149.00::NUMERIC),
        ('Noodles', 'Sample Stir-Fried Noodles', 'Development test item', 119.00::NUMERIC),
        ('Noodles', 'Sample Noodle Soup', 'Development test item', 109.00::NUMERIC),
        ('Drinks', 'Sample Iced Tea', 'Development test item', 39.00::NUMERIC),
        ('Drinks', 'Sample Lemonade', 'Development test item', 49.00::NUMERIC)
) AS v(category_name, name, description, price)
JOIN menu_categories c ON c.name = v.category_name
WHERE NOT EXISTS (
    SELECT 1
    FROM menu_items existing
    WHERE existing.category_id = c.id
      AND existing.name = v.name
);
