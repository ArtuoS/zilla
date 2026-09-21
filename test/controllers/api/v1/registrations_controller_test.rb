require "test_helper"

class Api::V1::RegistrationsControllerTest < ActionDispatch::IntegrationTest
  test "creates a user with valid attributes" do
    assert_difference "User.count", 1 do
      post api_v1_registrations_path, params: {
        user: { name: "New", surname: "User", email: "newuser@example.com", password: "password123" }
      }
    end
    assert_response :created
  end

  test "rejects a duplicate email" do
    assert_no_difference "User.count" do
      post api_v1_registrations_path, params: {
        user: { name: "Dup", surname: "User", email: users(:alice).email, password: "password123" }
      }
    end
    assert_response :unprocessable_entity
  end

  test "rejects missing required fields" do
    assert_no_difference "User.count" do
      post api_v1_registrations_path, params: { user: { email: "missing@example.com", password: "password123" } }
    end
    assert_response :unprocessable_entity
  end
end
