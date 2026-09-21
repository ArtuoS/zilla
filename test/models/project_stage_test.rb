require "test_helper"

class ProjectStageTest < ActiveSupport::TestCase
  test "valid with a project and a stage" do
    other_stage = Stage.create!(product: products(:empty_product), name: "X", initial_prompt: "x", sequence_order: 1)
    project_stage = ProjectStage.new(project: projects(:alice_project_two), stage: other_stage)
    assert project_stage.valid?
  end

  test "defaults to pending status" do
    project_stage = ProjectStage.create!(project: projects(:alice_project_two),
      stage: Stage.create!(product: products(:empty_product), name: "X", initial_prompt: "x", sequence_order: 1))
    assert project_stage.pending?
  end

  test "status must be one of pending, running, completed, skipped (FR-16)" do
    project_stage = project_stages(:one_landing)
    assert_raises(ArgumentError) { project_stage.status = "bogus" }
  end

  test "supports transitioning out of order: skip, redo, force-advance (FR-18)" do
    project_stage = project_stages(:one_landing)
    project_stage.skipped!
    assert project_stage.skipped?

    completed_stage = project_stages(:one_copywriting)
    assert completed_stage.completed?
    completed_stage.running! # redo
    assert completed_stage.running?
  end

  test "a project cannot have two project_stages for the same stage" do
    duplicate = ProjectStage.new(project: projects(:alice_project_one), stage: stages(:copywriting))
    assert_not duplicate.valid?
    assert_includes duplicate.errors[:stage_id], "has already been taken"
  end
end
