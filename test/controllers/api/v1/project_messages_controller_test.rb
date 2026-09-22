require "test_helper"

class Api::V1::ProjectMessagesControllerTest < ActionDispatch::IntegrationTest
  test "user posts a message and it is persisted and enqueues an agent reply (FR-10, FR-12, Scenario 8)" do
    assert_difference "ProjectMessage.count", 1 do
      assert_enqueued_with(job: AgentRespondJob) do
        post api_v1_project_project_stage_messages_path(projects(:alice_project_one), project_stages(:one_copywriting)),
          params: { project_message: { content: "Please make it shorter." } },
          headers: auth_headers(users(:alice))
      end
    end
    assert_response :created
  end

  test "rejects an empty message (Edge Case)" do
    assert_no_difference "ProjectMessage.count" do
      post api_v1_project_project_stage_messages_path(projects(:alice_project_one), project_stages(:one_copywriting)),
        params: { project_message: { content: "" } }, headers: auth_headers(users(:alice))
    end
    assert_response :unprocessable_entity
  end

  test "viewer cannot post a message but can read history (FR-22)" do
    post api_v1_project_project_stage_messages_path(projects(:alice_project_one), project_stages(:one_copywriting)),
      params: { project_message: { content: "Change this" } }, headers: auth_headers(users(:carol))
    assert_response :forbidden

    get api_v1_project_project_stage_messages_path(projects(:alice_project_one), project_stages(:one_copywriting)),
      headers: auth_headers(users(:carol))
    assert_response :success
  end

  test "message history is returned in chronological order (FR-13, NFR-2)" do
    get api_v1_project_project_stage_messages_path(projects(:alice_project_one), project_stages(:one_copywriting)),
      headers: auth_headers(users(:alice))
    body = JSON.parse(response.body)
    timestamps = body.map { |m| m["created_at"] }
    assert_equal timestamps.sort, timestamps
  end

  test "a project_stage that doesn't belong to the project is not reachable (Edge Case)" do
    other_project_stage = project_stages(:two_copywriting) # belongs to alice_project_two, not alice_project_one
    get api_v1_project_project_stage_messages_path(projects(:alice_project_one), other_project_stage),
      headers: auth_headers(users(:alice))
    assert_response :not_found
  end

  test "a user message nests the sender's user attributes; an agent message nests null (FR-11)" do
    get api_v1_project_project_stage_messages_path(projects(:alice_project_one), project_stages(:one_copywriting)),
      headers: auth_headers(users(:alice))
    body = JSON.parse(response.body)

    user_message = body.find { |m| m["sender_type"] == "user_sender" }
    assert_equal users(:alice).id, user_message["user"]["id"]
    assert_equal users(:alice).name, user_message["user"]["name"]
    assert_equal users(:alice).surname, user_message["user"]["surname"]

    agent_message = body.find { |m| m["sender_type"] == "agent_sender" }
    assert_nil agent_message["user"]
  end
end
