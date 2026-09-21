require "test_helper"

class ProductTest < ActiveSupport::TestCase
  test "valid with an owner and a name" do
    product = Product.new(owner: users(:alice), name: "New Product")
    assert product.valid?
  end

  test "invalid without a name" do
    product = Product.new(owner: users(:alice))
    assert_not product.valid?
    assert_includes product.errors[:name], "can't be blank"
  end

  test "invalid without an owner" do
    product = Product.new(name: "New Product")
    assert_not product.valid?
  end

  test "destroying a product destroys its stages, projects, and permissions" do
    product = products(:menopause_guide)
    stage_ids = product.stages.pluck(:id)
    project_ids = product.projects.pluck(:id)
    permission_ids = product.permissions.pluck(:id)

    product.destroy!

    assert_empty Stage.where(id: stage_ids)
    assert_empty Project.where(id: project_ids)
    assert_empty Permission.where(id: permission_ids)
  end
end
