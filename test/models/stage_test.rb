require "test_helper"

class StageTest < ActiveSupport::TestCase
  test "valid with a product, name, initial_prompt, and sequence_order" do
    stage = Stage.new(product: products(:menopause_guide), name: "Editing",
      initial_prompt: "Edit the copy.", sequence_order: 3)
    assert stage.valid?
  end

  test "invalid without a name" do
    stage = Stage.new(product: products(:menopause_guide), initial_prompt: "x", sequence_order: 3)
    assert_not stage.valid?
    assert_includes stage.errors[:name], "can't be blank"
  end

  test "invalid without an initial_prompt" do
    stage = Stage.new(product: products(:menopause_guide), name: "Editing", sequence_order: 3)
    assert_not stage.valid?
    assert_includes stage.errors[:initial_prompt], "can't be blank"
  end

  test "sequence_order must be unique within the same product (FR-5)" do
    stage = Stage.new(product: products(:menopause_guide), name: "Dup",
      initial_prompt: "x", sequence_order: stages(:copywriting).sequence_order)
    assert_not stage.valid?
    assert_includes stage.errors[:sequence_order], "has already been taken"
  end

  test "the same sequence_order is allowed across different products" do
    stage = Stage.new(product: products(:empty_product), name: "First",
      initial_prompt: "x", sequence_order: stages(:copywriting).sequence_order)
    assert stage.valid?
  end

  test "cannot be destroyed once a project has used it" do
    stage = stages(:copywriting)
    assert stage.project_stages.exists?

    assert_not stage.destroy
    assert_includes stage.errors[:base], "Cannot delete record because dependent project stages exist"
  end
end
