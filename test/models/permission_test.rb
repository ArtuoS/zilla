require "test_helper"

class PermissionTest < ActiveSupport::TestCase
  test "valid with a product, user, and access_level" do
    permission = Permission.new(product: products(:dave_product), user: users(:alice), access_level: :viewer)
    assert permission.valid?
  end

  test "access_level must be viewer or admin (FR-26)" do
    permission = Permission.new(product: products(:dave_product), user: users(:alice))
    assert_raises(ArgumentError) { permission.access_level = "bogus" }
  end

  test "a user can only hold one access level per product (FR-26)" do
    duplicate = Permission.new(product: products(:menopause_guide), user: users(:bob), access_level: :viewer)
    assert_not duplicate.valid?
    assert_includes duplicate.errors[:user_id], "has already been taken"
  end

  test "the product owner cannot also hold a permission row on their own product" do
    permission = Permission.new(product: products(:menopause_guide), user: users(:alice), access_level: :admin)
    assert_not permission.valid?
    assert_includes permission.errors[:user_id], "is already the product owner"
  end
end
