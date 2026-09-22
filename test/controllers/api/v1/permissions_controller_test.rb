require "test_helper"

class Api::V1::PermissionsControllerTest < ActionDispatch::IntegrationTest
  test "owner shares a product with an existing user by email (FR-20, Scenario 10)" do
    assert_difference "Permission.count", 1 do
      post api_v1_product_permissions_path(products(:dave_product)),
        params: { permission: { email: users(:alice).email, access_level: "viewer" } },
        headers: auth_headers(users(:dave))
    end
    assert_response :created
  end

  test "rejects sharing with an email that has no account (FR-21, Scenario 11)" do
    assert_no_difference "Permission.count" do
      post api_v1_product_permissions_path(products(:dave_product)),
        params: { permission: { email: "nobody@example.com", access_level: "viewer" } },
        headers: auth_headers(users(:dave))
    end
    assert_response :unprocessable_entity
  end

  test "rejects sharing a product with its own owner's email (Edge Case)" do
    assert_no_difference "Permission.count" do
      post api_v1_product_permissions_path(products(:dave_product)),
        params: { permission: { email: users(:dave).email, access_level: "viewer" } },
        headers: auth_headers(users(:dave))
    end
    assert_response :unprocessable_entity
  end

  test "re-sharing with an already-shared email updates the access level instead of duplicating (Edge Case)" do
    assert_no_difference "Permission.count" do
      patch_or_create_share(products(:menopause_guide), users(:carol).email, "admin", users(:alice))
    end
    assert_equal "admin", permissions(:carol_viewer_on_menopause_guide).reload.access_level
  end

  test "index nests each collaborator's user attributes instead of a bare user_id (FR-16)" do
    get api_v1_product_permissions_path(products(:menopause_guide)), headers: auth_headers(users(:alice))
    assert_response :success
    body = JSON.parse(response.body)
    bob_entry = body.find { |p| p["id"] == permissions(:bob_admin_on_menopause_guide).id }
    assert_nil bob_entry["user_id"]
    assert_equal users(:bob).id, bob_entry["user"]["id"]
    assert_equal users(:bob).name, bob_entry["user"]["name"]
    assert_equal users(:bob).surname, bob_entry["user"]["surname"]
    assert_equal users(:bob).email, bob_entry["user"]["email"]
  end

  test "viewer sees the product read-only (Scenario 12)" do
    get api_v1_product_path(products(:menopause_guide)), headers: auth_headers(users(:carol))
    assert_response :success

    post api_v1_product_stages_path(products(:menopause_guide)),
      params: { stage: { name: "X", initial_prompt: "x" } }, headers: auth_headers(users(:carol))
    assert_response :forbidden
  end

  test "admin can share the product with further users (Scenario 13)" do
    assert_difference "Permission.count", 1 do
      post api_v1_product_permissions_path(products(:menopause_guide)),
        params: { permission: { email: users(:dave).email, access_level: "viewer" } },
        headers: auth_headers(users(:bob)) # bob is admin on menopause_guide
    end
    assert_response :created
  end

  test "admin cannot revoke the owner's access or delete the product (Scenario 14)" do
    delete api_v1_product_path(products(:menopause_guide)), headers: auth_headers(users(:bob))
    assert_response :forbidden
    assert Product.exists?(products(:menopause_guide).id)
  end

  test "owner revokes another user's access, immediately cutting them off (Scenario 15)" do
    delete api_v1_product_permission_path(products(:menopause_guide), permissions(:carol_viewer_on_menopause_guide)),
      headers: auth_headers(users(:alice))
    assert_response :success

    get api_v1_product_path(products(:menopause_guide)), headers: auth_headers(users(:carol))
    assert_response :not_found
  end

  private

  def patch_or_create_share(product, email, access_level, actor)
    post api_v1_product_permissions_path(product),
      params: { permission: { email: email, access_level: access_level } }, headers: auth_headers(actor)
    assert_response :success
  end
end
