require "test_helper"

class Api::V1::ProductsControllerTest < ActionDispatch::IntegrationTest
  test "creates a product with a name (FR-3, Scenario 3)" do
    assert_difference "Product.count", 1 do
      post api_v1_products_path, params: { product: { name: "New Product" } }, headers: auth_headers(users(:alice))
    end
    assert_response :created
  end

  test "rejects a product without a name" do
    assert_no_difference "Product.count" do
      post api_v1_products_path, params: { product: { name: "" } }, headers: auth_headers(users(:alice))
    end
    assert_response :unprocessable_entity
  end

  test "index lists owned and shared products, not other users' products (FR-15, NFR-3)" do
    get api_v1_products_path, headers: auth_headers(users(:bob))
    assert_response :success
    ids = JSON.parse(response.body).map { |p| p["id"] }
    assert_includes ids, products(:menopause_guide).id # shared with bob as admin
    assert_not_includes ids, products(:dave_product).id
  end

  test "show is not reachable for a product the user doesn't own or have shared access to (NFR-3)" do
    get api_v1_product_path(products(:dave_product)), headers: auth_headers(users(:alice))
    assert_response :not_found
  end

  test "rejects unauthenticated requests" do
    get api_v1_products_path
    assert_response :unauthorized
  end
end
