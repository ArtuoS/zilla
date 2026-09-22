require "test_helper"

class Api::V1::MeControllerTest < ActionDispatch::IntegrationTest
  test "returns the current user's attributes when authenticated" do
    get api_v1_me_path, headers: auth_headers(users(:alice))
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal users(:alice).id, body["id"]
    assert_equal users(:alice).name, body["name"]
    assert_equal users(:alice).surname, body["surname"]
    assert_equal users(:alice).email, body["email"]
  end

  test "rejects an unauthenticated request" do
    get api_v1_me_path
    assert_response :unauthorized
  end
end
