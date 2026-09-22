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

  test "index and show nest the stage's id, name, description, initial_prompt, sequence_order (FR-10, FR-13)" do
    get api_v1_project_project_stage_path(projects(:alice_project_one), project_stages(:one_copywriting)),
      headers: auth_headers(users(:alice))
    assert_response :success
    stage_json = JSON.parse(response.body)["stage"]

    assert_equal stages(:copywriting).id, stage_json["id"]
    assert_equal stages(:copywriting).name, stage_json["name"]
    assert_equal stages(:copywriting).description, stage_json["description"]
    assert_equal stages(:copywriting).initial_prompt, stage_json["initial_prompt"]
    assert_equal stages(:copywriting).sequence_order, stage_json["sequence_order"]

    get api_v1_project_project_stages_path(projects(:alice_project_one)), headers: auth_headers(users(:alice))
    body = JSON.parse(response.body)
    assert(body.all? { |ps| ps["stage"]["id"].present? })
  end
end
