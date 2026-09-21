require "test_helper"

class Api::V1::ProjectStagesControllerTest < ActionDispatch::IntegrationTest
  test "user can skip an upcoming stage out of order (FR-18, Scenario 16)" do
    post skip_api_v1_project_project_stage_path(projects(:alice_project_one), project_stages(:one_landing)),
      headers: auth_headers(users(:alice))
    assert_response :success
    assert project_stages(:one_landing).reload.skipped?
  end

  test "user can force-advance the current stage without waiting on the agent (Scenario 16)" do
    post force_advance_api_v1_project_project_stage_path(projects(:alice_project_two), project_stages(:two_copywriting)),
      headers: auth_headers(users(:alice))
    assert_response :success
    assert project_stages(:two_copywriting).reload.completed?
  end

  test "user can redo an already-completed stage, which re-enqueues the agent (FR-18, Scenario 16)" do
    assert_enqueued_with(job: AgentRespondJob) do
      post redo_api_v1_project_project_stage_path(projects(:alice_project_one), project_stages(:one_copywriting)),
        headers: auth_headers(users(:alice))
    end
    assert_response :success
    assert project_stages(:one_copywriting).reload.running?
  end

  test "viewer cannot skip, redo, or force-advance (FR-22)" do
    post skip_api_v1_project_project_stage_path(projects(:alice_project_one), project_stages(:one_landing)),
      headers: auth_headers(users(:carol))
    assert_response :forbidden
  end
end
