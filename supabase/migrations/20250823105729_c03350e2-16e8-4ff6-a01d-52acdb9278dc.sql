-- Ensure trigger exists for stock notifications on products table
DROP TRIGGER IF EXISTS trigger_check_stock_issues ON products;

CREATE TRIGGER trigger_check_stock_issues
  AFTER UPDATE OF stock_quantity ON products
  FOR EACH ROW
  EXECUTE FUNCTION check_and_notify_stock_issues();

-- Also ensure we have a trigger for when stock is updated after orders
DROP TRIGGER IF EXISTS trigger_update_product_stock_after_order ON orders;

CREATE TRIGGER trigger_update_product_stock_after_order
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_after_order();