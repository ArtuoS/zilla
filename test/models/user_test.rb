require "test_helper"

class UserTest < ActiveSupport::TestCase
  test "valid with name, surname, email, and password" do
    user = User.new(name: "New", surname: "User", email: "new@example.com", password: "password123")
    assert user.valid?
  end

  test "invalid without name" do
    user = User.new(surname: "User", email: "new@example.com", password: "password123")
    assert_not user.valid?
    assert_includes user.errors[:name], "can't be blank"
  end

  test "invalid without surname" do
    user = User.new(name: "New", email: "new@example.com", password: "password123")
    assert_not user.valid?
    assert_includes user.errors[:surname], "can't be blank"
  end

  test "invalid without a password" do
    user = User.new(name: "New", surname: "User", email: "new@example.com")
    assert_not user.valid?
  end

  test "invalid with a duplicate email regardless of case" do
    user = User.new(name: "Dup", surname: "User", email: users(:alice).email.upcase, password: "password123")
    assert_not user.valid?
    assert_includes user.errors[:email], "has already been taken"
  end

  test "invalid with a malformed email" do
    user = User.new(name: "New", surname: "User", email: "not-an-email", password: "password123")
    assert_not user.valid?
  end

  test "normalizes email to a stripped, downcased form before saving" do
    user = User.create!(name: "New", surname: "User", email: "  New@Example.com  ", password: "password123")
    assert_equal "new@example.com", user.email
  end

  test "password_digest is never the plain password (NFR-1)" do
    user = users(:alice)
    assert_not_equal "password123", user.password_digest
    assert user.authenticate("password123")
  end
end
