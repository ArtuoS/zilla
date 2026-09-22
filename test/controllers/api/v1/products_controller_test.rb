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

  test "index and show label each product with the current user's access_level and owner (FR-4)" do
    get api_v1_products_path, headers: auth_headers(users(:bob))
    body = JSON.parse(response.body)
    menopause_guide_json = body.find { |p| p["id"] == products(:menopause_guide).id }
    assert_equal "admin", menopause_guide_json["access_level"]
    assert_equal users(:alice).id, menopause_guide_json["owner"]["id"]
    assert_equal users(:alice).email, menopause_guide_json["owner"]["email"]

    get api_v1_product_path(products(:menopause_guide)), headers: auth_headers(users(:carol))
    assert_equal "viewer", JSON.parse(response.body)["access_level"]

    get api_v1_product_path(products(:menopause_guide)), headers: auth_headers(users(:alice))
    assert_equal "owner", JSON.parse(response.body)["access_level"]
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
