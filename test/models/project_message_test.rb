require "test_helper"

class ProjectMessageTest < ActiveSupport::TestCase
  test "valid as a user message with content and a user" do
    message = ProjectMessage.new(project: projects(:alice_project_one),
      project_stage: project_stages(:one_copywriting), sender_type: :user_sender,
      user: users(:alice), content: "Hello")
    assert message.valid?
  end

  test "valid as an agent message with content and no user" do
    message = ProjectMessage.new(project: projects(:alice_project_one),
      project_stage: project_stages(:one_copywriting), sender_type: :agent_sender,
      content: "Hi there")
    assert message.valid?
  end

  test "invalid without content (empty message, per Edge Cases)" do
    message = ProjectMessage.new(project: projects(:alice_project_one),
      project_stage: project_stages(:one_copywriting), sender_type: :user_sender,
      user: users(:alice), content: "")
    assert_not message.valid?
    assert_includes message.errors[:content], "can't be blank"
  end

  test "a user message requires a user (FR-11)" do
    message = ProjectMessage.new(project: projects(:alice_project_one),
      project_stage: project_stages(:one_copywriting), sender_type: :user_sender,
      content: "Hello")
    assert_not message.valid?
    assert_includes message.errors[:user_id], "can't be blank"
  end

  test "an agent message must not have a user (FR-11)" do
    message = ProjectMessage.new(project: projects(:alice_project_one),
      project_stage: project_stages(:one_copywriting), sender_type: :agent_sender,
      user: users(:alice), content: "Hello")
    assert_not message.valid?
    assert_includes message.errors[:user_id], "must be blank"
  end
end
