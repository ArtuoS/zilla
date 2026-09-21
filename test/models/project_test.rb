require "test_helper"

class ProjectTest < ActiveSupport::TestCase
  test "valid with a product" do
    project = Project.new(product: products(:menopause_guide))
    assert project.valid?
  end

  test "invalid without a product" do
    project = Project.new
    assert_not project.valid?
  end

  test "destroying a project destroys its project_stages and project_messages" do
    project = projects(:alice_project_one)
    project_stage_ids = project.project_stages.pluck(:id)
    message_ids = project.project_messages.pluck(:id)
    assert message_ids.any?

    project.destroy!

    assert_empty ProjectStage.where(id: project_stage_ids)
    assert_empty ProjectMessage.where(id: message_ids)
  end
end
