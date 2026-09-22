require "test_helper"

class Api::V1::SessionsControllerTest < ActionDispatch::IntegrationTest
  test "logs in with valid credentials (Scenario 1, FR-1)" do
    post api_v1_session_path, params: { email: users(:alice).email, password: "password123" }
    assert_response :success
    body = JSON.parse(response.body)
    assert body["token"].present?
    assert_equal users(:alice).id, body["user"]["id"]
    assert_equal users(:alice).name, body["user"]["name"]
    assert_equal users(:alice).surname, body["user"]["surname"]
    assert_equal users(:alice).email, body["user"]["email"]
  end

  test "rejects an incorrect password without revealing which field was wrong (Scenario 2, FR-2)" do
    post api_v1_session_path, params: { email: users(:alice).email, password: "wrong-password" }
    assert_response :unauthorized
    body = JSON.parse(response.body)
    assert_no_match(/password/i, body["error"].to_s)
  end

  test "rejects an unregistered email with the same generic error (Scenario 2, FR-2)" do
    post api_v1_session_path, params: { email: "nobody@example.com", password: "password123" }
    assert_response :unauthorized
    body = JSON.parse(response.body)
    assert_no_match(/email/i, body["error"].to_s)
  end

  test "logout succeeds" do
    delete api_v1_session_path, headers: auth_headers(users(:alice))
    assert_response :success
  end
end
